// /lib/rag/embedding.ts
import fs from 'fs/promises';
import path from 'path';
import { Question, EmbeddedQuestion } from '../types';
import { ollamaClient } from './ollama';

// Use FAISS for vector search
import * as faiss from 'faiss-node';

// Path where embeddings are stored
const EMBEDDINGS_DIR = path.join(process.cwd(), 'data', 'embeddings');
const QUESTIONS_EMBEDDINGS_PATH = path.join(EMBEDDINGS_DIR, 'questions.faiss');
const QUESTIONS_METADATA_PATH = path.join(EMBEDDINGS_DIR, 'questions_metadata.json');

/**
 * Embedding utilities for vector-based retrieval
 */
export class EmbeddingService {
  private index: any | null = null;
  private questionsMetadata: Question[] = [];
  private dimension: number = 384; // Default for most Ollama models
  private initialized: boolean = false;

  /**
   * Initialize the embedding service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure the embeddings directory exists
      await fs.mkdir(EMBEDDINGS_DIR, { recursive: true });

      // Check if index exists
      try {
        // Try to load existing index
        await fs.access(QUESTIONS_EMBEDDINGS_PATH);
        this.index = await faiss.IndexFlatL2.load(QUESTIONS_EMBEDDINGS_PATH);
        
        // Load metadata
        const metadataContent = await fs.readFile(QUESTIONS_METADATA_PATH, 'utf-8');
        this.questionsMetadata = JSON.parse(metadataContent);
      } catch (error) {
        // If index doesn't exist, create a new one
        console.log('Creating new embeddings index');
        this.index = new faiss.IndexFlatL2(this.dimension);
        this.questionsMetadata = [];
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize embedding service:', error);
      throw error;
    }
  }

  /**
   * Create embeddings for the question bank
   */
  async createQuestionEmbeddings(questions: Question[]): Promise<void> {
    await this.initialize();

    // Create embeddings for each question
    for (const question of questions) {
      // Skip if question is already embedded
      if (this.questionsMetadata.some(q => q.id === question.id)) {
        continue;
      }

      // Get embedding from Ollama
      const embedding = await ollamaClient.getEmbeddings(question.text);
      
      // Add to index
      this.index.add([embedding]);
      
      // Add to metadata
      this.questionsMetadata.push(question);
    }

    // Save index and metadata
    await this.saveIndex();
  }

  /**
   * Save the current index and metadata to disk
   */
  private async saveIndex(): Promise<void> {
    await this.index.save(QUESTIONS_EMBEDDINGS_PATH);
    await fs.writeFile(
      QUESTIONS_METADATA_PATH, 
      JSON.stringify(this.questionsMetadata, null, 2),
      'utf-8'
    );
  }

  /**
   * Find similar questions based on vector similarity
   */
  async findSimilarQuestions(
    query: string, 
    count: number = 5,
    filters?: { stage?: number, tags?: string[] }
  ): Promise<{question: Question, similarity: number}[]> {
    await this.initialize();

    // Get embedding for the query
    const queryEmbedding = await ollamaClient.getEmbeddings(query);
    
    // Search for similar questions - get more than we need for filtering
    const searchResults = await this.index.search(queryEmbedding, count * 2);
    
    // Map results to questions with similarity scores
    let results = searchResults.neighbors.map((index: number, i: number) => ({
      question: this.questionsMetadata[index],
      similarity: 1 - searchResults.distances[i] // Convert L2 distance to similarity
    }));
    
    // Apply filters if provided
    if (filters) {
      if (filters.stage !== undefined) {
        results = results.filter(r => r.question.stage === filters.stage);
      }
      
      if (filters.tags && filters.tags.length > 0) {
        results = results.filter(r => 
          r.question.tags.some(tag => filters.tags!.includes(tag))
        );
      }
    }
    
    // Return top results after filtering
    return results.slice(0, count);
  }

  /**
   * Find potential contradictions based on a new answer with improved relevance
   */
  async findPotentialContradictions(
    questionId: string,
    answer: string,
    previousAnswers: { questionId: string, answer: string }[]
  ): Promise<{question: Question, similarity: number, previousAnswer: string}[]> {
    await this.initialize();
    
    // Find the current question
    const currentQuestion = this.questionsMetadata.find(q => q.id === questionId);
    if (!currentQuestion) {
      throw new Error(`Question not found: ${questionId}`);
    }

    // Get embedding for the new answer
    const answerEmbedding = await ollamaClient.getEmbeddings(answer);
    
    // Search for similar questions to check for contradictions
    let similarQuestions: {question: Question, similarity: number}[] = [];
    
    // First check explicitly related questions if they exist
    if (currentQuestion.relatedQuestionIds && currentQuestion.relatedQuestionIds.length > 0) {
      for (const relatedId of currentQuestion.relatedQuestionIds) {
        const relatedQuestion = this.questionsMetadata.find(q => q.id === relatedId);
        if (relatedQuestion) {
          similarQuestions.push({
            question: relatedQuestion,
            similarity: 1.0 // Explicit relationships are given highest similarity
          });
        }
      }
    }
    
    // Check for tag overlap - giving medium similarity score
    for (const question of this.questionsMetadata) {
      // Skip current question and already included questions
      if (question.id === questionId || similarQuestions.some(sq => sq.question.id === question.id)) {
        continue;
      }
      
      // Check tag overlap
      const overlap = question.tags.filter(tag => currentQuestion.tags.includes(tag));
      if (overlap.length >= 2) { // Require at least 2 matching tags
        similarQuestions.push({
          question,
          similarity: 0.8 + (0.05 * overlap.length) // Higher similarity for more tag matches
        });
      }
    }
    
    // Then add vector-based similar questions
    if (similarQuestions.length < 5) { // Only if we don't have enough yet
      const queryEmbedding = await ollamaClient.getEmbeddings(currentQuestion.text);
      const searchResults = await this.index.search(queryEmbedding, 10);
      
      for (const idx of searchResults.neighbors) {
        const question = this.questionsMetadata[idx];
        
        // Skip the current question and any already included from explicit relationships
        if (
          question.id === questionId || 
          similarQuestions.some(sq => sq.question.id === question.id)
        ) {
          continue;
        }
        
        similarQuestions.push({
          question,
          similarity: 0.6 // Lower similarity for vector-based matches
        });
      }
    }
    
    // Also check vector similarity between the answer and previous answers
    // This helps find contradictions where answers are similar but in response to different questions
    if (answer.length > 20) { // Only for substantial answers
      for (const prevAnswer of previousAnswers) {
        // Skip if already included
        if (similarQuestions.some(sq => sq.question.id === prevAnswer.questionId)) {
          continue;
        }
        
        const question = this.questionsMetadata.find(q => q.id === prevAnswer.questionId);
        if (!question) continue;
        
        // Get embedding for previous answer
        const prevEmbedding = await ollamaClient.getEmbeddings(prevAnswer.answer);
        
        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(answerEmbedding, prevEmbedding);
        
        // If answers are semantically similar, add to potential contradictions
        if (similarity > 0.75) {
          similarQuestions.push({
            question,
            similarity: 0.7 // Medium-high similarity for answer-based matches
          });
        }
      }
    }
    
    // Filter to only questions the user has already answered and sort by similarity
    const potentialContradictions = similarQuestions
      .filter(sq => previousAnswers.some(pa => pa.questionId === sq.question.id))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5) // Limit to top 5 most likely contradictions
      .map(sq => {
        const prevAnswer = previousAnswers.find(pa => pa.questionId === sq.question.id)!;
        return {
          question: sq.question,
          similarity: sq.similarity,
          previousAnswer: prevAnswer.answer
        };
      });
    
    return potentialContradictions;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimensions');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }
}

// Export a singleton instance
export const embeddingService = new EmbeddingService();
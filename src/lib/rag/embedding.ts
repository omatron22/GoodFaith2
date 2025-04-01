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
    count: number = 5
  ): Promise<{question: Question, similarity: number}[]> {
    await this.initialize();

    // Get embedding for the query
    const queryEmbedding = await ollamaClient.getEmbeddings(query);
    
    // Search for similar questions
    const searchResults = await this.index.search(queryEmbedding, count);
    
    // Map results to questions with similarity scores
    return searchResults.neighbors.map((index: number, i: number) => ({
      question: this.questionsMetadata[index],
      similarity: 1 - searchResults.distances[i] // Convert L2 distance to similarity
    }));
  }

  /**
   * Find potential contradictions based on a new answer
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
    
    // Then add vector-based similar questions
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
        similarity: 0.8 // Slightly lower similarity for vector-based matches
      });
    }
    
    // Filter to only questions the user has already answered
    const potentialContradictions = similarQuestions
      .filter(sq => previousAnswers.some(pa => pa.questionId === sq.question.id))
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
}

// Export a singleton instance
export const embeddingService = new EmbeddingService();
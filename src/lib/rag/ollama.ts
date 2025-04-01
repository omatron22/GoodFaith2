// /lib/rag/ollama.ts
import { OllamaRequest, OllamaResponse } from '../types';

// Default models
const REASONING_MODEL = 'deepseek-coder:latest';
const LIGHTWEIGHT_MODEL = 'mistral:latest';

/**
 * Client for interacting with Ollama models
 */
export class OllamaClient {
  private baseUrl: string;
  private cache: Map<string, any>;

  constructor(baseUrl: string = 'http://localhost:11434/api') {
    this.baseUrl = baseUrl;
    this.cache = new Map();
  }

  /**
   * Generate a response from a specific Ollama model
   */
  async generate(request: OllamaRequest): Promise<OllamaResponse> {
    // Create a cache key from the request
    const cacheKey = `generate:${JSON.stringify(request)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Cache the response
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Ollama client error:', error);
      throw error;
    }
  }

  /**
   * Get embeddings for a text using the specified model
   */
  async getEmbeddings(text: string, model: string = LIGHTWEIGHT_MODEL): Promise<number[]> {
    // Create a cache key for embeddings
    const cacheKey = `embedding:${model}:${text}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama embeddings error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Cache the embedding
      this.cache.set(cacheKey, data.embedding);
      
      return data.embedding;
    } catch (error) {
      console.error('Ollama embeddings error:', error);
      throw error;
    }
  }

  /**
   * Extract key principles from previous answers
   */
  private async extractKeyPrinciples(
    previousAnswers: { question: string; answer: string }[]
  ): Promise<string[]> {
    if (previousAnswers.length === 0) {
      return [];
    }

    const prompt = `
Analyze the following question-answer pairs about moral reasoning. 
Identify 3-5 key moral principles or values that appear to be important to the respondent.
Return ONLY a comma-separated list of these principles, with no additional text.

${previousAnswers.map((qa, i) => `Q${i+1}: ${qa.question}\nA${i+1}: ${qa.answer}`).join('\n\n')}
`;

    const response = await this.generate({
      model: LIGHTWEIGHT_MODEL,
      prompt,
      options: {
        temperature: 0.3,
        max_tokens: 100
      }
    });

    const principles = response.response
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    return principles.length > 0 ? principles : ["fairness", "autonomy", "harm"]; // Default fallback
  }

  /**
   * Analyze a contradiction using the reasoning model
   */
  async analyzeContradiction(
    question1: string,
    answer1: string,
    question2: string,
    answer2: string
  ): Promise<string> {
    const prompt = `
You are analyzing potential contradictions in a user's moral reasoning.

Question 1: "${question1}"
User's Answer 1: "${answer1}"

Question 2: "${question2}"
User's Answer 2: "${answer2}"

First, identify if there is a genuine contradiction in moral reasoning between these answers.
If there is no contradiction, explain why they are consistent.
If there is a contradiction, explain the specific inconsistency in the user's moral reasoning.

Your analysis should be brief, objective, and focused on the logical contradiction rather than judging the user's views.

Conclusion: [YES/NO] There is/is not a contradiction because...
`;

    const response = await this.generate({
      model: REASONING_MODEL,
      prompt,
      options: {
        temperature: 0.3, // Lower temperature for more analytical response
        max_tokens: 500,
      },
    });

    return response.response;
  }

  /**
   * Generate the next appropriate question based on user's previous answers
   */
  async generateQuestion(
    stage: number,
    previousAnswers: { question: string; answer: string }[]
  ): Promise<string> {
    // Extract key moral principles for context
    const keyPrinciples = await this.extractKeyPrinciples(previousAnswers);
    
    const previousContext = previousAnswers
      .map(
        (qa, index) => `Previous Question ${index + 1}: "${qa.question}"
Previous Answer ${index + 1}: "${qa.answer}"`
      )
      .join('\n\n');

    const prompt = `
You are generating a question for a moral reasoning test based on Kohlberg's stages of moral development.

The user is currently at Stage ${stage} in Kohlberg's model.

${previousContext ? `Here are their previous answers:\n\n${previousContext}\n\n` : ''}
${keyPrinciples.length > 0 ? `Based on their answers, they seem to value these principles: ${keyPrinciples.join(', ')}.\n\n` : ''}

Create a thoughtful, accessible moral question that:
1. Uses everyday language (no philosophical jargon)
2. Is appropriate for Stage ${stage} of Kohlberg's model
3. ${keyPrinciples.length >= 2 ? `Specifically probes the boundary between principles ${keyPrinciples[0]} and ${keyPrinciples[1]} where tensions might emerge` : 'Explores potential tensions in moral reasoning'}
4. Invites reflection and requires moral reasoning
5. Creates a scenario where their previous moral principles might come into tension

Respond with ONLY the question text, no explanations or other content.
`;

    const response = await this.generate({
      model: REASONING_MODEL,
      prompt,
      options: {
        temperature: 0.7, // Higher temperature for more creative questions
        max_tokens: 200,
      },
    });

    return response.response.trim();
  }

  /**
   * Analyze the user's overall moral framework based on their answers
   */
  async analyzeMoralFramework(
    answers: { question: string; answer: string }[],
    resolvedContradictions: number,
    totalContradictions: number
  ): Promise<{
    frameworkAlignment: Record<string, number>;
    keyPrinciples: string[];
    metaPrinciples?: string[];
    consistencyScore: number;
    subtlePatterns?: string[];
  }> {
    const answerContext = answers
      .map(
        (qa, index) => `Question ${index + 1}: "${qa.question}"
Answer ${index + 1}: "${qa.answer}"`
      )
      .join('\n\n');

    const prompt = `
You are analyzing a user's moral framework based on their answers to ethical questions.

Here are all their answers:

${answerContext}

The user has encountered ${totalContradictions} contradictions in their reasoning and has resolved ${resolvedContradictions} of them.

Please analyze their moral framework and provide:
1. A breakdown of alignment with major moral frameworks (deontological, utilitarian, virtue ethics, care ethics, etc.) as percentages
2. 3-5 key moral principles that appear most important to this person
3. 2-3 meta-principles (higher-order patterns) that seem to guide their reasoning
4. A consistency score from 0-100 based on the coherence of their moral reasoning
5. 2-3 subtle patterns you notice in their moral reasoning approach

Format your response as valid JSON with the following structure:
{
  "frameworkAlignment": {
    "deontological": 0,
    "utilitarian": 0,
    "virtueEthics": 0,
    "careEthics": 0,
    "other": 0
  },
  "keyPrinciples": [],
  "metaPrinciples": [],
  "consistencyScore": 0,
  "subtlePatterns": []
}
`;

    const response = await this.generate({
      model: REASONING_MODEL,
      prompt,
      options: {
        temperature: 0.3,
        max_tokens: 1000,
      },
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      console.error('Error parsing moral framework analysis:', error);
      throw new Error('Failed to parse moral framework analysis');
    }
  }
  
  /**
   * Find the most relevant next question from a set of candidates
   */
  async findMostRelevantQuestion(
    candidates: { id: string, text: string }[], 
    recentAnswers: { question: string, answer: string }[]
  ): Promise<string> {
    // If no recent answers or only one candidate, return that candidate
    if (!recentAnswers.length || candidates.length <= 1) {
      return candidates[0]?.id || '';
    }
    
    // Combine recent answers into a single text
    const context = recentAnswers
      .map(qa => `Q: ${qa.question}\nA: ${qa.answer}`)
      .join('\n\n');
    
    // Find the most engaging follow-up using the LLM
    const prompt = `
Given a user's recent answers to moral questions:

${context}

I have the following potential follow-up questions:
${candidates.map((q, i) => `${i+1}. ${q.text} [ID: ${q.id}]`).join('\n')}

Which ONE question would be most interesting to ask next to explore potential tensions or deepen understanding of their moral framework? Respond with ONLY the question ID.`;

    const response = await this.generate({
      model: LIGHTWEIGHT_MODEL,
      prompt,
      options: { temperature: 0.3, max_tokens: 20 }
    });
    
    // Extract the ID from the response
    const responseText = response.response.trim();
    
    // Try to find a direct ID match first
    for (const candidate of candidates) {
      if (responseText.includes(candidate.id)) {
        return candidate.id;
      }
    }
    
    // If no direct match, try to find a number that corresponds to the list position
    const match = responseText.match(/\d+/);
    if (match) {
      const index = parseInt(match[0]) - 1;
      if (index >= 0 && index < candidates.length) {
        return candidates[index].id;
      }
    }
    
    // Fallback to the first candidate
    return candidates[0].id;
  }
}

// Export a singleton instance
export const ollamaClient = new OllamaClient();
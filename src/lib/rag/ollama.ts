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

  constructor(baseUrl: string = 'http://localhost:11434/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate a response from a specific Ollama model
   */
  async generate(request: OllamaRequest): Promise<OllamaResponse> {
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

      return await response.json();
    } catch (error) {
      console.error('Ollama client error:', error);
      throw error;
    }
  }

  /**
   * Get embeddings for a text using the specified model
   */
  async getEmbeddings(text: string, model: string = LIGHTWEIGHT_MODEL): Promise<number[]> {
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
      return data.embedding;
    } catch (error) {
      console.error('Ollama embeddings error:', error);
      throw error;
    }
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

Create a thoughtful, accessible moral question that:
1. Uses everyday language (no philosophical jargon)
2. Is appropriate for Stage ${stage} of Kohlberg's model
3. Might reveal inconsistencies with their previous answers if appropriate
4. Invites reflection and requires moral reasoning

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
    consistencyScore: number;
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
3. A consistency score from 0-100 based on the coherence of their moral reasoning

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
  "consistencyScore": 0
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
}

// Export a singleton instance
export const ollamaClient = new OllamaClient();
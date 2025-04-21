// src/lib/types/llm.ts

/**
 * Types related to LLM integration with Ollama
 */

export interface OllamaRequestOptions {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    stop?: string[];
    // Ollama-specific options
    num_predict?: number;
    top_k?: number;
    repeat_penalty?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
  }
  
  export interface OllamaRequest {
    model: string;
    prompt: string;
    options?: OllamaRequestOptions;
    system?: string;
    template?: string;
    context?: number[]; // For conversation context
    stream?: boolean;
  }
  
  export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
  }
  
  // Specific LLM task types
  export interface QuestionGenerationRequest {
    stage: number;
    previousAnswers: Array<{
      question: string;
      answer: string;
    }>;
    userPrinciples?: string[];
    contextNotes?: string;
    temperature?: number;
  }
  
  export interface QuestionGenerationResponse {
    question: string;
    reasoning: string; // Why this question was chosen
    targetedPrinciples?: string[]; // Which principles this question targets
    potentialContradictions?: string[]; // What contradictions it might reveal
  }
  
  export interface ContradictionAnalysisRequest {
    question1: string;
    answer1: string;
    question2: string;
    answer2: string;
    principlesInvolved?: string[];
  }
  
  export interface ContradictionAnalysisResponse {
    isContradiction: boolean;
    confidence: number; // 0-1 scale
    explanation: string;
    logicalForm?: string; // e.g., "A->B, B->C, therefore A->C"
    suggestedResolution?: string;
  }
  
  export interface FrameworkAnalysisRequest {
    answers: Array<{
      question: string;
      answer: string;
    }>;
    detectedPrinciples: string[];
    contradictions: Array<{
      explanation: string;
      resolved: boolean;
    }>;
  }
  
  export interface FrameworkAnalysisResponse {
    primaryFramework: {
      name: string;
      alignmentScore: number;
      reasoning: string;
    };
    secondaryFrameworks: Array<{
      name: string;
      alignmentScore: number;
    }>;
    overallConsistency: number;
    keyInsights: string[];
    blindSpots: string[];
  }
  
  export interface PrincipleExtractionRequest {
    answers: Array<{
      question: string;
      answer: string;
    }>;
    existingPrinciples?: string[];
  }
  
  export interface PrincipleExtractionResponse {
    principles: Array<{
      text: string;
      description: string;
      derivedFrom: string[]; // Answer indices
      confidence: number;
    }>;
    patterns: string[];
    inconsistencies: string[];
  }
  
  // Prompt template types
  export interface PromptTemplate {
    id: string;
    name: string;
    template: string;
    variables: string[];
    version: string;
    createdAt: string;
    metadata?: {
      author?: string;
      description?: string;
      bestTemperature?: number;
      examples?: Array<{
        variables: Record<string, string>;
        expectedOutput: string;
      }>;
    };
  }
  
  // LLM configuration
  export interface LLMConfig {
    baseUrl: string;
    defaultModel: string;
    defaultOptions: OllamaRequestOptions;
    retryAttempts: number;
    retryDelay: number;
    timeout: number;
  }
  
  // Caching types for LLM responses
  export interface LLMCache {
    key: string;
    value: unknown;
    expiresAt: string;
    metadata?: {
      model: string;
      temperature: number;
      promptHash: string;
    };
  }
  
  // Error types
  export interface LLMError extends Error {
    code: 'CONNECTION_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'MODEL_NOT_FOUND' | 'RATE_LIMIT';
    details?: unknown;
  }
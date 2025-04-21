// src/lib/types/index.ts

/**
 * Main export file for all type definitions
 */

// Export graph types
export * from './graph';

// Export session types
export * from './session';

// Export LLM types
export * from './llm';

// Shared enums and constants
export enum ErrorCode {
  // Database errors
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR = 'DB_QUERY_ERROR',
  DB_TRANSACTION_ERROR = 'DB_TRANSACTION_ERROR',
  
  // LLM errors
  LLM_CONNECTION_ERROR = 'LLM_CONNECTION_ERROR',
  LLM_RESPONSE_ERROR = 'LLM_RESPONSE_ERROR',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  
  // Business logic errors
  INVALID_STAGE_PROGRESSION = 'INVALID_STAGE_PROGRESSION',
  CONTRADICTION_NOT_FOUND = 'CONTRADICTION_NOT_FOUND',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
}

// Application-wide constants
export const Constants = {
  MIN_ANSWERS_PER_STAGE: 3,
  MAX_PRINCIPLE_EXTRACTION: 10,
  CONTRADICTION_CONFIDENCE_THRESHOLD: 0.7,
  FRAMEWORK_ALIGNMENT_THRESHOLD: 0.6,
  MAX_RETRIES: 3,
  CACHE_TTL: 3600, // 1 hour in seconds
} as const;

// Utility types used across the application
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithTimestamps<T> = T & {
  createdAt: string;
  updatedAt: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
};

// Type guards
export function isQuestionNode(node: unknown): node is import('./graph').QuestionNode {
  if (!node || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  return Boolean(n && n.type && typeof n.type === 'string' && ['generated', 'seed'].includes(n.type));
}

export function isAnswerNode(node: unknown): node is import('./graph').AnswerNode {
  if (!node || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  return Boolean(n && typeof n.userId === 'string' && typeof n.text === 'string');
}

export function isPrincipleNode(node: unknown): node is import('./graph').PrincipleNode {
  if (!node || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  return Boolean(n && Array.isArray(n.derivedFrom) && typeof n.confidence === 'number');
}

export function isFrameworkNode(node: unknown): node is import('./graph').FrameworkNode {
  if (!node || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  return Boolean(n && typeof n.name === 'string' && Array.isArray(n.keyThinkers));
}

export function isStageNode(node: unknown): node is import('./graph').StageNode {
  if (!node || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  return Boolean(n && typeof n.stageNumber === 'number' && typeof n.name === 'string');
}

// Helper type for API endpoints
export type ApiEndpoint<TRequest, TResponse> = {
  request: TRequest;
  response: ApiResponse<TResponse>;
};
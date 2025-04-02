// /lib/types/index.ts

export enum MoralStage {
    PunishmentObedience = 1,
    InstrumentalExchange = 2,
    InterpersonalConformity = 3,
    SocialOrder = 4,
    SocialContract = 5,
    UniversalPrinciples = 6
}

// Define Question interface first since it's used by other interfaces
export interface Question {
    id: string;
    text: string;
    stage: MoralStage;
    relatedQuestionIds?: string[];
    tags: string[];
}

export interface UserAnswer {
    questionId: string;
    answer: string;
    timestamp: string;
}

export interface Contradiction {
    id: string;
    questionIds: [string, string]; // The two conflicting questions
    answers: [string, string]; // The user's conflicting answers
    explanation: string; // AI explanation of the contradiction
    resolved: boolean;
    resolution?: {
        explanation: string; // User's explanation
        overwrittenQuestionId: string; // Which answer they chose to overwrite
        newAnswer?: string; // New answer if provided
        timestamp: string;
    };
}

export interface MoralFramework {
    id: string;
    name: string;
    description: string;
    principles: string[];
    keyThinkers: string[];
}

export interface KohlbergStage {
    stage: MoralStage;
    name: string;
    description: string;
    reasoning: string;
    exampleDilemmas: string[];
}

export interface UserSession {
    userId: string;
    answers: UserAnswer[];
    contradictions: Contradiction[];
    currentStage: MoralStage;
    completedStages: MoralStage[];
    analysis?: {
        frameworkAlignment: Record<string, number>; // Framework ID to alignment score
        keyPrinciples: string[];
        consistencyScore: number;
        metaPrinciples?: string[]; // Higher-order principles that guide reasoning
        subtlePatterns?: string[]; // Subtle patterns in their moral reasoning
    };
}

export interface EmbeddedQuestion extends Question {
    embedding: number[];
}

export interface RAGRequest {
    query: string;
    previousAnswers: UserAnswer[];
    currentStage: MoralStage;
    userContext?: Record<string, unknown>; // Instead of any
}

export interface RAGResponse {
    question?: Question;
    contradictions?: Contradiction[];
    analysis?: UserSession['analysis']; // Reuse the type from UserSession
    error?: string;
}

export interface OllamaRequest {
    model: string;
    prompt: string;
    options?: {
        temperature?: number;
        top_p?: number;
        max_tokens?: number;
    };
}

export interface OllamaResponse {
    response: string;
    meta?: Record<string, unknown>; // Instead of any
}
// src/lib/types/session.ts

/**
 * Types related to user sessions and state management
 */

export interface UserSession {
    userId: string;
    currentStage: number;
    startedAt: string;
    lastActiveAt: string;
    answers: SessionAnswer[];
    contradictions: SessionContradiction[];
    resolvedContradictions: number;
    completedStages: number[];
    analysis?: SessionAnalysis;
  }
  
  export interface SessionAnswer {
    questionId: string;
    answerId: string;
    text: string;
    timestamp: string;
    stage: number;
    modified: boolean;
    previousVersionId?: string;
  }
  
  export interface SessionContradiction {
    id: string;
    questionIds: [string, string];
    answerIds: [string, string];
    explanation: string;
    resolved: boolean;
    resolution?: {
      explanation: string;
      overwrittenAnswerId: string;
      newAnswerId: string;
      timestamp: string;
    };
    detectedAt: string;
  }
  
  export interface SessionAnalysis {
    frameworkAlignment: FrameworkAlignment[];
    principleExtraction: ExtractedPrinciple[];
    consistencyScore: number;
    growthAreas: GrowthArea[];
    strengths: Strength[];
    overallSummary: string;
    stageProgress: StageProgress[];
    recommendedPhilosophers: RecommendedPhilosopher[];
  }
  
  export interface FrameworkAlignment {
    frameworkId: string;
    frameworkName: string;
    alignmentScore: number; // 0-100
    keyPrinciples: string[];
    reasoning: string;
  }
  
  export interface ExtractedPrinciple {
    id: string;
    text: string;
    description: string;
    derivedFrom: string[]; // Answer IDs
    frequency: number; // How often this principle appears
    consistency: number; // How consistently it's applied (0-1)
  }
  
  export interface GrowthArea {
    area: string;
    description: string;
    examples: string[]; // References to specific answers
    suggestions: string[];
  }
  
  export interface Strength {
    area: string;
    description: string;
    examples: string[]; // References to specific answers
    relatedPrinciples: string[];
  }
  
  export interface StageProgress {
    stage: number;
    status: 'not_started' | 'in_progress' | 'completed';
    questionsAnswered: number;
    requiredQuestions: number;
    contradictionsFound: number;
    contradictionsResolved: number;
    averageConsistency: number;
  }
  
  export interface RecommendedPhilosopher {
    name: string;
    alignmentScore: number;
    keyIdeas: string[];
    recommendedReading: string[];
    reasonForRecommendation: string;
  }
  
  // Session management operations
  export interface SessionOperations {
    create: (userId: string) => Promise<UserSession>;
    get: (sessionId: string) => Promise<UserSession | null>;
    update: (sessionId: string, data: Partial<UserSession>) => Promise<UserSession>;
    addAnswer: (sessionId: string, answer: SessionAnswer) => Promise<UserSession>;
    addContradiction: (sessionId: string, contradiction: SessionContradiction) => Promise<UserSession>;
    resolveContradiction: (
      sessionId: string, 
      contradictionId: string, 
      resolution: SessionContradiction['resolution']
    ) => Promise<UserSession>;
    advanceStage: (sessionId: string) => Promise<UserSession>;
    generateAnalysis: (sessionId: string) => Promise<SessionAnalysis>;
  }
  
  // Event types for session changes
  export interface SessionEvent {
    type: 'ANSWER_ADDED' | 'CONTRADICTION_DETECTED' | 'CONTRADICTION_RESOLVED' | 
          'STAGE_ADVANCED' | 'ANALYSIS_COMPLETED';
    sessionId: string;
    timestamp: string;
    data: unknown;
  }
  
  // Session statistics for dashboards or analytics
  export interface SessionStatistics {
    totalSessions: number;
    averageQuestionsPerSession: number;
    averageContradictionsPerSession: number;
    averageCompletionTime: number;
    stageCompletionRates: Record<number, number>;
    commonFrameworks: Array<{ framework: string; percentage: number }>;
    commonPrinciples: Array<{ principle: string; frequency: number }>;
  }
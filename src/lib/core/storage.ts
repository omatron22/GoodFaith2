// /lib/core/storage.ts
import fs from 'fs/promises';
import path from 'path';
import { 
  Question, 
  UserSession, 
  UserAnswer, 
  Contradiction, 
  MoralFramework,
  KohlbergStage
} from '../types';

// Define paths for data storage
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const KNOWLEDGE_BASE_DIR = path.join(DATA_DIR, 'knowledge-base');

// Knowledge base files
const QUESTIONS_FILE = path.join(KNOWLEDGE_BASE_DIR, 'questions.json');
const FRAMEWORKS_FILE = path.join(KNOWLEDGE_BASE_DIR, 'frameworks.json');
const KOHLBERG_FILE = path.join(KNOWLEDGE_BASE_DIR, 'kohlberg.json');

/**
 * File-based storage for the Good Faith application
 */
export class StorageService {
  constructor() {
    this.ensureDirectories();
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories() {
    try {
      await fs.mkdir(USERS_DIR, { recursive: true });
      await fs.mkdir(KNOWLEDGE_BASE_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }

  /**
   * Load questions from the knowledge base
   */
  async loadQuestions(): Promise<Question[]> {
    try {
      const data = await fs.readFile(QUESTIONS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load questions:', error);
      // Return empty array if file doesn't exist yet
      return [];
    }
  }

  /**
   * Save questions to the knowledge base
   */
  async saveQuestions(questions: Question[]): Promise<void> {
    try {
      await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questions, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save questions:', error);
      throw error;
    }
  }

  /**
   * Load moral frameworks from the knowledge base
   */
  async loadFrameworks(): Promise<MoralFramework[]> {
    try {
      const data = await fs.readFile(FRAMEWORKS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load frameworks:', error);
      // Return empty array if file doesn't exist yet
      return [];
    }
  }

  /**
   * Save moral frameworks to the knowledge base
   */
  async saveFrameworks(frameworks: MoralFramework[]): Promise<void> {
    try {
      await fs.writeFile(FRAMEWORKS_FILE, JSON.stringify(frameworks, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save frameworks:', error);
      throw error;
    }
  }

  /**
   * Load Kohlberg stages information
   */
  async loadKohlbergStages(): Promise<KohlbergStage[]> {
    try {
      const data = await fs.readFile(KOHLBERG_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load Kohlberg stages:', error);
      // Return empty array if file doesn't exist yet
      return [];
    }
  }

  /**
   * Save Kohlberg stages information
   */
  async saveKohlbergStages(stages: KohlbergStage[]): Promise<void> {
    try {
      await fs.writeFile(KOHLBERG_FILE, JSON.stringify(stages, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save Kohlberg stages:', error);
      throw error;
    }
  }

  /**
   * Get user session by ID
   */
  async getUserSession(userId: string): Promise<UserSession | null> {
    const userFilePath = path.join(USERS_DIR, `${userId}.json`);

    try {
      const data = await fs.readFile(userFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Return null if user doesn't exist
      return null;
    }
  }

  /**
   * Create a new user session
   */
  async createUserSession(userId: string): Promise<UserSession> {
    const newSession: UserSession = {
      userId,
      answers: [],
      contradictions: [],
      currentStage: 1, // Start at stage 1
      completedStages: [],
    };

    await this.saveUserSession(newSession);
    return newSession;
  }

  /**
   * Save user session
   */
  async saveUserSession(session: UserSession): Promise<void> {
    const userFilePath = path.join(USERS_DIR, `${session.userId}.json`);

    try {
      await fs.writeFile(userFilePath, JSON.stringify(session, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save user session:', error);
      throw error;
    }
  }

  /**
   * Add answer to user session
   */
  async addUserAnswer(userId: string, answer: UserAnswer): Promise<UserSession> {
    let session = await this.getUserSession(userId);
    
    if (!session) {
      session = await this.createUserSession(userId);
    }
    
    session.answers.push(answer);
    await this.saveUserSession(session);
    
    return session;
  }

  /**
   * Add contradiction to user session
   */
  async addContradiction(userId: string, contradiction: Contradiction): Promise<UserSession> {
    let session = await this.getUserSession(userId);
    
    if (!session) {
      throw new Error(`User session not found: ${userId}`);
    }
    
    session.contradictions.push(contradiction);
    await this.saveUserSession(session);
    
    return session;
  }

  /**
   * Update contradiction resolution in user session
   */
  async resolveContradiction(
    userId: string,
    contradictionId: string,
    resolution: Contradiction['resolution']
  ): Promise<UserSession> {
    let session = await this.getUserSession(userId);
    
    if (!session) {
      throw new Error(`User session not found: ${userId}`);
    }
    
    const contradictionIndex = session.contradictions.findIndex(c => c.id === contradictionId);
    
    if (contradictionIndex === -1) {
      throw new Error(`Contradiction not found: ${contradictionId}`);
    }
    
    // Update the contradiction
    session.contradictions[contradictionIndex].resolved = true;
    session.contradictions[contradictionIndex].resolution = resolution;
    
    // Find the answer that should be overwritten
    const answerIndex = session.answers.findIndex(
      a => a.questionId === resolution.overwrittenQuestionId
    );
    
    if (answerIndex !== -1 && resolution.newAnswer) {
      // Update the answer
      session.answers[answerIndex].answer = resolution.newAnswer;
    }
    
    await this.saveUserSession(session);
    
    return session;
  }

  /**
   * Update user session analysis
   */
  async updateSessionAnalysis(
    userId: string,
    analysis: UserSession['analysis']
  ): Promise<UserSession> {
    let session = await this.getUserSession(userId);
    
    if (!session) {
      throw new Error(`User session not found: ${userId}`);
    }
    
    session.analysis = analysis;
    await this.saveUserSession(session);
    
    return session;
  }

  /**
   * Advance user to next stage
   */
  async advanceUserStage(userId: string): Promise<UserSession> {
    let session = await this.getUserSession(userId);
    
    if (!session) {
      throw new Error(`User session not found: ${userId}`);
    }
    
    // Add current stage to completed stages if not already there
    if (!session.completedStages.includes(session.currentStage)) {
      session.completedStages.push(session.currentStage);
    }
    
    // Advance to next stage
    session.currentStage += 1;
    
    await this.saveUserSession(session);
    
    return session;
  }
}

// Export a singleton instance
export const storageService = new StorageService();
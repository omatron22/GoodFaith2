// /lib/core/analysis.ts
import { MoralFramework, Question, UserAnswer, UserSession } from '../types';
import { ollamaClient } from '../rag/ollama';
import { storageService } from './storage';

/**
 * Service for analyzing user's moral framework
 */
export class AnalysisService {
  /**
   * Analyze a user's moral framework based on their answers
   */
  async analyzeUserFramework(userId: string): Promise<UserSession['analysis']> {
    // Get user session
    const session = await storageService.getUserSession(userId);
    
    if (!session) {
      throw new Error(`User session not found: ${userId}`);
    }
    
    // Get all questions and frameworks
    const questions = await storageService.loadQuestions();
    const frameworks = await storageService.loadFrameworks();
    
    // Create array of question-answer pairs for analysis
    const questionAnswerPairs = session.answers.map(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      return {
        question: question!.text,
        answer: answer.answer
      };
    });
    
    // Count resolved and total contradictions
    const resolvedContradictions = session.contradictions.filter(c => c.resolved).length;
    const totalContradictions = session.contradictions.length;
    
    // Calculate base consistency score
    let consistencyScore = 100;
    
    if (totalContradictions > 0) {
      // Deduct points for each unresolved contradiction
      const unresolvedContradictions = totalContradictions - resolvedContradictions;
      consistencyScore -= unresolvedContradictions * 10;
      
      // Add back some points for resolved contradictions (showing growth)
      consistencyScore += resolvedContradictions * 5;
      
      // Ensure score is within 0-100 range
      consistencyScore = Math.max(0, Math.min(100, consistencyScore));
    }
    
    // If we have enough answers, use the reasoning model for in-depth analysis
    if (questionAnswerPairs.length >= 3) {
      try {
        // Perform detailed analysis with LLM
        const llmAnalysis = await ollamaClient.analyzeMoralFramework(
          questionAnswerPairs,
          resolvedContradictions,
          totalContradictions
        );
        
        // Use the detailed LLM analysis
        return {
          frameworkAlignment: llmAnalysis.frameworkAlignment,
          keyPrinciples: llmAnalysis.keyPrinciples,
          consistencyScore: Math.round((consistencyScore + llmAnalysis.consistencyScore) / 2)
        };
      } catch (error) {
        console.error("Error in LLM analysis:", error);
        // Fall back to heuristic analysis if LLM fails
      }
    }
    
    // Simple heuristic analysis if LLM analysis fails or not enough answers
    return this.performHeuristicAnalysis(
      session.answers,
      questions,
      frameworks,
      consistencyScore
    );
  }

  /**
   * Perform a simple heuristic analysis when LLM analysis is not available
   */
  private performHeuristicAnalysis(
    answers: UserAnswer[],
    questions: Question[],
    frameworks: MoralFramework[],
    consistencyScore: number
  ): UserSession['analysis'] {
    // Default alignments (start with equal weights)
    const frameworkAlignment: Record<string, number> = {};
    frameworks.forEach(framework => {
      frameworkAlignment[framework.id] = 0;
    });
    
    // Count tags from answered questions
    const tagCounts: Record<string, number> = {};
    
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (question) {
        question.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    // Find top principles based on tag frequency
    const keyPrinciples = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    
    // Simple framework alignment based on tag overlap with frameworks
    frameworks.forEach(framework => {
      let alignmentScore = 0;
      
      // Check overlapping principles
      framework.principles.forEach(principle => {
        // Check if any tag is similar to this principle
        for (const tag in tagCounts) {
          if (
            tag.toLowerCase().includes(principle.toLowerCase()) ||
            principle.toLowerCase().includes(tag.toLowerCase())
          ) {
            alignmentScore += tagCounts[tag];
          }
        }
      });
      
      frameworkAlignment[framework.id] = alignmentScore;
    });
    
    // Normalize framework alignment scores to percentages
    const totalAlignment = Object.values(frameworkAlignment).reduce((sum, val) => sum + val, 0);
    
    if (totalAlignment > 0) {
      Object.keys(frameworkAlignment).forEach(key => {
        frameworkAlignment[key] = Math.round((frameworkAlignment[key] / totalAlignment) * 100);
      });
    } else {
      // If no clear alignment, set equal values
      const equalValue = Math.round(100 / Object.keys(frameworkAlignment).length);
      Object.keys(frameworkAlignment).forEach(key => {
        frameworkAlignment[key] = equalValue;
      });
    }
    
    return {
      frameworkAlignment,
      keyPrinciples,
      consistencyScore
    };
  }

  /**
   * Evaluate if user is ready to advance to the next moral stage
   */
  async evaluateStageProgression(userId: string): Promise<{
    readyToAdvance: boolean;
    reason: string;
  }> {
    // Get user session
    const session = await storageService.getUserSession(userId);
    
    if (!session) {
      throw new Error(`User session not found: ${userId}`);
    }
    
    // Get all questions
    const questions = await storageService.loadQuestions();
    
    // Find questions from current stage that user has answered
    const stageQuestions = questions.filter(q => q.stage === session.currentStage);
    const answeredQuestionIds = session.answers.map(a => a.questionId);
    const answeredStageQuestions = stageQuestions.filter(q => answeredQuestionIds.includes(q.id));
    
    // Criteria for advancement
    // 1. User must have answered at least 3 questions in current stage
    // 2. User must have resolved any contradictions in current stage
    
    // Check if enough questions answered
    if (answeredStageQuestions.length < 3) {
      return {
        readyToAdvance: false,
        reason: `Need to answer at least 3 questions in stage ${session.currentStage} (currently answered ${answeredStageQuestions.length})`
      };
    }
    
    // Check for unresolved contradictions in current stage
    const currentStageAnswerIds = answeredStageQuestions.map(q => q.id);
    const unresolvedContradictions = session.contradictions.filter(
      c => 
        c.questionIds.some(qId => currentStageAnswerIds.includes(qId)) &&
        !c.resolved
    );
    
    if (unresolvedContradictions.length > 0) {
      return {
        readyToAdvance: false,
        reason: `Need to resolve ${unresolvedContradictions.length} contradiction(s) in current stage before advancing`
      };
    }
    
    // If user has answered enough questions and resolved contradictions, they can advance
    return {
      readyToAdvance: true,
      reason: `Successfully completed stage ${session.currentStage}`
    };
  }

  /**
   * Generate feedback based on the user's moral framework analysis
   */
  async generateFeedback(userId: string): Promise<string> {
    // Get user session and analysis
    const session = await storageService.getUserSession(userId);
    
    if (!session) {
      throw new Error(`User session not found: ${userId}`);
    }
    
    if (!session.analysis) {
      // Generate analysis if it doesn't exist
      session.analysis = await this.analyzeUserFramework(userId);
      await storageService.updateSessionAnalysis(userId, session.analysis);
    }
    
    // Get frameworks and Kohlberg stages
    const frameworks = await storageService.loadFrameworks();
    const kohlbergStages = await storageService.loadKohlbergStages();
    
    // Create context for feedback generation
    const topFramework = Object.entries(session.analysis.frameworkAlignment)
      .sort((a, b) => b[1] - a[1])[0];
    
    const frameworkInfo = frameworks.find(f => f.id === topFramework[0]);
    const highestStage = Math.max(...session.completedStages, session.currentStage);
    const stageInfo = kohlbergStages.find(s => s.stage === highestStage);
    
    // Generate personalized feedback
    const prompt = `
You are analyzing the moral reasoning of a user who has completed a moral framework questionnaire.

Based on their answers, they align most strongly with ${frameworkInfo?.name} (${topFramework[1]}% alignment).
Their key moral principles appear to be: ${session.analysis.keyPrinciples.join(', ')}.
Their moral reasoning consistency score is ${session.analysis.consistencyScore}/100.
They have reached Stage ${highestStage} (${stageInfo?.name}) in Kohlberg's stages of moral development.
They encountered ${session.contradictions.length} contradictions in their reasoning and resolved ${session.contradictions.filter(c => c.resolved).length} of them.

Please provide a brief (200-300 words), thoughtful, encouraging analysis of their moral framework that:
1. Acknowledges their strengths and consistencies
2. Gently identifies areas where they might reflect further
3. Offers insights about their moral development journey
4. Provides guidance on how they might continue to develop their moral reasoning

Be supportive, not judgmental. Focus on growth rather than evaluation. Avoid philosophical jargon and use clear, accessible language.
`;

    try {
      const feedbackResponse = await ollamaClient.generate({
        model: 'deepseek-coder:latest',
        prompt,
        options: {
          temperature: 0.7,
          max_tokens: 600
        }
      });
      
      return feedbackResponse.response;
    } catch (error) {
      console.error("Error generating feedback:", error);
      return "Unable to generate personalized feedback at this time. Your results have been saved and you can check back later.";
    }
  }
}

// Export a singleton instance
export const analysisService = new AnalysisService();
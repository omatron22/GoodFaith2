// /lib/core/contradictions.ts
import { Contradiction, Question, UserAnswer } from '../types';
import { ollamaClient } from '../rag/ollama';
import { v4 as uuidv4 } from 'uuid';

/**
 * Utilities for detecting and analyzing contradictions in moral reasoning
 */
export class ContradictionService {
  /**
   * Analyze if two answers contradict each other
   */
  async analyzeContradiction(
    question1: Question, 
    answer1: string,
    question2: Question,
    answer2: string
  ): Promise<{
    isContradiction: boolean;
    explanation: string;
  }> {
    // Use the reasoning model to analyze potential contradiction
    const analysis = await ollamaClient.analyzeContradiction(
      question1.text,
      answer1,
      question2.text,
      answer2
    );
    
    // Determine if there's a contradiction based on the analysis
    const isContradiction = this.detectContradictionFromAnalysis(analysis);
    
    return {
      isContradiction,
      explanation: analysis
    };
  }

  /**
   * Extract whether analysis indicates a contradiction
   */
  private detectContradictionFromAnalysis(analysis: string): boolean {
    // Simple heuristic - can be improved with more sophisticated NLP
    const lowerAnalysis = analysis.toLowerCase();
    
    // Check for positive indicators of contradiction
    const contradictionIndicators = [
      "there is a contradiction",
      "contradicts",
      "inconsistent",
      "inconsistency",
      "contradictory",
      "conflicts with",
      "conflict between",
      "cannot be reconciled",
      "mutually exclusive",
      "incompatible"
    ];
    
    // Check for negation indicators
    const negationIndicators = [
      "no contradiction",
      "not contradictory",
      "consistent",
      "no inconsistency",
      "compatible",
      "can be reconciled",
      "not incompatible",
      "not mutually exclusive"
    ];
    
    // Check if any contradiction indicators are present without negation
    const hasContradiction = contradictionIndicators.some(indicator => 
      lowerAnalysis.includes(indicator)
    );
    
    // Check if any negation indicators are present
    const hasNegation = negationIndicators.some(indicator => 
      lowerAnalysis.includes(indicator)
    );
    
    // Return true if there are contradiction indicators without negation
    return hasContradiction && !hasNegation;
  }

  /**
   * Create a new contradiction object
   */
  createContradiction(
    question1: Question,
    answer1: string,
    question2: Question,
    answer2: string,
    explanation: string
  ): Contradiction {
    return {
      id: uuidv4(),
      questionIds: [question1.id, question2.id],
      answers: [answer1, answer2],
      explanation,
      resolved: false
    };
  }

  /**
   * Find potential contradictions between a new answer and previous answers
   */
  async findPotentialContradictions(
    currentQuestion: Question,
    currentAnswer: string,
    previousQuestionsWithAnswers: {
      question: Question;
      answer: string;
    }[]
  ): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];
    
    // Check all related questions explicitly defined
    if (currentQuestion.relatedQuestionIds && currentQuestion.relatedQuestionIds.length > 0) {
      const relatedQAs = previousQuestionsWithAnswers.filter(
        qa => currentQuestion.relatedQuestionIds!.includes(qa.question.id)
      );
      
      for (const relatedQA of relatedQAs) {
        const { isContradiction, explanation } = await this.analyzeContradiction(
          currentQuestion,
          currentAnswer,
          relatedQA.question,
          relatedQA.answer
        );
        
        if (isContradiction) {
          contradictions.push(
            this.createContradiction(
              currentQuestion,
              currentAnswer,
              relatedQA.question,
              relatedQA.answer,
              explanation
            )
          );
        }
      }
    }
    
    // Check for tags overlap (questions with similar moral principles)
    const tagsOverlapQAs = previousQuestionsWithAnswers.filter(
      qa => 
        !currentQuestion.relatedQuestionIds?.includes(qa.question.id) && // Skip already checked
        qa.question.tags.some(tag => currentQuestion.tags.includes(tag))
    );
    
    for (const overlapQA of tagsOverlapQAs) {
      const { isContradiction, explanation } = await this.analyzeContradiction(
        currentQuestion,
        currentAnswer,
        overlapQA.question,
        overlapQA.answer
      );
      
      if (isContradiction) {
        contradictions.push(
          this.createContradiction(
            currentQuestion,
            currentAnswer,
            overlapQA.question,
            overlapQA.answer,
            explanation
          )
        );
      }
    }
    
    return contradictions;
  }
}

// Export a singleton instance
export const contradictionService = new ContradictionService();
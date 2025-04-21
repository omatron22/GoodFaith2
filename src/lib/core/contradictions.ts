// /lib/core/contradictions.ts
import { Contradiction, Question } from '../types';
import { ollamaClient } from '../graph/ollama';
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
   * Extract whether analysis indicates a contradiction - enhanced version
   */
  private detectContradictionFromAnalysis(analysis: string): boolean {
    // First, try to extract an explicit conclusion using regex
    const conclusionMatch = analysis.match(/conclusion:?\s*(.*?)(?:\.|$)/i) || 
                            analysis.match(/there (is|is not|isn't) a contradiction/i);
    
    if (conclusionMatch) {
      const conclusion = conclusionMatch[0].toLowerCase();
      
      // Check for explicit positive indicators in the conclusion
      if (/there is a contradiction|conclusion:\s*yes/i.test(conclusion)) {
        return true;
      }
      
      // Check for explicit negative indicators in the conclusion
      if (/there (is not|isn't) a contradiction|no contradiction|conclusion:\s*no/i.test(conclusion)) {
        return false;
      }
    }
    
    // If no clear conclusion, use a weighted scoring approach
    const lowerAnalysis = analysis.toLowerCase();
    
    // Calculate contradiction score with weighted indicators
    let score = 0;
    
    // Check for positive indicators of contradiction
    const contradictionIndicators = [
      { pattern: /contradicts|contradiction/i, weight: 0.3 },
      { pattern: /inconsistent|inconsistency/i, weight: 0.25 },
      { pattern: /conflicts with|conflict between/i, weight: 0.2 },
      { pattern: /cannot be reconciled/i, weight: 0.3 },
      { pattern: /mutually exclusive|incompatible/i, weight: 0.3 },
      { pattern: /tension between|at odds with/i, weight: 0.15 },
      { pattern: /opposes|opposing/i, weight: 0.2 }
    ];
    
    // Check for negation indicators
    const negationIndicators = [
      { pattern: /no contradiction/i, weight: -0.4 },
      { pattern: /not contradictory/i, weight: -0.3 },
      { pattern: /consistent|consistency/i, weight: -0.25 },
      { pattern: /compatible/i, weight: -0.2 },
      { pattern: /can be reconciled/i, weight: -0.3 },
      { pattern: /align|aligns with/i, weight: -0.15 },
      { pattern: /complement|complementary/i, weight: -0.2 }
    ];
    
    // Apply the patterns
    for (const { pattern, weight } of contradictionIndicators) {
      if (pattern.test(lowerAnalysis)) {
        score += weight;
      }
    }
    
    for (const { pattern, weight } of negationIndicators) {
      if (pattern.test(lowerAnalysis)) {
        score += weight;
      }
    }
    
    // Use a threshold to determine if there's a contradiction
    return score > 0.1; // Lower threshold for more sensitivity
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
    
    // First check explicitly related questions
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
    
    // Then check for tags overlap (questions with similar moral principles)
    // Prioritize by tag overlap count for efficiency
    const tagOverlapCounts = previousQuestionsWithAnswers
      .filter(qa => !currentQuestion.relatedQuestionIds?.includes(qa.question.id)) // Skip already checked
      .map(qa => ({
        qa,
        overlapCount: qa.question.tags.filter(tag => currentQuestion.tags.includes(tag)).length
      }))
      .filter(item => item.overlapCount > 0) // Must have at least one tag overlap
      .sort((a, b) => b.overlapCount - a.overlapCount); // Sort by most overlap first
    
    // Check the top 3 most relevant by tags (or fewer if there aren't that many)
    const topOverlaps = tagOverlapCounts.slice(0, 3);
    
    for (const { qa } of topOverlaps) {
      const { isContradiction, explanation } = await this.analyzeContradiction(
        currentQuestion,
        currentAnswer,
        qa.question,
        qa.answer
      );
      
      if (isContradiction) {
        contradictions.push(
          this.createContradiction(
            currentQuestion,
            currentAnswer,
            qa.question,
            qa.answer,
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
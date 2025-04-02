// /lib/core/analysis.ts
import { MoralFramework, Question, UserAnswer, UserSession, Contradiction } from '../types';
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
        question: question?.text || 'Unknown question',
        answer: answer.answer,
        tags: question?.tags || []
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
    
    // Perform simple heuristic analysis first
    const preliminaryAnalysis = this.performHeuristicAnalysis(
      session.answers,
      questions,
      frameworks,
      consistencyScore
    );
    
    // If we have enough answers, use the reasoning model for in-depth analysis
    if (questionAnswerPairs.length >= 3) {
      try {
        // Create a more detailed prompt based on the preliminary analysis
        const detailedAnalysis = await ollamaClient.analyzeMoralFramework(
          questionAnswerPairs.map(qa => ({ 
            question: qa.question, 
            answer: qa.answer 
          })),
          resolvedContradictions,
          totalContradictions
        );
        
        // Use the detailed LLM analysis, but keep at least some of our heuristic consistency score
        return {
          frameworkAlignment: detailedAnalysis.frameworkAlignment,
          keyPrinciples: detailedAnalysis.keyPrinciples,
          consistencyScore: Math.round((consistencyScore + detailedAnalysis.consistencyScore) / 2),
          metaPrinciples: detailedAnalysis.metaPrinciples || [],
          subtlePatterns: detailedAnalysis.subtlePatterns || []
        };
      } catch (error) {
        console.error("Error in LLM analysis:", error);
        // Fall back to heuristic analysis if LLM fails
      }
    }
    
    // Return the preliminary analysis if LLM analysis fails or not enough answers
    return preliminaryAnalysis;
  }

  /**
   * Perform a more sophisticated heuristic analysis when LLM analysis is not available
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
    
    // Count tags from answered questions with weighting by recency
    const tagCounts: Record<string, number> = {};
    const recentFactor = 1.5; // Recent answers have more weight
    
    answers.forEach((answer, index) => {
      const question = questions.find(q => q.id === answer.questionId);
      if (question) {
        // Calculate recency weight - more recent answers have more influence
        const recencyWeight = 1 + (recentFactor * (index / answers.length));
        
        question.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + recencyWeight;
        });
      }
    });
    
    // Find top principles based on weighted tag frequency
    const keyPrinciples = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    
    // Analyze answer content to detect patterns
    const answerTexts = answers.map(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      return {
        text: answer.answer.toLowerCase(),
        questionTags: question?.tags || []
      };
    });
    
    // Define word patterns associated with different frameworks
    const frameworkPatterns: Record<string, string[]> = {
      "deontological": ["duty", "obligation", "right", "wrong", "moral law", "universal", "principle", "categorical", "rule"],
      "utilitarian": ["happiness", "benefit", "consequences", "outcome", "greatest good", "utility", "maximize", "result"],
      "virtueEthics": ["character", "virtue", "excellence", "flourish", "good person", "integrity", "habit", "wisdom"],
      "careEthics": ["relationship", "care", "empathy", "compassion", "connection", "needs", "vulnerable", "dependent"],
      "contractarianism": ["agreement", "contract", "consent", "mutual", "fairness", "justice", "social", "equal"]
    };
    
    // Count matches for each framework in the answers
    const patternMatches: Record<string, number> = {};
    
    Object.entries(frameworkPatterns).forEach(([frameworkId, patterns]) => {
      patternMatches[frameworkId] = 0;
      
      patterns.forEach(pattern => {
        answerTexts.forEach(answer => {
          if (answer.text.includes(pattern)) {
            patternMatches[frameworkId] += 1;
          }
        });
      });
    });
    
    // Combine tag-based and pattern-based analysis
    frameworks.forEach(framework => {
      let alignmentScore = 0;
      
      // Add points from tag overlap
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
      
      // Add points from word pattern matches
      alignmentScore += (patternMatches[framework.id] || 0) * 2;
      
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
      consistencyScore,
      metaPrinciples: [], // Empty for heuristic analysis
      subtlePatterns: []  // Empty for heuristic analysis
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
    // 3. User's answers should show understanding of the current stage
    
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
    
    // If the user has answered enough questions and resolved contradictions, analyze their stage understanding
    if (session.currentStage > 1) { // Skip for the first stage
      try {
        // Get the user's answers to current stage questions
        const stageAnswers = session.answers
          .filter(a => answeredStageQuestions.find(q => q.id === a.questionId))
          .map(a => {
            const question = questions.find(q => q.id === a.questionId);
            return {
              question: question?.text || '',
              answer: a.answer
            };
          });
        
        // Use LLM to evaluate stage understanding
        const stageInfo = await storageService.loadKohlbergStages();
        const currentStageInfo = stageInfo.find(s => s.stage === session.currentStage);
        
        if (currentStageInfo && stageAnswers.length > 0) {
          const prompt = `
You are evaluating whether a user's moral reasoning shows understanding of Stage ${session.currentStage} (${currentStageInfo.name}) in Kohlberg's stages of moral development.

Stage ${session.currentStage} is characterized by: ${currentStageInfo.description}
The reasoning at this stage typically involves: ${currentStageInfo.reasoning}

Here are the user's answers to questions at this stage:
${stageAnswers.map((sa, i) => `Q${i+1}: ${sa.question}\nA${i+1}: ${sa.answer}`).join('\n\n')}

Based solely on these answers, does the user demonstrate sufficient understanding of Stage ${session.currentStage} moral reasoning to advance to the next stage?
Respond with either "YES" or "NO" followed by a brief explanation.
`;

          const response = await ollamaClient.generate({
            model: 'deepseek-coder:latest',
            prompt,
            options: {
              temperature: 0.3,
              max_tokens: 200
            }
          });

          // Check if the response indicates sufficient understanding
          if (!response.response.toLowerCase().startsWith('yes')) {
            return {
              readyToAdvance: false,
              reason: `Your answers don't yet fully demonstrate understanding of Stage ${session.currentStage} reasoning. Consider exploring the questions more deeply.`
            };
          }
        }
      } catch (error) {
        console.error("Error evaluating stage progression:", error);
        // If there's an error, we'll still let them advance if they meet the basic criteria
      }
    }
    
    // If user has answered enough questions, resolved contradictions, and shown understanding, they can advance
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
    
    // If analysis doesn't exist, generate it first
    if (!session.analysis) {
      session.analysis = await this.analyzeUserFramework(userId);
      await storageService.updateSessionAnalysis(userId, session.analysis);
    }
    
    // Now session.analysis is guaranteed to exist
    const analysis = session.analysis; // Create a non-null reference
    
    // Get frameworks and Kohlberg stages
    const frameworks = await storageService.loadFrameworks();
    const kohlbergStages = await storageService.loadKohlbergStages();
    const questions = await storageService.loadQuestions();
    
    // Create context for feedback generation
    const topFramework = Object.entries(analysis.frameworkAlignment)
      .sort((a, b) => b[1] - a[1])[0];
    
    const frameworkInfo = frameworks.find(f => f.id === topFramework[0]);
    const highestStage = Math.max(...session.completedStages, session.currentStage);
    const stageInfo = kohlbergStages.find(s => s.stage === highestStage);
    
    // Include additional context about secondary frameworks
    const secondaryFrameworks = Object.entries(analysis.frameworkAlignment)
      .sort((a, b) => b[1] - a[1])
      .slice(1, 3) // Get 2nd and 3rd highest
      .map(([id, score]) => {
        const fw = frameworks.find(f => f.id === id);
        return {
          name: fw?.name || id,
          score
        };
      });
    
    // Include information about resolved contradictions
    const resolvedContradictions = session.contradictions.filter(c => c.resolved);
    const contradictionPatterns = resolvedContradictions.length > 0 ? 
      this.analyzeContradictionPatterns(resolvedContradictions, questions) : [];
    
    // Generate personalized feedback
    const prompt = `
  You are analyzing the moral reasoning of a user who has completed a moral framework questionnaire.
  
  Based on their answers, they align most strongly with ${frameworkInfo?.name} (${topFramework[1]}% alignment).
  They also show elements of ${secondaryFrameworks.map(f => `${f.name} (${f.score}%)`).join(' and ')}.
  
  Their key moral principles appear to be: ${analysis.keyPrinciples.join(', ')}.
  ${analysis.metaPrinciples && analysis.metaPrinciples.length > 0 ? 
    `At a meta level, their reasoning seems guided by: ${analysis.metaPrinciples.join(', ')}.` : ''}
  
  Their moral reasoning consistency score is ${analysis.consistencyScore}/100.
  They have reached Stage ${highestStage} (${stageInfo?.name}) in Kohlberg's stages of moral development.
  They encountered ${session.contradictions.length} contradictions in their reasoning and resolved ${resolvedContradictions.length} of them.
  
  ${contradictionPatterns.length > 0 ? 
    `When resolving contradictions, they tended to: ${contradictionPatterns.join(', ')}.` : ''}
  
  Please provide a personalized, thoughtful analysis (about 250-300 words) of their moral framework that:
  1. Acknowledges their strengths and consistencies
  2. Insightfully identifies the core of their moral reasoning
  3. Gently identifies areas where they might reflect further
  4. Offers guidance on how they might continue to develop their moral thinking
  
  Be supportive, not judgmental. Focus on growth rather than evaluation. Avoid philosophical jargon and use clear, accessible language. Make connections between their primary ethical frameworks and principles. If they seem to have contradictions, suggest ways to harmonize their views.
  `;
  
    try {
      const feedbackResponse = await ollamaClient.generate({
        model: 'deepseek-coder:latest',
        prompt,
        options: {
          temperature: 0.7,
          max_tokens: 700
        }
      });
      
      return feedbackResponse.response;
    } catch (error) {
      console.error("Error generating feedback:", error);
      return "Unable to generate personalized feedback at this time. Your results have been saved and you can check back later.";
    }
  }
  
  /**
   * Analyze patterns in how the user resolves contradictions
   */
  private analyzeContradictionPatterns(
    resolvedContradictions: Contradiction[],
    questions: Question[]
  ): string[] {
    if (resolvedContradictions.length < 2) {
      return [];
    }
    
    // Count which questions they chose to overwrite
    let overwriteFirstCount = 0;
    let overwriteSecondCount = 0;
    
    resolvedContradictions.forEach(c => {
      if (c.resolution && c.questionIds.length === 2) {
        if (c.resolution.overwrittenQuestionId === c.questionIds[0]) {
          overwriteFirstCount++;
        } else {
          overwriteSecondCount++;
        }
      }
    });
    
    const patterns: string[] = [];
    
    // Check if they tend to overwrite one type more
    if (overwriteFirstCount > overwriteSecondCount * 2) {
      patterns.push("typically revise their initial positions when faced with contradictions");
    } else if (overwriteSecondCount > overwriteFirstCount * 2) {
      patterns.push("typically stand by their initial positions when faced with contradictions");
    } else {
      patterns.push("carefully consider which position to revise when faced with contradictions");
    }
    
    // Analyze their explanations for common themes
    const explanations = resolvedContradictions
      .filter(c => c.resolution && c.resolution.explanation)
      .map(c => c.resolution!.explanation.toLowerCase());
    
    if (explanations.length >= 2) {
      // Check for context sensitivity
      const contextWords = ["context", "situation", "circumstance", "case by case", "depends"];
      const usesContext = explanations.some(e => contextWords.some(word => e.includes(word)));
      
      if (usesContext) {
        patterns.push("emphasize the importance of context in moral decisions");
      }
      
      // Check for principle-based reasoning
      const principleWords = ["principle", "value", "belief", "fundamental", "core"];
      const usesPrinciples = explanations.some(e => principleWords.some(word => e.includes(word)));
      
      if (usesPrinciples) {
        patterns.push("refer to core principles when resolving moral tensions");
      }
      
      // Check for consequence-based reasoning
      const consequenceWords = ["consequence", "result", "outcome", "effect", "impact"];
      const usesConsequences = explanations.some(e => consequenceWords.some(word => e.includes(word)));
      
      if (usesConsequences) {
        patterns.push("consider the outcomes of actions when resolving moral dilemmas");
      }
    }
    
    return patterns;
  }
}

// Export a singleton instance
export const analysisService = new AnalysisService();
// /lib/rag/index.ts
import { v4 as uuidv4 } from 'uuid';
import { 
  Question, 
  UserAnswer, 
  Contradiction, 
  MoralStage,
  RAGRequest,
  RAGResponse,
  MoralFramework,
  KohlbergStage
} from '../types';
import { embeddingService } from './embedding';
import { ollamaClient } from './ollama';
import { storageService } from '../core/storage';

/**
 * The main RAG system for the Good Faith application
 */
export class RAGSystem {
  /**
   * Initialize the RAG system
   */
  async initialize(): Promise<void> {
    // Ensure knowledge base is populated
    await this.ensureKnowledgeBase();
    
    // Initialize embedding service
    await embeddingService.initialize();
    
    // Create embeddings for all questions
    const questions = await storageService.loadQuestions();
    await embeddingService.createQuestionEmbeddings(questions);
  }

  /**
   * Ensure the knowledge base has initial data
   */
  private async ensureKnowledgeBase(): Promise<void> {
    const questions = await storageService.loadQuestions();
    const frameworks = await storageService.loadFrameworks();
    const stages = await storageService.loadKohlbergStages();
    
    // If knowledge base is empty, populate with initial data
    if (questions.length === 0) {
      await this.populateInitialQuestions();
    }
    
    if (frameworks.length === 0) {
      await this.populateInitialFrameworks();
    }
    
    if (stages.length === 0) {
      await this.populateInitialKohlbergStages();
    }
  }

  /**
   * Populate the question bank with initial questions
   */
  private async populateInitialQuestions(): Promise<void> {
    // Initial set of questions for each Kohlberg stage
    const initialQuestions: Question[] = [
      // Stage 1: Punishment-Obedience
      {
        id: uuidv4(),
        text: "If you could take something valuable without anyone ever finding out, would you do it? Why or why not?",
        stage: MoralStage.PunishmentObedience,
        tags: ["honesty", "punishment", "authority"]
      },
      {
        id: uuidv4(),
        text: "If a rule exists but no one enforces it, should you still follow it?",
        stage: MoralStage.PunishmentObedience,
        tags: ["rules", "authority", "obedience"]
      },
      {
        id: uuidv4(),
        text: "Should you always do what your parents or teachers tell you to do?",
        stage: MoralStage.PunishmentObedience,
        tags: ["authority", "obedience", "punishment"]
      },
      
      // Stage 2: Instrumental Exchange
      {
        id: uuidv4(),
        text: "If someone does you a favor, should you always do one back? Why?",
        stage: MoralStage.InstrumentalExchange,
        tags: ["fairness", "reciprocity", "self-interest"]
      },
      {
        id: uuidv4(),
        text: "Is it ever okay to break a promise if keeping it would hurt you?",
        stage: MoralStage.InstrumentalExchange,
        tags: ["promises", "self-interest", "fairness"]
      },
      {
        id: uuidv4(),
        text: "Would you help someone if you knew they would never help you back?",
        stage: MoralStage.InstrumentalExchange,
        tags: ["self-interest", "reciprocity", "fairness"]
      },
      
      // Stage 3: Interpersonal Conformity
      {
        id: uuidv4(),
        text: "Would you do something you think is wrong to avoid disappointing your friends or family?",
        stage: MoralStage.InterpersonalConformity,
        tags: ["relationships", "approval", "social norms"]
      },
      {
        id: uuidv4(),
        text: "Is it more important to be seen as a good person or to actually be a good person?",
        stage: MoralStage.InterpersonalConformity,
        tags: ["approval", "social norms", "identity"]
      },
      {
        id: uuidv4(),
        text: "If everyone around you is doing something harmful, would you join in or stand apart?",
        stage: MoralStage.InterpersonalConformity,
        tags: ["social norms", "approval", "conformity"]
      },
      
      // Stage 4: Social Order
      {
        id: uuidv4(),
        text: "If a law exists that you believe is deeply unfair, should people still follow it? What determines when breaking a law might be justified?",
        stage: MoralStage.SocialOrder,
        tags: ["law", "social order", "justice", "civil disobedience"]
      },
      {
        id: uuidv4(),
        text: "Do you think the same rules should apply to everyone in society, regardless of their circumstances?",
        stage: MoralStage.SocialOrder,
        tags: ["equality", "social order", "justice"]
      },
      {
        id: uuidv4(),
        text: "Is it more important for a society to protect individual freedoms or to ensure the greater good?",
        stage: MoralStage.SocialOrder,
        tags: ["social order", "individual rights", "collective good"]
      },
      
      // Stage 5: Social Contract
      {
        id: uuidv4(),
        text: "Should people have the right to do things that harm themselves but not others?",
        stage: MoralStage.SocialContract,
        tags: ["autonomy", "harm principle", "rights"]
      },
      {
        id: uuidv4(),
        text: "What obligations do people in wealthy countries have toward those living in poverty elsewhere?",
        stage: MoralStage.SocialContract,
        tags: ["global justice", "social contract", "rights", "obligations"]
      },
      {
        id: uuidv4(),
        text: "How should we balance the economic needs of today with environmental concerns for future generations?",
        stage: MoralStage.SocialContract,
        tags: ["intergenerational justice", "sustainability", "rights", "future people"]
      },
      
      // Stage 6: Universal Principles
      {
        id: uuidv4(),
        text: "Is there anything that is absolutely wrong, regardless of circumstances or cultural beliefs?",
        stage: MoralStage.UniversalPrinciples,
        tags: ["universality", "moral absolutism", "relativity"]
      },
      {
        id: uuidv4(),
        text: "Should we prioritize the wellbeing of people living today or future generations who don't yet exist?",
        stage: MoralStage.UniversalPrinciples,
        tags: ["intergenerational justice", "future people", "universality"]
      },
      {
        id: uuidv4(),
        text: "What makes a human life valuable, and do all humans have equal moral worth?",
        stage: MoralStage.UniversalPrinciples,
        tags: ["human dignity", "equality", "personhood", "universality"]
      }
    ];
    
    // Set up related question IDs for potential contradictions
    const stage1Ids = initialQuestions.filter(q => q.stage === MoralStage.PunishmentObedience).map(q => q.id);
    const stage2Ids = initialQuestions.filter(q => q.stage === MoralStage.InstrumentalExchange).map(q => q.id);
    
    // Example: Connect some questions that might contradict each other
    initialQuestions.forEach(question => {
      // Questions about rules and honesty might contradict
      if (question.tags.includes("honesty") || question.tags.includes("rules")) {
        question.relatedQuestionIds = initialQuestions
          .filter(q => q.id !== question.id && (q.tags.includes("honesty") || q.tags.includes("rules")))
          .map(q => q.id);
      }
      
      // Questions about self-interest and helping others might contradict
      if (question.tags.includes("self-interest") || question.tags.includes("reciprocity")) {
        question.relatedQuestionIds = initialQuestions
          .filter(q => q.id !== question.id && (q.tags.includes("self-interest") || q.tags.includes("reciprocity")))
          .map(q => q.id);
      }
    });
    
    // Save the questions
    await storageService.saveQuestions(initialQuestions);
  }

  /**
   * Populate initial moral frameworks
   */
  private async populateInitialFrameworks(): Promise<void> {
    const initialFrameworks: MoralFramework[] = [
      {
        id: "deontological",
        name: "Deontological Ethics",
        description: "Focuses on the rightness or wrongness of actions themselves rather than the consequences.",
        principles: ["Moral duty", "Universal rules", "Categorical imperative", "Respect for persons"],
        keyThinkers: ["Immanuel Kant", "W.D. Ross", "Christine Korsgaard"]
      },
      {
        id: "utilitarian",
        name: "Utilitarian Ethics",
        description: "Judges actions based on their outcomes and consequences, seeking to maximize overall well-being.",
        principles: ["Greatest happiness principle", "Consequentialism", "Impartiality", "Welfare maximization"],
        keyThinkers: ["Jeremy Bentham", "John Stuart Mill", "Peter Singer"]
      },
      {
        id: "virtueEthics",
        name: "Virtue Ethics",
        description: "Emphasizes the role of character and virtues in moral philosophy rather than rules or consequences.",
        principles: ["Character development", "Eudaimonia", "Golden mean", "Practical wisdom"],
        keyThinkers: ["Aristotle", "Alasdair MacIntyre", "Martha Nussbaum"]
      },
      {
        id: "careEthics",
        name: "Care Ethics",
        description: "Emphasizes the importance of response to the needs of others, particularly those who are vulnerable.",
        principles: ["Empathy", "Relationships", "Contextual thinking", "Interdependence"],
        keyThinkers: ["Carol Gilligan", "Nel Noddings", "Virginia Held"]
      },
      {
        id: "contractarianism",
        name: "Social Contract Theory",
        description: "Bases morality on agreement among people for mutual benefit in society.",
        principles: ["Mutual agreement", "Fairness", "Justice as fairness", "Veil of ignorance"],
        keyThinkers: ["Thomas Hobbes", "John Rawls", "T.M. Scanlon"]
      }
    ];
    
    await storageService.saveFrameworks(initialFrameworks);
  }

  /**
   * Populate initial Kohlberg stages information
   */
  private async populateInitialKohlbergStages(): Promise<void> {
    const initialStages: KohlbergStage[] = [
      {
        stage: MoralStage.PunishmentObedience,
        name: "Punishment-Obedience Orientation",
        description: "In this stage, individuals focus on the direct consequences of their actions to themselves.",
        reasoning: "What is right is what avoids punishment or gains reward. Authority figures determine right and wrong.",
        exampleDilemmas: [
          "Should I take this toy if no one is looking?",
          "Should I follow this rule even though I don't want to?"
        ]
      },
      {
        stage: MoralStage.InstrumentalExchange,
        name: "Instrumental Exchange Orientation",
        description: "In this stage, individuals focus on what's fair in terms of concrete exchange.",
        reasoning: "What is right is what serves one's own interests but also allows for equal exchange with others.",
        exampleDilemmas: [
          "Should I share my toys so others will share with me?",
          "Should I keep a promise only if I get something in return?"
        ]
      },
      {
        stage: MoralStage.InterpersonalConformity,
        name: "Interpersonal Conformity Orientation",
        description: "In this stage, individuals focus on living up to social expectations and roles.",
        reasoning: "What is right is what gains the approval of others and maintains relationships.",
        exampleDilemmas: [
          "Should I do what my friends want me to do so they'll like me?",
          "Should I help others to be seen as a good person?"
        ]
      },
      {
        stage: MoralStage.SocialOrder,
        name: "Social Order Orientation",
        description: "In this stage, individuals focus on maintaining the social order and following social rules.",
        reasoning: "What is right is what contributes to society, upholds law and order, and fulfills one's duty.",
        exampleDilemmas: [
          "Should laws always be obeyed regardless of circumstances?",
          "Is it ever justified to break a rule for a greater good?"
        ]
      },
      {
        stage: MoralStage.SocialContract,
        name: "Social Contract Orientation",
        description: "In this stage, individuals recognize the relative nature of rules and values but still emphasize basic rights and democratic processes.",
        reasoning: "What is right is what protects rights and is agreed upon by society through fair procedures.",
        exampleDilemmas: [
          "Should individual rights ever be limited for the greater good?",
          "When should we change laws that no longer serve their purpose?"
        ]
      },
      {
        stage: MoralStage.UniversalPrinciples,
        name: "Universal Ethical Principles Orientation",
        description: "In this stage, individuals follow self-chosen ethical principles that are comprehensive, universal, and consistent.",
        reasoning: "What is right is determined by abstract, universal principles that transcend specific societies and situations.",
        exampleDilemmas: [
          "What fundamental principles should guide all human actions?",
          "How do we determine what is universally right regardless of culture or time?"
        ]
      }
    ];
    
    await storageService.saveKohlbergStages(initialStages);
  }

  /**
   * Get the next question for a user
   */
  async getNextQuestion(userId: string): Promise<Question> {
    // Get user session
    let session = await storageService.getUserSession(userId);
    
    if (!session) {
      session = await storageService.createUserSession(userId);
    }
    
    // Get all questions for the current stage
    const allQuestions = await storageService.loadQuestions();
    const stageQuestions = allQuestions.filter(q => q.stage === session.currentStage);
    
    // Filter out questions the user has already answered
    const answeredQuestionIds = session.answers.map(a => a.questionId);
    const unansweredQuestions = stageQuestions.filter(q => !answeredQuestionIds.includes(q.id));
    
    if (unansweredQuestions.length > 0) {
      // Return a random unanswered question
      return unansweredQuestions[Math.floor(Math.random() * unansweredQuestions.length)];
    }
    
    // If all questions for this stage are answered, either move to next stage or generate a new question
    if (session.currentStage < MoralStage.UniversalPrinciples) {
      // Advance to next stage and get a question from there
      session = await storageService.advanceUserStage(userId);
      return this.getNextQuestion(userId);
    } else {
      // We're at the highest stage, so generate a new question
      const previousAnswers = session.answers.map(answer => {
        const question = allQuestions.find(q => q.id === answer.questionId);
        return {
          question: question!.text,
          answer: answer.answer
        };
      });
      
      const newQuestionText = await ollamaClient.generateQuestion(
        session.currentStage,
        previousAnswers
      );
      
      // Create a new question
      const newQuestion: Question = {
        id: uuidv4(),
        text: newQuestionText,
        stage: session.currentStage,
        tags: ["generated", "universal-principles"]
      };
      
      // Save the new question
      const questions = await storageService.loadQuestions();
      questions.push(newQuestion);
      await storageService.saveQuestions(questions);
      
      // Create embedding for the new question
      await embeddingService.createQuestionEmbeddings([newQuestion]);
      
      return newQuestion;
    }
  }

  /**
   * Submit a user's answer and check for contradictions
   */
  async submitAnswer(
    userId: string,
    questionId: string,
    answer: string
  ): Promise<{
    question: Question;
    contradictions: Contradiction[];
  }> {
    // Get user session
    let session = await storageService.getUserSession(userId);
    
    if (!session) {
      session = await storageService.createUserSession(userId);
    }
    
    // Find the question
    const questions = await storageService.loadQuestions();
    const question = questions.find(q => q.id === questionId);
    
    if (!question) {
      throw new Error(`Question not found: ${questionId}`);
    }
    
    // Save the answer
    const userAnswer: UserAnswer = {
      questionId,
      answer,
      timestamp: new Date().toISOString()
    };
    
    session = await storageService.addUserAnswer(userId, userAnswer);
    
    // Check for contradictions
    const previousAnswers = session.answers
      .filter(a => a.questionId !== questionId) // Exclude the current answer
      .map(a => ({
        questionId: a.questionId,
        answer: a.answer
      }));
    
    // Find potential contradictions
    const potentialContradictions = await embeddingService.findPotentialContradictions(
      questionId,
      answer,
      previousAnswers
    );
    
    // Analyze each potential contradiction
    const contradictions: Contradiction[] = [];
    
    for (const potential of potentialContradictions) {
      // Skip if already checked for this pair
      const existingContradiction = session.contradictions.find(
        c => c.questionIds.includes(questionId) && c.questionIds.includes(potential.question.id)
      );
      
      if (existingContradiction) {
        contradictions.push(existingContradiction);
        continue;
      }
      
      // Analyze with LLM
      const analysis = await ollamaClient.analyzeContradiction(
        question.text,
        answer,
        potential.question.text,
        potential.previousAnswer
      );
      
      // If analysis indicates a contradiction, create it
      if (analysis.toLowerCase().includes("contradiction") && !analysis.toLowerCase().includes("no contradiction")) {
        const contradiction: Contradiction = {
          id: uuidv4(),
          questionIds: [questionId, potential.question.id],
          answers: [answer, potential.previousAnswer],
          explanation: analysis,
          resolved: false
        };
        
        // Save the contradiction
        session = await storageService.addContradiction(userId, contradiction);
        contradictions.push(contradiction);
      }
    }
    
    return {
      question,
      contradictions
    };
  }

  /**
   * Resolve a contradiction
   */
  async resolveContradiction(
    userId: string,
    contradictionId: string,
    explanation: string,
    overwrittenQuestionId: string,
    newAnswer?: string
  ): Promise<Contradiction> {
    // Get user session
    const session = await storageService.getUserSession(userId);
    
    if (!session) {
      throw new Error(`User session not found: ${userId}`);
    }
    
    // Find the contradiction
    const contradiction = session.contradictions.find(c => c.id === contradictionId);
    
    if (!contradiction) {
      throw new Error(`Contradiction not found: ${contradictionId}`);
    }
    
    // Create resolution
    const resolution = {
      explanation,
      overwrittenQuestionId,
      newAnswer,
      timestamp: new Date().toISOString()
    };
    
    // Update the contradiction
    await storageService.resolveContradiction(userId, contradictionId, resolution);
    
    // Return the updated contradiction
    const updatedSession = await storageService.getUserSession(userId);
    const updatedContradiction = updatedSession!.contradictions.find(c => c.id === contradictionId);
    
    if (!updatedContradiction) {
      throw new Error(`Failed to retrieve updated contradiction: ${contradictionId}`);
    }
    
    return updatedContradiction;
  }

  /**
   * Analyze the user's moral framework
   */
  async analyzeUserFramework(userId: string): Promise<UserSession['analysis']> {
    // Get user session
    const session = await storageService.getUserSession(userId);
    
    if (!session) {
      throw new Error(`User session not found: ${userId}`);
    }
    
    // Get all questions
    const questions = await storageService.loadQuestions();
    
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
    
    // Analyze with LLM
    const analysis = await ollamaClient.analyzeMoralFramework(
      questionAnswerPairs,
      resolvedContradictions,
      totalContradictions
    );
    
    // Save the analysis
    await storageService.updateSessionAnalysis(userId, analysis);
    
    return analysis;
  }

  /**
   * Process a RAG request
   */
  async processRequest(request: RAGRequest): Promise<RAGResponse> {
    try {
      // Handle different types of requests
      if (request.query === "GET_NEXT_QUESTION") {
        const question = await this.getNextQuestion(request.userContext.userId);
        return { question };
      } else if (request.query === "SUBMIT_ANSWER") {
        const result = await this.submitAnswer(
          request.userContext.userId,
          request.userContext.questionId,
          request.userContext.answer
        );
        return {
          question: result.question,
          contradictions: result.contradictions
        };
      } else if (request.query === "RESOLVE_CONTRADICTION") {
        const contradiction = await this.resolveContradiction(
          request.userContext.userId,
          request.userContext.contradictionId,
          request.userContext.explanation,
          request.userContext.overwrittenQuestionId,
          request.userContext.newAnswer
        );
        return { contradictions: [contradiction] };
      } else if (request.query === "ANALYZE_FRAMEWORK") {
        const analysis = await this.analyzeUserFramework(request.userContext.userId);
        return { analysis };
      } else {
        return { error: "Unknown query type" };
      }
    } catch (error) {
      console.error("RAG system error:", error);
      return { error: `Error processing request: ${error}` };
    }
  }
}

// Export a singleton instance
export const ragSystem = new RAGSystem();
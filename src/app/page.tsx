'use client';

import { useState, useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Question, Contradiction, MoralStage } from '@/lib/types';

// Define interface for Analysis data to replace 'any'
interface AnalysisData {
  userId: string;
  analysis: {
    frameworkAlignment: Record<string, number>;
    keyPrinciples: string[];
    consistencyScore: number;
    metaPrinciples?: string[];
    subtlePatterns?: string[];
  };
  feedback: string;
  statistics: {
    totalQuestions: number;
    totalContradictions: number;
    resolvedContradictions: number;
    highestStage: number;
  };
  frameworks: Array<{
    id: string;
    name: string;
    description: string;
    principles: string[];
    keyThinkers: string[];
  }>;
  kohlbergStages: Array<{
    stage: number;
    name: string;
    description: string;
    reasoning: string;
    exampleDilemmas: string[];
  }>;
}

export default function Home() {
  // User state
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Question state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [showQuestionLoading, setShowQuestionLoading] = useState(false);
  
  // Contradiction state
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [showContradictionModal, setShowContradictionModal] = useState(false);
  const [activeContradiction, setActiveContradiction] = useState<Contradiction | null>(null);
  const [resolutionExplanation, setResolutionExplanation] = useState('');
  const [overwrittenQuestionId, setOverwrittenQuestionId] = useState<string | null>(null);
  const [newAnswer, setNewAnswer] = useState('');
  
  // Analysis state - replace 'any' with proper type
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  
  // Rest of your component remains the same
  
  // Initialize and get first question
  useEffect(() => {
    const storedUserId = localStorage.getItem('goodFaithUserId');
    
    async function initializeSession() {
      try {
        setLoading(true);
        
        // Get or create user session
        const questionUrl = storedUserId
          ? `/api/question?userId=${storedUserId}`
          : '/api/question';
        
        const questionRes = await fetch(questionUrl);
        
        if (!questionRes.ok) {
          throw new Error('Failed to initialize session');
        }
        
        const data = await questionRes.json();
        
        // Save user ID
        setUserId(data.userId);
        if (!storedUserId) {
          localStorage.setItem('goodFaithUserId', data.userId);
        }
        
        // Set current question
        setCurrentQuestion(data.question);
      } catch (err) {
        setError('Failed to load the application. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    initializeSession();
  }, []);
  
  // Handle answer submission
  const handleSubmitAnswer = async () => {
    if (!userId || !currentQuestion || !answer.trim()) {
      return;
    }
    
    try {
      setShowQuestionLoading(true);
      
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          questionId: currentQuestion.id,
          answer: answer.trim()
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to submit answer');
      }
      
      const data = await res.json();
      
      // Check for contradictions
      if (data.contradictions && data.contradictions.length > 0) {
        setContradictions(data.contradictions);
        setActiveContradiction(data.contradictions[0]);
        setShowContradictionModal(true);
      } else {
        // Get next question
        await getNextQuestion();
      }
    } catch (err) {
      setError('Failed to submit your answer. Please try again.');
      console.error(err);
    } finally {
      setShowQuestionLoading(false);
    }
  };
  
  // Get next question
  const getNextQuestion = async () => {
    if (!userId) {
      return;
    }
    
    try {
      setShowQuestionLoading(true);
      
      const res = await fetch(`/api/question?userId=${userId}`);
      
      if (!res.ok) {
        throw new Error('Failed to get next question');
      }
      
      const data = await res.json();
      
      // Set current question
      setCurrentQuestion(data.question);
      setAnswer('');
    } catch (err) {
      setError('Failed to load the next question. Please try again.');
      console.error(err);
    } finally {
      setShowQuestionLoading(false);
    }
  };
  
  // Handle contradiction resolution
  const handleResolveContradiction = async () => {
    if (!userId || !activeContradiction || !resolutionExplanation.trim() || !overwrittenQuestionId) {
      return;
    }
    
    try {
      setShowQuestionLoading(true);
      
      const res = await fetch('/api/resolution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          contradictionId: activeContradiction.id,
          explanation: resolutionExplanation.trim(),
          overwrittenQuestionId,
          newAnswer: newAnswer.trim() || undefined
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to resolve contradiction');
      }
      
      // Close modal
      setShowContradictionModal(false);
      setActiveContradiction(null);
      setResolutionExplanation('');
      setOverwrittenQuestionId(null);
      setNewAnswer('');
      
      // Get next question
      await getNextQuestion();
    } catch (err) {
      setError('Failed to resolve the contradiction. Please try again.');
      console.error(err);
    } finally {
      setShowQuestionLoading(false);
    }
  };
  
  // Handle viewing analysis
  const handleViewAnalysis = async () => {
    if (!userId) {
      return;
    }
    
    try {
      setLoading(true);
      
      const res = await fetch(`/api/analysis?userId=${userId}`);
      
      if (!res.ok) {
        throw new Error('Failed to get analysis');
      }
      
      const data = await res.json();
      setAnalysis(data);
      setShowAnalysis(true);
    } catch (err) {
      setError('Failed to load your analysis. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset the application
  const handleReset = () => {
    localStorage.removeItem('goodFaithUserId');
    window.location.reload();
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <h1 className="text-3xl font-bold mb-4">Good Faith</h1>
          <p className="mb-4">Loading the application...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <h1 className="text-3xl font-bold mb-4">Good Faith</h1>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  if (showAnalysis && analysis) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">Your Moral Framework Analysis</h1>
          
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Feedback</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="whitespace-pre-line">{analysis.feedback}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Framework Alignment</h2>
              <ul className="space-y-2">
                {Object.entries(analysis.analysis.frameworkAlignment)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([frameworkId, score]) => {
                    const framework = analysis.frameworks.find((f) => f.id === frameworkId);
                    return (
                      <li key={frameworkId} className="flex items-center">
                        <div className="w-full">
                          <div className="flex justify-between mb-1">
                            <span>{framework?.name || frameworkId}</span>
                            <span>{score}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${score}%` }}
                            ></div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
            
            <div>
              <h2 className="text-2xl font-semibold mb-4">Key Principles</h2>
              <ul className="list-disc list-inside space-y-1">
                {analysis.analysis.keyPrinciples.map((principle: string) => (
                  <li key={principle}>{principle}</li>
                ))}
              </ul>
              
              <h2 className="text-2xl font-semibold mt-6 mb-4">Statistics</h2>
              <ul className="space-y-2">
                <li><strong>Questions Answered:</strong> {analysis.statistics.totalQuestions}</li>
                <li><strong>Highest Stage Reached:</strong> {analysis.statistics.highestStage} - {
analysis.kohlbergStages.find((s) => s.stage === analysis.statistics.highestStage)?.name
}</li>
                <li><strong>Contradictions Encountered:</strong> {analysis.statistics.totalContradictions}</li>
                <li><strong>Contradictions Resolved:</strong> {analysis.statistics.resolvedContradictions}</li>
                <li><strong>Consistency Score:</strong> {analysis.analysis.consistencyScore}/100</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                setShowAnalysis(false);
                getNextQuestion();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Continue Journey
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Start New Journey
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold">Good Faith</h1>
          <p className="text-lg mt-2 text-gray-600">
            Test the consistency of your moral framework
          </p>
        </header>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {currentQuestion && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Stage {currentQuestion.stage}
                </h2>
                <span className="text-sm text-gray-500">
                  Question ID: {currentQuestion.id.substr(0, 8)}
                </span>
              </div>
              
              <div className="mb-4">
                <p className="text-lg mb-2">{currentQuestion.text}</p>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full h-32 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={showQuestionLoading || !answer.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {showQuestionLoading ? 'Submitting...' : 'Submit Answer'}
                </button>
                
                <button
                  onClick={handleViewAnalysis}
                  disabled={showQuestionLoading}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  View Analysis
                </button>
              </div>
            </div>
          )}
        </div>
        
        {showContradictionModal && activeContradiction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
              <h2 className="text-2xl font-bold mb-4">We Found a Contradiction</h2>
              
              <div className="mb-4">
                <p className="text-red-600 mb-2">
                  Your current answer seems to contradict a previous response:
                </p>
                <div className="bg-red-50 p-4 rounded-lg mb-4">
                  <p className="mb-2">
                    <strong>Question 1:</strong> {
                      currentQuestion?.text
                    }
                  </p>
                  <p className="mb-4">
                    <strong>Your answer:</strong> {activeContradiction.answers[0]}
                  </p>
                  
                  <p className="mb-2">
                    <strong>Question 2:</strong> {
                      (() => {
                        // Find the other question
                        const otherQuestionId = activeContradiction.questionIds.find(
                          id => id !== currentQuestion?.id
                        );
                        const otherQuestion = contradictions
                          .find(c => c.id === activeContradiction.id)
                          ?.questionIds
                          .includes(otherQuestionId || '');
                        
                        // Return the text of the other question
                        return otherQuestion ? otherQuestion : 'Previous question';
                      })()
                    }
                  </p>
                  <p>
                    <strong>Your answer:</strong> {activeContradiction.answers[1]}
                  </p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Explanation:</p>
                  <p>{activeContradiction.explanation}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="font-semibold mb-2">How would you like to resolve this contradiction?</p>
                <textarea
                  value={resolutionExplanation}
                  onChange={(e) => setResolutionExplanation(e.target.value)}
                  placeholder="Explain your reasoning..."
                  className="w-full h-24 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                
                <div className="mb-4">
                  <p className="mb-2">Which answer would you like to change?</p>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="overwriteQuestion"
                        value={currentQuestion?.id}
                        checked={overwrittenQuestionId === currentQuestion?.id}
                        onChange={() => setOverwrittenQuestionId(currentQuestion?.id || null)}
                        className="mr-2"
                      />
                      Current answer
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="overwriteQuestion"
                        value={activeContradiction.questionIds.find(id => id !== currentQuestion?.id)}
                        checked={overwrittenQuestionId === activeContradiction.questionIds.find(id => id !== currentQuestion?.id)}
                        onChange={() => setOverwrittenQuestionId(
                          activeContradiction.questionIds.find(id => id !== currentQuestion?.id) || null
                        )}
                        className="mr-2"
                      />
                      Previous answer
                    </label>
                  </div>
                </div>
                
                {overwrittenQuestionId === activeContradiction.questionIds.find(id => id !== currentQuestion?.id) && (
                  <div>
                    <p className="mb-2">New answer for the previous question:</p>
                    <textarea
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      placeholder="Enter your new answer..."
                      className="w-full h-24 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowContradictionModal(false);
                    getNextQuestion();
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Skip For Now
                </button>
                
                <button
                  onClick={handleResolveContradiction}
                  disabled={!resolutionExplanation.trim() || !overwrittenQuestionId}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Resolve Contradiction
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">About Good Faith</h2>
          <p className="mb-2">
            This application tests the consistency of your moral reasoning through a series of questions based on Lawrence Kohlberg&apos;s stages of moral development.
          </p>
          <p className="mb-2">
            As you answer questions, the system will identify any contradictions in your moral reasoning and give you the opportunity to resolve them.
          </p>
          <p>
            At the end, you&apos;ll receive an analysis of your moral framework, including your alignment with various ethical theories and the key principles that guide your thinking.
          </p>
        </div>
      </div>
    </div>
  );
}
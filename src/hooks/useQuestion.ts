// /hooks/useQuestions.ts
import { useState, useCallback } from 'react';
import { Question, Contradiction } from '@/lib/types';

export function useQuestions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  // Get next question for a user
  const getNextQuestion = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`/api/question?userId=${userId}`);
      
      if (!res.ok) {
        throw new Error('Failed to get next question');
      }
      
      const data = await res.json();
      setCurrentQuestion(data.question);
      return data.question;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Submit answer and check for contradictions
  const submitAnswer = useCallback(async (
    userId: string,
    questionId: string,
    answer: string
  ): Promise<{ contradictions: Contradiction[] } | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          questionId,
          answer
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to submit answer');
      }
      
      const data = await res.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Resolve a contradiction
  const resolveContradiction = useCallback(async (
    userId: string,
    contradictionId: string,
    explanation: string,
    overwrittenQuestionId: string,
    newAnswer?: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/resolution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          contradictionId,
          explanation,
          overwrittenQuestionId,
          newAnswer
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to resolve contradiction');
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    loading,
    error,
    currentQuestion,
    getNextQuestion,
    submitAnswer,
    resolveContradiction
  };
}
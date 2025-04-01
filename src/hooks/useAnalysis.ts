// /hooks/useAnalysis.ts
import { useState, useCallback } from 'react';

export interface AnalysisResult {
  userId: string;
  analysis: {
    frameworkAlignment: Record<string, number>;
    keyPrinciples: string[];
    consistencyScore: number;
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

export function useAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Get analysis for a user
  const getAnalysis = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`/api/analysis?userId=${userId}`);
      
      if (!res.ok) {
        throw new Error('Failed to get analysis');
      }
      
      const data = await res.json();
      setAnalysisResult(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Determine primary moral framework
  const getPrimaryFramework = useCallback(() => {
    if (!analysisResult || !analysisResult.analysis || !analysisResult.analysis.frameworkAlignment) {
      return null;
    }
    
    const frameworkEntries = Object.entries(analysisResult.analysis.frameworkAlignment);
    if (frameworkEntries.length === 0) {
      return null;
    }
    
    // Sort by alignment score (highest first)
    const sortedFrameworks = frameworkEntries.sort((a, b) => b[1] - a[1]);
    const topFrameworkId = sortedFrameworks[0][0];
    
    // Find the full framework details
    const frameworkDetails = analysisResult.frameworks.find(f => f.id === topFrameworkId);
    return {
      id: topFrameworkId,
      name: frameworkDetails?.name || topFrameworkId,
      score: sortedFrameworks[0][1],
      description: frameworkDetails?.description || '',
      principles: frameworkDetails?.principles || []
    };
  }, [analysisResult]);
  
  // Get Kohlberg stage information
  const getKohlbergStageInfo = useCallback((stageNumber: number) => {
    if (!analysisResult || !analysisResult.kohlbergStages) {
      return null;
    }
    
    return analysisResult.kohlbergStages.find(stage => stage.stage === stageNumber) || null;
  }, [analysisResult]);
  
  return {
    loading,
    error,
    analysisResult,
    getAnalysis,
    getPrimaryFramework,
    getKohlbergStageInfo
  };
}
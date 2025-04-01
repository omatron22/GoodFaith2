// /app/api/analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ragSystem } from '@/lib/rag';
import { analysisService } from '@/lib/core/analysis';
import { storageService } from '@/lib/core/storage';

export async function GET(req: NextRequest) {
  try {
    // Get user ID from query string
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }
    
    // Ensure RAG system is initialized
    await ragSystem.initialize();
    
    // Get user session
    const session = await storageService.getUserSession(userId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'User session not found' },
        { status: 404 }
      );
    }
    
    // Analyze moral framework
    const analysis = await analysisService.analyzeUserFramework(userId);
    
    // Generate feedback
    const feedback = await analysisService.generateFeedback(userId);
    
    // Get frameworks for context
    const frameworks = await storageService.loadFrameworks();
    const kohlbergStages = await storageService.loadKohlbergStages();
    
    return NextResponse.json({
      userId,
      analysis,
      feedback,
      statistics: {
        totalQuestions: session.answers.length,
        totalContradictions: session.contradictions.length,
        resolvedContradictions: session.contradictions.filter(c => c.resolved).length,
        highestStage: Math.max(...session.completedStages, session.currentStage)
      },
      frameworks,
      kohlbergStages
    });
  } catch (error) {
    console.error('Error getting analysis:', error);
    return NextResponse.json(
      { error: 'Failed to get analysis' },
      { status: 500 }
    );
  }
}
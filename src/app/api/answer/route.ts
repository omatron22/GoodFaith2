// /app/api/answer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ragSystem } from '@/lib/rag';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { userId, questionId, answer } = body;
    
    if (!userId || !questionId || !answer) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, questionId, answer' },
        { status: 400 }
      );
    }
    
    // Ensure RAG system is initialized
    await ragSystem.initialize();
    
    // Submit answer and check for contradictions
    const result = await ragSystem.submitAnswer(userId, questionId, answer);
    
    return NextResponse.json({
      question: result.question,
      contradictions: result.contradictions
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
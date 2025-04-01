// /app/api/resolution/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ragSystem } from '@/lib/rag';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { 
      userId, 
      contradictionId, 
      explanation, 
      overwrittenQuestionId,
      newAnswer
    } = body;
    
    if (!userId || !contradictionId || !explanation || !overwrittenQuestionId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, contradictionId, explanation, overwrittenQuestionId' },
        { status: 400 }
      );
    }
    
    // Ensure RAG system is initialized
    await ragSystem.initialize();
    
    // Resolve contradiction
    const resolvedContradiction = await ragSystem.resolveContradiction(
      userId,
      contradictionId,
      explanation,
      overwrittenQuestionId,
      newAnswer
    );
    
    return NextResponse.json({
      contradiction: resolvedContradiction
    });
  } catch (error) {
    console.error('Error resolving contradiction:', error);
    return NextResponse.json(
      { error: 'Failed to resolve contradiction' },
      { status: 500 }
    );
  }
}
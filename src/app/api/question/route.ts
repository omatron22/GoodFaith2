// /app/api/question/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ragSystem } from '@/lib/graph';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    // Get user ID from query string or generate a new one
    const url = new URL(req.url);
    let userId = url.searchParams.get('userId');
    
    if (!userId) {
      userId = uuidv4();
    }
    
    // Ensure RAG system is initialized
    await ragSystem.initialize();
    
    // Get next question for user
    const question = await ragSystem.getNextQuestion(userId);
    
    return NextResponse.json({
      userId,
      question
    });
  } catch (error) {
    console.error('Error getting question:', error);
    return NextResponse.json(
      { error: 'Failed to get question' },
      { status: 500 }
    );
  }
}
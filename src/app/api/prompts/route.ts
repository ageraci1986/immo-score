import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getAuthUser } from '@/lib/supabase/auth';

/**
 * GET /api/prompts
 * Retrieves all AI prompts (requires authentication)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prompts = await prisma.aiPrompt.findMany({
      orderBy: { slug: 'asc' },
    });

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Failed to fetch prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

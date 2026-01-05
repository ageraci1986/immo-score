import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { initializeLatitudePrompts, listLatitudePrompts } from '@/lib/ai/latitude-setup';

/**
 * POST /api/latitude/setup
 * Initialize Latitude prompts (admin only)
 */
export async function POST(): Promise<NextResponse> {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initializeLatitudePrompts();

    return NextResponse.json({
      success: true,
      message: 'Latitude prompts initialized successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to initialize Latitude prompts', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/latitude/setup
 * List all Latitude prompts
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prompts = await listLatitudePrompts();

    return NextResponse.json({
      success: true,
      prompts,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to list Latitude prompts', details: errorMessage },
      { status: 500 }
    );
  }
}

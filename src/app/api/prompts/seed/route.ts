import { NextResponse } from 'next/server';
import { seedDefaultPrompts } from '@/lib/ai/prompt-service';
import { getAuthUser } from '@/lib/supabase/auth';

/**
 * POST /api/prompts/seed
 * Seeds the default prompts into the database
 */
export async function POST(): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await seedDefaultPrompts();

    return NextResponse.json({
      message: 'Default prompts seeded successfully',
    });
  } catch (error) {
    console.error('Failed to seed prompts:', error);
    return NextResponse.json(
      { error: 'Failed to seed prompts' },
      { status: 500 }
    );
  }
}

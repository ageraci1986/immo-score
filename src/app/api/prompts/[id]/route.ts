import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getAuthUser } from '@/lib/supabase/auth';
import { z } from 'zod';

const updatePromptSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  content: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  maxTokens: z.number().int().min(256).max(32768).optional(),
  temperature: z.number().min(0).max(2).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/prompts/[id]
 * Retrieves a single prompt by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prompt = await prisma.aiPrompt.findUnique({
      where: { id: params.id },
    });

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Failed to fetch prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/prompts/[id]
 * Updates a prompt
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updatePromptSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const existing = await prisma.aiPrompt.findUnique({
      where: { id: params.id },
      select: { version: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    const prompt = await prisma.aiPrompt.update({
      where: { id: params.id },
      data: {
        ...validation.data,
        version: existing.version + 1,
      },
    });

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Failed to update prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

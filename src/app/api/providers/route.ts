import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getAuthUser } from '@/lib/supabase/auth';
import { z } from 'zod';

const createProviderSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'google']),
  name: z.string().min(1),
  apiKey: z.string().min(1),
});

/**
 * GET /api/providers
 * List all AI providers (masks API keys)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providers = await prisma.aiProvider.findMany({
      orderBy: { provider: 'asc' },
    });

    // Mask API keys - only show last 4 chars
    const masked = providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? `${'•'.repeat(20)}${p.apiKey.slice(-4)}` : '',
    }));

    return NextResponse.json({ providers: masked });
  } catch (error) {
    console.error('Failed to fetch providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/providers
 * Create or update an AI provider
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createProviderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { provider, name, apiKey } = validation.data;

    const result = await prisma.aiProvider.upsert({
      where: { provider },
      update: { apiKey, name, isActive: true },
      create: { provider, name, apiKey, isActive: true },
    });

    return NextResponse.json({
      provider: {
        ...result,
        apiKey: `${'•'.repeat(20)}${result.apiKey.slice(-4)}`,
      },
    });
  } catch (error) {
    console.error('Failed to save provider:', error);
    return NextResponse.json(
      { error: 'Failed to save provider' },
      { status: 500 }
    );
  }
}

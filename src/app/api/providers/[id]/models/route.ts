import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getAuthUser } from '@/lib/supabase/auth';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

/**
 * GET /api/providers/[id]/models
 * Fetches available models dynamically from the provider's API
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

    const providerRecord = await prisma.aiProvider.findUnique({
      where: { id: params.id },
      select: { provider: true, apiKey: true, isActive: true },
    });

    if (!providerRecord || !providerRecord.isActive || !providerRecord.apiKey) {
      return NextResponse.json(
        { error: 'Provider not found or inactive' },
        { status: 404 }
      );
    }

    let models: ModelInfo[] = [];

    switch (providerRecord.provider) {
      case 'anthropic':
        models = await fetchAnthropicModels(providerRecord.apiKey);
        break;
      case 'openai':
        models = await fetchOpenAIModels(providerRecord.apiKey);
        break;
      case 'google':
        models = await fetchGoogleModels(providerRecord.apiKey);
        break;
      default:
        return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
    }

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models from provider' },
      { status: 500 }
    );
  }
}

/**
 * Fetch available models from Anthropic API
 */
async function fetchAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const models: ModelInfo[] = (data.data ?? [])
    .filter((m: { id: string }) => !m.id.includes('legacy'))
    .map((m: { id: string; display_name?: string }) => ({
      id: m.id,
      name: m.display_name ?? formatModelName(m.id),
      provider: 'anthropic',
    }))
    .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));

  return models;
}

/**
 * Fetch available models from OpenAI API
 */
async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const models: ModelInfo[] = (data.data ?? [])
    .filter((m: { id: string; owned_by: string }) =>
      m.id.startsWith('gpt-') || m.id.startsWith('o1') || m.id.startsWith('o3') || m.id.startsWith('o4')
    )
    .map((m: { id: string }) => ({
      id: m.id,
      name: formatModelName(m.id),
      provider: 'openai',
    }))
    .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));

  return models;
}

/**
 * Fetch available models from Google Gemini API
 */
async function fetchGoogleModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${response.status}`);
  }

  const data = await response.json();
  const models: ModelInfo[] = (data.models ?? [])
    .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
      m.supportedGenerationMethods?.includes('generateContent')
    )
    .map((m: { name: string; displayName?: string }) => ({
      id: m.name.replace('models/', ''),
      name: m.displayName ?? formatModelName(m.name),
      provider: 'google',
    }))
    .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));

  return models;
}

/**
 * Formats a model ID into a human-readable name
 */
function formatModelName(id: string): string {
  return id
    .replace('models/', '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

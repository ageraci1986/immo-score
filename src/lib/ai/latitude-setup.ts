import { Latitude } from '@latitude-data/sdk';
import { env } from '@/config/env';
import { logInfo, logError } from '@/lib/logger';
import { PROMPT_PATHS } from './latitude-client';

/**
 * Vision Analysis Prompt Content (Simplified for testing)
 * This prompt analyzes property photos for facade and roof measurements
 */
const VISION_ANALYSIS_PROMPT = `---
provider: anthropic
model: claude-sonnet-4-20250514
---

Analyse les photos de ce bien immobilier.

Nombre d'images: {{imageCount}}

Images en base64 (séparées par |||):
{{images}}

Détermine:
1. Le nombre de façades visibles
2. La surface estimée des façades (en m²)
3. Le nombre de pans de toiture
4. La surface estimée de la toiture (en m²)

Retourne UNIQUEMENT un JSON valide:
{
  "facadeCount": 2,
  "facadeSurface": 120,
  "roofPanelCount": 2,
  "roofSurface": 85
}`;

/**
 * Narrative Generation Prompt Content (Simplified for testing)
 * This prompt identifies strengths and weaknesses from property description
 */
const NARRATIVE_GENERATION_PROMPT = `---
provider: anthropic
model: claude-sonnet-4-20250514
---

Analyse cette description de bien immobilier et identifie les forces et faiblesses.

Description du bien:
{{description}}

Retourne UNIQUEMENT un JSON valide:
{
  "strengths": ["force 1", "force 2", "force 3"],
  "weaknesses": ["faiblesse 1", "faiblesse 2", "faiblesse 3"]
}`;

/**
 * Initialize Latitude prompts
 * This function creates the prompts in Latitude if they don't exist
 */
export async function initializeLatitudePrompts(): Promise<void> {
  const latitude = new Latitude(env.LATITUDE_API_KEY, {
    projectId: env.LATITUDE_PROJECT_ID,
  });

  logInfo('Initializing Latitude prompts...');

  try {
    // Create or get Vision Analysis prompt
    logInfo('Creating/getting vision analysis prompt', {
      path: PROMPT_PATHS.VISION_ANALYSIS,
    });

    await latitude.prompts.getOrCreate(PROMPT_PATHS.VISION_ANALYSIS, {
      prompt: VISION_ANALYSIS_PROMPT,
    });

    logInfo('Vision analysis prompt ready', {
      path: PROMPT_PATHS.VISION_ANALYSIS,
    });

    // Create or get Narrative Generation prompt
    logInfo('Creating/getting narrative generation prompt', {
      path: PROMPT_PATHS.NARRATIVE_GENERATION,
    });

    await latitude.prompts.getOrCreate(PROMPT_PATHS.NARRATIVE_GENERATION, {
      prompt: NARRATIVE_GENERATION_PROMPT,
    });

    logInfo('Narrative generation prompt ready', {
      path: PROMPT_PATHS.NARRATIVE_GENERATION,
    });

    logInfo('All Latitude prompts initialized successfully');
  } catch (error) {
    logError('Failed to initialize Latitude prompts', error as Error);
    throw error;
  }
}

/**
 * List all prompts in the Latitude project
 */
export async function listLatitudePrompts(): Promise<unknown[]> {
  const latitude = new Latitude(env.LATITUDE_API_KEY, {
    projectId: env.LATITUDE_PROJECT_ID,
  });

  try {
    const prompts = await latitude.prompts.getAll();
    logInfo('Listed Latitude prompts', { count: prompts.length });
    return prompts;
  } catch (error) {
    logError('Failed to list Latitude prompts', error as Error);
    throw error;
  }
}

// Export prompt contents for reference
export const PROMPT_CONTENTS = {
  VISION_ANALYSIS: VISION_ANALYSIS_PROMPT,
  NARRATIVE_GENERATION: NARRATIVE_GENERATION_PROMPT,
} as const;

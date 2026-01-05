import { Latitude } from '@latitude-data/sdk';
import { env } from '@/config/env';
import { logDebug, logError } from '@/lib/logger';
import { AIAnalysisError } from '@/lib/errors';

/**
 * Latitude client instance for prompt management
 * @see https://docs.latitude.so/guides/sdk/typescript
 */
const latitude = new Latitude(env.LATITUDE_API_KEY, {
  projectId: env.LATITUDE_PROJECT_ID,
});

/**
 * Prompt paths in Latitude
 * These paths must match the prompts created in your Latitude project
 */
export const PROMPT_PATHS = {
  VISION_ANALYSIS: 'immo-score/vision-analysis',
  NARRATIVE_GENERATION: 'immo-score/narrative-generation',
  COST_ESTIMATION: 'immo-score/cost-estimation',
} as const;

export type PromptPath = (typeof PROMPT_PATHS)[keyof typeof PROMPT_PATHS];

/**
 * Vision analysis parameters for the prompt
 */
interface VisionAnalysisParams {
  readonly surface?: number;
  readonly description?: string;
  readonly location?: string;
  readonly price?: number;
  readonly imageUrls: readonly string[];
}

/**
 * Narrative generation parameters for the prompt
 */
interface NarrativeGenerationParams {
  readonly location?: string;
  readonly price?: number;
  readonly surface?: number;
  readonly peb?: string;
  readonly description?: string;
  readonly roofCondition: string;
  readonly roofSurface: number;
  readonly roofMaterial: string;
  readonly roofWorkNeeded: string;
  readonly facadeCondition: string;
  readonly facadeCount: number;
  readonly facadeSurface: number;
  readonly facadeMaterials: string;
  readonly interiorCondition?: string;
  readonly interiorWorkEstimate?: string;
  readonly totalInvestment: number;
  readonly workCost: number;
  readonly grossYield: number;
  readonly netYield: number;
  readonly cashFlow: number;
  readonly totalScore: number;
  readonly locationScore: number;
  readonly conditionScore: number;
  readonly rentabilityScore: number;
}

/**
 * Cost estimation parameters for the prompt
 */
interface CostEstimationParams {
  readonly location?: string;
  readonly propertyType?: string;
  readonly surface?: number;
  readonly bedrooms?: number;
  readonly constructionYear?: number;
  readonly peb?: string;
  readonly price?: number;
  readonly roofCondition: string;
  readonly roofSurface: number;
  readonly roofMaterial: string;
  readonly roofWorkNeeded: string;
  readonly facadeCondition: string;
  readonly facadeCount: number;
  readonly facadeSurface: number;
  readonly facadeMaterials: string;
  readonly facadeWorkNeeded: string;
  readonly interiorCondition?: string;
  readonly interiorWorkEstimate?: string;
}

/**
 * Runs a prompt from Latitude with the given parameters
 *
 * @param promptPath - The path to the prompt in Latitude
 * @param parameters - The parameters to pass to the prompt
 * @returns The response text from the prompt
 * @throws {AIAnalysisError} When the prompt execution fails
 */
export async function runPrompt<T extends Record<string, unknown>>(
  promptPath: PromptPath,
  parameters: T
): Promise<string> {
  logDebug('Running Latitude prompt', { promptPath, parameterKeys: Object.keys(parameters) });

  // Use streaming to avoid timeout issues
  return new Promise((resolve, reject) => {
    latitude.prompts
      .run(promptPath, {
        parameters: parameters as Record<string, unknown>,
        stream: true,
        onFinished: (result) => {
          if (!result.response?.text) {
            reject(
              new AIAnalysisError('Empty response from Latitude prompt', {
                promptPath,
              })
            );
            return;
          }
          logDebug('Latitude prompt completed', {
            promptPath,
            responseLength: result.response.text.length,
          });
          resolve(result.response.text);
        },
        onError: (error) => {
          logError('Latitude prompt execution failed', error as Error, { promptPath });
          reject(
            new AIAnalysisError(`Failed to run Latitude prompt: ${promptPath}`, {
              cause: error,
              promptPath,
            })
          );
        },
      })
      .catch((error) => {
        logError('Latitude prompt execution failed', error as Error, { promptPath });
        reject(
          new AIAnalysisError(`Failed to run Latitude prompt: ${promptPath}`, {
            cause: error,
            promptPath,
          })
        );
      });
  });
}

/**
 * Runs a prompt with streaming support
 *
 * @param promptPath - The path to the prompt in Latitude
 * @param parameters - The parameters to pass to the prompt
 * @param onEvent - Callback for each stream event
 * @returns The final response text
 */
export async function runPromptStreaming<T extends Record<string, unknown>>(
  promptPath: PromptPath,
  parameters: T,
  onEvent?: (event: { event: string; data: unknown }) => void
): Promise<string> {
  logDebug('Running Latitude prompt with streaming', { promptPath });

  return new Promise((resolve, reject) => {
    latitude.prompts
      .run(promptPath, {
        parameters: parameters as Record<string, unknown>,
        stream: true,
        onEvent: (event) => {
          onEvent?.(event);
        },
        onFinished: (result) => {
          if (!result.response?.text) {
            reject(
              new AIAnalysisError('Empty response from Latitude streaming prompt', {
                promptPath,
              })
            );
            return;
          }
          logDebug('Latitude streaming prompt completed', { promptPath });
          resolve(result.response.text);
        },
        onError: (error) => {
          logError('Latitude streaming prompt failed', error as Error, { promptPath });
          reject(
            new AIAnalysisError(`Streaming prompt failed: ${promptPath}`, {
              cause: error,
              promptPath,
            })
          );
        },
      })
      .catch(reject);
  });
}

/**
 * Runs the vision analysis prompt
 *
 * @param params - Vision analysis parameters including public image URLs
 * @returns The raw response text (JSON string)
 */
export async function runVisionAnalysis(params: VisionAnalysisParams): Promise<string> {
  return runPrompt(PROMPT_PATHS.VISION_ANALYSIS, {
    surface: params.surface ?? '',
    description: params.description ?? '',
    location: params.location ?? '',
    price: params.price ?? '',
    imageUrls: params.imageUrls.join('\n'), // One URL per line for the prompt
    imageCount: params.imageUrls.length,
  });
}

/**
 * Runs the narrative generation prompt
 *
 * @param params - Narrative generation parameters
 * @returns The raw response text (JSON string)
 */
export async function runNarrativeGeneration(params: NarrativeGenerationParams): Promise<string> {
  return runPrompt(PROMPT_PATHS.NARRATIVE_GENERATION, {
    location: params.location ?? '',
    price: params.price ?? 0,
    surface: params.surface ?? 0,
    peb: params.peb ?? '',
    description: params.description ?? '',
    roofCondition: params.roofCondition,
    roofSurface: params.roofSurface,
    roofMaterial: params.roofMaterial,
    roofWorkNeeded: params.roofWorkNeeded,
    facadeCondition: params.facadeCondition,
    facadeCount: params.facadeCount,
    facadeSurface: params.facadeSurface,
    facadeMaterials: params.facadeMaterials,
    interiorCondition: params.interiorCondition ?? '',
    interiorWorkEstimate: params.interiorWorkEstimate ?? '',
    totalInvestment: params.totalInvestment,
    workCost: params.workCost,
    grossYield: params.grossYield,
    netYield: params.netYield,
    cashFlow: params.cashFlow,
    totalScore: params.totalScore,
    locationScore: params.locationScore,
    conditionScore: params.conditionScore,
    rentabilityScore: params.rentabilityScore,
  });
}

/**
 * Runs the cost estimation prompt
 *
 * @param params - Cost estimation parameters including property and vision analysis data
 * @returns The raw response text (JSON string)
 */
export async function runCostEstimation(params: CostEstimationParams): Promise<string> {
  return runPrompt(PROMPT_PATHS.COST_ESTIMATION, {
    location: params.location ?? '',
    propertyType: params.propertyType ?? '',
    surface: params.surface ?? 0,
    bedrooms: params.bedrooms ?? 0,
    constructionYear: params.constructionYear ?? '',
    peb: params.peb ?? '',
    price: params.price ?? 0,
    roofCondition: params.roofCondition,
    roofSurface: params.roofSurface,
    roofMaterial: params.roofMaterial,
    roofWorkNeeded: params.roofWorkNeeded,
    facadeCondition: params.facadeCondition,
    facadeCount: params.facadeCount,
    facadeSurface: params.facadeSurface,
    facadeMaterials: params.facadeMaterials,
    facadeWorkNeeded: params.facadeWorkNeeded,
    interiorCondition: params.interiorCondition ?? '',
    interiorWorkEstimate: params.interiorWorkEstimate ?? '',
  });
}

/**
 * Gets a prompt definition from Latitude (useful for debugging)
 *
 * @param promptPath - The path to the prompt
 * @returns The prompt definition
 */
export async function getPrompt(promptPath: PromptPath): Promise<unknown> {
  try {
    return await latitude.prompts.get(promptPath);
  } catch (error) {
    logError('Failed to get prompt from Latitude', error as Error, { promptPath });
    throw new AIAnalysisError(`Failed to get prompt: ${promptPath}`, {
      cause: error,
      promptPath,
    });
  }
}

/**
 * Lists all available prompts in the project
 *
 * @returns Array of prompt definitions
 */
export async function listPrompts(): Promise<unknown[]> {
  try {
    const prompts = await latitude.prompts.getAll();
    return prompts;
  } catch (error) {
    logError('Failed to list prompts from Latitude', error as Error);
    throw new AIAnalysisError('Failed to list prompts', { cause: error });
  }
}

export { latitude };

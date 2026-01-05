import { AIAnalysisError } from '@/lib/errors';
import { logDebug, logError, logInfo } from '@/lib/logger';
import type { VisionAnalysis, PropertyScore, AICostEstimation } from '@/types';
import {
  runNarrativeGeneration as runLatitudeNarrativeGeneration,
  runCostEstimation as runLatitudeCostEstimation,
  runVisionAnalysis as runLatitudeVisionAnalysis,
  PROMPT_PATHS,
} from './latitude-client';

interface PropertyContext {
  readonly surface?: number;
  readonly description?: string;
  readonly location?: string;
  readonly price?: number;
}

/**
 * Analyzes property photos using Latitude.so with GPT-4o-mini
 * Uses public image URLs passed to the prompt
 *
 * @param imageUrls - Array of public image URLs to analyze
 * @param context - Additional property information for context
 * @returns Structured vision analysis with roof, facade, and interior estimates
 * @throws {AIAnalysisError} When analysis fails
 */
export async function analyzePropertyPhotos(
  imageUrls: readonly string[],
  context: PropertyContext
): Promise<VisionAnalysis> {
  if (imageUrls.length === 0) {
    throw new AIAnalysisError('No images provided for analysis');
  }

  logInfo('Starting property photo analysis via Latitude', {
    promptPath: PROMPT_PATHS.VISION_ANALYSIS,
    imageCount: imageUrls.length,
    imageUrls: imageUrls.slice(0, 3),
    context,
  });

  try {
    const responseText = await runLatitudeVisionAnalysis({
      surface: context.surface,
      description: context.description,
      location: context.location,
      price: context.price,
      imageUrls: imageUrls.slice(0, 5), // Limit to 5 images
    });

    const analysis = parseVisionAnalysis(responseText);

    logDebug('Property photo analysis completed via Latitude', {
      roofCondition: analysis.roofEstimate.condition,
      facadeCondition: analysis.facadeEstimate.condition,
    });

    return analysis;
  } catch (error) {
    logError('Property photo analysis failed', error as Error, { context });

    throw new AIAnalysisError('Failed to analyze property photos via Latitude', {
      cause: error,
      context,
    });
  }
}

/**
 * Generates narrative analysis and scoring for a property using Latitude.so
 *
 * @param propertyData - Complete property information
 * @param visionAnalysis - Results from vision analysis
 * @param rentabilityData - Calculated rentability metrics
 * @param scores - Calculated scores breakdown
 * @returns Property score with narrative, pros, cons, and insights
 * @throws {AIAnalysisError} When generation fails
 */
export async function generatePropertyNarrative(
  propertyData: {
    readonly location?: string;
    readonly price?: number;
    readonly surface?: number;
    readonly peb?: string;
    readonly description?: string;
  },
  visionAnalysis: VisionAnalysis,
  rentabilityData: {
    readonly totalInvestment: number;
    readonly workCost: number;
    readonly grossYield: number;
    readonly netYield: number;
    readonly cashFlow: number;
  },
  scores: {
    readonly totalScore: number;
    readonly locationScore: number;
    readonly conditionScore: number;
    readonly rentabilityScore: number;
  }
): Promise<Omit<PropertyScore, 'totalScore' | 'breakdown' | 'recommendation'>> {
  logInfo('Generating property narrative via Latitude', {
    promptPath: PROMPT_PATHS.NARRATIVE_GENERATION,
    propertyData,
    scores,
  });

  try {
    const responseText = await runLatitudeNarrativeGeneration({
      location: propertyData.location,
      price: propertyData.price,
      surface: propertyData.surface,
      peb: propertyData.peb,
      description: propertyData.description,
      roofCondition: visionAnalysis.roofEstimate.condition,
      roofSurface: visionAnalysis.roofEstimate.estimatedSurface,
      roofMaterial: visionAnalysis.roofEstimate.material,
      roofWorkNeeded: visionAnalysis.roofEstimate.workNeeded.join(', '),
      facadeCondition: visionAnalysis.facadeEstimate.condition,
      facadeCount: visionAnalysis.facadeEstimate.count,
      facadeSurface: visionAnalysis.facadeEstimate.totalSurface,
      facadeMaterials: visionAnalysis.facadeEstimate.materials.join(', '),
      interiorCondition: visionAnalysis.interiorCondition?.overall,
      interiorWorkEstimate: visionAnalysis.interiorCondition?.workEstimate,
      totalInvestment: rentabilityData.totalInvestment,
      workCost: rentabilityData.workCost,
      grossYield: rentabilityData.grossYield,
      netYield: rentabilityData.netYield,
      cashFlow: rentabilityData.cashFlow,
      totalScore: scores.totalScore,
      locationScore: scores.locationScore,
      conditionScore: scores.conditionScore,
      rentabilityScore: scores.rentabilityScore,
    });

    const narrative = parseNarrativeResponse(responseText);

    logDebug('Property narrative generated successfully via Latitude');

    return narrative;
  } catch (error) {
    logError('Property narrative generation failed', error as Error);

    throw new AIAnalysisError('Failed to generate property narrative via Latitude', {
      cause: error,
    });
  }
}

/**
 * Parses vision analysis response from Latitude
 */
function parseVisionAnalysis(text: string): VisionAnalysis {
  const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleanedText);

    // Validate required fields
    if (!parsed.roofEstimate || !parsed.facadeEstimate) {
      throw new Error('Missing required fields in vision analysis');
    }

    return parsed as VisionAnalysis;
  } catch (error) {
    throw new AIAnalysisError('Failed to parse vision analysis response', {
      cause: error,
      rawText: cleanedText,
    });
  }
}

/**
 * Parses narrative response from Latitude
 */
function parseNarrativeResponse(
  text: string
): Omit<PropertyScore, 'totalScore' | 'breakdown' | 'recommendation'> {
  const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleanedText);

    if (!parsed.narrative || !parsed.pros || !parsed.cons || !parsed.keyInsights) {
      throw new Error('Missing required fields in narrative response');
    }

    return {
      narrative: parsed.narrative,
      pros: parsed.pros,
      cons: parsed.cons,
      keyInsights: parsed.keyInsights,
    };
  } catch (error) {
    throw new AIAnalysisError('Failed to parse narrative response', {
      cause: error,
      rawText: cleanedText,
    });
  }
}

/**
 * Property data for cost estimation
 */
interface CostEstimationPropertyData {
  readonly location?: string;
  readonly propertyType?: string;
  readonly surface?: number;
  readonly bedrooms?: number;
  readonly constructionYear?: number;
  readonly peb?: string;
  readonly price?: number;
}

/**
 * Estimates costs for a property using AI analysis via Latitude.so
 *
 * @param propertyData - Basic property information
 * @param visionAnalysis - Results from vision analysis (roof, facade, interior)
 * @returns AI cost estimation including work costs, insurance, and rent estimates
 * @throws {AIAnalysisError} When estimation fails
 */
export async function estimatePropertyCosts(
  propertyData: CostEstimationPropertyData,
  visionAnalysis: VisionAnalysis
): Promise<AICostEstimation> {
  logInfo('Estimating property costs via Latitude', {
    promptPath: PROMPT_PATHS.COST_ESTIMATION,
    propertyData,
  });

  try {
    const responseText = await runLatitudeCostEstimation({
      location: propertyData.location,
      propertyType: propertyData.propertyType,
      surface: propertyData.surface,
      bedrooms: propertyData.bedrooms,
      constructionYear: propertyData.constructionYear,
      peb: propertyData.peb,
      price: propertyData.price,
      roofCondition: visionAnalysis.roofEstimate.condition,
      roofSurface: visionAnalysis.roofEstimate.estimatedSurface,
      roofMaterial: visionAnalysis.roofEstimate.material,
      roofWorkNeeded: visionAnalysis.roofEstimate.workNeeded.join(', '),
      facadeCondition: visionAnalysis.facadeEstimate.condition,
      facadeCount: visionAnalysis.facadeEstimate.count,
      facadeSurface: visionAnalysis.facadeEstimate.totalSurface,
      facadeMaterials: visionAnalysis.facadeEstimate.materials.join(', '),
      facadeWorkNeeded: visionAnalysis.facadeEstimate.workNeeded?.join(', ') ?? '',
      interiorCondition: visionAnalysis.interiorCondition?.overall,
      interiorWorkEstimate: visionAnalysis.interiorCondition?.workEstimate,
    });

    const estimation = parseCostEstimationResponse(responseText);

    logDebug('Property cost estimation completed via Latitude', {
      estimatedWorkCost: estimation.estimatedWorkCost,
      estimatedInsurance: estimation.estimatedInsurance,
      estimatedMonthlyRent: estimation.estimatedMonthlyRent,
      confidence: estimation.confidence,
    });

    return estimation;
  } catch (error) {
    logError('Property cost estimation failed', error as Error, { propertyData });

    throw new AIAnalysisError('Failed to estimate property costs via Latitude', {
      cause: error,
      propertyData,
    });
  }
}

/**
 * Parses cost estimation response from Latitude
 */
function parseCostEstimationResponse(text: string): AICostEstimation {
  const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleanedText);

    // Validate required fields
    if (
      typeof parsed.estimatedWorkCost !== 'number' ||
      typeof parsed.estimatedInsurance !== 'number' ||
      typeof parsed.estimatedMonthlyRent !== 'number'
    ) {
      throw new Error('Missing required numeric fields in cost estimation');
    }

    return {
      estimatedWorkCost: parsed.estimatedWorkCost,
      workBreakdown: parsed.workBreakdown ?? {},
      estimatedInsurance: parsed.estimatedInsurance,
      estimatedMonthlyRent: parsed.estimatedMonthlyRent,
      rentPerRoom: parsed.rentPerRoom ?? 350,
      confidence: parsed.confidence ?? 0.5,
      reasoning: parsed.reasoning ?? '',
    };
  } catch (error) {
    throw new AIAnalysisError('Failed to parse cost estimation response', {
      cause: error,
      rawText: cleanedText,
    });
  }
}

import { AIAnalysisError } from '@/lib/errors';
import { logDebug, logError, logInfo } from '@/lib/logger';
import type { VisionAnalysis, PropertyScore, AICostEstimation } from '@/types';
import { runPrompt, PROMPT_SLUGS } from './prompt-service';

interface PropertyContext {
  readonly surface?: number;
  readonly description?: string;
  readonly location?: string;
  readonly price?: number;
}

/**
 * Analyzes property photos using AI via database-managed prompts
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

  logInfo('Starting property photo analysis', {
    imageCount: imageUrls.length,
    imageUrls: imageUrls.slice(0, 3),
    context,
  });

  try {
    const responseText = await runPrompt(PROMPT_SLUGS.VISION_ANALYSIS, {
      surface: context.surface ?? '',
      description: context.description ?? '',
      location: context.location ?? '',
      price: context.price ?? '',
      imageUrls: imageUrls.slice(0, 5).join('\n'),
      imageCount: imageUrls.length,
    });

    const analysis = parseVisionAnalysis(responseText);

    logDebug('Property photo analysis completed', {
      roofCondition: analysis.roofEstimate.condition,
      facadeCondition: analysis.facadeEstimate.condition,
    });

    return analysis;
  } catch (error) {
    logError('Property photo analysis failed', error as Error, { context });

    throw new AIAnalysisError('Failed to analyze property photos', {
      cause: error,
      context,
    });
  }
}

/**
 * Generates narrative analysis and scoring for a property
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
  logInfo('Generating property narrative', { propertyData, scores });

  try {
    const responseText = await runPrompt(PROMPT_SLUGS.NARRATIVE_GENERATION, {
      location: propertyData.location ?? '',
      price: propertyData.price ?? 0,
      surface: propertyData.surface ?? 0,
      peb: propertyData.peb ?? '',
      description: propertyData.description ?? '',
      roofCondition: visionAnalysis.roofEstimate.condition,
      roofSurface: visionAnalysis.roofEstimate.estimatedSurface,
      roofMaterial: visionAnalysis.roofEstimate.material,
      roofWorkNeeded: visionAnalysis.roofEstimate.workNeeded.join(', '),
      facadeCondition: visionAnalysis.facadeEstimate.condition,
      facadeCount: visionAnalysis.facadeEstimate.count,
      facadeSurface: visionAnalysis.facadeEstimate.totalSurface,
      facadeMaterials: visionAnalysis.facadeEstimate.materials.join(', '),
      interiorCondition: visionAnalysis.interiorCondition?.overall ?? '',
      interiorWorkEstimate: visionAnalysis.interiorCondition?.workEstimate ?? '',
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

    logDebug('Property narrative generated successfully');

    return narrative;
  } catch (error) {
    logError('Property narrative generation failed', error as Error);

    throw new AIAnalysisError('Failed to generate property narrative', {
      cause: error,
    });
  }
}

/**
 * Parses vision analysis response
 */
function parseVisionAnalysis(text: string): VisionAnalysis {
  const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleanedText);

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
 * Parses narrative response
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
 * Generates a short AI summary for email alerts
 */
export async function generateEmailSummary(
  propertyData: {
    readonly title?: string;
    readonly location?: string;
    readonly price?: number;
    readonly surface?: number;
    readonly bedrooms?: number;
    readonly peb?: string;
    readonly aiScore?: number;
    readonly aiAnalysis?: {
      readonly pros?: string[];
      readonly cons?: string[];
    };
    readonly rentabilityData?: {
      readonly netYield?: number;
      readonly monthlyCashFlow?: number;
    };
    readonly aiEstimations?: {
      readonly estimatedWorkCost?: number;
    };
  }
): Promise<string> {
  try {
    const summary = await runPrompt(PROMPT_SLUGS.EMAIL_SUMMARY, {
      title: propertyData.title ?? 'Bien immobilier',
      location: propertyData.location ?? 'Non spécifié',
      price: propertyData.price ?? 0,
      surface: propertyData.surface ?? 0,
      bedrooms: propertyData.bedrooms ?? 0,
      score: propertyData.aiScore ? Math.round(propertyData.aiScore) : 0,
      peb: propertyData.peb ?? 'Non disponible',
      pros: propertyData.aiAnalysis?.pros?.join(', ') ?? 'Non disponible',
      cons: propertyData.aiAnalysis?.cons?.join(', ') ?? 'Non disponible',
      netYield: propertyData.rentabilityData?.netYield ?? 0,
      cashFlow: propertyData.rentabilityData?.monthlyCashFlow ?? 0,
      workCost: propertyData.aiEstimations?.estimatedWorkCost ?? 0,
    });

    return summary.trim();
  } catch (error) {
    logError('Email summary generation failed', error as Error);
    return '';
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
  readonly investmentType?: string;
  readonly rentPerUnit?: number;
  readonly potentialExtraRooms?: number;
}

/**
 * Estimates costs for a property using AI analysis
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
  logInfo('Estimating property costs', { propertyData });

  try {
    const responseText = await runPrompt(PROMPT_SLUGS.COST_ESTIMATION, {
      location: propertyData.location ?? '',
      propertyType: propertyData.propertyType ?? '',
      surface: propertyData.surface ?? 0,
      bedrooms: propertyData.bedrooms ?? 0,
      constructionYear: propertyData.constructionYear ?? '',
      peb: propertyData.peb ?? '',
      price: propertyData.price ?? 0,
      roofCondition: visionAnalysis.roofEstimate.condition,
      roofSurface: visionAnalysis.roofEstimate.estimatedSurface,
      roofMaterial: visionAnalysis.roofEstimate.material,
      roofWorkNeeded: visionAnalysis.roofEstimate.workNeeded.join(', '),
      facadeCondition: visionAnalysis.facadeEstimate.condition,
      facadeCount: visionAnalysis.facadeEstimate.count,
      facadeSurface: visionAnalysis.facadeEstimate.totalSurface,
      facadeMaterials: visionAnalysis.facadeEstimate.materials.join(', '),
      facadeWorkNeeded: visionAnalysis.facadeEstimate.workNeeded?.join(', ') ?? '',
      interiorCondition: visionAnalysis.interiorCondition?.overall ?? '',
      interiorWorkEstimate: visionAnalysis.interiorCondition?.workEstimate ?? '',
      investmentType: propertyData.investmentType ?? 'colocation',
      rentPerUnit: propertyData.rentPerUnit ?? 350,
      potentialExtraRooms: propertyData.potentialExtraRooms ?? 0,
    });

    const estimation = parseCostEstimationResponse(responseText);

    logDebug('Property cost estimation completed', {
      estimatedWorkCost: estimation.estimatedWorkCost,
      estimatedInsurance: estimation.estimatedInsurance,
      estimatedMonthlyRent: estimation.estimatedMonthlyRent,
      confidence: estimation.confidence,
    });

    return estimation;
  } catch (error) {
    logError('Property cost estimation failed', error as Error, { propertyData });

    throw new AIAnalysisError('Failed to estimate property costs', {
      cause: error,
      propertyData,
    });
  }
}

/**
 * Parses cost estimation response
 */
function parseCostEstimationResponse(text: string): AICostEstimation {
  const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleanedText);

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

export interface ColocPreFilterResult {
  readonly passes: boolean;
  readonly reason: string;
}

/**
 * Pre-filters a property for colocation potential.
 * Checks if the property can reach ≥4 bedrooms (currently or after works).
 * Uses a fast shortcut (no AI) when bedrooms count is unambiguous.
 */
export async function preFilterColocProperty(params: {
  bedrooms: number | null;
  title: string | null;
  description: string | null;
}): Promise<ColocPreFilterResult> {
  const { bedrooms, title, description } = params;

  // Fast-path: 4+ bedrooms → always passes
  if (bedrooms !== null && bedrooms >= 4) {
    return { passes: true, reason: `${bedrooms} chambres détectées` };
  }

  // Fast-path: 0-2 bedrooms and no description → always fails
  if (bedrooms !== null && bedrooms <= 2 && !description) {
    return { passes: false, reason: `Seulement ${bedrooms} chambre(s), potentiel coloc insuffisant` };
  }

  // Call AI for borderline cases (3 ch, or unknown bedrooms with description)
  try {
    const responseText = await runPrompt(PROMPT_SLUGS.COLOC_PRE_FILTER, {
      bedrooms: bedrooms ?? 'inconnu',
      title: title ?? '',
      description: (description ?? '').slice(0, 1500),
    });

    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as { passes: boolean; reason: string };
    return { passes: Boolean(parsed.passes), reason: parsed.reason ?? '' };
  } catch (error) {
    logError('Coloc pre-filter failed, defaulting to pass', error as Error, params);
    // Default to pass on error to avoid blocking valid listings
    return { passes: true, reason: 'Erreur pré-filtre — bien conservé par défaut' };
  }
}

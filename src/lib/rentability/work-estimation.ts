import type { VisionAnalysis } from '@/types';

/**
 * Cost per square meter for different types of work
 */
const WORK_COSTS_PER_SQM = {
  ROOF_REPLACEMENT: 150,
  ROOF_REPAIR: 50,
  FACADE_FULL: 100,
  FACADE_PARTIAL: 40,
} as const;

/**
 * Estimated costs for interior work (flat rates)
 */
const INTERIOR_WORK_COSTS = {
  KITCHEN_RENOVATION: 15000,
  BATHROOM_RENOVATION: 8000,
  PAINTING: 3000,
  FLOORING: 4000,
} as const;

/**
 * Estimates total work cost from AI vision analysis
 *
 * @param analysis - AI-generated vision analysis of the property
 * @returns Estimated total cost for all necessary work in euros
 */
export function estimateWorkFromAI(analysis: VisionAnalysis): number {
  let totalCost = 0;

  // Roof work estimation
  if (analysis.roofEstimate) {
    const roofSurface = analysis.roofEstimate.estimatedSurface;

    switch (analysis.roofEstimate.condition) {
      case 'poor':
        totalCost += roofSurface * WORK_COSTS_PER_SQM.ROOF_REPLACEMENT;
        break;
      case 'fair':
        totalCost += roofSurface * WORK_COSTS_PER_SQM.ROOF_REPAIR;
        break;
      case 'good':
        // Minor repairs estimated at 25% of repair cost
        totalCost += roofSurface * WORK_COSTS_PER_SQM.ROOF_REPAIR * 0.25;
        break;
      case 'excellent':
        // No work needed
        break;
    }
  }

  // Facade work estimation
  if (analysis.facadeEstimate) {
    const facadeSurface = analysis.facadeEstimate.totalSurface;

    switch (analysis.facadeEstimate.condition) {
      case 'poor':
        totalCost += facadeSurface * WORK_COSTS_PER_SQM.FACADE_FULL;
        break;
      case 'fair':
        totalCost += facadeSurface * WORK_COSTS_PER_SQM.FACADE_PARTIAL;
        break;
      case 'good':
        // Minor work at 25% of partial cost
        totalCost += facadeSurface * WORK_COSTS_PER_SQM.FACADE_PARTIAL * 0.25;
        break;
      case 'excellent':
        // No work needed
        break;
    }
  }

  // Interior work estimation
  if (analysis.interiorCondition?.workEstimate) {
    const interiorEstimate = parseInteriorWorkEstimate(analysis.interiorCondition.workEstimate);
    totalCost += interiorEstimate;
  }

  return Math.round(totalCost);
}

/**
 * Parses the AI-generated text estimate for interior work
 * Extracts costs from format like "15-20k€" or "5k€"
 *
 * @param workEstimate - Text description of work needed with cost estimates
 * @returns Total estimated cost in euros
 */
function parseInteriorWorkEstimate(workEstimate: string): number {
  let total = 0;

  // Match patterns like "15-20k€" or "5k€"
  const costMatches = workEstimate.matchAll(/(\d+)(?:-(\d+))?k€/gi);

  for (const match of costMatches) {
    const min = parseInt(match[1], 10) * 1000;
    const max = match[2] ? parseInt(match[2], 10) * 1000 : min;

    // Use average of range
    total += (min + max) / 2;
  }

  // If no specific costs found, estimate based on keywords
  if (total === 0) {
    const lowerEstimate = workEstimate.toLowerCase();

    if (lowerEstimate.includes('cuisine') || lowerEstimate.includes('kitchen')) {
      total += INTERIOR_WORK_COSTS.KITCHEN_RENOVATION;
    }

    if (lowerEstimate.includes('salle de bain') || lowerEstimate.includes('bathroom')) {
      total += INTERIOR_WORK_COSTS.BATHROOM_RENOVATION;
    }

    if (lowerEstimate.includes('peinture') || lowerEstimate.includes('painting')) {
      total += INTERIOR_WORK_COSTS.PAINTING;
    }

    if (lowerEstimate.includes('parquet') || lowerEstimate.includes('flooring')) {
      total += INTERIOR_WORK_COSTS.FLOORING;
    }
  }

  return total;
}

/**
 * Calculates detailed breakdown of work costs
 *
 * @param analysis - AI vision analysis
 * @returns Breakdown of costs by category
 */
export function getWorkCostBreakdown(analysis: VisionAnalysis): Record<string, number> {
  const breakdown: Record<string, number> = {
    roof: 0,
    facade: 0,
    interior: 0,
    kitchen: 0,
    bathroom: 0,
    flooring: 0,
    painting: 0,
    other: 0,
  };

  // Roof costs
  if (analysis.roofEstimate) {
    const roofSurface = analysis.roofEstimate.estimatedSurface;
    let roofCost = 0;

    switch (analysis.roofEstimate.condition) {
      case 'poor':
        roofCost = roofSurface * WORK_COSTS_PER_SQM.ROOF_REPLACEMENT;
        break;
      case 'fair':
        roofCost = roofSurface * WORK_COSTS_PER_SQM.ROOF_REPAIR;
        break;
      case 'good':
        roofCost = roofSurface * WORK_COSTS_PER_SQM.ROOF_REPAIR * 0.25;
        break;
    }

    breakdown.roof = Math.round(roofCost);
  }

  // Facade costs
  if (analysis.facadeEstimate) {
    const facadeSurface = analysis.facadeEstimate.totalSurface;
    let facadeCost = 0;

    switch (analysis.facadeEstimate.condition) {
      case 'poor':
        facadeCost = facadeSurface * WORK_COSTS_PER_SQM.FACADE_FULL;
        break;
      case 'fair':
        facadeCost = facadeSurface * WORK_COSTS_PER_SQM.FACADE_PARTIAL;
        break;
      case 'good':
        facadeCost = facadeSurface * WORK_COSTS_PER_SQM.FACADE_PARTIAL * 0.25;
        break;
    }

    breakdown.facade = Math.round(facadeCost);
  }

  // Interior costs
  if (analysis.interiorCondition) {
    const estimate = analysis.interiorCondition.workEstimate.toLowerCase();

    if (estimate.includes('cuisine') || estimate.includes('kitchen')) {
      breakdown.kitchen = INTERIOR_WORK_COSTS.KITCHEN_RENOVATION;
    }

    if (estimate.includes('salle de bain') || estimate.includes('bathroom')) {
      breakdown.bathroom = INTERIOR_WORK_COSTS.BATHROOM_RENOVATION;
    }

    if (estimate.includes('peinture') || estimate.includes('painting')) {
      breakdown.painting = INTERIOR_WORK_COSTS.PAINTING;
    }

    if (estimate.includes('parquet') || estimate.includes('flooring')) {
      breakdown.flooring = INTERIOR_WORK_COSTS.FLOORING;
    }

    breakdown.interior =
      breakdown.kitchen + breakdown.bathroom + breakdown.painting + breakdown.flooring;
  }

  return breakdown;
}

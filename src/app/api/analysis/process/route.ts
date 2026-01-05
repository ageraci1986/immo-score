import { NextRequest, NextResponse } from 'next/server';
import { processPendingAnalysisJobs } from '@/lib/analysis/analysis-worker';
import { prisma } from '@/lib/db/client';
import { calculateRentabilityExtended, buildExtendedParams } from '@/lib/rentability/calculate';
import type { AICostEstimation, VisionAnalysis } from '@/types';

/**
 * POST /api/analysis/process
 * Trigger analysis job processing for properties with ANALYZING status
 * Use ?fix=error to fix ERROR properties with default values
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const fixMode = searchParams.get('fix');

    // Fix ERROR properties with default rentability
    if (fixMode === 'error') {
      console.log('Fixing ERROR properties with default rentability...');

      const errorProperties = await prisma.property.findMany({
        where: { status: 'ERROR' },
      });

      console.log(`Found ${errorProperties.length} ERROR properties to fix`);

      for (const property of errorProperties) {
        // Create default values
        const defaultVisionAnalysis: VisionAnalysis = {
          roofEstimate: {
            condition: 'fair',
            material: 'unknown',
            estimatedSurface: property.surface ? Math.round(property.surface * 0.8) : 80,
            estimatedAge: 20,
            workNeeded: [],
            confidence: 0.3,
          },
          facadeEstimate: {
            condition: 'fair',
            materials: ['unknown'],
            count: 2,
            totalSurface: property.surface ? Math.round(property.surface * 0.5) : 50,
            workNeeded: [],
            confidence: 0.3,
          },
          interiorCondition: {
            overall: 'fair',
            flooring: 'unknown',
            walls: 'unknown',
            ceilings: 'unknown',
            kitchen: 'unknown',
            bathrooms: 'unknown',
            workEstimate: 'moderate',
          },
        };

        const defaultCostEstimation: AICostEstimation = {
          estimatedWorkCost: property.surface ? property.surface * 300 : 30000,
          workBreakdown: {
            roof: 0,
            facade: 0,
            interior: property.surface ? property.surface * 200 : 20000,
            kitchen: 8000,
            bathroom: 5000,
            flooring: 0,
            painting: property.surface ? property.surface * 15 : 1500,
            other: 0,
          },
          estimatedInsurance: property.propertyType === 'HOUSE' ? 350 : 200,
          estimatedMonthlyRent: (property.bedrooms ?? 2) * 350,
          rentPerRoom: 350,
          confidence: 0.3,
          reasoning: 'Default estimation based on property data without image analysis',
        };

        // Calculate rentability
        const purchasePrice = property.price ?? 0;
        const params = buildExtendedParams({
          bedrooms: property.bedrooms ?? 2,
          cadastralIncome: property.cadastralIncome ?? 800,
          estimatedWorkCost: defaultCostEstimation.estimatedWorkCost,
          insuranceYearly: defaultCostEstimation.estimatedInsurance,
          rentPerRoom: defaultCostEstimation.rentPerRoom,
        });

        const rentabilityData = calculateRentabilityExtended({ ...params, purchasePrice });

        // Update property
        await prisma.property.update({
          where: { id: property.id },
          data: {
            aiAnalysis: JSON.parse(JSON.stringify(defaultVisionAnalysis)),
            aiEstimations: JSON.parse(JSON.stringify(defaultCostEstimation)),
            rentabilityData: JSON.parse(JSON.stringify(rentabilityData)),
            rentabilityRate: rentabilityData.netYield,
            status: 'COMPLETED',
          },
        });

        console.log(`Fixed property ${property.id}`);
      }

      return NextResponse.json({
        success: true,
        message: `Fixed ${errorProperties.length} ERROR properties`,
      });
    }

    console.log('Triggering analysis job processing...');

    // Process all pending analysis jobs
    await processPendingAnalysisJobs();

    return NextResponse.json({
      success: true,
      message: 'Analysis jobs processed',
    });
  } catch (error) {
    console.error('Error processing analysis jobs:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process analysis jobs',
      },
      { status: 500 }
    );
  }
}

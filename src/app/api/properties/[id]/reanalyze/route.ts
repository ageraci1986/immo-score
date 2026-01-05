import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { processPropertyAnalysis } from '@/lib/analysis/analysis-worker';

/**
 * POST /api/properties/[id]/reanalyze
 * Relance l'analyse complète d'une propriété (vision, cost, narrative)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: params.id },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Reset status to ANALYZING
    await prisma.property.update({
      where: { id: params.id },
      data: {
        status: 'ANALYZING',
      },
    });

    console.log(`Starting reanalysis for property ${params.id}`);

    // Run analysis in background (don't await to return immediately)
    processPropertyAnalysis(params.id).catch((error) => {
      console.error(`Reanalysis failed for property ${params.id}:`, error);
    });

    return NextResponse.json({
      success: true,
      message: 'Reanalysis started',
      propertyId: params.id,
    });
  } catch (error) {
    console.error('Failed to start reanalysis:', error);
    return NextResponse.json(
      { error: 'Failed to start reanalysis' },
      { status: 500 }
    );
  }
}

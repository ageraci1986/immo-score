import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { updateRentabilityParamsSchema } from '@/lib/validation/schemas';
import { calculateRentabilityExtended, buildExtendedParams } from '@/lib/rentability/calculate';
import { getAuthUser } from '@/lib/supabase/auth';
import type { AICostEstimation } from '@/types';

/**
 * GET /api/properties/[id]
 * Récupère une propriété par son ID
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

    const property = await prisma.property.findUnique({
      where: { id: params.id },
    });

    if (!property || property.userId !== user.id) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ property });
  } catch (error) {
    console.error('Failed to fetch property:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/properties/[id]
 * Met à jour les paramètres de rentabilité et recalcule le ROI
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

    // Get current property data
    const property = await prisma.property.findUnique({
      where: { id: params.id },
    });

    if (!property || property.userId !== user.id) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateRentabilityParamsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { rentabilityParams } = validation.data;

    // Get AI estimations if available
    const aiEstimations = property.aiEstimations as AICostEstimation | null;

    // Merge user params with defaults and AI estimations
    const extendedParams = buildExtendedParams({
      bedrooms: rentabilityParams.numberOfRooms ?? property.bedrooms ?? 2,
      cadastralIncome: rentabilityParams.cadastralIncome ?? property.cadastralIncome ?? 800,
      estimatedWorkCost: rentabilityParams.estimatedWorkCost ?? aiEstimations?.estimatedWorkCost ?? 0,
      insuranceYearly: rentabilityParams.insuranceYearly ?? aiEstimations?.estimatedInsurance ?? 300,
      rentPerRoom: rentabilityParams.rentPerRoom ?? aiEstimations?.rentPerRoom ?? 350,
      // Override with user-provided params
      ...rentabilityParams,
    });

    // Recalculate rentability with new params (include purchase price)
    const purchasePrice = property.price ?? 0;
    const rentabilityData = calculateRentabilityExtended({ ...extendedParams, purchasePrice });

    // Update property with new params and recalculated data
    const updatedProperty = await prisma.property.update({
      where: { id: params.id },
      data: {
        customParams: JSON.parse(JSON.stringify(rentabilityParams)),
        rentabilityData: JSON.parse(JSON.stringify(rentabilityData)),
        rentabilityRate: rentabilityData.netYield,
      },
    });

    console.log('Property rentability updated:', params.id);

    return NextResponse.json({
      property: updatedProperty,
      rentabilityData,
    });
  } catch (error) {
    console.error('Failed to update property rentability:', error);
    return NextResponse.json(
      { error: 'Failed to update property rentability' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/properties/[id]
 * Supprime une propriété
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });
    if (!property || property.userId !== user.id) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Delete associated scraping jobs first
    await prisma.scrapingJob.deleteMany({
      where: { propertyId: params.id },
    });

    // Delete the property
    await prisma.property.delete({
      where: { id: params.id },
    });

    console.log('Property deleted:', params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete property:', error);
    return NextResponse.json(
      { error: 'Failed to delete property' },
      { status: 500 }
    );
  }
}

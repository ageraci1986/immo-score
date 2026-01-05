import { prisma } from '@/lib/db/client';
import { analyzePropertyPhotos, estimatePropertyCosts, generatePropertyNarrative } from '@/lib/ai/claude-client';
import { calculateRentabilityExtended, buildExtendedParams } from '@/lib/rentability/calculate';
import type { VisionAnalysis, AICostEstimation, RentabilityResultsExtended } from '@/types';

/**
 * Process pending analysis jobs (properties with status ANALYZING)
 */
export async function processPendingAnalysisJobs(): Promise<void> {
  console.log('Processing pending analysis jobs...');

  // Get all properties ready for analysis
  const pendingProperties = await prisma.property.findMany({
    where: {
      status: 'ANALYZING',
    },
    take: 5, // Process 5 at a time to avoid overload
  });

  console.log(`Found ${pendingProperties.length} properties to analyze`);

  // Process each property
  for (const property of pendingProperties) {
    await processPropertyAnalysis(property.id);
  }
}

/**
 * Process analysis for a single property
 */
export async function processPropertyAnalysis(propertyId: string): Promise<void> {
  console.log(`Processing analysis for property ${propertyId}`);

  try {
    // Get the property with all data
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      console.error(`Property ${propertyId} not found`);
      return;
    }

    // Get photos for vision analysis
    const photos = property.photos as Array<{ url: string; publicUrl?: string }> | null;

    if (!photos || photos.length === 0) {
      console.log(`No photos for property ${propertyId}, skipping vision analysis`);
      // Still do cost estimation with default values
      await processWithoutVision(property);
      return;
    }

    // Extract public URLs for vision analysis (use publicUrl if available, otherwise url)
    const imageUrls = photos
      .slice(0, 5) // Limit to 5 images
      .map((photo) => photo.publicUrl || photo.url)
      .filter((url) => url && url.startsWith('http')); // Only keep valid HTTP URLs

    if (imageUrls.length === 0) {
      console.log(`No valid image URLs for property ${propertyId}, using defaults`);
      await processWithoutVision(property);
      return;
    }

    console.log(`Found ${imageUrls.length} image URLs for property ${propertyId}`);

    // Try vision analysis, fallback to defaults if it fails
    let visionAnalysis: VisionAnalysis | null = null;
    let costEstimation: AICostEstimation | null = null;

    try {
      // Step 1: Vision Analysis (using public URLs directly - no base64 conversion)
      console.log(`Running vision analysis for property ${propertyId}`);
      visionAnalysis = await analyzePropertyPhotos(imageUrls, {
        surface: property.surface ?? undefined,
        description: property.description ?? undefined,
        location: property.location ?? undefined,
        price: property.price ?? undefined,
      });

      // Step 2: Cost Estimation
      console.log(`Running cost estimation for property ${propertyId}`);
      costEstimation = await estimatePropertyCosts(
        {
          location: property.location ?? undefined,
          propertyType: property.propertyType ?? undefined,
          surface: property.surface ?? undefined,
          bedrooms: property.bedrooms ?? undefined,
          constructionYear: property.constructionYear ?? undefined,
          peb: property.peb ?? undefined,
          price: property.price ?? undefined,
        },
        visionAnalysis
      );
    } catch (aiError) {
      console.warn(`AI analysis failed for property ${propertyId}, using defaults:`, aiError);
    }

    // If AI analysis failed, use defaults
    if (!visionAnalysis || !costEstimation) {
      console.log(`Using default values for property ${propertyId}`);
      await processWithoutVision(property);
      return;
    }

    // Step 3: Calculate Rentability
    console.log(`Calculating rentability for property ${propertyId}`);
    const rentabilityData = calculatePropertyRentability(property, costEstimation);

    // Step 4: Generate Narrative (pros, cons, insights)
    console.log(`Generating narrative for property ${propertyId}`);
    let narrativeData = null;
    try {
      // Calculate scores for narrative generation
      const scores = {
        totalScore: Math.round((rentabilityData.netYield / 10) * 100), // Simple score based on yield
        locationScore: 70, // Default location score
        conditionScore: visionAnalysis.roofEstimate.condition === 'good' ? 80 :
                        visionAnalysis.roofEstimate.condition === 'fair' ? 60 : 40,
        rentabilityScore: Math.min(100, Math.round(rentabilityData.netYield * 15)),
      };

      narrativeData = await generatePropertyNarrative(
        {
          location: property.location ?? undefined,
          price: property.price ?? undefined,
          surface: property.surface ?? undefined,
          peb: property.peb ?? undefined,
          description: property.description ?? undefined,
        },
        visionAnalysis,
        {
          totalInvestment: rentabilityData.totalInvestment,
          workCost: costEstimation.estimatedWorkCost,
          grossYield: rentabilityData.grossYield,
          netYield: rentabilityData.netYield,
          cashFlow: rentabilityData.monthlyCashFlow,
        },
        scores
      );
      console.log(`Narrative generated for property ${propertyId}`);
    } catch (narrativeError) {
      console.warn(`Narrative generation failed for property ${propertyId}, continuing without:`, narrativeError);
    }

    // Step 5: Update property with all results
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        aiAnalysis: JSON.parse(JSON.stringify({
          ...visionAnalysis,
          ...(narrativeData ?? {}),
        })),
        aiEstimations: JSON.parse(JSON.stringify(costEstimation)),
        rentabilityData: JSON.parse(JSON.stringify(rentabilityData)),
        rentabilityRate: rentabilityData.netYield,
        status: 'COMPLETED',
      },
    });

    console.log(`Successfully analyzed property ${propertyId}`);
  } catch (error) {
    console.error(`Error analyzing property ${propertyId}:`, error);

    // Try to use defaults even on error
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      if (property) {
        await processWithoutVision(property);
        console.log(`Used default values for property ${propertyId} after error`);
        return;
      }
    } catch {
      // If even defaults fail, mark as error
    }

    // Update property status to ERROR only if defaults also failed
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        status: 'ERROR',
      },
    });
  }
}

/**
 * Process property without vision analysis (use default values)
 */
async function processWithoutVision(
  property: {
    id: string;
    price: number | null;
    surface: number | null;
    bedrooms: number | null;
    location: string | null;
    propertyType: string | null;
    cadastralIncome: number | null;
  }
): Promise<void> {
  // Create default vision analysis
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

  // Use default cost estimations based on property type and location
  const defaultCostEstimation: AICostEstimation = {
    estimatedWorkCost: property.surface ? property.surface * 300 : 30000, // ~300€/m²
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
  const rentabilityData = calculatePropertyRentability(property, defaultCostEstimation);

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
}

/**
 * Calculate rentability for a property using cost estimation
 */
function calculatePropertyRentability(
  property: {
    price: number | null;
    surface: number | null;
    bedrooms: number | null;
    cadastralIncome: number | null;
  },
  costEstimation: AICostEstimation
): RentabilityResultsExtended {
  const purchasePrice = property.price ?? 0;
  const params = buildExtendedParams({
    bedrooms: property.bedrooms ?? 2,
    cadastralIncome: property.cadastralIncome ?? 800,
    estimatedWorkCost: costEstimation.estimatedWorkCost,
    insuranceYearly: costEstimation.estimatedInsurance,
    rentPerRoom: costEstimation.rentPerRoom,
  });

  return calculateRentabilityExtended({ ...params, purchasePrice });
}


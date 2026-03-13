import { prisma } from '@/lib/db/client';
import { scraperManager } from './scraper-manager';

/**
 * Process pending scraping jobs
 */
export async function processPendingScrapingJobs(): Promise<void> {
  console.log('Processing pending scraping jobs...');

  // Get all pending jobs
  const pendingJobs = await prisma.scrapingJob.findMany({
    where: {
      status: 'PENDING',
      attempts: {
        lt: 3, // Max 3 attempts
      },
    },
    take: 10, // Process 10 at a time
  });

  console.log(`Found ${pendingJobs.length} pending jobs`);

  // Process each job
  for (const job of pendingJobs) {
    await processScrapingJob(job.id);
  }
}

/**
 * Process a single scraping job
 */
export async function processScrapingJob(jobId: string): Promise<void> {
  console.log(`Processing scraping job ${jobId}`);

  try {
    // Get the job
    const job = await prisma.scrapingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    // Update job status to RUNNING
    await prisma.scrapingJob.update({
      where: { id: jobId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    // Update property status
    await prisma.property.update({
      where: { id: job.propertyId },
      data: { status: 'SCRAPING' },
    });

    // Scrape the URL
    const result = await scraperManager.scrapeUrl(job.url);

    if (result.success && result.data) {
      // Process photos - store both url and publicUrl for compatibility
      const photos = Array.isArray(result.data.photos)
        ? result.data.photos.map((photoUrl: string) => ({
            url: photoUrl,
            publicUrl: photoUrl, // Use original URL as public URL until uploaded to storage
            storageKey: '',
          }))
        : [];

      console.log(`Scraped ${photos.length} photos for property ${job.propertyId}`);

      // Clean up whitespace in text fields (single-line: collapse all whitespace)
      const cleanText = (text: string | undefined): string | undefined =>
        text ? text.replace(/\s+/g, ' ').trim() : undefined;

      // Clean description: preserve paragraph structure but clean each line
      const cleanDescription = (text: string | undefined): string | undefined => {
        if (!text) return undefined;
        return text
          .split(/\n+/)
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .filter((line) => line.length > 0)
          .join('\n');
      };

      // Update property with scraped data
      await prisma.property.update({
        where: { id: job.propertyId },
        data: {
          title: cleanText(result.data.title),
          description: cleanDescription(result.data.description),
          price: result.data.price,
          location: cleanText(result.data.location),
          address: cleanText(result.data.address),

          // Surfaces
          surface: result.data.surface,
          landSurface: result.data.landSurface,
          livingRoomSurface: result.data.livingRoomSurface,

          // Rooms
          bedrooms: result.data.bedrooms,
          bathrooms: result.data.bathrooms,
          toilets: result.data.toilets,
          floors: result.data.floors,

          // Energy & construction
          peb: result.data.energyClass,
          constructionYear: result.data.yearBuilt,
          buildingCondition: result.data.buildingCondition,

          // Property details
          propertyType: result.data.propertyType,
          propertySubtype: result.data.propertySubtype,
          furnished: result.data.furnished,

          // Features
          hasGarden: result.data.hasGarden,
          gardenSurface: result.data.gardenSurface,
          hasTerrace: result.data.hasTerrace,
          terraceSurface: result.data.terraceSurface,
          hasParking: result.data.hasParking,
          parkingSpaces: result.data.parkingSpaces,
          hasSwimmingPool: result.data.hasSwimmingPool,
          hasLift: result.data.hasLift,
          facadeCount: result.data.facadeCount,
          facadeWidth: result.data.facadeWidth,

          // Legal & availability
          availabilityDate: result.data.availabilityDate,
          cadastralIncome: result.data.cadastralIncome,
          planningPermission: result.data.planningPermission,
          floodZone: result.data.floodZone,

          // Heating & utilities
          heatingType: result.data.heatingType,
          doubleGlazing: result.data.doubleGlazing,

          // External links
          virtualTour: result.data.virtualTour,

          photos,
          coordinates: result.data.coordinates || undefined,
          status: 'ANALYZING', // Ready for AI analysis
        },
      });

      // Mark job as completed
      await prisma.scrapingJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      console.log(`Successfully scraped job ${jobId}`);

      // Trigger analysis in the background (don't wait)
      fetch(`${process.env['NEXT_PUBLIC_APP_URL']}/api/analysis/process`, {
        method: 'POST',
      }).catch((error) => {
        console.error('Failed to trigger analysis:', error);
      });
    } else {
      // Mark job as failed
      await prisma.scrapingJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: result.error || 'Unknown error',
          completedAt: new Date(),
        },
      });

      // Update property status to ERROR
      await prisma.property.update({
        where: { id: job.propertyId },
        data: {
          status: 'ERROR',
        },
      });

      console.error(`Failed to scrape job ${jobId}:`, result.error);
    }
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);

    // Mark job as failed
    await prisma.scrapingJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    });
  }
}

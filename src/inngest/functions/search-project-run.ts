import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/db/client';
import { scrapeSearchPages } from '@/lib/scraping/search-scraper-adapter';
import type {
  SearchProjectRow,
  SearchProjectListingRow,
  ImmowebSearchResult,
} from '@/types/search-projects';

const MAX_CONCURRENT_ANALYSES = 3;

/**
 * Durable function: runs the full search project pipeline.
 * Each step is individually retried and resumable.
 */
export const searchProjectRun = inngest.createFunction(
  {
    id: 'search-project-run',
    retries: 2,
    concurrency: [{ limit: 5 }],
  },
  { event: 'search-project/run' },
  async ({ event, step }) => {
    const { projectId, userId, triggeredBy } = event.data as {
      projectId: string;
      userId: string;
      triggeredBy: string;
    };

    const supabase = createAdminClient();

    // Step 1: Fetch project
    const project = await step.run('fetch-project', async () => {
      const { data, error } = await supabase
        .from('search_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error || !data) {
        throw new Error(`Project not found: ${projectId}`);
      }

      return data as SearchProjectRow;
    });

    // Step 2: Scrape search page
    const searchResults = await step.run('scrape-search-page', async () => {
      try {
        return await scrapeSearchPages(project.search_url);
      } catch (scrapeError) {
        const errorMessage =
          scrapeError instanceof Error ? scrapeError.message : 'Scraping failed';

        await supabase.from('search_project_checks').insert({
          project_id: projectId,
          listings_found: 0,
          new_listings: 0,
          emails_sent: 0,
          triggered_by: triggeredBy,
          error_message: errorMessage,
        });

        await supabase
          .from('search_projects')
          .update({
            status: 'error',
            error_message: errorMessage,
            last_checked_at: new Date().toISOString(),
          })
          .eq('id', projectId);

        throw scrapeError;
      }
    });

    // Step 3: Identify new listings
    const newListings = await step.run('identify-new-listings', async () => {
      const { data: existingListings } = await supabase
        .from('search_project_listings')
        .select('immoweb_id, id, is_active')
        .eq('project_id', projectId);

      const existingIds = new Set(
        (existingListings || []).map((l: { immoweb_id: string }) => l.immoweb_id)
      );
      const scrapedIds = new Set(searchResults.map((r: ImmowebSearchResult) => r.immowebId));

      const newOnes = searchResults.filter(
        (r: ImmowebSearchResult) => !existingIds.has(r.immowebId)
      );

      // Insert new listings
      for (const listing of newOnes) {
        await supabase.from('search_project_listings').insert({
          project_id: projectId,
          user_id: userId,
          immoweb_id: listing.immowebId,
          listing_url: listing.listingUrl,
          title: listing.title,
          price: listing.price,
          city: listing.city,
          thumbnail_url: listing.thumbnailUrl,
        });
      }

      // Update existing listings
      for (const existing of existingListings || []) {
        const typedExisting = existing as SearchProjectListingRow;
        if (scrapedIds.has(typedExisting.immoweb_id)) {
          await supabase
            .from('search_project_listings')
            .update({ last_seen_at: new Date().toISOString(), is_active: true })
            .eq('id', typedExisting.id);
        } else if (typedExisting.is_active) {
          await supabase
            .from('search_project_listings')
            .update({ is_active: false })
            .eq('id', typedExisting.id);
        }
      }

      return newOnes;
    });

    // Step 4: Analyze each new listing in batches
    const analyzedListings: Array<{ listingId: string; propertyId: string }> = [];

    for (let i = 0; i < newListings.length; i += MAX_CONCURRENT_ANALYSES) {
      const batch = newListings.slice(i, i + MAX_CONCURRENT_ANALYSES);
      const batchIndex = Math.floor(i / MAX_CONCURRENT_ANALYSES);

      const batchResults = await step.run(
        `analyze-batch-${batchIndex}`,
        async () => {
          const results: Array<{ listingId: string; propertyId: string }> = [];

          const settled = await Promise.allSettled(
            batch.map(async (listing: ImmowebSearchResult) => {
              try {
                const property = await prisma.property.create({
                  data: {
                    userId,
                    sourceUrl: listing.listingUrl,
                    status: 'PENDING',
                    title: listing.title,
                    price: listing.price,
                    location: listing.city,
                    propertyType: project.property_type,
                    customParams: {
                      propertyType: project.property_type,
                      rentPerUnit: Number(project.rent_per_unit),
                    },
                  },
                });

                await prisma.scrapingJob.create({
                  data: {
                    propertyId: property.id,
                    url: listing.listingUrl,
                    status: 'PENDING',
                  },
                });

                // Process scraping
                const { processScrapingJob } = await import(
                  '@/lib/scraping/scraping-worker'
                );
                const job = await prisma.scrapingJob.findFirst({
                  where: { propertyId: property.id, status: 'PENDING' },
                  select: { id: true },
                });
                if (job) {
                  await processScrapingJob(job.id);
                }

                // Run analysis
                const { processPropertyAnalysis } = await import(
                  '@/lib/analysis/analysis-worker'
                );
                await processPropertyAnalysis(property.id);

                // Get score
                const completedProperty = await prisma.property.findUnique({
                  where: { id: property.id },
                  select: { id: true, aiScore: true },
                });

                const score = completedProperty?.aiScore
                  ? Math.round(completedProperty.aiScore)
                  : null;

                await supabase
                  .from('search_project_listings')
                  .update({ property_id: property.id, score })
                  .eq('project_id', projectId)
                  .eq('immoweb_id', listing.immowebId);

                results.push({
                  listingId: listing.immowebId,
                  propertyId: property.id,
                });
              } catch (error) {
                console.error(
                  `[Inngest] Failed to analyze listing ${listing.immowebId}:`,
                  error
                );
              }
            })
          );

          for (const result of settled) {
            if (result.status === 'rejected') {
              console.error('[Inngest] Batch item rejected:', result.reason);
            }
          }

          return results;
        }
      );

      analyzedListings.push(...batchResults);
    }

    // Step 5: Send email notification
    const emailsSent = await step.run('send-email', async () => {
      if (
        analyzedListings.length > 0 &&
        project.email_notifications_enabled &&
        project.notification_email
      ) {
        try {
          const { sendNewListingAlert } = await import('@/lib/email/resend');
          await sendNewListingAlert({
            to: project.notification_email,
            projectName: project.name,
            projectId,
            qualifiedListings: analyzedListings,
          });

          // Mark listings as email_sent
          for (const ql of analyzedListings) {
            await supabase
              .from('search_project_listings')
              .update({ email_sent: true })
              .eq('project_id', projectId)
              .eq('immoweb_id', ql.listingId);
          }

          return analyzedListings.length;
        } catch (emailError) {
          console.error('[Inngest] Failed to send email:', emailError);
          return 0;
        }
      }
      return 0;
    });

    // Step 6: Record check and update project
    await step.run('finalize', async () => {
      await supabase.from('search_project_checks').insert({
        project_id: projectId,
        listings_found: searchResults.length,
        new_listings: newListings.length,
        emails_sent: emailsSent,
        triggered_by: triggeredBy,
      });

      const nextCheckAt = new Date(
        Date.now() + project.check_interval_hours * 60 * 60 * 1000
      ).toISOString();

      await supabase
        .from('search_projects')
        .update({
          last_checked_at: new Date().toISOString(),
          next_check_at: nextCheckAt,
          status: 'active',
          error_message: null,
        })
        .eq('id', projectId);
    });

    return {
      projectId,
      listingsFound: searchResults.length,
      newListings: newListings.length,
      analyzed: analyzedListings.length,
      emailsSent,
    };
  }
);

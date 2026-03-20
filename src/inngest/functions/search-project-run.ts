import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/db/client';
import { scrapeSearchPages } from '@/lib/scraping/search-scraper-adapter';
import type {
  SearchProjectRow,
  SearchProjectListingRow,
  ImmowebSearchResult,
} from '@/types/search-projects';

const MAX_CONCURRENT_ANALYSES = 1;
const EMAIL_BATCH_SIZE = 10;

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
          pre_filtered_count: 0,
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
    // Pre-filter (coloc only) runs AFTER listing scrape but BEFORE AI analysis.
    const analyzedListings: Array<{ listingId: string; propertyId: string; score: number | null }> = [];
    let preFilteredCount = 0;

    for (let i = 0; i < newListings.length; i += MAX_CONCURRENT_ANALYSES) {
      const batch = newListings.slice(i, i + MAX_CONCURRENT_ANALYSES);
      const batchIndex = Math.floor(i / MAX_CONCURRENT_ANALYSES);

      const batchResults = await step.run(
        `analyze-batch-${batchIndex}`,
        async () => {
          const results: Array<{ listingId: string; propertyId: string; score: number | null }> = [];
          let batchPreFiltered = 0;

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

                // Process listing scrape (populates bedrooms + description)
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

                // ── Coloc pre-filter ──────────────────────────────────────
                if (
                  project.coloc_pre_filter_enabled &&
                  project.property_type === 'colocation'
                ) {
                  const scrapedProperty = await prisma.property.findUnique({
                    where: { id: property.id },
                    select: { bedrooms: true, title: true, description: true },
                  });

                  const { preFilterColocProperty } = await import(
                    '@/lib/ai/claude-client'
                  );
                  const filterResult = await preFilterColocProperty({
                    bedrooms: scrapedProperty?.bedrooms ?? null,
                    title: scrapedProperty?.title ?? listing.title,
                    description: scrapedProperty?.description ?? null,
                  });

                  if (!filterResult.passes) {
                    console.log(
                      `[Inngest] Pre-filter FAILED for ${listing.immowebId}: ${filterResult.reason}`
                    );
                    // Mark as pre-filtered, skip analysis
                    await prisma.property.update({
                      where: { id: property.id },
                      data: { status: 'ERROR' },
                    });
                    await supabase
                      .from('search_project_listings')
                      .update({ pre_filtered: true })
                      .eq('project_id', projectId)
                      .eq('immoweb_id', listing.immowebId);

                    batchPreFiltered++;
                    return; // skip analysis
                  }

                  console.log(
                    `[Inngest] Pre-filter PASSED for ${listing.immowebId}: ${filterResult.reason}`
                  );
                }
                // ─────────────────────────────────────────────────────────

                // Run full AI analysis
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
                  score,
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

          return { results, batchPreFiltered };
        }
      );

      analyzedListings.push(...batchResults.results);
      preFilteredCount += batchResults.batchPreFiltered;
    }

    // Step 5: Send email notification
    // Apply score threshold filter + split into batches of 10
    const emailsSent = await step.run('send-email', async () => {
      if (
        analyzedListings.length === 0 ||
        !project.email_notifications_enabled ||
        !project.notification_email
      ) {
        return 0;
      }

      // Filter by score threshold
      const qualifiedListings = analyzedListings.filter(
        (l) => l.score === null || l.score >= project.score_threshold
      );

      console.log(
        `[Inngest] Email: ${analyzedListings.length} analyzed, ` +
        `${qualifiedListings.length} above threshold (${project.score_threshold}), ` +
        `${preFilteredCount} pre-filtered`
      );

      if (qualifiedListings.length === 0) return 0;

      try {
        const { sendNewListingAlert } = await import('@/lib/email/resend');

        // Split into batches of EMAIL_BATCH_SIZE
        let totalSent = 0;
        for (let i = 0; i < qualifiedListings.length; i += EMAIL_BATCH_SIZE) {
          const emailBatch = qualifiedListings.slice(i, i + EMAIL_BATCH_SIZE);
          const batchNum = Math.floor(i / EMAIL_BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(qualifiedListings.length / EMAIL_BATCH_SIZE);

          await sendNewListingAlert({
            to: project.notification_email,
            projectName: project.name,
            projectId,
            qualifiedListings: emailBatch.map((l) => ({
              listingId: l.listingId,
              propertyId: l.propertyId,
            })),
            batchInfo: totalBatches > 1
              ? { current: batchNum, total: totalBatches }
              : undefined,
          });

          // Mark this batch as email_sent
          for (const ql of emailBatch) {
            await supabase
              .from('search_project_listings')
              .update({ email_sent: true })
              .eq('project_id', projectId)
              .eq('immoweb_id', ql.listingId);
          }

          totalSent += emailBatch.length;
        }

        return totalSent;
      } catch (emailError) {
        console.error('[Inngest] Failed to send email:', emailError);
        return 0;
      }
    });

    // Step 6: Record check and update project
    await step.run('finalize', async () => {
      await supabase.from('search_project_checks').insert({
        project_id: projectId,
        listings_found: searchResults.length,
        new_listings: newListings.length,
        emails_sent: emailsSent,
        pre_filtered_count: preFilteredCount,
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
      preFiltered: preFilteredCount,
      emailsSent,
    };
  }
);

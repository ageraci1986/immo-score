import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/db/client';
import { runCheckSchema } from '@/lib/validation/search-project-schemas';
import { scrapeSearchPages } from '@/lib/scraping/search-scraper-adapter';
import type {
  SearchProjectRow,
  SearchProjectListingRow,
  ImmowebSearchResult,
} from '@/types/search-projects';

const MAX_CONCURRENT_ANALYSES = 3;

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/search-projects/[id]/run
 * Triggers a check: returns immediately, processes asynchronously.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // Auth: either user session or cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    const isCronCall = cronSecret === process.env['CRON_SECRET'] && !!cronSecret;

    let userId: string | null = null;

    if (isCronCall) {
      const supabase = createAdminClient();
      const { data: project } = await supabase
        .from('search_projects')
        .select('user_id')
        .eq('id', params.id)
        .single();
      userId = project?.user_id ?? null;
    } else {
      const user = await getAuthUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = runCheckSchema.safeParse(body);
    const triggeredBy = validation.success ? validation.data.triggeredBy : 'manual';

    const supabase = createAdminClient();

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('search_projects')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const typedProject = project as SearchProjectRow;

    if (typedProject.status === 'paused' && triggeredBy !== 'initial') {
      return NextResponse.json(
        { error: 'Project is paused' },
        { status: 400 }
      );
    }

    // Return immediately — run the heavy work asynchronously
    // This prevents browser/client timeout from aborting the processing
    void processRunCheck(params.id, userId, typedProject, triggeredBy);

    return NextResponse.json({ data: { status: 'started' } });
  } catch (error) {
    console.error('[SearchProject] Run check failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Async processing: scrape, detect new listings, analyze, send email.
 * Runs independently of the HTTP request lifecycle.
 */
async function processRunCheck(
  projectId: string,
  userId: string,
  typedProject: SearchProjectRow,
  triggeredBy: string
): Promise<void> {
  const supabase = createAdminClient();

  try {
    console.log(`[SearchProject] Starting async processing for project ${projectId}`);

    // Step 1: Scrape search page
    let searchResults: ImmowebSearchResult[];
    try {
      searchResults = await scrapeSearchPages(typedProject.search_url);
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

      return;
    }

    // Step 2: Get existing listings for this project
    const { data: existingListings } = await supabase
      .from('search_project_listings')
      .select('immoweb_id, id, is_active')
      .eq('project_id', projectId);

    const existingIds = new Set(
      (existingListings || []).map((l: { immoweb_id: string }) => l.immoweb_id)
    );
    const scrapedIds = new Set(searchResults.map((r) => r.immowebId));

    // Step 3: Identify new listings
    const newListings = searchResults.filter((r) => !existingIds.has(r.immowebId));

    // Step 4: Process new listings — insert + analyze
    let analyzedCount = 0;
    let emailsSent = 0;
    const analyzedListings: Array<{ listingId: string; propertyId: string }> = [];

    // Insert all new listings first
    for (const listing of newListings) {
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

    // Analyze in batches of MAX_CONCURRENT_ANALYSES
    for (let i = 0; i < newListings.length; i += MAX_CONCURRENT_ANALYSES) {
      const batch = newListings.slice(i, i + MAX_CONCURRENT_ANALYSES);

      const results = await Promise.allSettled(
        batch.map(async (listing) => {
          try {
            // Create the property in Prisma with project-level params
            const property = await prisma.property.create({
              data: {
                userId,
                sourceUrl: listing.listingUrl,
                status: 'PENDING',
                title: listing.title,
                price: listing.price,
                location: listing.city,
                propertyType: typedProject.property_type,
                customParams: {
                  propertyType: typedProject.property_type,
                  rentPerUnit: Number(typedProject.rent_per_unit),
                },
              },
            });

            // Create scraping job
            await prisma.scrapingJob.create({
              data: {
                propertyId: property.id,
                url: listing.listingUrl,
                status: 'PENDING',
              },
            });

            // Process scraping + analysis directly (works on Vercel, no internal HTTP calls)
            const { processScrapingJob } = await import('@/lib/scraping/scraping-worker');
            const job = await prisma.scrapingJob.findFirst({
              where: { propertyId: property.id, status: 'PENDING' },
              select: { id: true },
            });
            if (job) {
              await processScrapingJob(job.id);
            }

            // Run analysis directly
            const { processPropertyAnalysis } = await import('@/lib/analysis/analysis-worker');
            await processPropertyAnalysis(property.id);

            // Get the completed property
            const completedProperty = await prisma.property.findUnique({
              where: { id: property.id },
              select: { id: true, aiScore: true, status: true },
            });

            const score = completedProperty?.aiScore
              ? Math.round(completedProperty.aiScore)
              : null;

            // Update the listing with score and property reference
            await supabase
              .from('search_project_listings')
              .update({
                property_id: property.id,
                score,
              })
              .eq('project_id', projectId)
              .eq('immoweb_id', listing.immowebId);

            analyzedCount++;

            // Track all analyzed listings for email notification
            analyzedListings.push({
              listingId: listing.immowebId,
              propertyId: property.id,
            });

            return { success: true, immowebId: listing.immowebId };
          } catch (error) {
            console.error(
              `[SearchProject] Failed to analyze listing ${listing.immowebId}:`,
              error
            );
            return { success: false, immowebId: listing.immowebId };
          }
        })
      );

      for (const result of results) {
        if (result.status === 'rejected') {
          console.error('[SearchProject] Batch item rejected:', result.reason);
        }
      }
    }

    // Step 5: Update existing listings — mark last_seen_at or is_active
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

    // Step 6: Send email when analyses are complete
    console.log(`[SearchProject] Email check: analyzedListings=${analyzedListings.length}, emailEnabled=${typedProject.email_notifications_enabled}, notificationEmail=${typedProject.notification_email}`);

    if (
      analyzedListings.length > 0 &&
      typedProject.email_notifications_enabled &&
      typedProject.notification_email
    ) {
      try {
        console.log(`[SearchProject] Sending email for ${analyzedListings.length} listings to ${typedProject.notification_email}`);
        const { sendNewListingAlert } = await import('@/lib/email/resend');
        await sendNewListingAlert({
          to: typedProject.notification_email,
          projectName: typedProject.name,
          projectId,
          qualifiedListings: analyzedListings,
        });
        emailsSent = analyzedListings.length;
        console.log(`[SearchProject] Email sent successfully!`);

        // Mark listings as email_sent
        for (const ql of analyzedListings) {
          await supabase
            .from('search_project_listings')
            .update({ email_sent: true })
            .eq('project_id', projectId)
            .eq('immoweb_id', ql.listingId);
        }
      } catch (emailError) {
        console.error('[SearchProject] Failed to send email:', emailError);
      }
    } else {
      console.log('[SearchProject] Skipping email — conditions not met');
    }

    // Step 7: Record the check
    await supabase.from('search_project_checks').insert({
      project_id: projectId,
      listings_found: searchResults.length,
      new_listings: newListings.length,
      emails_sent: emailsSent,
      triggered_by: triggeredBy,
    });

    // Step 8: Update project timestamps
    const nextCheckAt = new Date(
      Date.now() + typedProject.check_interval_hours * 60 * 60 * 1000
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

    console.log(`[SearchProject] Async processing completed for project ${projectId}: ${analyzedCount} analyzed, ${emailsSent} emails sent`);
  } catch (error) {
    console.error(`[SearchProject] Async processing failed for project ${projectId}:`, error);

    // Try to record the failure
    try {
      await supabase.from('search_project_checks').insert({
        project_id: projectId,
        listings_found: 0,
        new_listings: 0,
        emails_sent: 0,
        triggered_by: triggeredBy,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      await supabase
        .from('search_projects')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Processing failed',
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', projectId);
    } catch {
      console.error('[SearchProject] Failed to record error state');
    }
  }
}


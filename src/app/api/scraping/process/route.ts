import { NextResponse } from 'next/server';
import { processPendingScrapingJobs } from '@/lib/scraping/scraping-worker';

/**
 * POST /api/scraping/process
 * Trigger scraping job processing
 */
export async function POST(): Promise<NextResponse> {
  try {
    console.log('Triggering scraping job processing...');

    // Process all pending jobs
    await processPendingScrapingJobs();

    return NextResponse.json({
      success: true,
      message: 'Scraping jobs processed',
    });
  } catch (error) {
    console.error('Error processing scraping jobs:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process scraping jobs',
      },
      { status: 500 }
    );
  }
}

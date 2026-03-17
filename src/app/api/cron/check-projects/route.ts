import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SearchProjectRow } from '@/types/search-projects';

const MAX_CONCURRENT_PROJECTS = 5;

async function handleCron(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env['CRON_SECRET'];

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Find all active projects due for a check
    const { data: projects, error } = await supabase
      .from('search_projects')
      .select('*')
      .eq('status', 'active')
      .lte('next_check_at', new Date().toISOString());

    if (error) {
      console.error('[Cron] Failed to fetch projects:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const typedProjects = (projects || []) as SearchProjectRow[];
    console.log(`[Cron] Found ${typedProjects.length} projects due for check`);

    if (typedProjects.length === 0) {
      return NextResponse.json({ data: { checked: 0 } });
    }

    // Process projects in batches
    const appUrl = process.env['NEXT_PUBLIC_APP_URL'];
    let checkedCount = 0;
    let errorCount = 0;
    const errorMessages: string[] = [];

    for (let i = 0; i < typedProjects.length; i += MAX_CONCURRENT_PROJECTS) {
      const batch = typedProjects.slice(i, i + MAX_CONCURRENT_PROJECTS);

      const results = await Promise.allSettled(
        batch.map(async (project) => {
          const response = await fetch(
            `${appUrl}/api/search-projects/${project.id}/run`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-cron-secret': cronSecret,
              },
              body: JSON.stringify({ triggeredBy: 'cron' }),
            }
          );

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Check failed for project ${project.id}: ${text}`);
          }

          return project.id;
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          checkedCount++;
        } else {
          errorCount++;
          console.error('[Cron] Project check failed:', result.reason);
          errorMessages.push(String(result.reason));
        }
      }
    }

    console.log(
      `[Cron] Completed: ${checkedCount} checked, ${errorCount} errors`
    );

    return NextResponse.json({
      data: { checked: checkedCount, errors: errorCount, errorMessages },
    });
  } catch (error) {
    console.error('[Cron] Fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Vercel Cron sends GET; also export POST for manual testing
export const GET = handleCron;
export const POST = handleCron;

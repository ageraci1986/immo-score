import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { runCheckSchema } from '@/lib/validation/search-project-schemas';
import { inngest } from '@/inngest/client';
import type { SearchProjectRow } from '@/types/search-projects';

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/search-projects/[id]/run
 * Triggers a check via Inngest durable function.
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

    // Send event to Inngest — processing happens durably in the background
    await inngest.send({
      name: 'search-project/run',
      data: {
        projectId: params.id,
        userId,
        triggeredBy,
      },
    });

    return NextResponse.json({ data: { status: 'started' } });
  } catch (error) {
    console.error('[SearchProject] Run check failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateSearchProjectSchema } from '@/lib/validation/search-project-schemas';
import type {
  SearchProjectRow,
  SearchProjectListingRow,
  SearchProjectCheckRow,
} from '@/types/search-projects';
import { mapProjectRow, mapListingRow, mapCheckRow } from '@/types/search-projects';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/search-projects/[id]
 * Returns project details with listings and check history.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: project, error } = await supabase
      .from('search_projects')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch listings and checks in parallel
    const [listingsResult, checksResult] = await Promise.all([
      supabase
        .from('search_project_listings')
        .select('*')
        .eq('project_id', params.id)
        .order('first_seen_at', { ascending: false }),
      supabase
        .from('search_project_checks')
        .select('*')
        .eq('project_id', params.id)
        .order('checked_at', { ascending: false })
        .limit(50),
    ]);

    const listings = ((listingsResult.data || []) as SearchProjectListingRow[]).map(
      mapListingRow
    );
    const checks = ((checksResult.data || []) as SearchProjectCheckRow[]).map(
      mapCheckRow
    );

    return NextResponse.json({
      data: {
        ...mapProjectRow(project as SearchProjectRow),
        listings,
        checks,
      },
    });
  } catch (error) {
    console.error('Failed to fetch search project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/search-projects/[id]
 * Updates project settings.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateSearchProjectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('search_projects')
      .select('id, status, check_interval_hours')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    const input = validation.data;

    if (input.name !== undefined) updates['name'] = input.name;
    if (input.scoreThreshold !== undefined) updates['score_threshold'] = input.scoreThreshold;
    if (input.checkIntervalHours !== undefined) updates['check_interval_hours'] = input.checkIntervalHours;
    if (input.notificationEmail !== undefined) updates['notification_email'] = input.notificationEmail;
    if (input.emailNotificationsEnabled !== undefined)
      updates['email_notifications_enabled'] = input.emailNotificationsEnabled;
    if (input.propertyType !== undefined) updates['property_type'] = input.propertyType;
    if (input.rentPerUnit !== undefined) updates['rent_per_unit'] = input.rentPerUnit;

    if (input.status !== undefined) {
      updates['status'] = input.status;
      // If unpausing, recalculate next_check_at
      if (input.status === 'active' && existing['status'] === 'paused') {
        const interval = input.checkIntervalHours ?? existing['check_interval_hours'];
        updates['next_check_at'] = new Date(
          Date.now() + (interval as number) * 60 * 60 * 1000
        ).toISOString();
      }
    }

    const { data: updated, error } = await supabase
      .from('search_projects')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !updated) {
      console.error('Failed to update search project:', error);
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    return NextResponse.json({ data: mapProjectRow(updated as SearchProjectRow) });
  } catch (error) {
    console.error('Failed to update search project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/search-projects/[id]
 * Deletes a project and all associated data (cascade).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('search_projects')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete search project:', error);
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete search project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSearchProjectSchema } from '@/lib/validation/search-project-schemas';
import type { SearchProjectRow } from '@/types/search-projects';
import { mapProjectRow } from '@/types/search-projects';

const MAX_PROJECTS_PER_USER = 10;

/**
 * GET /api/search-projects
 * Returns all search projects for the authenticated user, with computed counts.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch projects
    const { data: projects, error } = await supabase
      .from('search_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch search projects:', error);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    // Fetch listing counts per project
    const projectIds = (projects as SearchProjectRow[]).map((p) => p.id);

    let listingCounts: Record<string, { total: number; new: number }> = {};

    if (projectIds.length > 0) {
      // Total listings per project
      const { data: totals } = await supabase
        .from('search_project_listings')
        .select('project_id')
        .in('project_id', projectIds);

      // New listings = first_seen_at after last_checked_at
      const { data: listings } = await supabase
        .from('search_project_listings')
        .select('project_id, first_seen_at')
        .in('project_id', projectIds);

      const projectMap = new Map(
        (projects as SearchProjectRow[]).map((p) => [p.id, p])
      );

      listingCounts = projectIds.reduce(
        (acc, id) => {
          const project = projectMap.get(id);
          const projectListings = (listings || []).filter((l) => l.project_id === id);
          const total = (totals || []).filter((t) => t.project_id === id).length;
          const newCount = project?.last_checked_at
            ? projectListings.filter(
                (l) => new Date(l.first_seen_at) >= new Date(project.last_checked_at!)
              ).length
            : total;

          acc[id] = { total, new: newCount };
          return acc;
        },
        {} as Record<string, { total: number; new: number }>
      );
    }

    const result = (projects as SearchProjectRow[]).map((row) => ({
      ...mapProjectRow(row),
      totalListings: listingCounts[row.id]?.total ?? 0,
      newListingsSinceLastCheck: listingCounts[row.id]?.new ?? 0,
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Failed to fetch search projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/search-projects
 * Creates a new search project and triggers the initial scan.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createSearchProjectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check project limit
    const { count } = await supabase
      .from('search_projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count ?? 0) >= MAX_PROJECTS_PER_USER) {
      return NextResponse.json(
        { error: `Limite de ${MAX_PROJECTS_PER_USER} projets atteinte` },
        { status: 429 }
      );
    }

    const { name, searchUrl, scoreThreshold, checkIntervalHours, notificationEmail, emailNotificationsEnabled, propertyType, rentPerUnit, colocPreFilterEnabled } =
      validation.data;

    const nextCheckAt = new Date(
      Date.now() + (checkIntervalHours ?? 24) * 60 * 60 * 1000
    ).toISOString();

    const { data: project, error } = await supabase
      .from('search_projects')
      .insert({
        user_id: user.id,
        name,
        search_url: searchUrl,
        score_threshold: scoreThreshold ?? 70,
        check_interval_hours: checkIntervalHours ?? 24,
        notification_email: notificationEmail,
        email_notifications_enabled: emailNotificationsEnabled ?? true,
        property_type: propertyType ?? 'colocation',
        rent_per_unit: rentPerUnit ?? 350,
        coloc_pre_filter_enabled: colocPreFilterEnabled ?? false,
        next_check_at: nextCheckAt,
      })
      .select()
      .single();

    if (error || !project) {
      console.error('Failed to create search project:', error);
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    // Initial scan is triggered by the client after project creation (see useCreateSearchProject hook)

    return NextResponse.json(
      { data: mapProjectRow(project as SearchProjectRow) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create search project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

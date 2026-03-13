// Types for Search Projects feature (Veille Immobilière)

export type ProjectStatus = 'active' | 'paused' | 'error';
export type CheckTrigger = 'cron' | 'manual' | 'initial';
export type PropertyInvestmentType = 'colocation' | 'logement_seul' | 'appartement' | 'immeuble_rapport';

// ── Database row types (snake_case, matching Supabase columns) ──

export interface SearchProjectRow {
  readonly id: string;
  readonly user_id: string;
  readonly name: string;
  readonly search_url: string;
  readonly status: ProjectStatus;
  readonly score_threshold: number;
  readonly check_interval_hours: number;
  readonly notification_email: string;
  readonly email_notifications_enabled: boolean;
  readonly property_type: PropertyInvestmentType;
  readonly rent_per_unit: number;
  readonly last_checked_at: string | null;
  readonly next_check_at: string | null;
  readonly error_message: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface SearchProjectListingRow {
  readonly id: string;
  readonly project_id: string;
  readonly user_id: string;
  readonly immoweb_id: string;
  readonly listing_url: string;
  readonly property_id: string | null;
  readonly score: number | null;
  readonly title: string | null;
  readonly price: number | null;
  readonly city: string | null;
  readonly thumbnail_url: string | null;
  readonly first_seen_at: string;
  readonly last_seen_at: string;
  readonly is_active: boolean;
  readonly email_sent: boolean;
  readonly created_at: string;
}

export interface SearchProjectCheckRow {
  readonly id: string;
  readonly project_id: string;
  readonly checked_at: string;
  readonly listings_found: number;
  readonly new_listings: number;
  readonly emails_sent: number;
  readonly triggered_by: CheckTrigger;
  readonly error_message: string | null;
}

// ── Client-facing types (camelCase, used in UI) ──

export interface SearchProject {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly searchUrl: string;
  readonly status: ProjectStatus;
  readonly scoreThreshold: number;
  readonly checkIntervalHours: number;
  readonly notificationEmail: string;
  readonly emailNotificationsEnabled: boolean;
  readonly propertyType: PropertyInvestmentType;
  readonly rentPerUnit: number;
  readonly lastCheckedAt: string | null;
  readonly nextCheckAt: string | null;
  readonly errorMessage: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  // Computed fields (from JOINs)
  readonly totalListings?: number;
  readonly newListingsSinceLastCheck?: number;
}

export interface SearchProjectListing {
  readonly id: string;
  readonly projectId: string;
  readonly userId: string;
  readonly immowebId: string;
  readonly listingUrl: string;
  readonly propertyId: string | null;
  readonly score: number | null;
  readonly title: string | null;
  readonly price: number | null;
  readonly city: string | null;
  readonly thumbnailUrl: string | null;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  readonly isActive: boolean;
  readonly emailSent: boolean;
  readonly createdAt: string;
}

export interface SearchProjectCheck {
  readonly id: string;
  readonly projectId: string;
  readonly checkedAt: string;
  readonly listingsFound: number;
  readonly newListings: number;
  readonly emailsSent: number;
  readonly triggeredBy: CheckTrigger;
  readonly errorMessage: string | null;
}

// ── Input types ──

export interface CreateSearchProjectInput {
  readonly name: string;
  readonly searchUrl: string;
  readonly scoreThreshold?: number;
  readonly checkIntervalHours?: number;
  readonly notificationEmail: string;
  readonly emailNotificationsEnabled?: boolean;
  readonly propertyType?: PropertyInvestmentType;
  readonly rentPerUnit?: number;
}

export interface UpdateSearchProjectInput {
  readonly name?: string;
  readonly scoreThreshold?: number;
  readonly checkIntervalHours?: number;
  readonly notificationEmail?: string;
  readonly emailNotificationsEnabled?: boolean;
  readonly propertyType?: PropertyInvestmentType;
  readonly rentPerUnit?: number;
  readonly status?: 'active' | 'paused';
}

// ── Scraping result type ──

export interface ImmowebSearchResult {
  readonly immowebId: string;
  readonly listingUrl: string;
  readonly title: string | null;
  readonly price: number | null;
  readonly city: string | null;
  readonly thumbnailUrl: string | null;
}

// ── API response types ──

export interface SearchProjectWithDetails extends SearchProject {
  readonly listings: SearchProjectListing[];
  readonly checks: SearchProjectCheck[];
}

export interface RunCheckResult {
  readonly newListings: number;
  readonly analyzed: number;
  readonly emailsSent: number;
}

// ── Row-to-client mappers ──

export function mapProjectRow(row: SearchProjectRow): SearchProject {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    searchUrl: row.search_url,
    status: row.status,
    scoreThreshold: row.score_threshold,
    checkIntervalHours: row.check_interval_hours,
    notificationEmail: row.notification_email,
    emailNotificationsEnabled: row.email_notifications_enabled,
    propertyType: row.property_type,
    rentPerUnit: row.rent_per_unit,
    lastCheckedAt: row.last_checked_at,
    nextCheckAt: row.next_check_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapListingRow(row: SearchProjectListingRow): SearchProjectListing {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    immowebId: row.immoweb_id,
    listingUrl: row.listing_url,
    propertyId: row.property_id,
    score: row.score,
    title: row.title,
    price: row.price,
    city: row.city,
    thumbnailUrl: row.thumbnail_url,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    isActive: row.is_active,
    emailSent: row.email_sent,
    createdAt: row.created_at,
  };
}

export function mapCheckRow(row: SearchProjectCheckRow): SearchProjectCheck {
  return {
    id: row.id,
    projectId: row.project_id,
    checkedAt: row.checked_at,
    listingsFound: row.listings_found,
    newListings: row.new_listings,
    emailsSent: row.emails_sent,
    triggeredBy: row.triggered_by,
    errorMessage: row.error_message,
  };
}

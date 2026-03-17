import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Updates the Supabase session and returns appropriate response
 * Used in Next.js middleware to refresh auth tokens
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT run supabase.auth.getUser() between createServerClient
  // and supabaseResponse. This refreshes the session if expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public routes that don't require authentication
  const publicPaths = ['/login', '/signup', '/auth/callback', '/auth/confirm', '/auth/signout'];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Auth callback/confirm routes should NEVER be redirected (even for authenticated users)
  const isAuthFlow = request.nextUrl.pathname.startsWith('/auth/');

  // Also allow API auth routes
  const isAuthApiRoute = request.nextUrl.pathname.startsWith('/api/auth');

  // Allow internal processing routes (called server-to-server without cookies)
  const internalApiPaths = ['/api/scraping/process', '/api/analysis/process', '/api/inngest', '/api/cron', '/api/search-projects'];
  const isInternalApi = internalApiPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Allow the landing page
  const isLandingPage = request.nextUrl.pathname === '/';

  if (!user && !isPublicPath && !isAuthApiRoute && !isInternalApi && !isLandingPage) {
    // Redirect unauthenticated users to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login/signup pages only
  // Do NOT redirect from /auth/* routes (callback, confirm, signout)
  if (user && isPublicPath && !isAuthFlow) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

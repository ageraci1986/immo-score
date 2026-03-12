import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /auth/signout
 * Signs out the current user
 */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createClient();
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`, {
    status: 302,
  });
}

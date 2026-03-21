'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Detects Supabase invite callback (hash fragment with type=invite)
 * and redirects to /auth/set-password after exchanging the session.
 */
export function InviteRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('type=invite')) return;

    // Supabase client-side auto-detects the hash and sets the session.
    // We just need to wait for it, then redirect.
    const supabase = createClient();

    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Clear the hash and redirect to set-password
        window.location.replace('/auth/set-password');
      }
    });
  }, [router]);

  return null;
}

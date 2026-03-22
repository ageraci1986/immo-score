'use client';

import { useEffect } from 'react';

/**
 * Detects Supabase invite callback (hash fragment with type=invite)
 * and redirects to /auth/set-password, preserving the hash so Supabase
 * can establish the session on the destination page.
 */
export function InviteRedirect(): null {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('type=invite')) return;

    // Redirect immediately with the hash fragment preserved.
    // Supabase JS will pick up the access_token from the hash
    // on the set-password page and establish the session there.
    window.location.replace('/auth/set-password' + hash);
  }, []);

  return null;
}

import { createClient } from './server';
import { prisma } from '@/lib/db/client';

interface AuthUser {
  id: string;        // Prisma User id
  supabaseId: string; // Supabase auth user id
  email: string;
}

/**
 * Gets the authenticated user from Supabase and ensures a matching Prisma user exists.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  // Find or create the Prisma user
  const dbUser = await prisma.user.upsert({
    where: { supabaseId: user.id },
    update: { email: user.email },
    create: {
      supabaseId: user.id,
      email: user.email,
    },
    select: { id: true, supabaseId: true, email: true },
  });

  return dbUser;
}

/**
 * Requires authentication. Throws if not authenticated.
 * Use in API routes for protected endpoints.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

import { createClient } from './server';
import { prisma } from '@/lib/db/client';
import type { UserRole } from '@/lib/permissions';

export interface AuthUser {
  id: string;
  supabaseId: string;
  email: string;
  role: UserRole;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const dbUser = await prisma.user.upsert({
    where: { supabaseId: user.id },
    update: { email: user.email },
    create: {
      supabaseId: user.id,
      email: user.email,
      role: 'user_basic',
    },
    select: { id: true, supabaseId: true, email: true, role: true },
  });

  return {
    id: dbUser.id,
    supabaseId: dbUser.supabaseId,
    email: dbUser.email,
    role: dbUser.role as UserRole,
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) throw new Error('Forbidden');
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  return requireRole(['admin']);
}

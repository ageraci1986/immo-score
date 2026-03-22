'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';
import type { UserRole } from '@/lib/permissions';

interface RoleGuardProps {
  readonly allowedRoles: UserRole[];
  readonly children: React.ReactNode;
  readonly fallback?: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps): JSX.Element | null {
  const { user, isLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !allowedRoles.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [isLoading, user, allowedRoles, router]);

  if (isLoading) {
    return fallback ? <>{fallback}</> : null;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}

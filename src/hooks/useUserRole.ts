'use client';

import { useEffect, useState } from 'react';
import type { UserRole } from '@/lib/permissions';

interface UserWithRole {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export function useUserRole(): { user: UserWithRole | null; isLoading: boolean } {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setUser(json.data as UserWithRole);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { user, isLoading };
}

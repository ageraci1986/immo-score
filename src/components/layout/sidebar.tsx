'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Home,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/properties', label: 'Mes Biens', icon: Home },
  { href: '/reports', label: 'Rapports', icon: BarChart3 },
];

interface UserData {
  email: string;
  name: string;
  avatarUrl?: string;
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }): JSX.Element {
  const Icon = item.icon;
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors',
        isActive
          ? 'bg-primary-900/5 text-primary-900'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      )}
    >
      <Icon className="w-5 h-5 mr-3" />
      {item.label}
    </Link>
  );
}

function useAuthUser(): UserData | null {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        setUser({
          email: authUser.email ?? '',
          name: (authUser.user_metadata as Record<string, string>)?.['full_name'] ?? authUser.email ?? '',
          avatarUrl: (authUser.user_metadata as Record<string, string>)?.['avatar_url'],
        });
      }
    });
  }, []);

  return user;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthUser();
  const [signingOut, setSigningOut] = useState(false);

  const isSettingsActive = pathname === '/settings' || pathname.startsWith('/settings/');

  const handleSignOut = async (): Promise<void> => {
    setSigningOut(true);
    try {
      await fetch('/auth/signout', { method: 'POST' });
      router.push('/login');
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col justify-between z-20">
      {/* Logo + Nav */}
      <div>
        <div className="h-20 flex items-center px-8 border-b border-slate-100">
          <Link href="/dashboard" className="text-2xl font-bold text-primary-900 tracking-tight">
            Immo<span className="text-primary-500">Score</span>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="p-4 space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>

      {/* Bottom section: Settings + User */}
      <div>
        {/* Settings link */}
        <div className="px-4 pb-2">
          <Link
            href="/settings"
            className={cn(
              'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors',
              isSettingsActive
                ? 'bg-primary-900/5 text-primary-900'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <Settings className="w-5 h-5 mr-3" />
            Réglages
          </Link>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center px-2 py-2 text-sm font-medium text-slate-600">
            <Avatar className="w-8 h-8 mr-3">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
              <AvatarFallback>{user ? getInitials(user.name) : 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate">{user?.name || 'Utilisateur'}</p>
              {user?.email && (
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4 mr-3" />
            {signingOut ? 'Déconnexion...' : 'Se déconnecter'}
          </button>
        </div>
      </div>
    </aside>
  );
}

// Mobile sidebar (sheet-based)
export function MobileSidebar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthUser();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async (): Promise<void> => {
    setSigningOut(true);
    try {
      await fetch('/auth/signout', { method: 'POST' });
      router.push('/login');
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-slate-100">
        <Link href="/dashboard" className="text-2xl font-bold text-primary-900 tracking-tight">
          Immo<span className="text-primary-500">Score</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {mainNavItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {/* Settings in mobile nav */}
        <NavLink
          item={{ href: '/settings', label: 'Réglages', icon: Settings }}
          pathname={pathname}
        />
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-100 space-y-2">
        <div className="flex items-center px-4 py-2">
          <Avatar className="w-8 h-8 mr-3">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback>{user ? getInitials(user.name) : 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'Utilisateur'}</p>
            {user?.email && (
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center px-4 py-2 text-sm font-medium text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-4 h-4 mr-3" />
          {signingOut ? 'Déconnexion...' : 'Se déconnecter'}
        </button>
      </div>
    </div>
  );
}

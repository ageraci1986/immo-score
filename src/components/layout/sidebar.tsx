'use client';

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

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/properties', label: 'Mes Biens', icon: Home },
  { href: '/reports', label: 'Rapports', icon: BarChart3 },
];

interface SidebarProps {
  user?: {
    name: string;
    email?: string;
    image?: string;
  };
}

export function Sidebar({ user }: SidebarProps): JSX.Element {
  const pathname = usePathname();

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between hidden md:flex z-20">
      {/* Logo */}
      <div>
        <div className="h-20 flex items-center px-8 border-b border-slate-100">
          <Link href="/dashboard" className="text-2xl font-bold text-primary-900 tracking-tight">
            Immo<span className="text-primary-500">Score</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
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
          })}
        </nav>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <button className="flex items-center flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors">
            <Avatar className="w-8 h-8 mr-3">
              {user?.image && <AvatarImage src={user.image} alt={user.name} />}
              <AvatarFallback>{user ? getInitials(user.name) : 'U'}</AvatarFallback>
            </Avatar>
            <span className="truncate">{user?.name || 'Utilisateur'}</span>
          </button>
          <button
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            title="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// Mobile sidebar (sheet-based)
export function MobileSidebar({ user }: SidebarProps): JSX.Element {
  const pathname = usePathname();

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
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
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-100 space-y-2">
        <div className="flex items-center px-4 py-2">
          <Avatar className="w-8 h-8 mr-3">
            {user?.image && <AvatarImage src={user.image} alt={user.name} />}
            <AvatarFallback>{user ? getInitials(user.name) : 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'Utilisateur'}</p>
            {user?.email && (
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            )}
          </div>
        </div>
        <button className="w-full flex items-center px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors">
          <LogOut className="w-4 h-4 mr-3" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

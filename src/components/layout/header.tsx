'use client';

import { Plus, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onAddClick?: () => void;
  addButtonLabel?: string;
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
  onMenuClick?: () => void;
}

export function Header({
  title,
  subtitle,
  badge,
  showSearch,
  searchPlaceholder = 'Rechercher...',
  onSearch,
  onAddClick,
  addButtonLabel = 'Ajouter un bien',
  children,
  className,
  sticky = true,
  onMenuClick,
}: HeaderProps): JSX.Element {
  return (
    <header
      className={cn(
        'bg-white/70 backdrop-blur-md border-b border-slate-200 h-20 px-8 flex items-center justify-between z-10',
        sticky && 'sticky top-0',
        className
      )}
    >
      <div className="flex items-center">
        {/* Mobile menu button */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="mr-4 p-2 text-slate-500 hover:text-slate-900 md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Custom children (filters, etc.) */}
        {children}

        {/* Search */}
        {showSearch && (
          <SearchInput
            placeholder={searchPlaceholder}
            icon={<Search className="w-4 h-4" />}
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-64 hidden md:flex"
          />
        )}

        {/* Add button */}
        {onAddClick && (
          <Button variant="gradient" onClick={onAddClick} className="shadow-md shadow-emerald-200 transform hover:scale-105 transition-all">
            <Plus className="w-5 h-5 mr-2" />
            {addButtonLabel}
          </Button>
        )}
      </div>
    </header>
  );
}

// Simple header for detail pages
interface SimpleHeaderProps {
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export function SimpleHeader({
  backHref,
  backLabel = 'Retour au Dashboard',
  onBack,
  meta,
  actions,
}: SimpleHeaderProps): JSX.Element {
  const BackWrapper = backHref ? 'a' : 'button';

  return (
    <nav className="bg-white border-b border-slate-200 h-16 flex items-center px-8 sticky top-0 z-30">
      <BackWrapper
        href={backHref}
        onClick={onBack}
        className="text-slate-500 hover:text-slate-900 flex items-center text-sm font-medium transition-colors"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        {backLabel}
      </BackWrapper>

      <div className="ml-auto flex items-center space-x-4">
        {meta}
        {actions}
      </div>
    </nav>
  );
}

'use client';

import { useState } from 'react';
import { Sidebar, MobileSidebar } from './sidebar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email?: string;
    image?: string;
  };
}

export function AppLayout({ children, user }: AppLayoutProps): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <Sidebar user={user} />

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white z-50 md:hidden animate-slide-in-from-left">
            <MobileSidebar user={user} />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
}

// Simple layout without sidebar (for detail pages, auth pages)
interface SimpleLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function SimpleLayout({ children, className }: SimpleLayoutProps): JSX.Element {
  return (
    <div className={cn('min-h-screen bg-slate-50', className)}>
      {children}
    </div>
  );
}

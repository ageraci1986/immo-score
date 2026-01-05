'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScoreBadge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface PropertyCardProps {
  id: string;
  title: string;
  location: string;
  price: number;
  score: number;
  roi?: number;
  cashflow?: number;
  surface?: number;
  imageUrl?: string;
  status?: 'analyzing' | 'ready' | 'shortlist' | 'offer' | 'archived';
  addedAt?: string;
  warning?: string;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  showCheckbox?: boolean;
  className?: string;
}

export function PropertyCard({
  id,
  title,
  location,
  price,
  score,
  roi,
  cashflow,
  surface,
  imageUrl,
  status,
  addedAt,
  warning,
  selected = false,
  onSelect,
  showCheckbox = false,
  className,
}: PropertyCardProps): JSX.Element {
  const getStatusBadge = (): React.ReactNode => {
    switch (status) {
      case 'shortlist':
        return (
          <span className="bg-ai text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wide">
            Shortlist
          </span>
        );
      case 'offer':
        return (
          <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wide">
            Offre En cours
          </span>
        );
      case 'analyzing':
        return (
          <span className="bg-ai/80 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wide flex items-center">
            <span className="animate-spin mr-1">⚡</span> Analyse...
          </span>
        );
      default:
        return null;
    }
  };

  const isLowScore = score < 50;
  const isSelected = selected;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all hover:-translate-y-1',
        isSelected
          ? 'border-2 border-ai/50 shadow-lg shadow-indigo-100'
          : 'hover:shadow-xl',
        isLowScore && 'opacity-70 hover:opacity-100',
        className
      )}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <div
          className={cn(
            'absolute top-3 left-3 z-10 transition-opacity',
            !isSelected && 'opacity-0 group-hover:opacity-100'
          )}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(checked: boolean) => onSelect?.(id, checked)}
          />
        </div>
      )}

      {/* Image Area */}
      <Link href={`/properties/${id}`} className="block relative h-44">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className={cn(
              'object-cover transition-all',
              !isSelected && 'grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100'
            )}
          />
        ) : (
          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
            <Home className="w-12 h-12 text-slate-400" />
          </div>
        )}

        {/* Score Badge */}
        <div className="absolute top-3 right-3">
          <ScoreBadge score={score} />
        </div>

        {/* Status Badge */}
        {status && (
          <div className="absolute bottom-3 left-3">
            {getStatusBadge()}
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-900 truncate pr-4">{title}</h3>
            <p className="text-xs text-slate-500">{location}</p>
          </div>
          <p className="font-bold text-slate-800 whitespace-nowrap">
            {formatCurrency(price).replace('€', '')}k €
          </p>
        </div>

        {/* Mini metrics */}
        {warning ? (
          <div className="mt-4 mb-4 bg-red-50 border border-red-100 rounded-lg p-2 flex items-center">
            <AlertTriangle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-xs text-red-700 font-medium line-clamp-1">{warning}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-4 mb-4">
            <div className={cn('rounded-lg p-2 text-center', roi && roi >= 6 ? 'bg-emerald-50' : 'bg-slate-50')}>
              <span className="block text-[10px] text-slate-500 uppercase">ROI</span>
              <span className={cn('block text-sm font-bold', roi && roi >= 6 ? 'text-emerald-700' : 'text-slate-700')}>
                {roi ? `${roi.toFixed(1)}%` : '-'}
              </span>
            </div>
            <div className={cn('rounded-lg p-2 text-center', cashflow && cashflow > 0 ? 'bg-emerald-50' : 'bg-slate-50')}>
              <span className="block text-[10px] text-slate-500 uppercase">
                {cashflow !== undefined ? 'Cashflow' : 'Surface'}
              </span>
              <span className={cn('block text-sm font-bold', cashflow && cashflow > 0 ? 'text-emerald-700' : 'text-slate-700')}>
                {cashflow !== undefined ? `${cashflow > 0 ? '+' : ''}${cashflow}€` : surface ? `${surface}m²` : '-'}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {addedAt || 'Récemment ajouté'}
          </span>
          <Link
            href={`/properties/${id}`}
            className={cn(
              'text-xs font-medium hover:underline',
              isSelected ? 'text-ai hover:text-indigo-800' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Voir détails →
          </Link>
        </div>
      </div>
    </Card>
  );
}

// Add new property card (empty state)
interface AddPropertyCardProps {
  onClick?: () => void;
}

export function AddPropertyCard({ onClick }: AddPropertyCardProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-slate-100 transition-colors min-h-[280px]"
    >
      <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
        <svg
          className="w-6 h-6 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </div>
      <h4 className="text-slate-900 font-medium">Nouvelle Analyse</h4>
      <p className="text-slate-500 text-sm mt-1">Collez une URL Immoweb</p>
    </button>
  );
}

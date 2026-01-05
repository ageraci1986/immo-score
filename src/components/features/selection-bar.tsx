'use client';

import { BarChart3, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionBarProps {
  count: number;
  onCompare?: () => void;
  onDelete?: () => void;
  onClear: () => void;
  className?: string;
}

export function SelectionBar({
  count,
  onCompare,
  onDelete,
  onClear,
  className,
}: SelectionBarProps): JSX.Element | null {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center space-x-6 animate-slide-in-from-bottom',
        className
      )}
    >
      <span className="font-medium text-sm border-r border-slate-700 pr-4">
        {count} bien{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}
      </span>

      {onCompare && (
        <button
          onClick={onCompare}
          className="flex items-center text-sm font-medium hover:text-ai transition-colors"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Comparer
        </button>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          className="flex items-center text-sm font-medium hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Supprimer
        </button>
      )}

      <button
        onClick={onClear}
        className="bg-white text-slate-900 rounded-full p-1 hover:bg-slate-200 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

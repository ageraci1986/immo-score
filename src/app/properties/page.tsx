'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  SlidersHorizontal,
  BarChart3,
  Trash2,
  X,
  Home,
  AlertTriangle,
} from 'lucide-react';
import { useProperties, useDeleteProperty } from '@/hooks/use-properties';
import { AddPropertyModal } from '@/components/features/add-property-modal';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/layout/sidebar';
import type { Property } from '@/types';

type FilterStatus = 'all' | 'analyzing' | 'favorites' | 'offers';
type SortOption = 'date' | 'score' | 'roi' | 'price';
type ViewMode = 'grid' | 'list';

export default function PropertiesPage(): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('roi');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: properties, isLoading, error } = useProperties();
  const deleteProperty = useDeleteProperty();

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    if (!properties) return [];

    let filtered = [...properties];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(query) ||
          p.address?.toLowerCase().includes(query) ||
          p.location?.toLowerCase().includes(query)
      );
    }

    // Status filter
    switch (filterStatus) {
      case 'analyzing':
        filtered = filtered.filter(
          (p) => p.status === 'SCRAPING' || p.status === 'ANALYZING'
        );
        break;
      case 'favorites':
        filtered = filtered.filter((p) => p.isFavorite);
        break;
      case 'offers':
        // In the future, filter by offer status
        break;
    }

    // Sort
    switch (sortBy) {
      case 'score':
        filtered.sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));
        break;
      case 'roi':
        filtered.sort(
          (a, b) =>
            (b.rentabilityData?.netYield ?? 0) -
            (a.rentabilityData?.netYield ?? 0)
        );
        break;
      case 'price':
        filtered.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case 'date':
      default:
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return filtered;
  }, [properties, searchQuery, filterStatus, sortBy]);

  // Selection handlers
  const handleSelect = (id: string, selected: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleClearSelection = (): void => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = (): void => {
    selectedIds.forEach((id) => {
      deleteProperty.mutate(id);
    });
    setSelectedIds(new Set());
  };

  // Count stats
  const analyzingCount =
    properties?.filter(
      (p) => p.status === 'SCRAPING' || p.status === 'ANALYZING'
    ).length ?? 0;
  const favoritesCount = properties?.filter((p) => p.isFavorite).length ?? 0;

  const filterButtons: { key: FilterStatus; label: string; count?: number }[] = [
    { key: 'all', label: 'Tout' },
    { key: 'analyzing', label: 'En cours', count: analyzingCount },
    { key: 'favorites', label: 'Favoris', count: favoritesCount },
    { key: 'offers', label: 'Offres faites', count: 0 },
  ];

  const sortLabels: Record<SortOption, string> = {
    roi: 'ROI décroissant',
    score: 'Score décroissant',
    price: 'Prix croissant',
    date: 'Date récente',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 h-20 px-8 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-slate-800 mr-4">Portefeuille</h2>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              {properties?.length ?? 0} Biens
            </span>
          </div>

          {/* CONTROLS */}
          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher (ville, rue...)"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:border-ai focus:ring-1 focus:ring-ai"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* View Toggle */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded',
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded',
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Main CTA */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-lg transition-transform hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau
            </button>
          </div>
        </header>

        {/* FILTRES SECONDAIRES */}
        <div className="px-8 py-4 bg-slate-50/50 flex items-center space-x-2 border-b border-slate-200 overflow-x-auto">
          {filterButtons.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterStatus(filter.key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                filterStatus === filter.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              {filter.label}
              {filter.count !== undefined && filter.count > 0 && ` (${filter.count})`}
            </button>
          ))}

          <div className="w-px h-6 bg-slate-300 mx-2" />

          {/* Sort */}
          <button
            className="flex items-center px-3 py-1.5 rounded-lg text-slate-500 text-xs font-medium hover:bg-slate-100"
            onClick={() => {
              const options: SortOption[] = ['roi', 'score', 'price', 'date'];
              const currentIndex = options.indexOf(sortBy);
              const nextOption = options[(currentIndex + 1) % options.length];
              if (nextOption) {
                setSortBy(nextOption);
              }
            }}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            Trier par : {sortLabels[sortBy]}
          </button>
        </div>

        {/* CONTENT SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
              {[...Array(8)].map((_, i) => (
                <PropertyCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 rounded-2xl p-12 text-center border border-red-100">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-2xl">❌</span>
              </div>
              <h3 className="text-xl font-semibold text-red-900 mb-2">
                Erreur de chargement
              </h3>
              <p className="text-red-700">
                {error instanceof Error
                  ? error.message
                  : 'Une erreur est survenue'}
              </p>
            </div>
          ) : filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  selected={selectedIds.has(property.id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-slate-100 transition-colors w-64">
                <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-slate-400" />
                </div>
                <h4 className="text-slate-900 font-medium">Nouvelle Analyse</h4>
                <p className="text-slate-500 text-sm mt-1">Collez une URL Immoweb</p>
              </div>
            </div>
          )}
        </div>

        {/* FLOATING ACTION BAR */}
        {selectedIds.size > 0 && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center space-x-6 animate-fade-in">
            <span className="font-medium text-sm border-r border-slate-700 pr-4">
              {selectedIds.size} bien{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </span>

            <button className="flex items-center text-sm font-medium hover:text-ai transition-colors">
              <BarChart3 className="w-4 h-4 mr-2" />
              Comparer
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center text-sm font-medium hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </button>

            <button
              onClick={handleClearSelection}
              className="bg-white text-slate-900 rounded-full p-1 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* Modal */}
      <AddPropertyModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}

// Property Card matching the mockup
interface PropertyCardProps {
  property: Property;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}

function PropertyCard({ property, selected, onSelect }: PropertyCardProps): JSX.Element {
  const score = property.aiScore ?? 0;
  const roi = property.rentabilityData?.netYield;
  const cashflow = property.rentabilityData?.cashFlow;
  const isAnalyzing = property.status === 'SCRAPING' || property.status === 'ANALYZING';

  // Score color
  const scoreColor = score >= 70 ? 'emerald' : score >= 50 ? 'yellow' : 'red';

  // Format price
  const formatPrice = (price: number): string => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M €`;
    }
    return `${Math.round(price / 1000)}k €`;
  };

  // Determine status badge
  const getStatusBadge = () => {
    if (property.isFavorite) {
      return (
        <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wide">
          Shortlist
        </span>
      );
    }
    // Add more status badges as needed
    return null;
  };

  return (
    <div
      className={cn(
        'group relative bg-white rounded-2xl overflow-hidden transition-all hover:-translate-y-1',
        selected
          ? 'border-2 border-ai/50 shadow-lg shadow-indigo-100'
          : 'border border-slate-200 shadow-sm hover:shadow-xl'
      )}
    >
      {/* Selection Checkbox */}
      <div
        className={cn(
          'absolute top-3 left-3 z-10 transition-opacity',
          !selected && 'opacity-0 group-hover:opacity-100'
        )}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={(checked: boolean) => onSelect(property.id, checked)}
        />
      </div>

      {/* Image Area */}
      <Link href={`/properties/${property.id}`} className="block relative h-44">
        {(property.photos?.[0]?.publicUrl || property.photos?.[0]?.url) ? (
          <Image
            src={property.photos[0].publicUrl || property.photos[0].url}
            alt={property.title || 'Bien immobilier'}
            fill
            className={cn(
              'object-cover transition-all',
              !selected && 'grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100'
            )}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
            <Home className="w-12 h-12 text-slate-300" />
          </div>
        )}

        {/* Score Badge */}
        {!isAnalyzing && score > 0 && (
          <div
            className={cn(
              'absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full shadow-sm',
              scoreColor === 'emerald' && 'border border-emerald-100',
              scoreColor === 'yellow' && 'border border-yellow-100',
              scoreColor === 'red' && 'border border-red-100'
            )}
          >
            <span
              className={cn(
                'text-xs font-bold',
                scoreColor === 'emerald' && 'text-emerald-800',
                scoreColor === 'yellow' && 'text-yellow-700',
                scoreColor === 'red' && 'text-red-600'
              )}
            >
              {score}/100
            </span>
          </div>
        )}

        {/* Analyzing Badge */}
        {isAnalyzing && (
          <div className="absolute top-3 right-3 bg-ai/90 backdrop-blur px-2.5 py-1 rounded-full flex items-center">
            <span className="animate-spin h-2 w-2 border-2 border-white border-t-transparent rounded-full mr-1.5"></span>
            <span className="text-xs font-medium text-white">Analyse...</span>
          </div>
        )}

        {/* Status Badge */}
        {getStatusBadge() && (
          <div className="absolute bottom-3 left-3">
            {getStatusBadge()}
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="font-bold text-slate-900 truncate">
              {property.title || 'Bien immobilier'}
            </h3>
            <p className="text-xs text-slate-500">
              {property.location || property.address || 'Localisation inconnue'}
            </p>
          </div>
          <p className="font-bold text-slate-800 whitespace-nowrap">
            {property.price ? formatPrice(property.price) : '—'}
          </p>
        </div>

        {/* Mini metrics or Warning */}
        {score < 40 && score > 0 ? (
          <div className="mt-4 mb-4 bg-red-50 border border-red-100 rounded-lg p-2 flex items-center">
            <AlertTriangle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-xs text-red-700 font-medium line-clamp-1">
              Score faible - À vérifier
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-4 mb-4">
            <div
              className={cn(
                'rounded-lg p-2 text-center',
                roi && roi >= 6 ? 'bg-emerald-50' : 'bg-slate-50'
              )}
            >
              <span className="block text-[10px] text-slate-500 uppercase">ROI</span>
              <span
                className={cn(
                  'block text-sm font-bold',
                  roi && roi >= 6 ? 'text-emerald-700' : 'text-slate-700'
                )}
              >
                {roi ? `${roi.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div
              className={cn(
                'rounded-lg p-2 text-center',
                cashflow && cashflow > 0 ? 'bg-emerald-50' : 'bg-slate-50'
              )}
            >
              <span className="block text-[10px] text-slate-500 uppercase">
                {cashflow !== undefined ? 'Cashflow' : 'Surface'}
              </span>
              <span
                className={cn(
                  'block text-sm font-bold',
                  cashflow && cashflow > 0 ? 'text-emerald-700' : 'text-slate-700'
                )}
              >
                {cashflow !== undefined
                  ? `${cashflow > 0 ? '+' : ''}${Math.round(cashflow)}€`
                  : property.surface
                    ? `${property.surface}m²`
                    : '—'}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {formatRelativeDate(property.createdAt)}
          </span>
          <Link
            href={`/properties/${property.id}`}
            className={cn(
              'text-xs font-medium hover:underline',
              selected ? 'text-ai hover:text-indigo-800' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Voir détails →
          </Link>
        </div>
      </div>
    </div>
  );
}

// Skeleton for loading state
function PropertyCardSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-3 w-24" />
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
        <div className="pt-3 border-t border-slate-50 flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

function formatRelativeDate(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Ajouté aujourd'hui";
  if (diffDays === 1) return 'Ajouté hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30)
    return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  return `Il y a ${Math.floor(diffDays / 30)} mois`;
}

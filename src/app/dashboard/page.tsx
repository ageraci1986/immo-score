'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Building2, Zap, Plus, Home, BarChart3, LayoutGrid } from 'lucide-react';
import { useProperties } from '@/hooks/use-properties';
import { AddPropertyModal } from '@/components/features/add-property-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';

export default function DashboardPage(): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: properties, isLoading, error } = useProperties();

  // Calculate stats
  const totalProperties = properties?.length ?? 0;
  const inProgressCount =
    properties?.filter(
      (p) => p.status === 'SCRAPING' || p.status === 'ANALYZING'
    ).length ?? 0;
  const completedProperties =
    properties?.filter((p) => p.status === 'COMPLETED') ?? [];
  const avgScore =
    completedProperties.length > 0
      ? Math.round(
          completedProperties.reduce((sum, p) => sum + (p.aiScore ?? 0), 0) /
            completedProperties.length
        )
      : 0;
  const avgRentability =
    completedProperties.length > 0 &&
    completedProperties.some(
      (p) =>
        p.rentabilityData &&
        typeof p.rentabilityData === 'object' &&
        'netYield' in p.rentabilityData
    )
      ? (
          completedProperties
            .filter(
              (p) =>
                p.rentabilityData &&
                typeof p.rentabilityData === 'object' &&
                'netYield' in p.rentabilityData
            )
            .reduce(
              (sum, p) =>
                sum +
                ((p.rentabilityData as { netYield: number }).netYield ?? 0),
              0
            ) /
          completedProperties.filter(
            (p) =>
              p.rentabilityData &&
              typeof p.rentabilityData === 'object' &&
              'netYield' in p.rentabilityData
          ).length
        ).toFixed(1)
      : '0';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-col justify-between hidden md:flex z-20">
        <div>
          <div className="h-20 flex items-center px-8 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              Immo<span className="text-accent">Score</span>
            </h1>
          </div>
          <nav className="p-4 space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center px-4 py-3 text-sm font-medium bg-primary/5 text-primary rounded-xl"
            >
              <LayoutGrid className="w-5 h-5 mr-3" />
              Dashboard
            </Link>
            <Link
              href="/properties"
              className="flex items-center px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
            >
              <Home className="w-5 h-5 mr-3" />
              Mes Biens
            </Link>
            <Link
              href="/reports"
              className="flex items-center px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
            >
              <BarChart3 className="w-5 h-5 mr-3" />
              Rapports
            </Link>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-100">
          <button className="flex items-center w-full px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <div className="w-8 h-8 rounded-full bg-slate-200 mr-3 flex items-center justify-center font-bold text-xs">
              JD
            </div>
            Jean Dupont
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Header */}
        <header className="h-20 glass-effect sticky top-0 z-10 border-b border-slate-200 px-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Vue d&apos;ensemble</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-gradient px-5 py-2.5 rounded-lg text-sm font-medium flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Ajouter un bien
          </button>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* KPI BENTO GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* KPI 1 - Biens Analysés */}
            <div className="kpi-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Biens Analysés</p>
                  <h3 className="text-3xl font-bold text-slate-800 mt-2">{totalProperties}</h3>
                </div>
                <span className="p-2 bg-slate-50 rounded-lg text-slate-400">
                  <Building2 className="w-6 h-6" />
                </span>
              </div>
            </div>

            {/* KPI 2 - Analyses en cours */}
            <div className="kpi-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Analyses en cours</p>
                  <div className="flex items-center mt-2">
                    <h3 className="text-3xl font-bold text-slate-800">{inProgressCount}</h3>
                    {inProgressCount > 0 && (
                      <span className="ml-2 flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ai opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-ai"></span>
                      </span>
                    )}
                  </div>
                </div>
                <span className="p-2 bg-indigo-50 rounded-lg text-ai">
                  <Zap className="w-6 h-6" />
                </span>
              </div>
            </div>

            {/* KPI 3 - Score Moyen */}
            <div className="kpi-card relative overflow-hidden">
              <div className="flex justify-between items-start z-10 relative">
                <div>
                  <p className="text-sm font-medium text-slate-500">Score Moyen</p>
                  <h3 className="text-3xl font-bold text-emerald-600 mt-2">
                    {avgScore}<span className="text-lg text-emerald-400">/100</span>
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-full border-4 border-emerald-100 border-t-emerald-500 flex items-center justify-center"></div>
              </div>
            </div>

            {/* KPI 4 - Rentabilité Moy. */}
            <div className="kpi-card">
              <div>
                <p className="text-sm font-medium text-slate-500">Rentabilité Moy.</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-2">{avgRentability}%</h3>
              </div>
              <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(parseFloat(avgRentability) * 10, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* SECTION TITRE + FILTRES */}
          <div className="flex items-center justify-between mt-8">
            <h3 className="text-lg font-bold text-slate-800">Analyses Récentes</h3>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-600 hover:border-slate-400 transition-colors">
                Date
              </button>
              <button className="px-3 py-1 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-600 hover:border-slate-400 transition-colors">
                Score
              </button>
            </div>
          </div>

          {/* LISTE DES BIENS (GRID) */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
              {[...Array(3)].map((_, i) => (
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
          ) : properties && properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
              {properties.slice(0, 5).map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
              <AddPropertyCard onClick={() => setIsModalOpen(true)} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
              <AddPropertyCard onClick={() => setIsModalOpen(true)} />
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      <AddPropertyModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}

// Property Card Component matching the mockup
function PropertyCard({ property }: { property: Property }): JSX.Element {
  const score = property.aiScore ?? 0;
  const roi = property.rentabilityData?.netYield;
  const isAnalyzing = property.status === 'SCRAPING' || property.status === 'ANALYZING';

  // Determine score color
  const scoreColor = score >= 70 ? 'emerald' : score >= 50 ? 'yellow' : 'red';

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden block"
    >
      {/* Image */}
      <div className="relative h-48 bg-slate-200">
        {(property.photos?.[0]?.publicUrl || property.photos?.[0]?.url) ? (
          <Image
            src={property.photos[0].publicUrl || property.photos[0].url}
            alt={property.title || 'Bien immobilier'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-12 h-12 text-slate-300" />
          </div>
        )}

        {/* Score Badge */}
        {!isAnalyzing && score > 0 && (
          <div className={cn(
            "absolute top-4 right-4 score-badge",
            scoreColor === 'emerald' && 'score-badge-excellent',
            scoreColor === 'yellow' && 'score-badge-good',
            scoreColor === 'red' && 'score-badge-poor'
          )}>
            <span className={cn(
              "h-2 w-2 rounded-full mr-2",
              scoreColor === 'emerald' && 'bg-emerald-500',
              scoreColor === 'yellow' && 'bg-yellow-500',
              scoreColor === 'red' && 'bg-red-500'
            )}></span>
            <span className={cn(
              "text-sm font-bold",
              scoreColor === 'emerald' && 'text-emerald-800',
              scoreColor === 'yellow' && 'text-yellow-800',
              scoreColor === 'red' && 'text-red-800'
            )}>{score}/100</span>
          </div>
        )}

        {/* Analyzing Badge */}
        {isAnalyzing && (
          <div className="absolute top-4 right-4 bg-ai/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center">
            <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-2"></span>
            <span className="text-sm font-medium text-white">Analyse...</span>
          </div>
        )}

        {/* Location Badge */}
        {property.location && (
          <div className="absolute bottom-4 left-4 location-badge">
            {property.location}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex justify-between items-end mb-2">
          <h4 className="text-xl font-bold text-slate-900">
            {property.price?.toLocaleString('fr-FR') ?? '—'} €
          </h4>
          {roi !== undefined && roi !== null && (
            <span className={cn(
              roi >= 6 ? 'roi-badge-positive' : roi >= 4 ? 'roi-badge-neutral' : 'roi-badge-negative'
            )}>
              ROI {roi.toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-slate-500 text-sm mb-4 line-clamp-1">
          {property.address || property.title || 'Bien immobilier'}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex space-x-3 text-slate-400 text-xs">
            {property.surface && (
              <span className="flex items-center">
                <Home className="w-4 h-4 mr-1" />
                {property.surface}m²
              </span>
            )}
            {property.status === 'COMPLETED' && (
              <span className="flex items-center">
                <Zap className="w-4 h-4 mr-1" />
                IA Ready
              </span>
            )}
          </div>
          <span className="text-ai font-medium text-sm group-hover:underline">
            Voir détail →
          </span>
        </div>
      </div>
    </Link>
  );
}

// Add Property Card matching the mockup
function AddPropertyCard({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-slate-100 transition-colors min-h-[300px]"
    >
      <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
        <Plus className="w-6 h-6 text-slate-400" />
      </div>
      <h4 className="text-slate-900 font-medium">Nouvelle Analyse</h4>
      <p className="text-slate-500 text-sm mt-1">Collez une URL Immoweb</p>
    </button>
  );
}

// Skeleton for loading state
function PropertyCardSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <div className="pt-4 border-t border-slate-50">
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

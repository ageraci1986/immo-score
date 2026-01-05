'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Trash2,
  MapPin,
  Zap,
  Check,
  AlertTriangle,
  Home,
  BedDouble,
  Bath,
  Calendar,
  Ruler,
  Download,
  Settings,
} from 'lucide-react';
import { useProperty, useDeleteProperty } from '@/hooks/use-properties';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RentabilitySection } from '@/components/features/rentability-section';
import { cn } from '@/lib/utils';
import { generatePropertyReport } from '@/lib/pdf/generate-report';
import type { Property, PropertyPhoto } from '@/types';

export default function PropertyDetailPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const propertyId = params['id'] as string;

  const { data: property, isLoading, error } = useProperty(propertyId);
  const deleteProperty = useDeleteProperty();

  const [showAllPhotos, setShowAllPhotos] = useState(false);

  const handleDelete = async (): Promise<void> => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce bien ?')) {
      await deleteProperty.mutateAsync(propertyId);
      router.push('/properties');
    }
  };

  if (isLoading) {
    return <PropertyDetailSkeleton />;
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-2xl">❌</span>
          </div>
          <h3 className="text-xl font-semibold text-red-900 mb-2">
            Bien non trouvé
          </h3>
          <p className="text-red-700 mb-6">
            {error instanceof Error
              ? error.message
              : 'Ce bien n\'existe pas ou a été supprimé.'}
          </p>
          <Button onClick={() => router.push('/properties')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au portefeuille
          </Button>
        </div>
      </div>
    );
  }

  const pricePerSqm = property.price && property.surface
    ? Math.round(property.price / property.surface)
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* NAV SIMPLE */}
      <nav className="bg-white border-b border-slate-200 h-16 flex items-center px-8 sticky top-0 z-30">
        <Link
          href="/properties"
          className="text-slate-500 hover:text-slate-900 flex items-center text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au Dashboard
        </Link>
        <div className="ml-auto flex items-center space-x-4">
          <span className="text-xs text-slate-400">
            Analyse générée {formatRelativeDate(property.updatedAt)}
          </span>
          <button
            onClick={handleDelete}
            className="text-slate-400 hover:text-red-500 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* HEADER TITRE */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {property.title || 'Bien immobilier'}
          </h1>
          <p className="text-slate-500 flex items-center mt-2">
            <MapPin className="w-4 h-4 mr-1" />
            {property.address || property.location || 'Localisation inconnue'}
            {property.sourceUrl && (
              <a
                href={property.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 text-ai text-sm underline hover:text-indigo-700"
              >
                Voir l&apos;annonce originale ↗
              </a>
            )}
          </p>
        </div>

        {/* GALLERIE STYLE AIRBNB */}
        <PhotoGallery
          photos={property.photos}
          showAll={showAllPhotos}
          onShowAll={() => setShowAllPhotos(true)}
        />

        {/* LAYOUT ASYMÉTRIQUE (2/3 CONTENT, 1/3 STICKY) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-8">
          {/* GAUCHE : CONTENU */}
          <div className="lg:col-span-2 space-y-8">
            {/* BLOC INTELLIGENCE ARTIFICIELLE */}
            {property.aiAnalysis && (
              <AiAnalysisSection analysis={property.aiAnalysis} />
            )}

            {/* SECTION RENTABILITÉ */}
            {property.status === 'COMPLETED' && (
              <RentabilitySection property={property} />
            )}

            {/* CARACTÉRISTIQUES */}
            <CharacteristicsSection property={property} />

            {/* DESCRIPTION */}
            {property.description && (
              <DescriptionSection description={property.description} />
            )}
          </div>

          {/* DROITE : STICKY PANEL */}
          <div className="lg:col-span-1">
            <StickyPricePanel
              property={property}
              pricePerSqm={pricePerSqm}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// Photo Gallery Component - Airbnb style
interface PhotoGalleryProps {
  photos: readonly PropertyPhoto[];
  showAll: boolean;
  onShowAll: () => void;
}

function PhotoGallery({ photos, showAll, onShowAll }: PhotoGalleryProps): JSX.Element {
  if (photos.length === 0) {
    return (
      <div className="h-[400px] rounded-2xl overflow-hidden bg-slate-200 flex items-center justify-center mb-8 shadow-sm">
        <div className="text-center text-slate-400">
          <Home className="w-16 h-16 mx-auto mb-2 opacity-50" />
          <p>Aucune photo disponible</p>
        </div>
      </div>
    );
  }

  const displayPhotos = showAll ? photos : photos.slice(0, 5);
  const remainingCount = photos.length - 5;

  // Helper to get photo URL (prefer publicUrl, fallback to url)
  const getPhotoUrl = (photo: PropertyPhoto | undefined): string | undefined => {
    return photo?.publicUrl || photo?.url;
  };

  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[400px] rounded-2xl overflow-hidden mb-8 shadow-sm">
      {/* Main Photo */}
      <div className="col-span-2 row-span-2 relative group">
        {getPhotoUrl(photos[0]) ? (
          <Image
            src={getPhotoUrl(photos[0])!}
            alt="Photo principale"
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 1200px) 50vw, 600px"
            priority
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
            <Home className="w-16 h-16 text-slate-300" />
          </div>
        )}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-900 shadow-sm">
          Photo Principale
        </div>
      </div>

      {/* Secondary Photos */}
      {[1, 2, 3, 4].map((index) => {
        const photo = displayPhotos[index];
        const photoUrl = getPhotoUrl(photo);
        const isLastWithMore = index === 4 && remainingCount > 0 && !showAll;

        return (
          <div
            key={index}
            className={cn(
              'col-span-1 row-span-1 relative',
              isLastWithMore && 'cursor-pointer'
            )}
            onClick={isLastWithMore ? onShowAll : undefined}
          >
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={`Photo ${index + 1}`}
                fill
                className="object-cover hover:opacity-90 transition-opacity"
                sizes="(max-width: 1200px) 25vw, 300px"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-slate-100" />
            )}
            {isLastWithMore && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white font-medium hover:bg-black/40 transition-colors">
                +{remainingCount} photos
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// AI Analysis Section - matching mockup exactly
interface AiAnalysisSectionProps {
  analysis: NonNullable<Property['aiAnalysis']>;
}

function AiAnalysisSection({ analysis }: AiAnalysisSectionProps): JSX.Element {
  return (
    <section className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Zap className="w-32 h-32 text-ai" />
      </div>

      <div className="flex items-center mb-4">
        <div className="bg-ai text-white p-2 rounded-lg shadow-md shadow-indigo-200 mr-3">
          <Zap className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Analyse Claude AI</h2>
      </div>

      <p className="text-slate-700 leading-relaxed mb-6">
        {analysis.narrative ?? 'Analyse en cours...'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Points Forts */}
        <div className="bg-white/60 p-4 rounded-xl border border-emerald-100">
          <h4 className="font-bold text-emerald-800 flex items-center mb-2">
            <Check className="w-4 h-4 mr-2" />
            Points Forts
          </h4>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            {(analysis.pros ?? []).map((pro, index) => (
              <li key={index}>{pro}</li>
            ))}
          </ul>
        </div>

        {/* Points de Vigilance */}
        <div className="bg-white/60 p-4 rounded-xl border border-orange-100">
          <h4 className="font-bold text-orange-800 flex items-center mb-2">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Points de Vigilance
          </h4>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            {(analysis.cons ?? []).map((con, index) => (
              <li key={index}>{con}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// Characteristics Section - matching mockup grid
interface CharacteristicsSectionProps {
  property: Property;
}

function CharacteristicsSection({ property }: CharacteristicsSectionProps): JSX.Element {
  const characteristics = [
    {
      icon: <Home className="w-5 h-5" />,
      value: property.surface,
      unit: 'm²',
      label: 'Surface',
    },
    {
      icon: <BedDouble className="w-5 h-5" />,
      value: property.bedrooms,
      label: 'Chambres',
    },
    {
      icon: <Bath className="w-5 h-5" />,
      value: property.bathrooms,
      label: 'SdB',
    },
    {
      icon: <Zap className="w-5 h-5" />,
      value: property.peb,
      label: 'PEB',
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      value: property.constructionYear,
      label: 'Année',
    },
    {
      icon: <Ruler className="w-5 h-5" />,
      value: property.facadeCount,
      label: 'Façades',
    },
  ].filter((c) => c.value !== null && c.value !== undefined);

  if (characteristics.length === 0) return <></>;

  return (
    <section>
      <h3 className="text-lg font-bold text-slate-900 mb-4">Caractéristiques</h3>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {characteristics.map((char, index) => (
          <div
            key={index}
            className="bg-white border border-slate-100 p-4 rounded-xl text-center"
          >
            <div className="text-slate-400 mb-1 mx-auto w-6 h-6 flex items-center justify-center">
              {char.icon}
            </div>
            <span className="block text-xl font-bold text-slate-800">
              {char.value}
              {char.unit && (
                <small className="text-xs font-normal">{char.unit}</small>
              )}
            </span>
            <span className="text-xs text-slate-500">{char.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Description Section
interface DescriptionSectionProps {
  description: string;
}

function DescriptionSection({ description }: DescriptionSectionProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > 500;
  const displayText = expanded || !isLong ? description : description.slice(0, 500) + '...';

  return (
    <section>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Description</h3>
      <div className="prose prose-slate text-slate-600 max-w-none text-sm">
        <p className="whitespace-pre-line">{displayText}</p>
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-ai text-sm font-medium mt-2 hover:underline"
        >
          {expanded ? 'Réduire' : 'Lire la suite'}
        </button>
      )}
    </section>
  );
}

// Sticky Price Panel - matching mockup exactly
interface StickyPricePanelProps {
  property: Property;
  pricePerSqm: number | null;
}

function StickyPricePanel({ property, pricePerSqm }: StickyPricePanelProps): JSX.Element {
  const rentabilityData = property.rentabilityData;
  const score = property.aiScore ?? 0;

  const handleDownloadPDF = (): void => {
    generatePropertyReport(property);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sticky top-24">
      {/* Prix demandé */}
      <div className="mb-6 pb-6 border-b border-slate-100">
        <p className="text-slate-500 text-sm mb-1">Prix demandé</p>
        <h2 className="text-4xl font-bold text-slate-900">
          {property.price?.toLocaleString('fr-FR') ?? '—'} €
        </h2>
        {pricePerSqm && (
          <p className="text-slate-400 text-xs mt-1">
            ~{pricePerSqm.toLocaleString('fr-FR')} €/m²
          </p>
        )}
      </div>

      {/* SCORE CIRCULAIRE */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="block text-sm font-bold text-slate-700">Immo-Score</span>
          <span className="text-xs text-slate-500">
            {property.aiAnalysis?.breakdown
              ? `Basé sur ${Object.keys(property.aiAnalysis.breakdown).length} critères`
              : 'Score global'}
          </span>
        </div>
        <div
          className={cn(
            'relative w-16 h-16 flex items-center justify-center rounded-full border-4',
            score >= 70
              ? 'bg-emerald-50 border-emerald-500'
              : score >= 50
                ? 'bg-yellow-50 border-yellow-500'
                : 'bg-red-50 border-red-500'
          )}
        >
          <span
            className={cn(
              'text-xl font-bold',
              score >= 70
                ? 'text-emerald-700'
                : score >= 50
                  ? 'text-yellow-700'
                  : 'text-red-700'
            )}
          >
            {score || '—'}
          </span>
        </div>
      </div>

      {/* KPIs FINANCIERS */}
      <div className="space-y-4 mb-8">
        {rentabilityData?.grossYield !== undefined && (
          <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
            <span className="text-sm text-slate-600">Rentabilité Brute</span>
            <span className="text-sm font-bold text-emerald-600">
              {rentabilityData.grossYield.toFixed(1)} %
            </span>
          </div>
        )}
        {rentabilityData?.cashFlow !== undefined && (
          <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
            <span className="text-sm text-slate-600">Cashflow estimé</span>
            <span
              className={cn(
                'text-sm font-bold',
                rentabilityData.cashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {rentabilityData.cashFlow >= 0 ? '+' : ''}
              {Math.round(rentabilityData.cashFlow).toLocaleString('fr-FR')} €
              <small className="text-slate-400 font-normal">/mois</small>
            </span>
          </div>
        )}
        {rentabilityData?.annualGrossRent !== undefined && (
          <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
            <span className="text-sm text-slate-600">Loyer potentiel</span>
            <span className="text-sm font-bold text-slate-800">
              {Math.round(rentabilityData.annualGrossRent / 12).toLocaleString('fr-FR')} €
            </span>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="space-y-3">
        <button
          onClick={handleDownloadPDF}
          className="w-full bg-primary hover:bg-emerald-900 text-white font-medium py-3 rounded-xl shadow-lg shadow-emerald-200 transition-all transform hover:scale-[1.02]"
        >
          <Download className="w-4 h-4 inline mr-2" />
          Télécharger Rapport PDF
        </button>
        <button className="w-full bg-white border border-slate-200 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-50 transition-colors">
          <Settings className="w-4 h-4 inline mr-2" />
          Éditer les paramètres
        </button>
      </div>
    </div>
  );
}

// Skeleton Loading
function PropertyDetailSkeleton(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 h-16 flex items-center px-8">
        <Skeleton className="h-4 w-40" />
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-96 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <Skeleton className="h-[400px] w-full rounded-2xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <div>
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
}

function formatRelativeDate(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `il y a ${diffMins} min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  if (diffDays < 30)
    return `il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  return `il y a ${Math.floor(diffDays / 30)} mois`;
}

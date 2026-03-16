'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useProperty } from '@/hooks/use-properties';
import { FormattedDescription } from '@/components/properties/formatted-description';

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  SCRAPING: 'Scraping en cours',
  ANALYZING: 'Analyse IA',
  COMPLETED: 'Terminé',
  ERROR: 'Erreur',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  SCRAPING: 'bg-blue-100 text-blue-700',
  ANALYZING: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  ERROR: 'bg-red-100 text-red-700',
};

export default function PropertyDetailPage(): JSX.Element {
  const params = useParams();
  const propertyId = params['id'] as string;

  const { data: property, isLoading, error } = useProperty(propertyId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg bg-white p-12 text-center">
            <div className="mb-4 text-6xl">⏳</div>
            <p className="text-gray-600">Chargement du bien...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg bg-red-50 p-12 text-center">
            <div className="mb-4 text-6xl">❌</div>
            <h3 className="mb-2 text-xl font-semibold text-red-900">
              Erreur de chargement
            </h3>
            <p className="mb-6 text-red-700">
              {error instanceof Error
                ? error.message
                : 'Bien introuvable'}
            </p>
            <Link
              href="/dashboard"
              className="inline-block rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
            >
              Retour au Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const photos = Array.isArray(property.photos) ? property.photos : [];
  const rentabilityData =
    property.rentabilityData &&
    typeof property.rentabilityData === 'object'
      ? (property.rentabilityData as unknown as Record<string, unknown>)
      : null;
  const aiAnalysis =
    property.aiAnalysis &&
    typeof property.aiAnalysis === 'object'
      ? (property.aiAnalysis as unknown as Record<string, unknown>)
      : null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {property.address ?? 'Adresse non disponible'}
            </h1>
            <p className="mt-2 text-gray-600">
              Ajouté le{' '}
              {new Date(property.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <span
            className={`rounded-full px-4 py-2 text-sm font-medium ${statusColors[property.status]}`}
          >
            {statusLabels[property.status]}
          </span>
        </div>

        {/* Photos Gallery */}
        {photos.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Photos</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo, index) => {
                // Handle both string and object formats
                const photoUrl = typeof photo === 'string'
                  ? photo
                  : (photo as { url?: string })?.url;

                if (!photoUrl) return null;

                return (
                  <div
                    key={index}
                    className="aspect-video overflow-hidden rounded-lg bg-gray-100"
                  >
                    <img
                      src={photoUrl}
                      alt={`Photo ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Hide broken images
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Info */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <InfoCard title="Prix" value={property.price ? Number(property.price) : null} format="currency" />
          <InfoCard title="Surface" value={property.surface ? Number(property.surface) : null} format="surface" />
          <InfoCard
            title="Type de bien"
            value={property.propertyType ?? '-'}
            format="text"
          />
        </div>

        {/* AI Score & Rentability */}
        {property.status === 'COMPLETED' && (
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {property.aiScore !== null && property.aiScore !== undefined && (
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-gray-900">
                  Score IA
                </h3>
                <div className="mb-4 text-center">
                  <p className="text-6xl font-bold text-primary-600">
                    {property.aiScore.toFixed(1)}
                  </p>
                  <p className="text-gray-500">/ 10</p>
                </div>
                {aiAnalysis && (
                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    <ScoreItem
                      label="État de la toiture"
                      value={aiAnalysis['roofCondition'] as string}
                    />
                    <ScoreItem
                      label="État de la façade"
                      value={aiAnalysis['facadeCondition'] as string}
                    />
                    <ScoreItem
                      label="État intérieur"
                      value={aiAnalysis['interiorCondition'] as string}
                    />
                  </div>
                )}
              </div>
            )}

            {rentabilityData && (
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-gray-900">
                  Rentabilité
                </h3>
                <div className="space-y-3">
                  {rentabilityData['netYield'] !== undefined && (
                    <RentabilityItem
                      label="Rendement net"
                      value={`${(rentabilityData['netYield'] as number).toFixed(2)}%`}
                      highlight
                    />
                  )}
                  {rentabilityData['grossYield'] !== undefined && (
                    <RentabilityItem
                      label="Rendement brut"
                      value={`${(rentabilityData['grossYield'] as number).toFixed(2)}%`}
                    />
                  )}
                  {rentabilityData['cashFlow'] !== undefined && (
                    <RentabilityItem
                      label="Cash-flow mensuel"
                      value={new Intl.NumberFormat('fr-BE', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(rentabilityData['cashFlow'] as number)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional Details */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-gray-900">
            Détails du bien
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Chambres" value={property.bedrooms} />
            <DetailItem label="Salles de bain" value={property.bathrooms} />
            <DetailItem
              label="Année de construction"
              value={property.constructionYear}
            />
            <DetailItem
              label="Classe énergétique"
              value={property.peb ?? '-'}
            />
            <DetailItem
              label="Terrain"
              value={property.landSurface ? `${property.landSurface} m²` : '-'}
            />
            <DetailItem
              label="Nombre de façades"
              value={property.facadeCount ?? '-'}
            />
            <DetailItem
              label="Largeur de façade"
              value={property.facadeWidth ? `${property.facadeWidth} m` : '-'}
            />
            <DetailItem
              label="Jardin"
              value={property.hasGarden ? 'Oui' : 'Non'}
            />
            <DetailItem
              label="Terrasse"
              value={property.hasTerrace ? 'Oui' : 'Non'}
            />
            <DetailItem
              label="Parking"
              value={property.hasParking ? 'Oui' : 'Non'}
            />
          </div>

          {property.description && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h4 className="mb-4 font-semibold text-gray-900">Description</h4>
              <FormattedDescription description={property.description} />
            </div>
          )}

          {property.sourceUrl && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <a
                href={property.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary-600 transition-colors hover:text-primary-700"
              >
                Voir l'annonce originale →
              </a>
            </div>
          )}
        </div>

        {/* Error Message */}
        {property.status === 'ERROR' && (property as unknown as Record<string, unknown>)['errorMessage'] && (
          <div className="mt-8 rounded-lg bg-red-50 p-6">
            <h3 className="mb-2 font-semibold text-red-900">
              Erreur lors du traitement
            </h3>
            <p className="text-sm text-red-700">{String((property as unknown as Record<string, unknown>)['errorMessage'])}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface InfoCardProps {
  readonly title: string;
  readonly value: number | string | null | undefined;
  readonly format: 'currency' | 'surface' | 'text';
}

function InfoCard({ title, value, format }: InfoCardProps): JSX.Element {
  let displayValue = '-';

  if (value !== null && value !== undefined) {
    if (format === 'currency' && typeof value === 'number') {
      displayValue = new Intl.NumberFormat('fr-BE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(value);
    } else if (format === 'surface' && typeof value === 'number') {
      displayValue = `${value} m²`;
    } else {
      displayValue = String(value);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <p className="mb-2 text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{displayValue}</p>
    </div>
  );
}

interface ScoreItemProps {
  readonly label: string;
  readonly value: string;
}

function ScoreItem({ label, value }: ScoreItemProps): JSX.Element {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

interface RentabilityItemProps {
  readonly label: string;
  readonly value: string;
  readonly highlight?: boolean;
}

function RentabilityItem({
  label,
  value,
  highlight = false,
}: RentabilityItemProps): JSX.Element {
  return (
    <div className="flex justify-between">
      <span className={`text-sm ${highlight ? 'font-medium' : ''} text-gray-600`}>
        {label}
      </span>
      <span
        className={`text-sm font-bold ${highlight ? 'text-primary-600' : 'text-gray-900'}`}
      >
        {value}
      </span>
    </div>
  );
}

interface DetailItemProps {
  readonly label: string;
  readonly value: number | string | boolean | null | undefined;
}

function DetailItem({ label, value }: DetailItemProps): JSX.Element {
  let displayValue = '-';

  if (value !== null && value !== undefined) {
    if (typeof value === 'boolean') {
      displayValue = value ? 'Oui' : 'Non';
    } else {
      displayValue = String(value);
    }
  }

  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-medium text-gray-900">{displayValue}</p>
    </div>
  );
}

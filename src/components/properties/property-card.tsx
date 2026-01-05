'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Property } from '@/types';

interface PropertyCardProps {
  readonly property: Property;
  readonly onDelete?: (id: string) => void;
}

const statusLabels: Record<Property['status'], string> = {
  PENDING: 'En attente',
  SCRAPING: 'Scraping en cours',
  ANALYZING: 'Analyse IA',
  COMPLETED: 'Terminé',
  ERROR: 'Erreur',
};

const statusColors: Record<Property['status'], string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  SCRAPING: 'bg-blue-100 text-blue-700',
  ANALYZING: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  ERROR: 'bg-red-100 text-red-700',
};

export function PropertyCard({ property, onDelete }: PropertyCardProps): JSX.Element {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Extract first photo URL (handle both string and object formats)
  const firstPhoto =
    property.photos && Array.isArray(property.photos) && property.photos.length > 0
      ? typeof property.photos[0] === 'string'
        ? property.photos[0]
        : (property.photos[0] as { url?: string })?.url
      : null;

  const hasData = property.status === 'COMPLETED';

  const handleDelete = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(property.id);
    }
    setShowDeleteConfirm(false);
  };

  const cancelDelete = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="relative">
      <Link
        href={`/dashboard/properties/${property.id}`}
        className="group block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
      >
        {/* Image */}
        <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
          {firstPhoto ? (
            <img
              src={firstPhoto}
              alt={property.address ?? 'Photo du bien'}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                // Replace with placeholder on error
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const placeholder = document.createElement('div');
                  placeholder.className = 'flex h-full items-center justify-center text-6xl';
                  placeholder.textContent = '🏠';
                  parent.appendChild(placeholder);
                }
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl">
              🏠
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute right-2 top-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[property.status]}`}
            >
              {statusLabels[property.status]}
            </span>
          </div>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors z-10"
            title="Supprimer la propriété"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          {property.title && (
            <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-gray-900">
              {property.title}
            </h3>
          )}

          {/* Address and date */}
          <div className="mb-2">
            {property.address && (
              <p className="text-sm text-gray-600 mb-1">{property.address}</p>
            )}
            <p className="text-xs text-gray-500">
              Ajouté le {formatDate(property.createdAt)}
            </p>
          </div>

          {/* Price & Surface */}
          {hasData && (
            <div className="mb-3 flex items-center gap-4 text-sm text-gray-600">
              {property.price && (
                <span className="font-medium text-primary-600">
                  {new Intl.NumberFormat('fr-BE', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  }).format(property.price)}
                </span>
              )}
              {property.surface && (
                <span>
                  {property.surface} m²
                </span>
              )}
            </div>
          )}

          {/* Score & Rentability */}
          {hasData && (
            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
              {property.aiScore !== null && property.aiScore !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">Score IA</p>
                  <p className="text-lg font-bold text-gray-900">
                    {property.aiScore.toFixed(1)}/10
                  </p>
                </div>
              )}
              {property.rentabilityData &&
                typeof property.rentabilityData === 'object' &&
                'netYield' in property.rentabilityData && (
                <div>
                  <p className="text-xs text-gray-500">Rendement net</p>
                  <p className="text-lg font-bold text-gray-900">
                    {(property.rentabilityData.netYield as number).toFixed(2)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {property.status === 'ERROR' && (
            <p className="mt-2 text-sm text-red-600">
              Une erreur est survenue lors du traitement
            </p>
          )}
        </div>
      </Link>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={cancelDelete}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">
              Confirmer la suppression
            </h3>
            <p className="text-gray-600 mb-4">
              Êtes-vous sûr de vouloir supprimer cette propriété ? Cette action est
              irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

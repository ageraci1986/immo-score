'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateProperties } from '@/hooks/use-properties';

interface AddPropertiesModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function AddPropertiesModal({
  isOpen,
  onClose,
}: AddPropertiesModalProps): JSX.Element | null {
  const [urls, setUrls] = useState('');
  const createProperties = useCreateProperties();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    const urlList = urls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urlList.length === 0) {
      return;
    }

    createProperties.mutate(
      { urls: urlList },
      {
        onSuccess: () => {
          setUrls('');
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Ajouter des Biens
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Description */}
        <p className="mb-4 text-sm text-gray-600">
          Ajoutez une ou plusieurs URLs de biens immobiliers (une par ligne).
          Le scraping et l'analyse IA démarreront automatiquement.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="urls"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              URLs des biens
            </label>
            <textarea
              id="urls"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://www.immoweb.be/fr/annonce/..."
              rows={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Formats supportés: Immoweb, Logic-Immo, et autres sites
              immobiliers
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              disabled={createProperties.isPending}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={createProperties.isPending}
            >
              {createProperties.isPending ? 'Ajout en cours...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

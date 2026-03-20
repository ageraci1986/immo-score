'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { SearchProjectListing } from '@/types/search-projects';

interface SearchProjectListingRowProps {
  readonly listing: SearchProjectListing;
  readonly scoreThreshold: number;
}

function isNew(firstSeenAt: string): boolean {
  const date = new Date(firstSeenAt);
  const now = new Date();
  return now.getTime() - date.getTime() < 24 * 60 * 60 * 1000;
}

export function SearchProjectListingRow({
  listing,
  scoreThreshold,
}: SearchProjectListingRowProps): JSX.Element {
  const isNewListing = isNew(listing.firstSeenAt);
  const meetsThreshold = listing.score !== null && listing.score >= scoreThreshold;

  return (
    <div className="flex items-start gap-4 p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
      {/* Thumbnail */}
      <div className="shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-slate-100">
        {listing.thumbnailUrl ? (
          <Image
            src={listing.thumbnailUrl}
            alt={listing.title || 'Annonce'}
            width={96}
            height={64}
            className="object-cover w-full h-full"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
            No image
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm text-slate-900 truncate">
            {listing.title || 'Annonce sans titre'}
          </h4>
          {isNewListing && (
            <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0 hover:bg-blue-100">
              Nouveau
            </Badge>
          )}
          {meetsThreshold && (
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0 hover:bg-emerald-100">
              Top
            </Badge>
          )}
          {listing.preFiltered && (
            <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0 hover:bg-amber-100">
              Filtré
            </Badge>
          )}
          {!listing.isActive && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Inactive
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
          {listing.price && (
            <span className="font-semibold text-slate-800">
              {listing.price.toLocaleString('fr-FR')} &euro;
            </span>
          )}
          {listing.city && <span>{listing.city}</span>}
        </div>

        {/* Score bar */}
        <div className="flex items-center gap-2 mt-2">
          {listing.preFiltered ? (
            <span className="text-xs text-amber-600">Non analysé · potentiel coloc insuffisant</span>
          ) : (
            <>
              <div className="w-32">
                <Progress value={listing.score ?? 0} className="h-2" />
              </div>
              <span className={`text-xs font-medium ${listing.score !== null && listing.score >= 70 ? 'text-emerald-600' : listing.score !== null && listing.score >= 50 ? 'text-amber-600' : 'text-slate-500'}`}>
                {listing.score !== null ? `${listing.score}/100` : 'En cours...'}
              </span>
            </>
          )}
        </div>

        <div className="text-xs text-slate-400 mt-1">
          Détecté le {new Date(listing.firstSeenAt).toLocaleDateString('fr-FR')}
        </div>
      </div>

      {/* Action */}
      <div className="shrink-0 flex flex-col gap-1">
        {listing.propertyId && (
          <Link
            href={`/properties/${listing.propertyId}`}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Voir l&apos;analyse
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

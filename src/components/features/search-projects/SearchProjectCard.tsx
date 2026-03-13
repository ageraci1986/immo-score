'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Play, Pause, MoreVertical, Trash2, Eye, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SearchProject } from '@/types/search-projects';

interface SearchProjectCardProps {
  readonly project: SearchProject;
  readonly onRunCheck: (id: string) => void;
  readonly onTogglePause: (id: string, newStatus: 'active' | 'paused') => void;
  readonly onDelete: (id: string) => void;
  readonly isRunning?: boolean;
}

function getStatusBadge(status: string): JSX.Element {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Actif</Badge>;
    case 'paused':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En pause</Badge>;
    case 'error':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Erreur</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "à l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  return `il y a ${diffDays}j`;
}

function formatFutureTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return 'imminent';

  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 60) return `dans ${diffMinutes} min`;
  return `dans ${diffHours}h`;
}

export function SearchProjectCard({
  project,
  onRunCheck,
  onTogglePause,
  onDelete,
  isRunning = false,
}: SearchProjectCardProps): JSX.Element {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header: status + name + menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {getStatusBadge(project.status)}
            <h3 className="font-semibold text-slate-900 truncate">
              {project.name}
            </h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/search-projects/${project.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir le détail
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onTogglePause(
                    project.id,
                    project.status === 'active' ? 'paused' : 'active'
                  )
                }
              >
                {project.status === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Mettre en pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Réactiver
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => {
                  setIsDeleting(true);
                  onDelete(project.id);
                }}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Metrics */}
        <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
          <span>{project.totalListings ?? 0} annonces</span>
          {(project.newListingsSinceLastCheck ?? 0) > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
              +{project.newListingsSinceLastCheck} nouvelles
            </Badge>
          )}
          <span>Score min: {project.scoreThreshold}</span>
        </div>

        {/* Timing */}
        <div className="mt-2 text-xs text-slate-400">
          Dernier check: {formatRelativeTime(project.lastCheckedAt)} &bull; Prochain:{' '}
          {project.status === 'active'
            ? formatFutureTime(project.nextCheckAt)
            : 'en pause'}
        </div>

        {/* Error message */}
        {project.status === 'error' && project.errorMessage && (
          <div className="mt-2 text-xs text-red-500 bg-red-50 rounded p-2">
            {project.errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRunCheck(project.id)}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Vérifier
          </Button>
          <Button variant="default" size="sm" asChild>
            <Link href={`/search-projects/${project.id}`}>
              Voir
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

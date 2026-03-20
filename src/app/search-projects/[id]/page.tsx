'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings2,
  RefreshCw,
  Pause,
  Play,
  Bell,
  BellOff,
  Loader2,
  Filter,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SearchProjectListingRow } from '@/components/features/search-projects/SearchProjectListingRow';
import { SearchProjectSettingsSheet } from '@/components/features/search-projects/SearchProjectSettingsSheet';
import { ShareProjectDialog } from '@/components/features/search-projects/ShareProjectDialog';
import {
  useSearchProject,
  useUpdateSearchProject,
  useRunCheck,
} from '@/hooks/use-search-projects';
import { useUserRole } from '@/hooks/useUserRole';
import { canShareProjects } from '@/lib/permissions';
import { toast } from 'sonner';
import type { SearchProjectListing } from '@/types/search-projects';

type ListingFilter = 'all' | 'above-threshold' | 'new';

export default function SearchProjectDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: project, isLoading, error } = useSearchProject(params.id);
  const updateProject = useUpdateSearchProject(params.id);
  const runCheck = useRunCheck(params.id);

  const { user: roleUser } = useUserRole();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [filter, setFilter] = useState<ListingFilter>('all');
  const [isRunning, setIsRunning] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-48 w-full mb-4" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8">
          <div className="text-center py-12">
            <p className="text-red-600">Projet non trouvé</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/search-projects')}>
              Retour à la liste
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const handleRunCheck = (): void => {
    setIsRunning(true);
    runCheck.mutate(undefined, {
      onSuccess: (result) => {
        setIsRunning(false);
        toast.success(`Vérification terminée — ${result.newListings} nouvelle(s) annonce(s)`);
      },
      onError: (err) => {
        setIsRunning(false);
        toast.error(err.message);
      },
    });
  };

  const handleTogglePause = (): void => {
    const newStatus = project.status === 'active' ? 'paused' : 'active';
    updateProject.mutate({ status: newStatus as 'active' | 'paused' });
  };

  const handleToggleEmail = (): void => {
    updateProject.mutate({
      emailNotificationsEnabled: !project.emailNotificationsEnabled,
    });
  };

  // Filter listings
  const filteredListings = (project.listings || []).filter(
    (listing: SearchProjectListing) => {
      if (filter === 'above-threshold') {
        return listing.score !== null && listing.score >= project.scoreThreshold;
      }
      if (filter === 'new') {
        const date = new Date(listing.firstSeenAt);
        const now = new Date();
        return now.getTime() - date.getTime() < 24 * 60 * 60 * 1000;
      }
      return true;
    }
  );

  const averageScore =
    project.listings.filter((l) => l.score !== null).length > 0
      ? Math.round(
          project.listings
            .filter((l) => l.score !== null)
            .reduce((sum, l) => sum + (l.score ?? 0), 0) /
            project.listings.filter((l) => l.score !== null).length
        )
      : null;

  const newCount = project.listings.filter((l) => {
    const date = new Date(l.firstSeenAt);
    const now = new Date();
    return now.getTime() - date.getTime() < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link
                href="/search-projects"
                className="text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
                  {project.searchUrl}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {roleUser && canShareProjects(roleUser.role) && (
                <ShareProjectDialog projectId={params.id} projectName={project.name} />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings2 className="h-4 w-4 mr-1" />
                Paramètres
              </Button>
            </div>
          </div>

          {/* Stats + Actions row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Stats cards */}
            <div className="lg:col-span-2 grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm text-slate-500">Annonces trackées</p>
                <p className="text-2xl font-bold text-slate-900">
                  {project.listings.length}
                </p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm text-slate-500">Nouvelles (24h)</p>
                <p className="text-2xl font-bold text-blue-600">{newCount}</p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm text-slate-500">Score moyen</p>
                <p className="text-2xl font-bold text-slate-900">
                  {averageScore !== null ? `${averageScore}/100` : '—'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleRunCheck}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Vérifier maintenant
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleToggleEmail}
                >
                  {project.emailNotificationsEnabled ? (
                    <>
                      <Bell className="h-4 w-4 mr-1" />
                      Alertes ON
                    </>
                  ) : (
                    <>
                      <BellOff className="h-4 w-4 mr-1" />
                      Alertes OFF
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleTogglePause}
                >
                  {project.status === 'active' ? (
                    <>
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Reprendre
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Main content: listings + check history */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Listings (3 cols) */}
            <div className="lg:col-span-3">
              {/* Filters */}
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4 text-slate-400" />
                {(['all', 'above-threshold', 'new'] as ListingFilter[]).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' && `Toutes (${project.listings.length})`}
                    {f === 'above-threshold' &&
                      `Score >= ${project.scoreThreshold}`}
                    {f === 'new' && `Nouvelles (${newCount})`}
                  </Button>
                ))}
              </div>

              {/* Listings list */}
              <div className="rounded-lg border bg-white">
                {filteredListings.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    {project.listings.length === 0
                      ? 'Aucune annonce détectée. Lancez une vérification.'
                      : 'Aucune annonce ne correspond à ce filtre.'}
                  </div>
                ) : (
                  filteredListings.map((listing) => (
                    <SearchProjectListingRow
                      key={listing.id}
                      listing={listing}
                      scoreThreshold={project.scoreThreshold}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Check history (1 col) */}
            <div className="lg:col-span-1">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Historique des vérifications
              </h3>
              <div className="rounded-lg border bg-white">
                {project.checks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Aucune vérification effectuée
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {project.checks.slice(0, 20).map((check) => (
                      <div key={check.id} className="px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            {new Date(check.checkedAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                            })}{' '}
                            {new Date(check.checkedAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {check.newListings > 0 && (
                            <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0 hover:bg-blue-100">
                              +{check.newListings}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {check.listingsFound} annonces vues
                          {check.triggeredBy === 'manual' && ' (manuel)'}
                          {check.triggeredBy === 'initial' && ' (initial)'}
                        </div>
                        {check.errorMessage && (
                          <p className="text-[10px] text-red-500 mt-0.5 truncate">
                            {check.errorMessage}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile: check history in accordion */}
              <div className="lg:hidden mt-4">
                <Accordion type="single" collapsible>
                  <AccordionItem value="checks">
                    <AccordionTrigger className="text-sm">
                      Historique ({project.checks.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      {project.checks.slice(0, 10).map((check) => (
                        <div
                          key={check.id}
                          className="py-2 text-xs text-slate-500 border-b last:border-0"
                        >
                          {new Date(check.checkedAt).toLocaleString('fr-FR')} —{' '}
                          {check.newListings} nouvelles
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings sheet */}
      <SearchProjectSettingsSheet
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        project={project}
        onSubmit={(data) => {
          updateProject.mutate(data, {
            onSuccess: () => {
              setIsSettingsOpen(false);
              toast.success('Paramètres sauvegardés');
            },
          });
        }}
        isLoading={updateProject.isPending}
      />
    </div>
  );
}

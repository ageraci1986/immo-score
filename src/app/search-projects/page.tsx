'use client';

import { useState, useEffect } from 'react';
import { Plus, Radar } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchProjectCard } from '@/components/features/search-projects/SearchProjectCard';
import { CreateSearchProjectModal } from '@/components/features/search-projects/CreateSearchProjectModal';
import {
  useSearchProjects,
  useCreateSearchProject,
  useUpdateSearchProject,
  useDeleteSearchProject,
  useRunCheck,
} from '@/hooks/use-search-projects';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function SearchProjectsPage(): JSX.Element {
  const { data: projects, isLoading, error } = useSearchProjects();
  const createProject = useCreateSearchProject();
  const deleteProject = useDeleteSearchProject();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [runningCheckId, setRunningCheckId] = useState<string | null>(null);

  // Get user email for pre-filling the form
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  const handleCreate = (data: Parameters<typeof createProject.mutate>[0]): void => {
    createProject.mutate(data, {
      onSuccess: () => {
        setIsModalOpen(false);
        toast.success('Projet créé — Analyse initiale en cours...');
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const handleDelete = (id: string): void => {
    deleteProject.mutate(id, {
      onSuccess: () => {
        toast.success('Projet supprimé');
      },
    });
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Veille Immobilière</h1>
              <p className="text-sm text-slate-500 mt-1">
                Surveillez automatiquement les nouvelles annonces sur Immoweb
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau projet
            </Button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-red-600">Erreur lors du chargement des projets</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && projects?.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
              <Radar className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">
                Aucun projet de recherche
              </h3>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                Créez votre premier projet de veille en collant une URL de recherche Immoweb.
                L&apos;app analysera automatiquement les nouvelles annonces.
              </p>
              <Button className="mt-6" onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier projet
              </Button>
            </div>
          )}

          {/* Project grid */}
          {!isLoading && projects && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <SearchProjectCardWithCheck
                  key={project.id}
                  project={project}
                  onDelete={handleDelete}
                  runningCheckId={runningCheckId}
                  setRunningCheckId={setRunningCheckId}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create modal */}
      <CreateSearchProjectModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleCreate}
        isLoading={createProject.isPending}
        userEmail={userEmail}
      />
    </div>
  );
}

/**
 * Wrapper to give each card its own useRunCheck + useUpdateSearchProject hook.
 */
function SearchProjectCardWithCheck({
  project,
  onDelete,
  runningCheckId,
  setRunningCheckId,
}: {
  project: Parameters<typeof SearchProjectCard>[0]['project'];
  onDelete: (id: string) => void;
  runningCheckId: string | null;
  setRunningCheckId: (id: string | null) => void;
}): JSX.Element {
  const runCheck = useRunCheck(project.id);
  const updateProject = useUpdateSearchProject(project.id);
  
  const handleRunCheck = (): void => {
    setRunningCheckId(project.id);
    runCheck.mutate(undefined, {
      onSuccess: (result) => {
        setRunningCheckId(null);
        toast.success(`Vérification terminée — ${result.newListings} nouvelle(s) annonce(s)`);
      },
      onError: (err) => {
        setRunningCheckId(null);
        toast.error(err.message);
      },
    });
  };

  const handleTogglePause = (_id: string, newStatus: 'active' | 'paused'): void => {
    updateProject.mutate(
      { status: newStatus },
      {
        onSuccess: () => {
          toast.success(newStatus === 'paused' ? 'Projet en pause' : 'Projet réactivé');
        },
      }
    );
  };

  return (
    <SearchProjectCard
      project={project}
      onRunCheck={() => handleRunCheck()}
      onTogglePause={handleTogglePause}
      onDelete={onDelete}
      isRunning={runningCheckId === project.id}
    />
  );
}

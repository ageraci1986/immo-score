'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  SearchProject,
  SearchProjectWithDetails,
  CreateSearchProjectInput,
  UpdateSearchProjectInput,
  RunCheckResult,
} from '@/types/search-projects';

// ── Queries ──

export function useSearchProjects() {
  return useQuery<SearchProject[]>({
    queryKey: ['search-projects'],
    queryFn: async () => {
      const res = await fetch('/api/search-projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const json = await res.json();
      return json.data;
    },
  });
}

export function useSearchProject(id: string) {
  return useQuery<SearchProjectWithDetails>({
    queryKey: ['search-project', id],
    queryFn: async () => {
      const res = await fetch(`/api/search-projects/${id}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      const json = await res.json();
      return json.data;
    },
    enabled: !!id,
    // Auto-refresh every 5s if any listing has a pending score
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasPendingScores = data.listings?.some(
        (l) => l.score === null && l.propertyId
      );
      return hasPendingScores ? 5000 : false;
    },
  });
}

// ── Mutations ──

export function useCreateSearchProject() {
  const queryClient = useQueryClient();

  return useMutation<SearchProject, Error, CreateSearchProjectInput>({
    mutationFn: async (input) => {
      const res = await fetch('/api/search-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create project');
      }
      const json = await res.json();
      return json.data;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['search-projects'] });

      // Trigger initial analysis run — endpoint returns immediately, processing is async
      fetch(`/api/search-projects/${project.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggeredBy: 'initial' }),
      }).catch((err) => {
        console.error('Failed to trigger initial scan:', err);
      });
    },
  });
}

export function useUpdateSearchProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation<SearchProject, Error, UpdateSearchProjectInput>({
    mutationFn: async (input) => {
      const res = await fetch(`/api/search-projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to update project');
      }
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-projects'] });
      queryClient.invalidateQueries({ queryKey: ['search-project', id] });
    },
  });
}

export function useDeleteSearchProject() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/search-projects/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete project');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-projects'] });
    },
  });
}

export function useRunCheck(id: string) {
  const queryClient = useQueryClient();

  return useMutation<RunCheckResult, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`/api/search-projects/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggeredBy: 'manual' }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Check failed');
      }
      // Endpoint returns immediately — processing happens async on server
      return { newListings: 0, analyzed: 0, emailsSent: 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-projects'] });
      queryClient.invalidateQueries({ queryKey: ['search-project', id] });
    },
  });
}

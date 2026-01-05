import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Property, PropertyStatus } from '@/types';

interface PropertiesResponse {
  readonly properties: Property[];
}

interface CreatePropertiesInput {
  readonly urls: readonly string[];
  readonly customParams?: Record<string, unknown>;
}

interface CreatePropertiesResponse {
  readonly properties: Property[];
  readonly message: string;
}

/**
 * Fetch all properties
 */
async function fetchProperties(status?: PropertyStatus): Promise<Property[]> {
  const params = new URLSearchParams();
  if (status) {
    params.append('status', status);
  }

  const response = await fetch(`/api/properties?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch properties');
  }

  const data = (await response.json()) as PropertiesResponse;
  return data.properties;
}

/**
 * Create new properties
 */
async function createProperties(input: CreatePropertiesInput): Promise<CreatePropertiesResponse> {
  const response = await fetch('/api/properties', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create properties');
  }

  return (await response.json()) as CreatePropertiesResponse;
}

/**
 * Fetch a single property by ID
 */
async function fetchProperty(id: string): Promise<Property> {
  const response = await fetch(`/api/properties/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch property');
  }

  const data = (await response.json()) as { property: Property };
  return data.property;
}

/**
 * Hook to fetch properties
 */
export function useProperties(status?: PropertyStatus) {
  return useQuery({
    queryKey: ['properties', status],
    queryFn: () => fetchProperties(status),
  });
}

/**
 * Hook to fetch a single property
 */
export function useProperty(id: string) {
  return useQuery({
    queryKey: ['properties', id],
    queryFn: () => fetchProperty(id),
    enabled: Boolean(id),
  });
}

/**
 * Delete a property
 */
async function deleteProperty(id: string): Promise<void> {
  const response = await fetch(`/api/properties/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete property');
  }
}

/**
 * Hook to create properties
 */
export function useCreateProperties() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProperties,
    onSuccess: (data) => {
      // Invalidate queries to refetch
      void queryClient.invalidateQueries({ queryKey: ['properties'] });

      toast.success(data.message || 'Propriétés ajoutées avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'ajout des propriétés');
    },
  });
}

/**
 * Hook to delete a property
 */
export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => {
      // Invalidate queries to refetch
      void queryClient.invalidateQueries({ queryKey: ['properties'] });

      toast.success('Propriété supprimée avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression de la propriété');
    },
  });
}

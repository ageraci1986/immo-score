import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Property, RentabilityParamsExtended, RentabilityResultsExtended } from '@/types';

interface UpdateRentabilityInput {
  readonly propertyId: string;
  readonly rentabilityParams: Partial<RentabilityParamsExtended>;
}

interface UpdateRentabilityResponse {
  readonly property: Property;
  readonly rentabilityData: RentabilityResultsExtended;
}

/**
 * Update rentability parameters for a property
 */
async function updateRentability(
  input: UpdateRentabilityInput
): Promise<UpdateRentabilityResponse> {
  const response = await fetch(`/api/properties/${input.propertyId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rentabilityParams: input.rentabilityParams }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update rentability');
  }

  return (await response.json()) as UpdateRentabilityResponse;
}

/**
 * Hook to update rentability parameters
 */
export function useUpdateRentability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRentability,
    onSuccess: (_data, variables) => {
      // Invalidate property query to refetch
      void queryClient.invalidateQueries({ queryKey: ['properties', variables.propertyId] });
      void queryClient.invalidateQueries({ queryKey: ['properties'] });

      toast.success('Rentabilité mise à jour');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });
}

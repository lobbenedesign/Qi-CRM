import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repo } from '../lib/repo';
import type { Activity } from '../types/crm';

export function useActivities(filter?: { contactId?: string; dealId?: string }) {
  return useQuery({
    queryKey: ['activities', filter ?? {}],
    queryFn: async () => (await repo.listActivities(filter)) as Activity[],
    staleTime: 15_000,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (activity: Partial<Activity>) => repo.createActivity(activity),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Activity> }) => repo.updateActivity(id, patch),
    onSuccess: (_, { id }) => {
      // Invalidate both general activities and specific queries
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { repo } from '../lib/repo';
import type { AiInsight } from '../types/crm';

export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: async () => (await repo.listInsights()) as AiInsight[],
    staleTime: 30_000,
  });
}

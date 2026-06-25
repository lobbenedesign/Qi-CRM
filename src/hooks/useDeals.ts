import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repo } from '../lib/repo';
import { useDealsStore } from '../store/dealsStore';
import { useRemindersStore } from '../store/remindersStore';
import { logAudit } from '../lib/audit';
import { resolveDealAssignee } from '../lib/assignment';
import type { Deal, DealStage } from '../types/crm';

const DEALS_KEY = ['deals'];

export function useDeals() {
  const { setDeals, setLoading } = useDealsStore();

  return useQuery({
    queryKey: DEALS_KEY,
    queryFn: async () => {
      setLoading(true);
      const deals = (await repo.listDeals()) as Deal[];
      setDeals(deals);
      setLoading(false);
      return deals;
    },
    staleTime: 30_000,
  });
}

export function useMoveDeal() {
  const qc = useQueryClient();
  const { moveDeal } = useDealsStore();

  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: DealStage }) => {
      const patch: Partial<Deal> = { stage };
      if (stage === 'won' || stage === 'lost') patch.closed_at = new Date().toISOString();
      await repo.updateDeal(id, patch);
    },
    onMutate: ({ id, stage }) => {
      const d = useDealsStore.getState().deals.find((x) => x.id === id);
      moveDeal(id, stage); // optimistic update
      logAudit('stage_change', 'deal', d?.title ?? 'Deal', { to: stage });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: DEALS_KEY });
    },
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (deal: Partial<Deal>) => {
      // Se nessun assegnatario indicato (o 'auto'), applica lo smistamento
      const assignee_id = deal.assignee_id === undefined ? resolveDealAssignee() : deal.assignee_id;
      return repo.createDeal({ ...deal, assignee_id });
    },
    onSuccess: (created) => {
      logAudit('create', 'deal', created.title);
      if (created.assignee_id) logAudit('assign', 'deal', created.title, { to: created.assignee_id });
      qc.invalidateQueries({ queryKey: DEALS_KEY });
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  const { updateDeal } = useDealsStore();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Deal> }) => repo.updateDeal(id, patch),
    onMutate: ({ id, patch }) => updateDeal(id, patch),
    onSuccess: (updated, vars) => {
      if (vars.patch.assignee_id !== undefined) logAudit('assign', 'deal', updated.title, { to: updated.assignee_id });
      else logAudit('update', 'deal', updated.title);
      qc.invalidateQueries({ queryKey: DEALS_KEY });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  const { removeDeal } = useDealsStore();

  return useMutation({
    mutationFn: async (id: string) => repo.deleteDeal(id),
    onMutate: (id) => {
      const d = useDealsStore.getState().deals.find((x) => x.id === id);
      removeDeal(id);
      logAudit('delete', 'deal', d?.title ?? 'Deal');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: DEALS_KEY }),
  });
}

export function usePipelines() {
  const { setPipelines } = useDealsStore();

  return useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const pipelines = await repo.listPipelines();
      setPipelines(pipelines);
      return pipelines;
    },
    staleTime: 300_000,
  });
}

export function usePipelineStages() {
  const { setStages } = useDealsStore();

  return useQuery({
    queryKey: ['pipeline_stages'],
    queryFn: async () => {
      const stages = await repo.listStages();
      setStages(stages);
      return stages;
    },
    staleTime: 300_000, // stages rarely change
  });
}

export function useCreateStage() {
  const qc = useQueryClient();
  const { addStage } = useDealsStore();

  return useMutation({
    mutationFn: async (input: Partial<import('../types/crm').PipelineStage>) => repo.createStage(input),
    onSuccess: (newStage) => {
      addStage(newStage);
      logAudit('create', 'automation', `Fase Pipeline: ${newStage.name}`); // Rilevato come configurazione / automazione
      qc.invalidateQueries({ queryKey: ['pipeline_stages'] });
    },
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  const { updateStage } = useDealsStore();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<import('../types/crm').PipelineStage> }) =>
      repo.updateStage(id, patch),
    onSuccess: (updatedStage) => {
      updateStage(updatedStage.id, updatedStage);
      logAudit('update', 'automation', `Fase Pipeline: ${updatedStage.name}`);
      qc.invalidateQueries({ queryKey: ['pipeline_stages'] });
      qc.invalidateQueries({ queryKey: DEALS_KEY });
    },
  });
}

export function useDeleteStage() {
  const qc = useQueryClient();
  const { removeStage } = useDealsStore();

  return useMutation({
    mutationFn: async (id: string) => repo.deleteStage(id),
    onSuccess: (res, id) => {
      const targetStage = useDealsStore.getState().stages.find((st) => st.id === id);
      if (targetStage) {
        const affectedDeals = useDealsStore.getState().deals.filter((d) => d.stage === targetStage.stage_key);
        const addReminder = useRemindersStore.getState().add;
        affectedDeals.forEach((deal) => {
          addReminder({
            title: `Deal rilocato: "${deal.title}"`,
            note: `La fase "${targetStage.name}" è stata rimossa. Il deal è stato spostato alla fase sicura "${res.fallbackKey}".`,
            remind_at: new Date().toISOString(),
            channels: ['visual'],
            user_id: deal.assignee_id || 'tm-owner',
            contact_id: deal.contact_id,
            deal_id: deal.id,
            ticket_id: null,
          });
        });
      }
      removeStage(id, res.fallbackKey);
      logAudit('delete', 'automation', `Fase Pipeline ID: ${id}`);
      qc.invalidateQueries({ queryKey: ['pipeline_stages'] });
      qc.invalidateQueries({ queryKey: DEALS_KEY });
    },
  });
}

export function useReorderStages() {
  const qc = useQueryClient();
  const { reorderStages } = useDealsStore();

  return useMutation({
    mutationFn: async (stageIds: string[]) => repo.reorderStages(stageIds),
    onSuccess: (_, stageIds) => {
      const currentStages = useDealsStore.getState().stages;
      const sorted = [...currentStages].sort((a, b) => {
        const idxA = stageIds.indexOf(a.id);
        const idxB = stageIds.indexOf(b.id);
        return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
      }).map((s, index) => ({ ...s, display_order: index + 1 }));
      
      reorderStages(sorted);
      logAudit('update', 'automation', `Riordino Colonne Pipeline`);
      qc.invalidateQueries({ queryKey: ['pipeline_stages'] });
    },
  });
}

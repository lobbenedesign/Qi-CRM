import { create } from 'zustand';
import type { Deal, DealStage, QuantumDeal, PipelineDefinition, PipelineStage } from '../types/crm';
import { computeDealRisk } from '../lib/trust';

interface DealsState {
  deals: Deal[];
  stages: PipelineStage[];
  pipelines: PipelineDefinition[];
  activePipelineId: string;
  isLoading: boolean;

  setDeals: (deals: Deal[]) => void;
  setStages: (stages: PipelineStage[]) => void;
  setPipelines: (pipelines: PipelineDefinition[]) => void;
  setActivePipelineId: (id: string) => void;
  setLoading: (v: boolean) => void;

  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, patch: Partial<Deal>) => void;
  moveDeal: (id: string, stage: DealStage) => void;
  removeDeal: (id: string) => void;
  addStage: (stage: PipelineStage) => void;
  updateStage: (id: string, patch: Partial<PipelineStage>) => void;
  removeStage: (id: string, fallbackKey: DealStage) => void;
  reorderStages: (stages: PipelineStage[]) => void;

  // Quantum Pipeline: compute enriched deals with visual props
  getQuantumDeals: () => QuantumDeal[];
  getDealsByStage: (stage: DealStage) => QuantumDeal[];
}

export const useDealsStore = create<DealsState>((set, get) => ({
  deals: [],
  stages: [],
  pipelines: [],
  activePipelineId: 'pipe-default',
  isLoading: false,

  setDeals:   (deals)  => set({ deals }),
  setStages:  (stages) => set({ stages }),
  setPipelines: (pipelines) => set({ pipelines }),
  setActivePipelineId: (activePipelineId) => set({ activePipelineId }),
  setLoading: (v)      => set({ isLoading: v }),

  addDeal: (deal) =>
    set((s) => ({ deals: [...s.deals, deal] })),

  updateDeal: (id, patch) =>
    set((s) => ({
      deals: s.deals.map((d) =>
        d.id === id ? { ...d, ...patch, updated_at: new Date().toISOString() } : d,
      ),
    })),

  moveDeal: (id, stage) =>
    set((s) => ({
      deals: s.deals.map((d) =>
        d.id === id
          ? { ...d, stage, updated_at: new Date().toISOString() }
          : d,
      ),
    })),

  removeDeal: (id) =>
    set((s) => ({ deals: s.deals.filter((d) => d.id !== id) })),

  addStage: (stage) =>
    set((s) => ({ stages: [...s.stages, stage] })),

  updateStage: (id, patch) =>
    set((s) => {
      const idx = s.stages.findIndex((st) => st.id === id);
      if (idx < 0) return {};
      const oldKey = s.stages[idx].stage_key;
      const updatedStages = s.stages.map((st) => st.id === id ? { ...st, ...patch } : st);
      
      let updatedDeals = s.deals;
      if (patch.stage_key && patch.stage_key !== oldKey) {
        updatedDeals = s.deals.map((d) => d.stage === oldKey ? { ...d, stage: patch.stage_key! } : d);
      }

      return { stages: updatedStages, deals: updatedDeals };
    }),

  removeStage: (id, fallbackKey) =>
    set((s) => {
      const targetStage = s.stages.find((st) => st.id === id);
      if (!targetStage) return {};
      
      const updatedStages = s.stages.filter((st) => st.id !== id);
      const updatedDeals = s.deals.map((d) =>
        d.stage === targetStage.stage_key
          ? { ...d, stage: fallbackKey, updated_at: new Date().toISOString() }
          : d
      );

      return { stages: updatedStages, deals: updatedDeals };
    }),

  reorderStages: (stagesList) =>
    set({ stages: stagesList }),

  getQuantumDeals: () => {
    const { deals, stages, activePipelineId } = get();
    // Filtra i deal della pipeline attiva
    const filteredDeals = deals.filter((d) => (d.pipeline_id || 'pipe-default') === activePipelineId);
    
    return filteredDeals.map((deal) => {
      const stageMeta = stages.find((s) => s.stage_key === deal.stage);
      const riskScore = computeDealRisk({
        velocityDays:    deal.velocity_days,
        hasRiskInsight:  (deal.ai_insights ?? []).some((i) => i.insight_type === 'risk_alert'),
        sentimentScore:  deal.contact?.sentiment_score ?? null,
        stageProbability: stageMeta?.probability ?? 50,
      });

      const isHighRisk = riskScore > 50;

      return {
        ...deal,
        risk_score:    riskScore,
        is_stalled:    isHighRisk,
        visual_color:  isHighRisk
          ? (stageMeta?.risk_color ?? '#ef4444')
          : (stageMeta?.default_color ?? '#64748b'),
        should_expand: isHighRisk && (stageMeta?.is_expandable ?? false),
        stage_meta:    stageMeta ?? ({} as PipelineStage),
      } as QuantumDeal;
    });
  },

  getDealsByStage: (stage) => {
    return get().getQuantumDeals().filter((d) => d.stage === stage);
  },
}));

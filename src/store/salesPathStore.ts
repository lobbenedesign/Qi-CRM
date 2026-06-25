import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Avanzamento della checklist di Guided Selling per deal+stage.
// chiave: `${dealId}|${stageKey}` → { [stepId]: true }

interface SalesPathState {
  done: Record<string, Record<string, boolean>>;
  toggle: (dealId: string, stageKey: string, stepId: string) => void;
  isDone: (dealId: string, stageKey: string, stepId: string) => boolean;
  doneCount: (dealId: string, stageKey: string, stepIds: string[]) => number;
}

const key = (dealId: string, stageKey: string) => `${dealId}|${stageKey}`;

export const useSalesPathStore = create<SalesPathState>()(
  persist(
    (set, get) => ({
      done: {},
      toggle: (dealId, stageKey, stepId) =>
        set((s) => {
          const k = key(dealId, stageKey);
          const cur = s.done[k] ?? {};
          return { done: { ...s.done, [k]: { ...cur, [stepId]: !cur[stepId] } } };
        }),
      isDone: (dealId, stageKey, stepId) => !!get().done[key(dealId, stageKey)]?.[stepId],
      doneCount: (dealId, stageKey, stepIds) => {
        const m = get().done[key(dealId, stageKey)] ?? {};
        return stepIds.filter((id) => m[id]).length;
      },
    }),
    { name: 'qi-crm-salespath-v1' },
  ),
);

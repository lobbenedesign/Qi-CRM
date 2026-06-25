import { create } from 'zustand';

export type QuickTarget = 'contact' | 'deal' | 'ticket' | 'reminder' | null;

interface QuickCreateState {
  target: QuickTarget;
  open: (t: Exclude<QuickTarget, null>) => void;
  close: () => void;
}

/** Stato globale per aprire i modal di creazione da qualsiasi punto (Quick-Add "+"). */
export const useQuickCreateStore = create<QuickCreateState>((set) => ({
  target: null,
  open: (t) => set({ target: t }),
  close: () => set({ target: null }),
}));

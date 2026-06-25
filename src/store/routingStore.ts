import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TeamRole } from '../types/team';

export type AssignMode = 'manual' | 'role' | 'auto';
export type AssignStrategy = 'round_robin' | 'least_loaded';

export interface ChannelRouting {
  mode: AssignMode;
  role: TeamRole | null;     // usato in mode 'role'
  strategy: AssignStrategy;
}

interface RoutingState {
  deals: ChannelRouting;
  tickets: ChannelRouting;
  rr: Record<string, number>;   // contatori round-robin per chiave

  setDeals: (c: Partial<ChannelRouting>) => void;
  setTickets: (c: Partial<ChannelRouting>) => void;
  bumpRr: (key: string, poolSize: number) => number;  // restituisce l'indice corrente e incrementa
}

export const useRoutingStore = create<RoutingState>()(
  persist(
    (set, get) => ({
      deals:   { mode: 'role', role: 'commerciale', strategy: 'round_robin' },
      tickets: { mode: 'auto', role: null,          strategy: 'least_loaded' },
      rr: {},

      setDeals: (c) => set((s) => ({ deals: { ...s.deals, ...c } })),
      setTickets: (c) => set((s) => ({ tickets: { ...s.tickets, ...c } })),

      bumpRr: (key, poolSize) => {
        if (poolSize <= 0) return 0;
        const cur = get().rr[key] ?? 0;
        const idx = cur % poolSize;
        set((s) => ({ rr: { ...s.rr, [key]: cur + 1 } }));
        return idx;
      },
    }),
    { name: 'qi-crm-routing-v1' },
  ),
);

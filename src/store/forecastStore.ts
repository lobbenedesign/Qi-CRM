import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Quote di vendita per membro e periodo (YYYY-MM).
// chiave interna: `${memberId}|${period}` → importo quota.

interface ForecastState {
  quotas: Record<string, number>;
  defaultQuota: number;
  getQuota: (memberId: string, period: string) => number;
  setQuota: (memberId: string, period: string, amount: number) => void;
  setDefaultQuota: (amount: number) => void;
}

const key = (memberId: string, period: string) => `${memberId}|${period}`;

export const useForecastStore = create<ForecastState>()(
  persist(
    (set, get) => ({
      quotas: {},
      defaultQuota: 50000,
      getQuota: (memberId, period) => {
        const v = get().quotas[key(memberId, period)];
        return v ?? get().defaultQuota;
      },
      setQuota: (memberId, period, amount) =>
        set((s) => ({ quotas: { ...s.quotas, [key(memberId, period)]: Math.max(0, amount) } })),
      setDefaultQuota: (amount) => set({ defaultQuota: Math.max(0, amount) }),
    }),
    { name: 'qi-crm-forecast-v1' },
  ),
);

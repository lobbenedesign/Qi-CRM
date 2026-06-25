import { create } from 'zustand';
import type { Company } from '../types/crm';

interface CompaniesState {
  companies: Company[];
  isLoading: boolean;
  searchQuery: string;

  setCompanies: (companies: Company[]) => void;
  setLoading: (v: boolean) => void;
  setSearchQuery: (q: string) => void;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  removeCompany: (id: string) => void;

  getFiltered: () => Company[];
}

export const useCompaniesStore = create<CompaniesState>((set, get) => ({
  companies: [],
  isLoading: false,
  searchQuery: '',

  setCompanies: (companies) => set({ companies }),
  setLoading:   (v)         => set({ isLoading: v }),
  setSearchQuery: (q)       => set({ searchQuery: q }),

  updateCompany: (id, patch) =>
    set((s) => ({
      companies: s.companies.map((c) =>
        c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c,
      ),
    })),

  removeCompany: (id) =>
    set((s) => ({ companies: s.companies.filter((c) => c.id !== id) })),

  getFiltered: () => {
    const { companies, searchQuery } = get();
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.domain?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q),
    );
  },
}));

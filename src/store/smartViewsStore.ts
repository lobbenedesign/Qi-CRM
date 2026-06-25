import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FilterCondition {
  field: string; // e.g., 'first_name', 'email', 'job_title', 'lead_score'
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'is_known' | 'is_unknown' | 'in_list';
  value: string;
}

export interface SmartView {
  id: string;
  name: string;
  target: 'contacts' | 'companies';
  conditions: FilterCondition[];
  scope: 'private' | 'team' | 'public';
  is_pinned: boolean;
}

interface SmartViewsState {
  views: SmartView[];
  saveView: (view: Omit<SmartView, 'id'>) => void;
  deleteView: (id: string) => void;
  togglePinView: (id: string) => void;
}

const DEFAULT_VIEWS: SmartView[] = [
  {
    id: 'view-all',
    name: 'Tutti i contatti',
    target: 'contacts',
    conditions: [],
    scope: 'public',
    is_pinned: true,
  },
  {
    id: 'view-high-score',
    name: 'Top Lead (Score > 70)',
    target: 'contacts',
    conditions: [
      { field: 'lead_score', operator: 'greater_than', value: '70' }
    ],
    scope: 'public',
    is_pinned: true,
  },
  {
    id: 'view-sales',
    name: 'Reparto Sales',
    target: 'contacts',
    conditions: [
      { field: 'job_title', operator: 'contains', value: 'Sales' }
    ],
    scope: 'team',
    is_pinned: true,
  }
];

export const useSmartViewsStore = create<SmartViewsState>()(
  persist(
    (set) => ({
      views: DEFAULT_VIEWS,

      saveView: (viewData) =>
        set((s) => {
          const newView: SmartView = {
            ...viewData,
            id: `view-${crypto.randomUUID().slice(0, 8)}`,
          };
          return { views: [...s.views, newView] };
        }),

      deleteView: (id) =>
        set((s) => ({
          views: s.views.filter((v) => v.id !== id),
        })),

      togglePinView: (id) =>
        set((s) => ({
          views: s.views.map((v) =>
            v.id === id ? { ...v, is_pinned: !v.is_pinned } : v,
          ),
        })),
    }),
    {
      name: 'qi-crm-smart-views-v1',
    }
  )
);

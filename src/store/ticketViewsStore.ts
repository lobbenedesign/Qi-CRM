import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TicketStatus } from '../types/team';

export interface SavedTicketView {
  id: string;
  name: string;
  statusFilter: TicketStatus | '';
  mineOnly: boolean;
  pinned: boolean;
}

interface TicketViewsState {
  views: SavedTicketView[];
  activeViewId: string;
  
  // Property visibility settings (Page 85)
  visibleProperties: string[];
  
  setActiveViewId: (id: string) => void;
  addView: (view: Omit<SavedTicketView, 'id' | 'pinned'>) => string;
  updateView: (id: string, patch: Partial<SavedTicketView>) => void;
  deleteView: (id: string) => void;
  togglePinView: (id: string) => void;
  
  setVisibleProperties: (props: string[]) => void;
  resetPropertiesToDefault: () => void;
}

const DEFAULT_VIEWS: SavedTicketView[] = [
  {
    id: 'view-all',
    name: 'Tutti i Ticket',
    statusFilter: '',
    mineOnly: false,
    pinned: true
  },
  {
    id: 'view-mine-open',
    name: 'I miei Ticket Aperti',
    statusFilter: 'open',
    mineOnly: true,
    pinned: true
  },
  {
    id: 'view-waiting',
    name: 'In Attesa di Risposta',
    statusFilter: 'waiting',
    mineOnly: false,
    pinned: true
  }
];

const DEFAULT_PROPERTIES = ['status', 'priority', 'category', 'assignee', 'description', 'created_at'];

export const useTicketViewsStore = create<TicketViewsState>()(
  persist(
    (set) => ({
      views: DEFAULT_VIEWS,
      activeViewId: 'view-all',
      visibleProperties: DEFAULT_PROPERTIES,

      setActiveViewId: (activeViewId) => set({ activeViewId }),

      addView: (view) => {
        const id = `view-${Math.random().toString(36).substring(2, 10)}`;
        set((s) => ({
          views: [...s.views, { ...view, id, pinned: false }]
        }));
        return id;
      },

      updateView: (id, patch) =>
        set((s) => ({
          views: s.views.map((v) => (v.id === id ? { ...v, ...patch } : v))
        })),

      deleteView: (id) =>
        set((s) => ({
          views: s.views.filter((v) => v.id !== id),
          activeViewId: s.activeViewId === id ? 'view-all' : s.activeViewId
        })),

      togglePinView: (id) =>
        set((s) => ({
          views: s.views.map((v) => (v.id === id ? { ...v, pinned: !v.pinned } : v))
        })),

      setVisibleProperties: (visibleProperties) => set({ visibleProperties }),
      
      resetPropertiesToDefault: () => set({ visibleProperties: DEFAULT_PROPERTIES })
    }),
    {
      name: 'qi-crm-ticket-views-v2'
    }
  )
);

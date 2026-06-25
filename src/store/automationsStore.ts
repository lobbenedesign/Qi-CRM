import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from 'reactflow';

export interface Journey {
  id: string;
  name: string;
  description: string;
  active: boolean;
  nodes: Node[];
  edges: Edge[];
  runs: number;
  created_at: string;
  updated_at: string;
}

const defaultNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 100, y: 250 },
    data: { label: 'Deal Vinto', type: 'stage_won' },
  },
];

const defaultEdges: Edge[] = [];

const seed: Journey[] = [
  {
    id: 'journey-1',
    name: 'Benvenuto Nuovo Cliente',
    description: 'Sequenza automatica per nuovi deal vinti.',
    active: true,
    nodes: defaultNodes,
    edges: defaultEdges,
    runs: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

interface AutomationsState {
  journeys: Journey[];
  addJourney: (j: Pick<Journey, 'name' | 'description'>) => Journey;
  updateJourney: (id: string, updates: Partial<Journey>) => void;
  deleteJourney: (id: string) => void;
  toggleJourney: (id: string) => void;
}

export const useAutomationsStore = create<AutomationsState>()(
  persist(
    (set) => ({
      journeys: seed,
      addJourney: (j) => {
        const newJourney: Journey = {
          ...j,
          id: `journey-${crypto.randomUUID().slice(0, 8)}`,
          active: false,
          nodes: [{ id: `trigger-${Date.now()}`, type: 'trigger', position: { x: 100, y: 250 }, data: { label: 'Nuovo Trigger', type: 'new_lead' } }],
          edges: [],
          runs: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((s) => ({ journeys: [newJourney, ...s.journeys] }));
        return newJourney;
      },
      updateJourney: (id, updates) =>
        set((s) => ({
          journeys: s.journeys.map((j) => (j.id === id ? { ...j, ...updates, updated_at: new Date().toISOString() } : j)),
        })),
      deleteJourney: (id) => set((s) => ({ journeys: s.journeys.filter((j) => j.id !== id) })),
      toggleJourney: (id) =>
        set((s) => ({
          journeys: s.journeys.map((j) => (j.id === id ? { ...j, active: !j.active } : j)),
        })),
    }),
    { name: 'qi-crm-journeys-v1' },
  ),
);

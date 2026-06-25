import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DealStage } from '../types/crm';

export interface PlaybookItem {
  id: string;
  title: string;
  isMandatory: boolean;
  type: 'checkbox' | 'text';
}

export interface Playbook {
  id: string;
  stage: DealStage;
  title: string;
  description: string;
  items: PlaybookItem[];
}

export interface PlaybookState {
  playbooks: Playbook[];
  // Map of DealID -> Map of PlaybookItemID -> value (boolean for checkbox, string for text)
  dealProgress: Record<string, Record<string, boolean | string>>;
  
  updateProgress: (dealId: string, itemId: string, value: boolean | string) => void;
}

const DEFAULT_PLAYBOOKS: Playbook[] = [
  {
    id: 'pb-lead',
    stage: 'lead',
    title: 'Discovery Iniziale (Lead)',
    description: 'Raccogli le informazioni base prima di passare al contatto vero e proprio.',
    items: [
      { id: 'pb-lead-1', title: 'Verificare settore e dimensione azienda', isMandatory: true, type: 'checkbox' },
      { id: 'pb-lead-2', title: 'Identificare ruolo del referente', isMandatory: true, type: 'checkbox' },
      { id: 'pb-lead-3', title: 'Nota su potenziale budget', isMandatory: false, type: 'text' },
    ]
  },
  {
    id: 'pb-contacted',
    stage: 'contacted',
    title: 'Qualificazione & BANT',
    description: 'Valuta se il contatto è in target per procedere.',
    items: [
      { id: 'pb-contacted-1', title: 'Budget confermato (B)', isMandatory: true, type: 'checkbox' },
      { id: 'pb-contacted-2', title: 'Decision Maker coinvolto (A)', isMandatory: true, type: 'checkbox' },
      { id: 'pb-contacted-3', title: 'Need primario identificato (N)', isMandatory: true, type: 'checkbox' },
      { id: 'pb-contacted-4', title: 'Timeline per la decisione (T)', isMandatory: true, type: 'text' },
    ]
  },
  {
    id: 'pb-proposal',
    stage: 'proposal',
    title: 'Proposta Commerciale',
    description: 'Prepariamo un preventivo in linea con i Need.',
    items: [
      { id: 'pb-proposal-1', title: 'Generato preventivo via Qi-Quote', isMandatory: true, type: 'checkbox' },
      { id: 'pb-proposal-2', title: 'Fissata call di presentazione', isMandatory: true, type: 'checkbox' },
      { id: 'pb-proposal-3', title: 'Obiezioni sollevate (da prevenire)', isMandatory: false, type: 'text' },
    ]
  },
  {
    id: 'pb-negotiation',
    stage: 'negotiation',
    title: 'Negoziazione Finale',
    description: 'Fase critica pre-chiusura.',
    items: [
      { id: 'pb-negotiation-1', title: 'Sconto massimo approvato dal manager', isMandatory: true, type: 'checkbox' },
      { id: 'pb-negotiation-2', title: 'Legal & Compliance completato', isMandatory: true, type: 'checkbox' },
      { id: 'pb-negotiation-3', title: 'Data presunta firma (Expected)', isMandatory: false, type: 'text' },
    ]
  }
];

export const usePlaybookStore = create<PlaybookState>()(
  persist(
    (set) => ({
      playbooks: DEFAULT_PLAYBOOKS,
      dealProgress: {},

      updateProgress: (dealId, itemId, value) => set((state) => {
        const dealData = state.dealProgress[dealId] || {};
        return {
          dealProgress: {
            ...state.dealProgress,
            [dealId]: {
              ...dealData,
              [itemId]: value
            }
          }
        };
      })
    }),
    { name: 'qi-crm-playbooks-v1' }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomProperty {
  id: string;
  targetObject: 'contact' | 'company' | 'deal';
  group: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'boolean';
  options?: string[];
  description: string;
}

interface CustomPropertiesState {
  properties: CustomProperty[];
  addProperty: (property: Omit<CustomProperty, 'id'>) => void;
  deleteProperty: (id: string) => void;
}

const DEFAULT_PROPERTIES: CustomProperty[] = [
  {
    id: 'prop-codice-fiscale',
    targetObject: 'contact',
    group: 'Dati Anagrafici',
    label: 'Codice Fiscale',
    type: 'text',
    description: 'Codice fiscale per la fatturazione e contrattualistica italiana.'
  },
  {
    id: 'prop-linkedin',
    targetObject: 'contact',
    group: 'Social & Web',
    label: 'Profilo LinkedIn',
    type: 'text',
    description: 'URL completo del profilo professionale LinkedIn.'
  },
  {
    id: 'prop-sito-web',
    targetObject: 'company',
    group: 'Social & Web',
    label: 'Sito Web Secondario',
    type: 'text',
    description: 'Sito web aggiuntivo o portale partner.'
  },
  {
    id: 'prop-budget',
    targetObject: 'deal',
    group: 'Qualificazione',
    label: 'Budget Stimato (€)',
    type: 'number',
    description: 'Budget approssimativo dichiarato dal potenziale cliente.'
  },
  {
    id: 'prop-canale-acquisizione',
    targetObject: 'deal',
    group: 'Qualificazione',
    label: 'Canale Acquisizione',
    type: 'select',
    options: ['Inbound Form', 'Fiera / Evento', 'Outreach LinkedIn', 'Referral', 'Altro'],
    description: 'Canale commerciale principale da cui proviene l\'opportunità.'
  }
];

export const useCustomPropertiesStore = create<CustomPropertiesState>()(
  persist(
    (set) => ({
      properties: DEFAULT_PROPERTIES,

      addProperty: (p) =>
        set((s) => {
          const id = `prop-${p.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Math.random().toString(36).substring(2, 6)}`;
          return { properties: [...s.properties, { ...p, id }] };
        }),

      deleteProperty: (id) =>
        set((s) => ({
          properties: s.properties.filter((p) => p.id !== id),
        })),
    }),
    {
      name: 'qi-crm-custom-properties-v1',
    }
  )
);

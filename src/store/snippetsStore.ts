import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Snippet {
  id: string;
  name: string;
  text: string;
  shortcut: string; // e.g. '#prezzi'
  useCount: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyText: string;
  useCount: number;
}

interface SnippetsState {
  snippets: Snippet[];
  templates: EmailTemplate[];
  addSnippet: (snippet: Omit<Snippet, 'id' | 'useCount'>) => void;
  updateSnippet: (id: string, patch: Partial<Snippet>) => void;
  deleteSnippet: (id: string) => void;
  incrementSnippetUse: (id: string) => void;

  addTemplate: (template: Omit<EmailTemplate, 'id' | 'useCount'>) => void;
  updateTemplate: (id: string, patch: Partial<EmailTemplate>) => void;
  deleteTemplate: (id: string) => void;
  incrementTemplateUse: (id: string) => void;
}

const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 'snip-1',
    name: 'Listino Prezzi Standard',
    text: 'Ecco il nostro listino prezzi aggiornato per il software Qi-CRM:\n- Piano Light: €49/mese (fino a 3 utenti)\n- Piano Pro: €149/mese (funzionalità commerciali avanzate)\n- Piano Enterprise: su misura (AI Hub illimitato & custom APIs)',
    shortcut: '#prezzi',
    useCount: 24
  },
  {
    id: 'snip-2',
    name: 'Follow-up Commerciale',
    text: 'Buongiorno, faccio seguito alla nostra piacevole conversazione della scorsa settimana per verificare se ha avuto modo di consultare il materiale informativo inviato. Resto a completa disposizione per qualsiasi chiarimento.',
    shortcut: '#followup',
    useCount: 15
  },
  {
    id: 'snip-3',
    name: 'Presa in Carico Supporto',
    text: 'Gentile cliente, ti confermiamo che il nostro team tecnico ha preso in carico la tua richiesta. Un operatore specializzato ti risponderà nelle prossime 2 ore lavorative. Grazie per la pazienza.',
    shortcut: '#supporto',
    useCount: 42
  }
];

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Email di Benvenuto Onboarding',
    subject: 'Benvenuto in Qi-CRM! Inizia da qui',
    bodyText: 'Ciao,\n\nSiamo entusiasti di averti a bordo. La tua istanza Qi-CRM è ora attiva e configurata.\n\nEcco i primi passi raccomandati:\n1. Personalizza i campi dei contatti\n2. Collega il tuo canale chat\n3. Invita i membri del tuo team\n\nPer qualsiasi supporto, rispondi direttamente a questa email.\n\nCordiali saluti,\nIl Team Qi-CRM',
    useCount: 8
  },
  {
    id: 'tmpl-2',
    name: 'Proposta Commerciale Bozza',
    subject: 'Bozza Accordo di Partnership - Qi-CRM',
    bodyText: 'Gentile cliente,\n\nIn allegato trova la proposta commerciale elaborata sulla base delle vostre esigenze di vendita B2B.\n\nIl piano proposto include:\n- Pipeline illimitate\n- Sincronizzazione contatti automatica\n- Assistente AI dedicato\n\nRimango in attesa di un vostro riscontro per definire i dettagli.\n\nCordiali saluti,\nGiuseppe Lobbene',
    useCount: 12
  }
];

export const useSnippetsStore = create<SnippetsState>()(
  persist(
    (set) => ({
      snippets: DEFAULT_SNIPPETS,
      templates: DEFAULT_TEMPLATES,

      addSnippet: (snip) =>
        set((s) => ({
          snippets: [...s.snippets, { ...snip, id: `snip-${Math.random().toString(36).substring(2, 10)}`, useCount: 0 }]
        })),

      updateSnippet: (id, patch) =>
        set((s) => ({
          snippets: s.snippets.map((snip) => (snip.id === id ? { ...snip, ...patch } : snip))
        })),

      deleteSnippet: (id) =>
        set((s) => ({
          snippets: s.snippets.filter((snip) => snip.id !== id)
        })),

      incrementSnippetUse: (id) =>
        set((s) => ({
          snippets: s.snippets.map((snip) => (snip.id === id ? { ...snip, useCount: snip.useCount + 1 } : snip))
        })),

      addTemplate: (tmpl) =>
        set((s) => ({
          templates: [...s.templates, { ...tmpl, id: `tmpl-${Math.random().toString(36).substring(2, 10)}`, useCount: 0 }]
        })),

      updateTemplate: (id, patch) =>
        set((s) => ({
          templates: s.templates.map((tmpl) => (tmpl.id === id ? { ...tmpl, ...patch } : tmpl))
        })),

      deleteTemplate: (id) =>
        set((s) => ({
          templates: s.templates.filter((tmpl) => tmpl.id !== id)
        })),

      incrementTemplateUse: (id) =>
        set((s) => ({
          templates: s.templates.map((tmpl) => (tmpl.id === id ? { ...tmpl, useCount: tmpl.useCount + 1 } : tmpl))
        }))
    }),
    {
      name: 'qi-crm-snippets-templates-v1'
    }
  )
);

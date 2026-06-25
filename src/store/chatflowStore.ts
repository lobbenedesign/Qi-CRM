import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatflowStep {
  id: string;
  type: 'message' | 'input_email' | 'input_phone' | 'buttons';
  message: string;
  buttons?: string[];
  nextStepId: string | null;
}

export interface Chatflow {
  id: string;
  name: string;
  active: boolean;
  steps: ChatflowStep[];
}

interface ChatflowState {
  chatflows: Chatflow[];
  activeChatflowId: string | null;
  addChatflow: (cf: Omit<Chatflow, 'id'>) => void;
  updateChatflow: (id: string, patch: Partial<Chatflow>) => void;
  deleteChatflow: (id: string) => void;
}

const DEFAULT_CHATFLOWS: Chatflow[] = [
  {
    id: 'bot-lead-generation',
    name: 'Bot di Cattura Lead Principale',
    active: true,
    steps: [
      {
        id: 'step-1',
        type: 'message',
        message: 'Ciao! Benvenuto su Qi-CRM. Sono il tuo assistente virtuale.',
        nextStepId: 'step-2'
      },
      {
        id: 'step-2',
        type: 'buttons',
        message: 'Come posso aiutarti oggi?',
        buttons: ['Voglio richiedere una demo', 'Vorrei consultare i prezzi', 'Parla con un operatore'],
        nextStepId: 'step-3'
      },
      {
        id: 'step-3',
        type: 'input_email',
        message: 'Perfetto! Lasciami la tua email aziendale così ti ricontattiamo subito.',
        nextStepId: 'step-4'
      },
      {
        id: 'step-4',
        type: 'message',
        message: 'Grazie mille! Un nostro consulente ti contatterà all\'indirizzo indicato entro breve. Buona giornata!',
        nextStepId: null
      }
    ]
  }
];

export const useChatflowStore = create<ChatflowState>()(
  persist(
    (set) => ({
      chatflows: DEFAULT_CHATFLOWS,
      activeChatflowId: 'bot-lead-generation',

      addChatflow: (cf) =>
        set((s) => ({
          chatflows: [...s.chatflows, { ...cf, id: `bot-${Math.random().toString(36).substring(2, 10)}` }]
        })),

      updateChatflow: (id, patch) =>
        set((s) => ({
          chatflows: s.chatflows.map((cf) => (cf.id === id ? { ...cf, ...patch } : cf))
        })),

      deleteChatflow: (id) =>
        set((s) => ({
          chatflows: s.chatflows.filter((cf) => cf.id !== id)
        }))
    }),
    {
      name: 'qi-crm-chatflows-v1'
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DeadlineCategory = 'tax' | 'vendor' | 'client' | 'contract' | 'invoice' | 'other';
export type DeadlineStatus = 'pending' | 'completed' | 'overdue';

export interface Deadline {
  id: string;
  title: string;
  description: string;
  due_date: string; // YYYY-MM-DD
  category: DeadlineCategory;
  amount: number | null;
  status: DeadlineStatus;
  contact_id: string | null;
  deal_id: string | null;
  notify_telegram: boolean;
  notify_email: boolean;
  created_at: string;
}

interface DeadlinesState {
  deadlines: Deadline[];
  addDeadline: (deadline: Omit<Deadline, 'id' | 'created_at' | 'status'>) => void;
  updateDeadline: (id: string, patch: Partial<Deadline>) => void;
  toggleComplete: (id: string) => void;
  removeDeadline: (id: string) => void;
}

export const useDeadlinesStore = create<DeadlinesState>()(
  persist(
    (set) => ({
      deadlines: [
        {
          id: 'dl-demo-1',
          title: 'Liquidazione IVA Trimestrale Q2',
          description: 'Calcolo e versamento IVA tramite F24 per il secondo trimestre fiscale.',
          due_date: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0],
          category: 'tax',
          amount: 2450.00,
          status: 'pending',
          contact_id: null,
          deal_id: null,
          notify_telegram: true,
          notify_email: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'dl-demo-2',
          title: 'Rinnovo Licenza Cloud AWS',
          description: 'Pagamento annuale della quota server per hosting gestionale e API.',
          due_date: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
          category: 'vendor',
          amount: 850.00,
          status: 'pending',
          contact_id: null,
          deal_id: null,
          notify_telegram: false,
          notify_email: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'dl-demo-3',
          title: 'Invio primo acconto fornitore hardware',
          description: 'Saldare il 30% della fattura per i dispositivi ordinati a inizio mese.',
          due_date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
          category: 'vendor',
          amount: 1500.00,
          status: 'pending', // Overdue since it is past date
          contact_id: null,
          deal_id: null,
          notify_telegram: true,
          notify_email: false,
          created_at: new Date().toISOString(),
        }
      ],
      addDeadline: (input) => {
        const newDl: Deadline = {
          ...input,
          id: `ded-${crypto.randomUUID().slice(0, 8)}`,
          status: 'pending',
          created_at: new Date().toISOString(),
        };
        set((state) => ({ deadlines: [newDl, ...state.deadlines] }));
      },
      updateDeadline: (id, patch) =>
        set((state) => ({
          deadlines: state.deadlines.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      toggleComplete: (id) =>
        set((state) => ({
          deadlines: state.deadlines.map((d) =>
            d.id === id
              ? { ...d, status: d.status === 'completed' ? 'pending' : 'completed' }
              : d
          ),
        })),
      removeDeadline: (id) =>
        set((state) => ({
          deadlines: state.deadlines.filter((d) => d.id !== id),
        })),
    }),
    { name: 'qi-crm-deadlines-v1' }
  )
);

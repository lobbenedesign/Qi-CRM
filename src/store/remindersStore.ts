import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Reminder, DeliveryLog } from '../types/team';

const mins = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

const seed: Reminder[] = [
  { id: 'rm-1', title: 'Richiamare Mario Rossi', note: 'Confermare invio contratto rivisto', remind_at: mins(2),   channels: ['visual', 'email', 'telegram'], user_id: 'tm-owner', contact_id: 'ct-rossi', deal_id: 'dl-acme-annual', ticket_id: null, status: 'pending', created_at: new Date().toISOString() },
  { id: 'rm-2', title: 'Follow-up proposta Nexus', note: 'Inviare email di follow-up alle 9:00', remind_at: mins(90),  channels: ['visual', 'email'], user_id: 'tm-owner', contact_id: 'ct-verdi', deal_id: 'dl-nexus-pro', ticket_id: null, status: 'pending', created_at: new Date().toISOString() },
  { id: 'rm-3', title: 'Preparare report settimanale', note: null, remind_at: mins(60 * 26), channels: ['visual'], user_id: 'tm-owner', contact_id: null, deal_id: null, ticket_id: null, status: 'pending', created_at: new Date().toISOString() },
];

interface RemindersState {
  reminders: Reminder[];
  deliveries: DeliveryLog[];

  add: (r: Omit<Reminder, 'id' | 'status' | 'created_at'>) => void;
  markSent: (id: string) => void;
  complete: (id: string) => void;
  remove: (id: string) => void;
  logDelivery: (d: Omit<DeliveryLog, 'id' | 'at'>) => void;
}

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set) => ({
      reminders: seed,
      deliveries: [],

      add: (r) =>
        set((s) => ({
          reminders: [
            { ...r, id: `rm-${crypto.randomUUID().slice(0, 8)}`, status: 'pending', created_at: new Date().toISOString() },
            ...s.reminders,
          ],
        })),
      markSent: (id) => set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, status: 'sent' } : r)) })),
      complete: (id) => set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, status: 'done' } : r)) })),
      remove: (id) => set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),

      logDelivery: (d) =>
        set((s) => ({
          deliveries: [{ ...d, id: `dl-${crypto.randomUUID().slice(0, 6)}`, at: new Date().toISOString() }, ...s.deliveries].slice(0, 200),
        })),
    }),
    { name: 'qi-crm-reminders-v1' },
  ),
);

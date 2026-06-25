import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// BROADCAST OMNICANALE — campagne di massa su Email, SMS,
// WhatsApp, Telegram e Push, con A/B test e analitiche.
// (Le campagne email "1-a-molti" restano in marketingStore;
//  questo modulo è il broadcast multicanale dedicato.)
// ============================================================

export type BroadcastChannel = 'email' | 'sms' | 'whatsapp' | 'telegram' | 'push';

export interface AudienceFilter {
  type: 'all' | 'tag' | 'lifecycle' | 'lead_status';
  value?: string;
}

export interface BroadcastVariant {
  id: 'A' | 'B';
  subject: string;   // usato solo da email/push
  body: string;
}

export interface VariantResult {
  variantId: 'A' | 'B';
  recipients: number;
  sent: number;
  delivered: number;
  opened: number;     // "read" per WhatsApp/Telegram
  clicked: number;
  failed: number;
  unsubscribed: number;
}

export interface Broadcast {
  id: string;
  name: string;
  channel: BroadcastChannel;
  audience: AudienceFilter;
  abTest: boolean;
  variants: BroadcastVariant[];   // 1 (no A/B) o 2 (A/B)
  guardianAi: boolean;
  status: 'draft' | 'sent';
  results: VariantResult[];
  winner: 'A' | 'B' | null;
  sentAt: string | null;
  created_at: string;
}

interface BroadcastState {
  broadcasts: Broadcast[];
  add: (b: Omit<Broadcast, 'id' | 'status' | 'results' | 'winner' | 'sentAt' | 'created_at'>) => string;
  update: (id: string, patch: Partial<Broadcast>) => void;
  remove: (id: string) => void;
  markSent: (id: string, results: VariantResult[], winner: 'A' | 'B' | null) => void;
}

const now = () => new Date().toISOString();

const seed: Broadcast[] = [
  {
    id: 'bc-seed-1', name: 'Offerta di primavera', channel: 'email',
    audience: { type: 'lifecycle', value: 'lead' }, abTest: true, guardianAi: true,
    variants: [
      { id: 'A', subject: '🌸 -20% solo questa settimana', body: 'Approfitta dello sconto primaverile sui nostri piani.' },
      { id: 'B', subject: 'Il tuo sconto del 20% scade venerdì', body: 'Ultimi giorni per attivare il tuo piano scontato.' },
    ],
    status: 'sent',
    results: [
      { variantId: 'A', recipients: 60, sent: 60, delivered: 59, opened: 27, clicked: 7, failed: 1, unsubscribed: 1 },
      { variantId: 'B', recipients: 60, sent: 60, delivered: 60, opened: 34, clicked: 12, failed: 0, unsubscribed: 0 },
    ],
    winner: 'B', sentAt: now(), created_at: now(),
  },
];

export const useBroadcastStore = create<BroadcastState>()(
  persist(
    (set) => ({
      broadcasts: seed,
      add: (b) => {
        const id = `bc-${crypto.randomUUID().slice(0, 8)}`;
        set((s) => ({ broadcasts: [{ ...b, id, status: 'draft', results: [], winner: null, sentAt: null, created_at: now() }, ...s.broadcasts] }));
        return id;
      },
      update: (id, patch) => set((s) => ({ broadcasts: s.broadcasts.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      remove: (id) => set((s) => ({ broadcasts: s.broadcasts.filter((b) => b.id !== id) })),
      markSent: (id, results, winner) =>
        set((s) => ({ broadcasts: s.broadcasts.map((b) => (b.id === id ? { ...b, status: 'sent', results, winner, sentAt: now() } : b)) })),
    }),
    { name: 'qi-crm-broadcast-v1' },
  ),
);

// Tassi medi simulati per canale (delivery / open|read / click).
export const CHANNEL_RATES: Record<BroadcastChannel, { delivered: number; opened: number; clicked: number; hasSubject: boolean; label: string }> = {
  email:    { delivered: 0.97, opened: 0.45, clicked: 0.12, hasSubject: true,  label: 'Email' },
  sms:      { delivered: 0.98, opened: 0.90, clicked: 0.18, hasSubject: false, label: 'SMS' },
  whatsapp: { delivered: 0.95, opened: 0.80, clicked: 0.27, hasSubject: false, label: 'WhatsApp' },
  telegram: { delivered: 0.92, opened: 0.70, clicked: 0.22, hasSubject: false, label: 'Telegram' },
  push:     { delivered: 0.85, opened: 0.32, clicked: 0.09, hasSubject: true,  label: 'Push' },
};

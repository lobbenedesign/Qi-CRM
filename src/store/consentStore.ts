import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConsentChannel } from '../types/crm';

// ============================================================
// MODULO DI CONSENSO PRIVACY (firmabile/controfirmabile).
// Traccia le richieste di consenso inviate ai clienti e l'esito
// (firma digitale via link o registrazione di un modulo cartaceo).
// L'esito aggiorna `contact.consent` → guida i gate del marketing.
// ============================================================

export interface ConsentGrants {
  marketing: boolean;
  profiling: boolean;
  third_party: boolean;
  channels: ConsentChannel[];
}

export type ConsentRequestStatus = 'sent' | 'signed' | 'paper' | 'countersigned';

export interface ConsentRequest {
  id: string;
  token: string;                 // per il link pubblico /consent/:token
  contact_id: string;
  contact_name: string;
  contact_email: string;
  policy_version: string;
  status: ConsentRequestStatus;
  grants: ConsentGrants | null;  // concessioni risultanti dopo la firma
  signed_name: string | null;    // chi ha firmato (cliente)
  signed_at: string | null;
  signature_hash: string | null; // impronta della firma (digitale)
  countersigned_by: string | null;
  countersigned_at: string | null;
  channel: 'digital' | 'paper';
  created_at: string;
}

interface ConsentState {
  requests: ConsentRequest[];
  create: (input: { contact_id: string; contact_name: string; contact_email: string; policy_version: string }) => ConsentRequest;
  getByToken: (token: string) => ConsentRequest | undefined;
  forContact: (contactId: string) => ConsentRequest[];
  sign: (token: string, grants: ConsentGrants, signedName: string, signatureHash: string) => void;
  recordPaper: (contactId: string, contactName: string, contactEmail: string, grants: ConsentGrants, policyVersion: string, operator: string) => ConsentRequest;
  countersign: (id: string, operator: string) => void;
  remove: (id: string) => void;
}

const now = () => new Date().toISOString();
const token = () => crypto.randomUUID().replace(/-/g, '').slice(0, 24);

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      requests: [],

      create: (input) => {
        const req: ConsentRequest = {
          id: `cr-${crypto.randomUUID().slice(0, 8)}`, token: token(),
          contact_id: input.contact_id, contact_name: input.contact_name, contact_email: input.contact_email,
          policy_version: input.policy_version, status: 'sent', grants: null,
          signed_name: null, signed_at: null, signature_hash: null,
          countersigned_by: null, countersigned_at: null, channel: 'digital', created_at: now(),
        };
        set((s) => ({ requests: [req, ...s.requests] }));
        return req;
      },

      getByToken: (t) => get().requests.find((r) => r.token === t),
      forContact: (contactId) => get().requests.filter((r) => r.contact_id === contactId).sort((a, b) => b.created_at.localeCompare(a.created_at)),

      sign: (t, grants, signedName, signatureHash) =>
        set((s) => ({
          requests: s.requests.map((r) =>
            r.token === t ? { ...r, status: 'signed', grants, signed_name: signedName, signed_at: now(), signature_hash: signatureHash } : r,
          ),
        })),

      recordPaper: (contactId, contactName, contactEmail, grants, policyVersion, operator) => {
        const req: ConsentRequest = {
          id: `cr-${crypto.randomUUID().slice(0, 8)}`, token: token(),
          contact_id: contactId, contact_name: contactName, contact_email: contactEmail,
          policy_version: policyVersion, status: 'paper', grants,
          signed_name: contactName, signed_at: now(), signature_hash: null,
          countersigned_by: operator, countersigned_at: now(), channel: 'paper', created_at: now(),
        };
        set((s) => ({ requests: [req, ...s.requests] }));
        return req;
      },

      countersign: (id, operator) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, status: 'countersigned', countersigned_by: operator, countersigned_at: now() } : r)),
        })),

      remove: (id) => set((s) => ({ requests: s.requests.filter((r) => r.id !== id) })),
    }),
    { name: 'qi-crm-consent-requests-v1' },
  ),
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuditEntry } from '../types/team';

const MAX = 800;  // cap entries

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

const seedEntries: AuditEntry[] = [
  { id: 'a1', user_id: 'tm-comm',  user_name: 'Marco Bianchi', user_role: 'commerciale',    action: 'stage_change', resource: 'deal',    target_label: 'Nexus — Piano Pro 50 seats', timestamp: ago(12),  meta: { to: 'proposal' } },
  { id: 'a2', user_id: 'tm-tel',   user_name: 'Sara Conti',    user_role: 'telefonista',    action: 'create',       resource: 'contact', target_label: 'Federica Greco',              timestamp: ago(35) },
  { id: 'a3', user_id: 'tm-admin', user_name: 'Anna Ferrari',  user_role: 'amministrativo', action: 'update',       resource: 'company', target_label: 'Acme Industries',             timestamp: ago(70) },
  { id: 'a4', user_id: 'tm-comm',  user_name: 'Marco Bianchi', user_role: 'commerciale',    action: 'login',        resource: 'session', target_label: 'Accesso',                     timestamp: ago(90) },
  { id: 'a5', user_id: 'tm-conf',  user_name: 'Luca Verdi',    user_role: 'configuratore',  action: 'update',       resource: 'deal',    target_label: 'Globex — Progetto pilota',    timestamp: ago(140) },
];

interface AuditState {
  entries: AuditEntry[];
  log: (e: Omit<AuditEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
      entries: seedEntries,
      log: (e) =>
        set((s) => ({
          entries: [
            { ...e, id: `a-${crypto.randomUUID().slice(0, 8)}`, timestamp: new Date().toISOString() },
            ...s.entries,
          ].slice(0, MAX),
        })),
      clear: () => set({ entries: [] }),
    }),
    { name: 'qi-crm-audit-v1' },
  ),
);

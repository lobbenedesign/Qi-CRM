import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TeamRoleDefinition } from '../types/team';

interface RoleState {
  roles: TeamRoleDefinition[];
  addRole: (role: TeamRoleDefinition) => void;
  updateRole: (key: string, patch: Partial<TeamRoleDefinition>) => void;
  deleteRole: (key: string) => void;
}

const DEFAULT_ROLES: TeamRoleDefinition[] = [
  {
    key: 'superadmin',
    label: 'Superadmin',
    description: 'Controllo totale, gestione team e audit log',
    color: '#6366f1',
    permissions: ['*'],
    is_custom: false,
  },
  {
    key: 'ceo',
    label: 'CEO / Titolare',
    description: 'Accesso completo a tutti i reparti, contratti e bilanci',
    color: '#ec4899',
    permissions: [
      'dashboard:view', 'analytics:view', 'org:view', 'ai:view',
      'contacts:view', 'contacts:create', 'contacts:edit', 'contacts:delete', 'contacts:export',
      'companies:view', 'companies:create', 'companies:edit', 'companies:delete',
      'pipeline:view', 'deals:view', 'deals:create', 'deals:edit', 'deals:delete',
      'tickets:view', 'tickets:create', 'tickets:edit', 'tickets:delete',
      'automations:view', 'automations:manage',
      'activities:create', 'reminders:view',
      'contracts:view', 'contracts:create', 'contracts:sign',
      'deadlines:view', 'invoices:view', 'invoices:create',
      'team:manage', 'audit:view', 'pipeline:manage'
    ],
    is_custom: false,
  },
  {
    key: 'commerciale',
    label: 'Commerciale',
    description: 'Gestione contatti, opportunità e pipeline di vendita',
    color: '#22c55e',
    permissions: [
      'dashboard:view', 'analytics:view', 'org:view', 'ai:view',
      'contacts:view', 'contacts:create', 'contacts:edit',
      'companies:view',
      'pipeline:view', 'deals:view', 'deals:create', 'deals:edit', 'deals:delete',
      'tickets:view', 'tickets:create',
      'activities:create', 'reminders:view',
      'contracts:view', 'deadlines:view'
    ],
    is_custom: false,
  },
  {
    key: 'amministrativo',
    label: 'Amministrativo',
    description: 'Gestione fatture, scadenze fiscali e contratti clienti',
    color: '#f59e0b',
    permissions: [
      'dashboard:view', 'analytics:view', 'org:view',
      'contacts:view', 'contacts:create', 'contacts:edit', 'contacts:delete', 'contacts:export',
      'companies:view', 'companies:create', 'companies:edit', 'companies:delete',
      'pipeline:view', 'deals:view',
      'tickets:view', 'tickets:create',
      'automations:view',
      'activities:create', 'reminders:view',
      'contracts:view', 'deadlines:view', 'invoices:view', 'pipeline:manage'
    ],
    is_custom: false,
  },
  {
    key: 'configuratore',
    label: 'Configuratore',
    description: 'Configurazione deal, caratteristiche prodotti e ticket tecnici',
    color: '#8b5cf6',
    permissions: [
      'dashboard:view', 'org:view',
      'contacts:view', 'companies:view',
      'pipeline:view', 'deals:view', 'deals:edit',
      'tickets:view',
      'activities:create', 'reminders:view'
    ],
    is_custom: false,
  },
  {
    key: 'telefonista',
    label: 'Telefonista',
    description: 'Acquisizione contatti iniziali, appuntamenti e ticket di supporto',
    color: '#06b6d4',
    permissions: [
      'dashboard:view', 'ai:view',
      'contacts:view', 'contacts:create',
      'pipeline:view', 'deals:view', 'deals:create',
      'tickets:view', 'tickets:create',
      'activities:create', 'reminders:view'
    ],
    is_custom: false,
  },
];

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      roles: DEFAULT_ROLES,

      addRole: (role) =>
        set((s) => ({ roles: [...s.roles, role] })),

      updateRole: (key, patch) =>
        set((s) => ({
          roles: s.roles.map((r) => (r.key === key ? { ...r, ...patch } : r)),
        })),

      deleteRole: (key) =>
        set((s) => ({
          roles: s.roles.filter((r) => r.key !== key || !r.is_custom),
        })),
    }),
    {
      name: 'qi-crm-roles-v1',
    }
  )
);

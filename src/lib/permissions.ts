import { useRoleStore } from '../store/roleStore';

export type Permission = string;

// Lista strutturata di tutte le autorizzazioni disponibili nel sistema per la griglia di configurazione
export const AVAILABLE_PERMISSIONS = [
  { key: 'dashboard:view', label: 'Vedere la Dashboard', category: 'Generale' },
  { key: 'analytics:view', label: 'Vedere gli Analytics', category: 'Generale' },
  { key: 'org:view', label: 'Vedere l\'Organigramma', category: 'Generale' },
  { key: 'ai:view', label: 'Accedere al modulo AI Hub', category: 'Generale' },
  { key: 'audit:view', label: 'Vedere i Log di Audit', category: 'Generale' },
  { key: 'team:manage', label: 'Gestire il Team (Inviti e Ruoli)', category: 'Amministrazione' },
  
  { key: 'contacts:view', label: 'Vedere i Contatti', category: 'Contatti' },
  { key: 'contacts:create', label: 'Creare nuovi Contatti', category: 'Contatti' },
  { key: 'contacts:edit', label: 'Modificare i Contatti', category: 'Contatti' },
  { key: 'contacts:delete', label: 'Eliminare i Contatti', category: 'Contatti' },
  { key: 'contacts:export', label: 'Esportare Contatti in CSV', category: 'Contatti' },

  { key: 'companies:view', label: 'Vedere i Clienti', category: 'Clienti' },
  { key: 'companies:create', label: 'Creare nuovi Clienti', category: 'Clienti' },
  { key: 'companies:edit', label: 'Modificare i Clienti', category: 'Clienti' },
  { key: 'companies:delete', label: 'Eliminare i Clienti', category: 'Clienti' },

  { key: 'pipeline:view', label: 'Vedere la Pipeline', category: 'Opportunità' },
  { key: 'deals:view', label: 'Vedere i Deal', category: 'Opportunità' },
  { key: 'deals:create', label: 'Creare nuovi Deal', category: 'Opportunità' },
  { key: 'deals:edit', label: 'Modificare i Deal', category: 'Opportunità' },
  { key: 'deals:delete', label: 'Eliminare i Deal', category: 'Opportunità' },
  { key: 'pipeline:manage', label: 'Gestire colonne e stage Pipeline', category: 'Opportunità' },

  { key: 'tickets:view', label: 'Vedere i Ticket di Supporto', category: 'Supporto Clienti' },
  { key: 'tickets:create', label: 'Aprire nuovi Ticket', category: 'Supporto Clienti' },
  { key: 'tickets:edit', label: 'Modificare i Ticket', category: 'Supporto Clienti' },
  { key: 'tickets:delete', label: 'Eliminare i Ticket', category: 'Supporto Clienti' },

  { key: 'automations:view', label: 'Vedere le Automazioni', category: 'Automazioni' },
  { key: 'automations:manage', label: 'Creare/Modificare Automazioni', category: 'Automazioni' },

  { key: 'contracts:view', label: 'Vedere i Contratti', category: 'Contratti' },
  { key: 'contracts:create', label: 'Redigere nuovi Contratti', category: 'Contratti' },
  { key: 'contracts:sign', label: 'Apporre Firma Elettronica', category: 'Contratti' },

  { key: 'marketing:view', label: 'Vedere Strumenti Marketing', category: 'Marketing' },
  { key: 'marketing:manage', label: 'Gestire Moduli di Acquisizione', category: 'Marketing' },

  { key: 'deadlines:view', label: 'Vedere le Scadenze', category: 'Fatture e Scadenze' },
  { key: 'invoices:view', label: 'Vedere le Fatture', category: 'Fatture e Scadenze' },
  { key: 'invoices:create', label: 'Emettere nuove Fatture', category: 'Fatture e Scadenze' },
];

/** Ottiene i metadati di un ruolo in tempo reale. */
export const getRoleMeta = (role: string) => {
  const roles = useRoleStore.getState().roles;
  const roleDef = roles.find(r => r.key === role);
  if (roleDef) {
    return { label: roleDef.label, desc: roleDef.description, color: roleDef.color };
  }
  return { label: role, desc: 'Ruolo personalizzato', color: '#64748b' };
};

/** Proxy per mantenere la compatibilità con i file che importano ROLE_META staticamente */
export const ROLE_META = new Proxy({} as Record<string, { label: string; desc: string; color: string }>, {
  get(_target, prop) {
    if (typeof prop === 'string') {
      return getRoleMeta(prop);
    }
    return undefined;
  }
});

/** Proxy per mantenere la compatibilità con i file che importano ALL_ROLES staticamente */
export const ALL_ROLES = new Proxy([] as string[], {
  get(_target, prop) {
    const keys = useRoleStore.getState().roles.map(r => r.key);
    if (prop === 'length') return keys.length;
    if (prop === 'map') return keys.map.bind(keys);
    if (prop === 'find') return keys.find.bind(keys);
    if (prop === 'forEach') return keys.forEach.bind(keys);
    if (prop === 'filter') return keys.filter.bind(keys);
    if (prop === 'indexOf') return keys.indexOf.bind(keys);
    if (prop === Symbol.iterator) return keys[Symbol.iterator].bind(keys);
    if (typeof prop === 'string' && !isNaN(Number(prop))) {
      return keys[Number(prop)];
    }
    return (keys as any)[prop];
  }
});

/** Verifica se un ruolo possiede un permesso. */
export function can(role: string | undefined, perm: Permission): boolean {
  if (!role) return false;
  const roles = useRoleStore.getState().roles;
  const roleDef = roles.find(r => r.key === role);
  if (!roleDef) return false;
  return roleDef.permissions.includes('*') || roleDef.permissions.includes(perm);
}

// ----- Voci di navigazione con permesso richiesto -----
export interface NavDef { to: string; label: string; perm: Permission; }

export const NAV_DEFS: NavDef[] = [
  { to: '/',            label: 'Dashboard',   perm: 'dashboard:view' },
  { to: '/contacts',    label: 'Contatti',    perm: 'contacts:view' },
  { to: '/companies',   label: 'Clienti',     perm: 'companies:view' },
  { to: '/pipeline',    label: 'Pipeline',    perm: 'pipeline:view' },
  { to: '/tickets',     label: 'Ticket',      perm: 'tickets:view' },
  { to: '/inbox',       label: 'Inbox Chat',  perm: 'tickets:view' },
  { to: '/contracts',    label: 'Contratti',   perm: 'contracts:view' },
  { to: '/marketing',    label: 'Marketing',   perm: 'marketing:view' },
  { to: '/deadlines',    label: 'Scadenzario',  perm: 'deadlines:view' },
  { to: '/invoices',     label: 'Fatture',     perm: 'invoices:view' },
  { to: '/automations', label: 'Automazioni', perm: 'automations:view' },
  { to: '/analytics',   label: 'Analytics',   perm: 'analytics:view' },
  { to: '/ai',          label: 'AI Hub',      perm: 'ai:view' },
  { to: '/team',        label: 'Team',         perm: 'team:manage' },
  { to: '/integrations', label: 'Integrazioni', perm: 'team:manage' },
  { to: '/audit',       label: 'Audit Log',    perm: 'audit:view' },
];

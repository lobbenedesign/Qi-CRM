import { useCreateContact } from './useContacts';
import { useCreateTicket } from './useTickets';
import { useOrgSettingsStore } from '../store/orgSettingsStore';
import { useToastStore } from '../store/toastStore';
import { activePool } from '../lib/assignment';
import { buildMeta } from '../lib/trust';
import { logAudit } from '../lib/audit';

export interface InboundLead {
  name: string;
  email?: string;
  phone?: string;
  message?: string;
}

/**
 * Ingestione di una richiesta di contatto proveniente dal sito della società.
 * Crea il contatto (provenienza 'website'), opzionalmente apre un ticket di
 * richiamo auto-assegnato al ruolo configurato, e notifica con un toast.
 *
 * In produzione questa logica vivrà in una Supabase Edge Function chiamata
 * dal form del sito via l'endpoint+key configurati in Integrazioni.
 */
export function useIngestInboundLead() {
  const createContact = useCreateContact();
  const createTicket = useCreateTicket();
  const inbound = useOrgSettingsStore((s) => s.inbound);
  const pushToast = useToastStore((s) => s.push);

  return async (lead: InboundLead) => {
    const [first, ...rest] = lead.name.trim().split(' ');
    const last = rest.join(' ');

    let contactId: string | null = null;
    if (inbound.auto_create_contact) {
      const contact = await createContact.mutateAsync({
        first_name: first || lead.name,
        last_name: last || null,
        email: lead.email || null,
        phone: lead.phone || null,
        lead_status: 'new',
        lifecycle_stage: 'lead',
        tags: ['website', 'inbound'],
        field_trust: {
          ...(lead.email ? { email: buildMeta('import') } : {}),
          ...(lead.phone ? { phone: buildMeta('import') } : {}),
        },
        ai_summary: lead.message ? `Richiesta dal sito: "${lead.message}"` : null,
      });
      contactId = contact.id;
    }

    if (inbound.auto_create_ticket) {
      // Smista al ruolo configurato per i lead dal sito (least-loaded approssimato)
      const pool = activePool(inbound.assign_role);
      const assignee_id = pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
      await createTicket.mutateAsync({
        title: `Richiesta dal sito — ${lead.name}`,
        description: lead.message || 'Nuova richiesta di contatto dal sito web.',
        category: 'callback',
        priority: 'high',
        contact_id: contactId,
        assignee_id,
      });
    }

    logAudit('create', 'contact', lead.name, { source: 'website' });
    pushToast({
      kind: 'info',
      title: '🌐 Nuova richiesta dal sito',
      body: `${lead.name}${lead.email ? ` · ${lead.email}` : ''} — acquisita e smistata`,
    });
  };
}

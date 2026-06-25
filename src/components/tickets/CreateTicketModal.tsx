import { useState } from 'react';
import { X, Loader2, Zap } from 'lucide-react';
import { useCreateTicket, useTickets } from '../../hooks/useTickets';
import { useContacts } from '../../hooks/useContacts';
import { useContactsStore } from '../../store/contactsStore';
import { resolveTicketAssignee, CATEGORY_ROLE } from '../../lib/assignment';
import { ROLE_META } from '../../lib/permissions';
import { useTeamStore } from '../../store/teamStore';
import { AssigneePicker } from '../team/AssigneePicker';
import type { TicketCategory, TicketPriority } from '../../types/team';

const CATEGORIES: { key: TicketCategory; label: string }[] = [
  { key: 'callback', label: 'Richiamo / Appuntamento' },
  { key: 'sales',    label: 'Commerciale' },
  { key: 'admin',    label: 'Amministrativo' },
  { key: 'config',   label: 'Configurazione' },
  { key: 'support',  label: 'Supporto' },
];

const PRIORITIES: { key: TicketPriority; label: string }[] = [
  { key: 'low', label: 'Bassa' }, { key: 'medium', label: 'Media' },
  { key: 'high', label: 'Alta' }, { key: 'urgent', label: 'Urgente' },
];

interface Props { onClose: () => void; }

export function CreateTicketModal({ onClose }: Props) {
  const createTicket = useCreateTicket();
  const { data: tickets = [] } = useTickets();
  useContacts();
  const contacts = useContactsStore((s) => s.contacts);

  const [form, setForm] = useState({
    title: '', description: '', category: 'callback' as TicketCategory,
    priority: 'medium' as TicketPriority, contact_id: '', due_at: '',
    assignee: 'auto' as string | 'auto',
  });

  const previewMember = useTeamStore((s) => {
    if (form.assignee !== 'auto') return s.members.find((m) => m.id === form.assignee);
    return undefined;
  });
  const autoRole = CATEGORY_ROLE[form.category];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignee_id = form.assignee === 'auto'
      ? resolveTicketAssignee(form.category, tickets)
      : (form.assignee || null);
    const c = contacts.find((x) => x.id === form.contact_id);
    await createTicket.mutateAsync({
      title: form.title, description: form.description || null,
      category: form.category, priority: form.priority,
      contact_id: form.contact_id || null, company_id: c?.company_id ?? null,
      assignee_id, due_at: form.due_at || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-surface-900 rounded-xl shadow-2xl border
                      border-surface-200 dark:border-surface-700 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Nuovo Ticket</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Titolo *</label>
            <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="es. Richiamare per preventivo" className="auth-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Descrizione</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2} className="auth-input resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Categoria</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TicketCategory }))} className="auth-input">
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Priorità</label>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TicketPriority }))} className="auth-input">
                {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Contatto collegato</label>
            <select value={form.contact_id} onChange={(e) => setForm((f) => ({ ...f, contact_id: e.target.value }))} className="auth-input">
              <option value="">— Nessuno —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Assegna a</label>
            <AssigneePicker value={form.assignee} onChange={(v) => setForm((f) => ({ ...f, assignee: v }))} />
            <p className="text-[11px] text-surface-400 mt-1 flex items-center gap-1">
              {form.assignee === 'auto' ? (
                <><Zap size={11} className="text-amber-500" /> Verrà smistato automaticamente a un <strong>{ROLE_META[autoRole].label}</strong> disponibile</>
              ) : previewMember ? (
                <>Assegnato a {previewMember.first_name} {previewMember.last_name}</>
              ) : 'Resterà non assegnato'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Scadenza</label>
            <input type="date" value={form.due_at} onChange={(e) => setForm((f) => ({ ...f, due_at: e.target.value }))} className="auth-input" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={createTicket.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-60 font-medium">
              {createTicket.isPending && <Loader2 size={14} className="animate-spin" />}
              Crea Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

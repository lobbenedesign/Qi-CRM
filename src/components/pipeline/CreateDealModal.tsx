import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateDeal } from '../../hooks/useDeals';
import { useContacts } from '../../hooks/useContacts';
import { useCompanies } from '../../hooks/useCompanies';
import { useContactsStore } from '../../store/contactsStore';
import { useCompaniesStore } from '../../store/companiesStore';
import { buildMeta } from '../../lib/trust';
import { AssigneePicker } from '../team/AssigneePicker';
import { Zap } from 'lucide-react';
import { useDealsStore } from '../../store/dealsStore';
import type { DealStage } from '../../types/crm';

interface Props {
  onClose: () => void;
  defaultStage?: DealStage;
}

export function CreateDealModal({ onClose, defaultStage = 'lead' }: Props) {
  const createDeal = useCreateDeal();
  useContacts();
  useCompanies();
  const contacts = useContactsStore((s) => s.contacts);
  const companies = useCompaniesStore((s) => s.companies);
  const stages = useDealsStore((s) => s.stages);

  const [form, setForm] = useState({
    title: '', value: '', stage: defaultStage,
    contact_id: '', company_id: '', expected_close: '', next_action: '',
    assignee: 'auto' as string | 'auto',
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDeal.mutateAsync({
      title: form.title,
      value: Number(form.value) || 0,
      currency: 'EUR',
      stage: form.stage,
      contact_id: form.contact_id || null,
      company_id: form.company_id || null,
      expected_close: form.expected_close || null,
      next_action: form.next_action || null,
      // 'auto' → assignee_id undefined così l'hook applica lo smistamento
      ...(form.assignee === 'auto' ? {} : { assignee_id: form.assignee || null }),
      field_trust: { value: buildMeta('user') },
    });
    onClose();
  };

  // Auto-compila azienda dal contatto scelto
  const onContact = (id: string) => {
    const c = contacts.find((x) => x.id === id);
    setForm((f) => ({ ...f, contact_id: id, company_id: c?.company_id ?? f.company_id }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-surface-900 rounded-xl shadow-2xl border
                   border-surface-200 dark:border-surface-700 w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Nuovo Deal</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Titolo *</label>
            <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="es. Acme — Contratto annuale" className="auth-input" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Valore (€) *</label>
              <input required type="number" min="0" value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="0" className="auth-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Stage</label>
              <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as DealStage }))}
                className="auth-input">
                {stages.map((s) => <option key={s.id} value={s.stage_key}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Contatto</label>
            <select value={form.contact_id} onChange={(e) => onContact(e.target.value)} className="auth-input">
              <option value="">— Nessuno —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Azienda</label>
            <select value={form.company_id} onChange={(e) => setForm((f) => ({ ...f, company_id: e.target.value }))} className="auth-input">
              <option value="">— Nessuna —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Chiusura prevista</label>
              <input type="date" value={form.expected_close}
                onChange={(e) => setForm((f) => ({ ...f, expected_close: e.target.value }))} className="auth-input" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Assegna a</label>
            <AssigneePicker value={form.assignee} onChange={(v) => setForm((f) => ({ ...f, assignee: v }))} />
            {form.assignee === 'auto' && (
              <p className="text-[11px] text-surface-400 mt-1 flex items-center gap-1">
                <Zap size={11} className="text-amber-500" /> Smistamento automatico secondo le regole impostate
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Prossima azione</label>
            <input value={form.next_action} onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))}
              placeholder="es. Inviare proposta" className="auth-input" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-surface-600 dark:text-surface-400
                         hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={createDeal.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700
                         text-white rounded-lg transition-colors disabled:opacity-60 font-medium">
              {createDeal.isPending && <Loader2 size={14} className="animate-spin" />}
              Crea Deal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

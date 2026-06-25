import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateContact } from '../../hooks/useContacts';
import { useCompanies } from '../../hooks/useCompanies';
import { useCompaniesStore } from '../../store/companiesStore';

interface Props {
  onClose: () => void;
}

export function CreateContactModal({ onClose }: Props) {
  const createContact = useCreateContact();
  useCompanies();
  const companies = useCompaniesStore((s) => s.companies);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    company_id: '',
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createContact.mutateAsync({
      ...form,
      company_id: form.company_id || null,
    } as any);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-surface-900 rounded-xl shadow-2xl border
                   border-surface-200 dark:border-surface-700 w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">
            Nuovo Contatto
          </h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Nome *</label>
              <input
                required
                value={form.first_name}
                onChange={set('first_name')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200
                           dark:border-surface-700 bg-white dark:bg-surface-800
                           text-surface-900 dark:text-surface-100 outline-none
                           focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Cognome</label>
              <input
                value={form.last_name}
                onChange={set('last_name')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200
                           dark:border-surface-700 bg-white dark:bg-surface-800
                           text-surface-900 dark:text-surface-100 outline-none
                           focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200
                         dark:border-surface-700 bg-white dark:bg-surface-800
                         text-surface-900 dark:text-surface-100 outline-none
                         focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Telefono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200
                         dark:border-surface-700 bg-white dark:bg-surface-800
                         text-surface-900 dark:text-surface-100 outline-none
                         focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Ruolo</label>
            <input
              value={form.job_title}
              onChange={set('job_title')}
              placeholder="es. CEO, Sales Manager…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200
                         dark:border-surface-700 bg-white dark:bg-surface-800
                         text-surface-900 dark:text-surface-100 outline-none
                         focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Azienda</label>
            <select
              value={form.company_id}
              onChange={set('company_id')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200
                         dark:border-surface-700 bg-white dark:bg-surface-800
                         text-surface-900 dark:text-surface-100 outline-none
                         focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            >
              <option value="">— Nessuna —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-surface-600 dark:text-surface-400
                         hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={createContact.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600
                         hover:bg-brand-700 text-white rounded-lg transition-colors
                         disabled:opacity-60 font-medium"
            >
              {createContact.isPending && <Loader2 size={14} className="animate-spin" />}
              Crea Contatto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

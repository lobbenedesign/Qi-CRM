import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateCompany } from '../../hooks/useCompanies';

interface Props {
  onClose: () => void;
}

export function CreateCompanyModal({ onClose }: Props) {
  const createCompany = useCreateCompany();

  const [form, setForm] = useState({
    name: '',
    domain: '',
    industry: '',
    website: '',
    phone: '',
    city: '',
    country: 'IT',
  });

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { city, country, ...rest } = form;
    await createCompany.mutateAsync({
      ...rest,
      address: { city, country },
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
            Nuova Azienda
          </h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Nome azienda *</label>
            <input
              required
              value={form.name}
              onChange={set('name')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200
                         dark:border-surface-700 bg-white dark:bg-surface-800
                         text-surface-900 dark:text-surface-100 outline-none
                         focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Dominio</label>
              <input
                value={form.domain}
                onChange={set('domain')}
                placeholder="es. acme.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200
                           dark:border-surface-700 bg-white dark:bg-surface-800
                           text-surface-900 dark:text-surface-100 outline-none
                           focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Settore</label>
              <input
                value={form.industry}
                onChange={set('industry')}
                placeholder="es. SaaS, Retail…"
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200
                           dark:border-surface-700 bg-white dark:bg-surface-800
                           text-surface-900 dark:text-surface-100 outline-none
                           focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Website</label>
            <input
              type="url"
              value={form.website}
              onChange={set('website')}
              placeholder="https://"
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200
                         dark:border-surface-700 bg-white dark:bg-surface-800
                         text-surface-900 dark:text-surface-100 outline-none
                         focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Città</label>
              <input
                value={form.city}
                onChange={set('city')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200
                           dark:border-surface-700 bg-white dark:bg-surface-800
                           text-surface-900 dark:text-surface-100 outline-none
                           focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Paese</label>
              <input
                value={form.country}
                onChange={set('country')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200
                           dark:border-surface-700 bg-white dark:bg-surface-800
                           text-surface-900 dark:text-surface-100 outline-none
                           focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
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
              disabled={createCompany.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600
                         hover:bg-brand-700 text-white rounded-lg transition-colors
                         disabled:opacity-60 font-medium"
            >
              {createCompany.isPending && <Loader2 size={14} className="animate-spin" />}
              Crea Azienda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

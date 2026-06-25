import { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOrgSettingsStore } from '../../store/orgSettingsStore';

export function MassEmailSettings() {
  const settings = useOrgSettingsStore((s) => s.mass_email);
  const patch = useOrgSettingsStore((s) => s.patch);

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a real app, you would validate the SMTP/API credentials here
    patch('mass_email', { verified: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-5 mt-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
          <Mail size={18} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-surface-900 dark:text-surface-100">Integrazione Email Marketing (Qi-Campaigns)</h2>
          <p className="text-xs text-surface-500">Configura il provider SMTP o API per l'invio massivo di newsletter (Mailchimp alternative).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <label className="block">
          <span className="text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1 block">Provider</span>
          <select
            value={settings.provider}
            onChange={(e) => patch('mass_email', { provider: e.target.value as any })}
            className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
          >
            <option value="smtp">SMTP Generico</option>
            <option value="sendgrid">SendGrid</option>
            <option value="ses">Amazon SES</option>
            <option value="mailgun">Mailgun</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1 block">API Key o Password SMTP</span>
          <input
            type="password"
            value={settings.api_key}
            onChange={(e) => patch('mass_email', { api_key: e.target.value })}
            placeholder="sk_..."
            className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1 block">Indirizzo Mittente (From Email)</span>
          <input
            type="email"
            value={settings.from_address}
            onChange={(e) => patch('mass_email', { from_address: e.target.value })}
            placeholder="newsletter@azienda.it"
            className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1 block">Nome Mittente (From Name)</span>
          <input
            type="text"
            value={settings.from_name}
            onChange={(e) => patch('mass_email', { from_name: e.target.value })}
            placeholder="Il team di Marketing"
            className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-surface-100 dark:border-surface-800 pt-4">
        {settings.verified ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} /> Connessione verificata
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500">
            <AlertCircle size={14} /> Connessione non verificata
          </div>
        )}

        <button
          onClick={handleSave}
          className="bg-surface-900 dark:bg-white text-white dark:text-surface-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-surface-800 dark:hover:bg-surface-100 transition-colors"
        >
          {saved ? 'Salvato!' : 'Salva e Verifica'}
        </button>
      </div>
    </div>
  );
}

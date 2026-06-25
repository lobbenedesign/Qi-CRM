import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrgSettingsStore } from '../store/orgSettingsStore';
import { PRIVACY_NOTICE, POLICY_VERSION } from '../lib/consent';

/** Informativa privacy pubblica (art. 13 GDPR). Linkata dai punti di raccolta dati. */
export default function PrivacyPolicy() {
  const companyName = useOrgSettingsStore((s) => s.company_name);
  const website = useOrgSettingsStore((s) => s.website);

  // Sostituisce i segnaposto dell'informativa con i dati dell'organizzazione.
  const text = PRIVACY_NOTICE
    .replace('[Ragione Sociale]', companyName || '[Ragione Sociale]')
    .replace('[indirizzo]', website || '[indirizzo]')
    .replace(/\[dominio\]/g, (website || 'azienda.it').replace(/^https?:\/\/(www\.)?/, ''));

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col">
      <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between shrink-0">
        <Link to="/" className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 transition-colors">
          <ArrowLeft size={14} /> {companyName}
        </Link>
        <span className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-semibold">
          <ShieldCheck size={14} /> Privacy
        </span>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-1">Informativa sulla Privacy</h1>
        <p className="text-xs text-surface-400 mb-6">Versione {POLICY_VERSION} · Reg. UE 2016/679 (GDPR)</p>

        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 shadow-sm">
          <pre className="whitespace-pre-wrap font-sans text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
{text}
          </pre>
        </div>

        <div className="mt-6 bg-brand-500/5 border border-brand-500/20 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-surface-900 dark:text-surface-100 mb-2 flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-brand-500" /> I tuoi diritti
          </h2>
          <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
            Puoi richiedere in ogni momento l'accesso, la rettifica, la cancellazione, la limitazione, la
            portabilità dei tuoi dati e revocare i consensi prestati. Per esercitare i tuoi diritti o gestire
            le tue preferenze di contatto scrivi al titolare del trattamento.
          </p>
        </div>
      </div>

      <footer className="py-5 text-center text-[10px] text-surface-400 shrink-0">
        © {new Date().getFullYear()} {companyName} · Tutti i diritti riservati
      </footer>
    </div>
  );
}

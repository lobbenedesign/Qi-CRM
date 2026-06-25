import { ShieldCheck, ShieldX, ShieldAlert, Shield } from 'lucide-react';
import type { Contact } from '../../types/crm';
import { getConsent, consentStatus, canSendMarketing, canProfile, CHANNEL_LABEL } from '../../lib/consent';

const STATUS_META = {
  granted:   { label: 'Consenso pieno',    icon: <ShieldCheck size={14} />, cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  partial:   { label: 'Consenso parziale', icon: <ShieldAlert size={14} />, cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  withdrawn: { label: 'Consenso revocato', icon: <ShieldX size={14} />,     cls: 'text-red-600 dark:text-red-400 bg-red-500/10' },
  none:      { label: 'Nessun consenso',   icon: <Shield size={14} />,      cls: 'text-surface-500 bg-surface-200/60 dark:bg-surface-800' },
} as const;

/** Stato privacy/consenso del contatto + cosa il marketing può fare (gate GDPR). */
export function ConsentCard({ contact, onManage }: { contact: Contact; onManage?: () => void }) {
  const c = getConsent(contact);
  const status = consentStatus(contact);
  const meta = STATUS_META[status];

  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700">
        <span className="text-xs font-bold text-surface-700 dark:text-surface-200 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-brand-500" /> Privacy & Consenso
        </span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>
          {meta.icon} {meta.label}
        </span>
      </div>

      <div className="p-3 space-y-2 text-[11px]">
        {/* Cosa possiamo fare */}
        <div className="grid grid-cols-2 gap-2">
          <Gate ok={canSendMarketing(contact, 'email')} label="Email marketing" />
          <Gate ok={canProfile(contact)} label="Profilazione" />
        </div>

        {/* Canali autorizzati */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-surface-400">Canali autorizzati:</span>
          {c.channels.length === 0
            ? <span className="text-surface-400 italic">nessuno</span>
            : c.channels.map((ch) => (
                <span key={ch} className="bg-brand-500/10 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded font-medium">{CHANNEL_LABEL[ch]}</span>
              ))}
        </div>

        {/* Metadati per accountability */}
        <div className="text-[10px] text-surface-400 space-y-0.5 pt-1 border-t border-surface-100 dark:border-surface-800">
          {c.given_at && <p>Acquisito il {new Date(c.given_at).toLocaleDateString('it-IT')} · fonte: {c.source ?? '—'}</p>}
          {c.withdrawn_at && <p className="text-red-500">Revocato il {new Date(c.withdrawn_at).toLocaleDateString('it-IT')}</p>}
          <p>Informativa: {c.policy_version ?? 'non registrata'} · base giuridica: {c.legal_basis}</p>
          {c.log.length > 0 && <p>{c.log.length} evento/i nel registro consensi</p>}
        </div>

        {onManage && (
          <button onClick={onManage} className="w-full mt-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline text-left">
            Gestisci consensi →
          </button>
        )}
      </div>
    </div>
  );
}

function Gate({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded ${ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-surface-100 dark:bg-surface-800 text-surface-400'}`}>
      {ok ? <ShieldCheck size={12} /> : <ShieldX size={12} />} {label}: {ok ? 'sì' : 'no'}
    </span>
  );
}

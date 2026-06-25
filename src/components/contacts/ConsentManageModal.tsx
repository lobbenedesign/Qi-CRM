import { useState } from 'react';
import { X, Link2, Check, Printer, ShieldCheck, FileSignature, Download, Ban } from 'lucide-react';
import type { Contact, ConsentChannel } from '../../types/crm';
import { useConsentStore, type ConsentGrants } from '../../store/consentStore';
import { useUpdateContact } from '../../hooks/useContacts';
import { useAuthStore } from '../../store/authStore';
import { useOrgSettingsStore } from '../../store/orgSettingsStore';
import { useToastStore } from '../../store/toastStore';
import {
  POLICY_VERSION, PRIVACY_NOTICE, CONSENT_LABELS, CHANNEL_LABEL,
  getConsent, buildConsent, updateConsent,
} from '../../lib/consent';

const CHANNELS: ConsentChannel[] = ['email', 'sms', 'whatsapp', 'phone'];

/** Gestione consensi lato operatore: invia modulo digitale, registra il cartaceo
 *  (controfirma) e stampa il modulo. La registrazione scrive `contact.consent`. */
export function ConsentManageModal({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const create = useConsentStore((s) => s.create);
  const recordPaper = useConsentStore((s) => s.recordPaper);
  const updateContact = useUpdateContact();
  const operator = useAuthStore((s) => s.session?.email) || 'operatore';
  const companyName = useOrgSettingsStore((s) => s.company_name);
  const website = useOrgSettingsStore((s) => s.website);
  const pushToast = useToastStore((s) => s.push);

  const cur = getConsent(contact);
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || 'Contatto';

  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [marketing, setMarketing] = useState(cur.marketing);
  const [profiling, setProfiling] = useState(cur.profiling);
  const [thirdParty, setThirdParty] = useState(cur.third_party);
  const [channels, setChannels] = useState<ConsentChannel[]>(cur.channels.length ? cur.channels : ['email']);

  const toggleChannel = (ch: ConsentChannel) =>
    setChannels((p) => (p.includes(ch) ? p.filter((x) => x !== ch) : [...p, ch]));

  const generateLink = () => {
    const req = create({ contact_id: contact.id, contact_name: name, contact_email: contact.email ?? '', policy_version: POLICY_VERSION });
    setLink(`${window.location.origin}/consent/${req.token}`);
  };

  const saveManual = async () => {
    const grants: ConsentGrants = { marketing, profiling, third_party: thirdParty, channels: marketing ? channels : [] };
    const input = { ...grants, source: 'manual' as const, source_ref: null };
    const consent = contact.consent ? updateConsent(cur, input) : buildConsent(input);
    await updateContact.mutateAsync({ id: contact.id, patch: { consent } });
    recordPaper(contact.id, name, contact.email ?? '', grants, POLICY_VERSION, operator);
    pushToast({ title: 'Consensi registrati', body: 'Il modulo è stato registrato e controfirmato. Le funzioni rispettano ora le concessioni.', kind: 'success' });
    onClose();
  };

  // Diritto di revoca (art. 7.3): azzera i consensi e registra withdrawn_at.
  const withdrawAll = async () => {
    if (!confirm(`Revocare tutti i consensi di ${name}? Le comunicazioni marketing verranno bloccate.`)) return;
    const consent = updateConsent(cur, { marketing: false, profiling: false, third_party: false, channels: [], source: 'manual', source_ref: null });
    await updateContact.mutateAsync({ id: contact.id, patch: { consent } });
    pushToast({ title: 'Consensi revocati', body: 'Tutti i consensi sono stati revocati e registrati nel log.', kind: 'success' });
    onClose();
  };

  // Diritto di portabilità (art. 20): esporta i dati del contatto in JSON.
  const exportData = () => {
    const blob = new Blob([JSON.stringify(contact, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dati-${name.replace(/\s+/g, '_')}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const printModule = () => {
    const w = window.open('', '_blank', 'width=820,height=1000');
    if (!w) return;
    const row = (label: string) => `<div class="row"><span class="box">&#9744;</span> ${label}</div>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Modulo Consenso Privacy</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:720px;margin:32px auto;padding:0 24px;line-height:1.5}
        h1{font-size:18px} h2{font-size:14px;margin-top:24px} .muted{color:#64748b;font-size:12px}
        .row{margin:8px 0;font-size:13px} .box{font-size:16px;margin-right:6px}
        pre{white-space:pre-wrap;font-family:inherit;font-size:11px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px}
        .sign{margin-top:36px;display:flex;justify-content:space-between;gap:24px}
        .sign div{flex:1;border-top:1px solid #0f172a;padding-top:6px;font-size:12px}
      </style></head><body>
      <h1>Modulo di Consenso al Trattamento dei Dati Personali</h1>
      <p class="muted">Titolare: ${companyName} — ${website} · Informativa versione ${POLICY_VERSION}</p>
      <p style="font-size:13px">Interessato: <b>${name}</b>${contact.email ? ` — ${contact.email}` : ''}</p>
      <h2>Acconsento al trattamento per le seguenti finalità (barrare):</h2>
      ${row(CONSENT_LABELS.marketing)}
      <div class="muted" style="margin-left:22px">Canali: &#9744; Email &nbsp; &#9744; SMS &nbsp; &#9744; WhatsApp &nbsp; &#9744; Telefono</div>
      ${row(CONSENT_LABELS.profiling)}
      ${row(CONSENT_LABELS.third_party)}
      <h2>Informativa (estratto)</h2>
      <pre>${PRIVACY_NOTICE.replace(/</g, '&lt;')}</pre>
      <div class="sign">
        <div>Firma dell'interessato &nbsp;&nbsp; Data ____/____/______</div>
        <div>Per ${companyName} (controfirma) &nbsp;&nbsp; Data ____/____/______</div>
      </div>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 dark:border-surface-800 sticky top-0 bg-white dark:bg-surface-900">
          <h3 className="font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2 text-sm">
            <ShieldCheck size={16} className="text-brand-500" /> Gestione consensi — {name}
          </h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* A) Modulo digitale */}
          <section className="space-y-2">
            <h4 className="text-xs font-bold text-surface-700 dark:text-surface-200 uppercase tracking-wide flex items-center gap-1.5"><Link2 size={13} /> Invia modulo digitale</h4>
            <p className="text-[11px] text-surface-500">Genera un link sicuro che il cliente compila e firma. La firma scrive automaticamente i consensi.</p>
            {link ? (
              <div className="flex items-center gap-2">
                <input readOnly value={link} className="flex-1 bg-surface-50 dark:bg-surface-800 text-[11px] rounded-lg border border-surface-200 dark:border-surface-700 px-2.5 py-2 focus:outline-none" onClick={(e) => (e.target as HTMLInputElement).select()} />
                <button onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className={`p-2 rounded-lg ${copied ? 'text-emerald-500' : 'text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}>
                  {copied ? <Check size={15} /> : <Link2 size={15} />}
                </button>
              </div>
            ) : (
              <button onClick={generateLink} className="text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg">Genera link</button>
            )}
          </section>

          {/* B) Registrazione manuale / cartaceo */}
          <section className="space-y-3 pt-4 border-t border-surface-100 dark:border-surface-800">
            <h4 className="text-xs font-bold text-surface-700 dark:text-surface-200 uppercase tracking-wide flex items-center gap-1.5"><FileSignature size={13} /> Registra consenso ricevuto (cartaceo)</h4>
            <p className="text-[11px] text-surface-500">Imposta ciò che il cliente ha concesso sul modulo firmato: verrà controfirmato da <b>{operator}</b> e reso operativo subito.</p>

            <Row checked={marketing} onChange={setMarketing} label={CONSENT_LABELS.marketing} />
            {marketing && (
              <div className="ml-6 flex flex-wrap gap-2">
                {CHANNELS.map((ch) => (
                  <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                    className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors ${channels.includes(ch) ? 'bg-brand-600 text-white border-brand-600' : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300'}`}>
                    {CHANNEL_LABEL[ch]}
                  </button>
                ))}
              </div>
            )}
            <Row checked={profiling} onChange={setProfiling} label={CONSENT_LABELS.profiling} />
            <Row checked={thirdParty} onChange={setThirdParty} label={CONSENT_LABELS.third_party} />

            <div className="flex gap-2 pt-2">
              <button onClick={printModule} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800">
                <Printer size={14} /> Stampa modulo
              </button>
              <button onClick={saveManual} disabled={updateContact.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg disabled:opacity-60">
                <Check size={14} /> Registra e controfirma
              </button>
            </div>
          </section>

          {/* C) Diritti dell'interessato (GDPR) */}
          <section className="space-y-2 pt-4 border-t border-surface-100 dark:border-surface-800">
            <h4 className="text-xs font-bold text-surface-700 dark:text-surface-200 uppercase tracking-wide flex items-center gap-1.5"><ShieldCheck size={13} /> Diritti dell'interessato</h4>
            <div className="flex gap-2">
              <button onClick={exportData} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800">
                <Download size={14} /> Esporta dati (portabilità)
              </button>
              <button onClick={withdrawAll} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Ban size={14} /> Revoca consensi
              </button>
            </div>
            <p className="text-[10px] text-surface-400">Per la cancellazione (diritto all'oblio) usa il cestino in alto nella scheda contatto.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${checked ? 'bg-emerald-600' : 'bg-surface-300 dark:bg-surface-700'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      <span className="text-xs text-surface-700 dark:text-surface-200">{label}</span>
    </label>
  );
}

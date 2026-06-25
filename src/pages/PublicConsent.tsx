import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle, AlertCircle, PenLine } from 'lucide-react';
import { useConsentStore, type ConsentGrants } from '../store/consentStore';
import { useOrgSettingsStore } from '../store/orgSettingsStore';
import { buildConsent, updateConsent, getConsent, CONSENT_LABELS, CHANNEL_LABEL } from '../lib/consent';
import type { ConsentChannel } from '../types/crm';
import { repo } from '../lib/repo';

const CHANNELS: ConsentChannel[] = ['email', 'sms', 'whatsapp', 'phone'];

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Modulo di consenso firmabile dal cliente. La firma scrive le concessioni sul contatto. */
export default function PublicConsent() {
  const { token } = useParams<{ token: string }>();
  const req = useConsentStore((s) => (token ? s.getByToken(token) : undefined));
  const sign = useConsentStore((s) => s.sign);
  const companyName = useOrgSettingsStore((s) => s.company_name);

  const [marketing, setMarketing] = useState(false);
  const [profiling, setProfiling] = useState(false);
  const [thirdParty, setThirdParty] = useState(false);
  const [channels, setChannels] = useState<ConsentChannel[]>(['email']);
  const [signName, setSignName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!req || req.status === 'signed' || req.status === 'countersigned') {
    return (
      <Center>
        {req && (req.status === 'signed' || req.status === 'countersigned')
          ? <Msg icon={<CheckCircle className="text-emerald-500" size={44} />} title="Modulo già firmato" body="Questo modulo di consenso è già stato compilato. Grazie." />
          : <Msg icon={<AlertCircle className="text-red-500" size={44} />} title="Link non valido" body="Il modulo richiesto non esiste o è scaduto." />}
      </Center>
    );
  }

  const toggleChannel = (ch: ConsentChannel) =>
    setChannels((prev) => (prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch]));

  const submit = async () => {
    if (!accepted) { setError('Devi confermare di aver letto l\'informativa.'); return; }
    if (!signName.trim()) { setError('Inserisci nome e cognome per firmare.'); return; }
    setLoading(true); setError(null);
    try {
      const grants: ConsentGrants = {
        marketing, profiling, third_party: thirdParty,
        channels: marketing ? channels : [],
      };
      const hash = await sha256(`${req.token}|${signName}|${new Date().toISOString()}`);

      // 1) Registra la firma sul modulo
      sign(req.token, grants, signName.trim(), hash);

      // 2) Scrive il consenso sul contatto → attiva/blocca le funzioni di marketing
      const contact = await repo.getContact(req.contact_id).catch(() => null);
      const input = { ...grants, source: 'preference_center' as const, source_ref: req.id };
      const consent = contact?.consent ? updateConsent(getConsent(contact), input) : buildConsent(input);
      await repo.updateContact(req.contact_id, { consent });

      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Errore durante la firma.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Center>
        <Msg icon={<CheckCircle className="text-emerald-500" size={48} />} title="Consenso registrato"
          body={`Grazie ${req.contact_name}. Le tue preferenze sono state salvate e saranno rispettate da ${companyName}.`} />
      </Center>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col">
      <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between shrink-0">
        <span className="text-sm font-bold text-surface-900 dark:text-surface-100">{companyName}</span>
        <span className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-semibold"><ShieldCheck size={14} /> Modulo Consenso Privacy</span>
      </div>

      <div className="flex-1 max-w-lg w-full mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Gentile {req.contact_name},</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 mb-5">
          indica per quali finalità acconsenti al trattamento dei tuoi dati. Potrai revocare i consensi in ogni momento.
          Vedi l'<Link to="/privacy" target="_blank" className="text-brand-600 dark:text-brand-400 underline">informativa completa</Link>.
        </p>

        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-5 shadow-sm space-y-4">
          <Toggle checked={marketing} onChange={setMarketing} label={CONSENT_LABELS.marketing} />
          {marketing && (
            <div className="ml-6 -mt-1">
              <p className="text-[11px] font-semibold text-surface-500 mb-1.5">Su quali canali?</p>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((ch) => (
                  <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                      channels.includes(ch) ? 'bg-brand-600 text-white border-brand-600' : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300'
                    }`}>
                    {CHANNEL_LABEL[ch]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Toggle checked={profiling} onChange={setProfiling} label={CONSENT_LABELS.profiling} />
          <Toggle checked={thirdParty} onChange={setThirdParty} label={CONSENT_LABELS.third_party} />

          <div className="pt-3 border-t border-surface-100 dark:border-surface-800 space-y-3">
            <label className="flex items-start gap-2 text-[11px] text-surface-600 dark:text-surface-300 cursor-pointer">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 shrink-0" />
              <span>{CONSENT_LABELS.required} *</span>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-surface-500 flex items-center gap-1 mb-1"><PenLine size={12} /> Firma (nome e cognome)</span>
              <input value={signName} onChange={(e) => setSignName(e.target.value)} placeholder={req.contact_name}
                className="w-full bg-surface-50 dark:bg-surface-800 text-sm font-[cursive] rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </label>
            {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={13} /> {error}</p>}
            <button onClick={submit} disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
              {loading ? 'Registrazione...' : 'Firma e invia consenso'}
            </button>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-[10px] text-surface-400 shrink-0">© {new Date().getFullYear()} {companyName}</footer>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${checked ? 'bg-brand-600' : 'bg-surface-300 dark:bg-surface-700'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      <span className="text-xs text-surface-700 dark:text-surface-200">{label}</span>
    </label>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-surface-100 dark:bg-surface-950 flex items-center justify-center p-4">{children}</div>;
}
function Msg({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-7 text-center max-w-sm shadow-xl">
      <div className="mb-3 flex justify-center">{icon}</div>
      <h2 className="text-lg font-bold text-surface-900 dark:text-white">{title}</h2>
      <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{body}</p>
    </div>
  );
}

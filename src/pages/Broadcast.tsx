import { useMemo, useState } from 'react';
import {
  Megaphone, Mail, MessageSquare, MessageCircle, Send, Bell,
  Plus, Trash2, ShieldCheck, Users, Trophy, FlaskConical, X,
} from 'lucide-react';
import {
  useBroadcastStore, CHANNEL_RATES,
  type Broadcast, type BroadcastChannel, type AudienceFilter, type VariantResult,
} from '../store/broadcastStore';
import { useContacts } from '../hooks/useContacts';
import { useCan } from '../hooks/useCan';
import { useToastStore } from '../store/toastStore';
import { getConsent } from '../lib/consent';
import type { Contact, ConsentChannel } from '../types/crm';

// Mappa canale broadcast → canale di consenso (telegram/push non hanno canale dedicato:
// basta il consenso marketing generale). Il marketing parte SOLO se c'è consenso.
const CONSENT_CHANNEL: Partial<Record<BroadcastChannel, ConsentChannel>> = {
  email: 'email', sms: 'sms', whatsapp: 'whatsapp',
};
function hasMarketingConsent(contact: Contact, channel: BroadcastChannel): boolean {
  const c = getConsent(contact);
  if (!c.marketing || c.withdrawn_at) return false;
  const cc = CONSENT_CHANNEL[channel];
  return cc ? c.channels.includes(cc) : true;
}

const CHANNEL_ICON: Record<BroadcastChannel, React.ReactNode> = {
  email: <Mail size={14} />, sms: <MessageSquare size={14} />,
  whatsapp: <MessageCircle size={14} />, telegram: <Send size={14} />, push: <Bell size={14} />,
};

const LIFECYCLES = ['subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist'];
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'customer', 'lost'];

function filterAudience(contacts: Contact[], a: AudienceFilter): Contact[] {
  switch (a.type) {
    case 'tag': return contacts.filter((c) => (c.tags ?? []).includes(a.value ?? ''));
    case 'lifecycle': return contacts.filter((c) => c.lifecycle_stage === a.value);
    case 'lead_status': return contacts.filter((c) => c.lead_status === a.value);
    default: return contacts;
  }
}

function simulate(variantId: 'A' | 'B', recipients: number, channel: BroadcastChannel): VariantResult {
  const r = CHANNEL_RATES[channel];
  const bias = 0.88 + Math.random() * 0.3; // varia A vs B
  const sent = recipients;
  const delivered = Math.round(sent * r.delivered);
  const opened = Math.round(delivered * Math.min(0.98, r.opened * bias));
  const clicked = Math.round(delivered * Math.min(0.95, r.clicked * bias));
  return {
    variantId, recipients, sent, delivered,
    opened: Math.max(opened, clicked), clicked,
    failed: sent - delivered, unsubscribed: Math.round(delivered * 0.01),
  };
}

export default function Broadcast() {
  const canManage = useCan('marketing:manage');
  const { broadcasts, add, update, remove, markSent } = useBroadcastStore();
  const { data: contacts = [] } = useContacts();
  const pushToast = useToastStore((s) => s.push);

  const [editing, setEditing] = useState<Partial<Broadcast> | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => (c.tags ?? []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [contacts]);

  const audienceContacts = useMemo(
    () => (editing ? filterAudience(contacts, editing.audience ?? { type: 'all' }) : []),
    [editing, contacts],
  );
  // Gate consenso: solo i contatti che hanno autorizzato il marketing sul canale scelto.
  const consented = useMemo(
    () => (editing ? audienceContacts.filter((c) => hasMarketingConsent(c, (editing.channel as BroadcastChannel) ?? 'email')) : []),
    [editing, audienceContacts],
  );
  const consentExcluded = audienceContacts.length - consented.length;
  const reachable = useMemo(() => {
    if (!editing) return [];
    return editing.guardianAi
      ? consented.filter((c) => c.email_opens > 0 || c.email_clicks > 0)
      : consented;
  }, [editing, consented]);

  const startNew = () => setEditing({
    name: 'Nuovo Broadcast', channel: 'email',
    audience: { type: 'all' }, abTest: false, guardianAi: true,
    variants: [{ id: 'A', subject: '', body: '' }],
  });

  const setChannel = (channel: BroadcastChannel) => setEditing((e) => e && ({ ...e, channel }));
  const setAudience = (audience: AudienceFilter) => setEditing((e) => e && ({ ...e, audience }));
  const toggleAb = () => setEditing((e) => {
    if (!e) return e;
    if (e.abTest) return { ...e, abTest: false, variants: [e.variants![0]] };
    return { ...e, abTest: true, variants: [e.variants![0], { id: 'B', subject: '', body: '' }] };
  });
  const setVariant = (id: 'A' | 'B', patch: Partial<{ subject: string; body: string }>) =>
    setEditing((e) => e && ({ ...e, variants: e.variants!.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));

  const save = () => {
    if (!editing) return;
    if (editing.id) update(editing.id, editing);
    else add(editing as any);
    setEditing(null);
  };

  const sendBroadcast = (b: Broadcast) => {
    const aud = filterAudience(contacts, b.audience);
    const withConsent = aud.filter((c) => hasMarketingConsent(c, b.channel)); // gate consenso obbligatorio
    const reach = b.guardianAi ? withConsent.filter((c) => c.email_opens > 0 || c.email_clicks > 0) : withConsent;
    if (reach.length === 0) {
      pushToast({ title: 'Nessun destinatario consenziente', body: 'Nessun contatto del segmento ha autorizzato il marketing su questo canale.', kind: 'info' });
      return;
    }
    if (!confirm(`Inviare il broadcast "${b.name}" via ${CHANNEL_RATES[b.channel].label} a ${reach.length} contatti?`)) return;

    let results: VariantResult[];
    let winner: 'A' | 'B' | null = null;
    if (b.abTest) {
      const half = Math.floor(reach.length / 2);
      results = [simulate('A', half, b.channel), simulate('B', reach.length - half, b.channel)];
      const rate = (r: VariantResult) => (r.delivered ? r.clicked / r.delivered : 0);
      winner = rate(results[1]) > rate(results[0]) ? 'B' : 'A';
    } else {
      results = [simulate('A', reach.length, b.channel)];
    }
    markSent(b.id, results, winner);
  };

  return (
    <div className="flex flex-col h-full gap-4 p-1">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Megaphone className="text-brand-500" size={22} />
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Broadcast Omnicanale</h1>
            <p className="text-xs text-surface-500">Campagne di massa su Email, SMS, WhatsApp, Telegram e Push — con A/B test</p>
          </div>
        </div>
        {!editing && canManage && (
          <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg">
            <Plus size={14} /> Crea Broadcast
          </button>
        )}
      </div>

      {/* Editor */}
      {editing && (
        <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-5 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-surface-900 dark:text-white">{editing.id ? 'Modifica' : 'Nuovo'} Broadcast</h2>
            <button onClick={() => setEditing(null)} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-surface-500 mb-1">Nome interno</label>
            <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none" />
          </div>

          {/* Canale */}
          <div>
            <label className="block text-[11px] font-semibold text-surface-500 mb-1.5">Canale</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CHANNEL_RATES) as BroadcastChannel[]).map((ch) => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    editing.channel === ch ? 'bg-brand-600 text-white border-brand-600' : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-brand-400'
                  }`}>
                  {CHANNEL_ICON[ch]} {CHANNEL_RATES[ch].label}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="block text-[11px] font-semibold text-surface-500 mb-1.5">Segmento destinatari</label>
            <div className="grid grid-cols-2 gap-2">
              <select value={editing.audience?.type || 'all'}
                onChange={(e) => setAudience({ type: e.target.value as AudienceFilter['type'], value: undefined })}
                className="bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none">
                <option value="all">Tutti i contatti</option>
                <option value="tag">Per Tag</option>
                <option value="lifecycle">Per Lifecycle</option>
                <option value="lead_status">Per Stato Lead</option>
              </select>
              {editing.audience?.type === 'tag' && (
                <select value={editing.audience.value || ''} onChange={(e) => setAudience({ type: 'tag', value: e.target.value })}
                  className="bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none">
                  <option value="">Seleziona tag...</option>
                  {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {editing.audience?.type === 'lifecycle' && (
                <select value={editing.audience.value || ''} onChange={(e) => setAudience({ type: 'lifecycle', value: e.target.value })}
                  className="bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none">
                  <option value="">Seleziona...</option>
                  {LIFECYCLES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {editing.audience?.type === 'lead_status' && (
                <select value={editing.audience.value || ''} onChange={(e) => setAudience({ type: 'lead_status', value: e.target.value })}
                  className="bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none">
                  <option value="">Seleziona...</option>
                  {LEAD_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-surface-500 mt-2">
              <span className="flex items-center gap-1.5"><Users size={12} /> {reachable.length} destinatari raggiungibili</span>
              {consentExcluded > 0 && (
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400" title="Esclusi perché senza consenso al marketing su questo canale">
                  <ShieldCheck size={11} /> {consentExcluded} esclusi per mancato consenso
                </span>
              )}
              {editing.guardianAi && consented.length !== reachable.length && (
                <span className="text-amber-600">({consented.length - reachable.length} esclusi da Guardian AI)</span>
              )}
            </div>
            {editing.channel === 'email' && (
              <p className="text-[10px] text-surface-400 mt-1 flex items-center gap-1">
                <Mail size={10} /> Ogni email include il footer obbligatorio "Gestisci preferenze / Disiscriviti".
              </p>
            )}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={!!editing.abTest} onChange={toggleAb} />
              <FlaskConical size={14} className="text-indigo-500" /> A/B Test
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={!!editing.guardianAi} onChange={(e) => setEditing({ ...editing, guardianAi: e.target.checked })} />
              <ShieldCheck size={14} className="text-emerald-500" /> Guardian AI (escludi non ingaggiati)
            </label>
          </div>

          {/* Varianti */}
          <div className={`grid gap-3 ${editing.abTest ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
            {editing.variants!.map((v) => (
              <div key={v.id} className="border border-surface-200 dark:border-surface-700 rounded-lg p-3 space-y-2">
                {editing.abTest && <span className="text-[10px] font-bold text-indigo-500 uppercase">Variante {v.id}</span>}
                {CHANNEL_RATES[editing.channel as BroadcastChannel].hasSubject && (
                  <input value={v.subject} onChange={(e) => setVariant(v.id, { subject: e.target.value })} placeholder="Oggetto / Titolo"
                    className="w-full bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none" />
                )}
                <textarea value={v.body} onChange={(e) => setVariant(v.id, { body: e.target.value })} rows={4} placeholder="Testo del messaggio..."
                  className="w-full bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none" />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2 border-t border-surface-150 dark:border-surface-800">
            <button onClick={() => setEditing(null)} className="flex-1 py-2 text-xs font-semibold hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-700 dark:text-surface-300">Annulla</button>
            <button onClick={save} className="flex-1 py-2 text-xs font-semibold bg-brand-600 text-white rounded-lg">Salva Broadcast</button>
          </div>
        </div>
      )}

      {/* Lista */}
      {!editing && (
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
          {broadcasts.length === 0 && (
            <p className="text-sm text-surface-400 col-span-full text-center py-10">Nessun broadcast. Creane uno per iniziare.</p>
          )}
          {broadcasts.map((b) => <BroadcastCard key={b.id} b={b} canManage={canManage}
            onEdit={() => setEditing(b)} onDelete={() => { if (confirm('Eliminare questo broadcast?')) remove(b.id); }}
            onSend={() => sendBroadcast(b)} />)}
        </div>
      )}
    </div>
  );
}

function BroadcastCard({ b, canManage, onEdit, onDelete, onSend }: {
  b: Broadcast; canManage: boolean; onEdit: () => void; onDelete: () => void; onSend: () => void;
}) {
  const total = b.results.reduce((acc, r) => ({
    delivered: acc.delivered + r.delivered, opened: acc.opened + r.opened, clicked: acc.clicked + r.clicked, sent: acc.sent + r.sent,
  }), { delivered: 0, opened: 0, clicked: 0, sent: 0 });
  const ctr = total.delivered ? Math.round((total.clicked / total.delivered) * 100) : 0;
  const openRate = total.delivered ? Math.round((total.opened / total.delivered) * 100) : 0;

  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-surface-900 dark:text-surface-50">{b.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded uppercase">
              {CHANNEL_ICON[b.channel]} {CHANNEL_RATES[b.channel].label}
            </span>
            {b.abTest && <span className="text-[10px] font-bold text-indigo-500 inline-flex items-center gap-0.5"><FlaskConical size={10} /> A/B</span>}
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${b.status === 'sent' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-surface-200 dark:bg-surface-700 text-surface-500'}`}>
              {b.status === 'sent' ? 'Inviato' : 'Bozza'}
            </span>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            {b.status === 'draft' && <button onClick={onEdit} className="text-xs font-semibold px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded text-surface-600 dark:text-surface-300">Modifica</button>}
            <button onClick={onDelete} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={13} /></button>
          </div>
        )}
      </div>

      {b.status === 'sent' ? (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Consegnati" value={total.delivered} />
            <Metric label="Aperture" value={`${openRate}%`} />
            <Metric label="CTR" value={`${ctr}%`} accent />
          </div>
          {b.abTest && (
            <div className="space-y-1.5 pt-1">
              {b.results.map((r) => {
                const rCtr = r.delivered ? Math.round((r.clicked / r.delivered) * 100) : 0;
                const isWin = b.winner === r.variantId;
                return (
                  <div key={r.variantId} className={`flex items-center gap-2 text-[11px] rounded-lg px-2 py-1.5 ${isWin ? 'bg-emerald-500/10' : 'bg-surface-50 dark:bg-surface-800/50'}`}>
                    <span className="font-bold w-6">{r.variantId}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                      <div className={`h-full rounded-full ${isWin ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(100, rCtr * 4)}%` }} />
                    </div>
                    <span className="font-semibold w-10 text-right">CTR {rCtr}%</span>
                    {isWin && <Trophy size={12} className="text-emerald-500" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-auto pt-3">
          <button onClick={onSend} className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg">
            <Send size={13} /> Invia ora
          </button>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg py-2">
      <p className={`text-base font-bold ${accent ? 'text-brand-600 dark:text-brand-400' : 'text-surface-900 dark:text-white'}`}>{value}</p>
      <p className="text-[10px] text-surface-400 uppercase tracking-wide">{label}</p>
    </div>
  );
}

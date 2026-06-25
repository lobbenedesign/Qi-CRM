import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Plug, Globe, Calendar, MessageCircle, Send, Mail,
  Copy, Check, RefreshCw, Building2, Zap, Loader2, ShieldCheck,
  Play, Eye, Smartphone, Bell, Share2
} from 'lucide-react';
import { useOrgSettingsStore } from '../store/orgSettingsStore';
import { useIngestInboundLead } from '../hooks/useInboundLead';
import { useToastStore } from '../store/toastStore';
import { useCan } from '../hooks/useCan';
import { ROLE_META, ALL_ROLES } from '../lib/permissions';
import { SetupGuide } from '../components/config/SetupGuide';
import { StatusBadge, type ConnStatus } from '../components/config/StatusBadge';
import type { TeamRole } from '../types/team';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 outline-none focus:ring-2 focus:ring-brand-500/30';
const labelCls = 'block text-xs font-semibold text-surface-500 dark:text-surface-400 mb-1';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="relative w-10 h-6 rounded-full transition-colors shrink-0"
      style={{ backgroundColor: checked ? '#22c55e' : '#cbd5e1' }}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function CopyRow({ value, onCopy, copied }: { value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex gap-2">
      <input readOnly value={value} className={`${inputCls} font-mono text-xs`} onFocus={(e) => e.target.select()} />
      <button onClick={onCopy} className="shrink-0 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors">
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function Card({ icon, title, subtitle, status, enabled, onToggle, color, children }: {
  icon: React.ReactNode; title: string; subtitle: string; status?: ConnStatus;
  enabled?: boolean; onToggle?: (v: boolean) => void; color: string; children?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1a`, color }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-surface-900 dark:text-surface-100 text-sm">{title}</p>
            {status && <StatusBadge status={status} />}
          </div>
          <p className="text-xs text-surface-400">{subtitle}</p>
        </div>
        {onToggle && <Toggle checked={!!enabled} onChange={onToggle} />}
      </div>
      {children && <div className="space-y-4 pt-1">{children}</div>}
    </div>
  );
}

function statusOf(enabled: boolean, hasFields: boolean, verified: boolean): ConnStatus {
  if (!enabled || !hasFields) return 'not_configured';
  return verified ? 'connected' : 'configured';
}

export default function Integrations() {
  const canManage = useCan('team:manage');
  const org = useOrgSettingsStore();
  const ingest = useIngestInboundLead();
  const pushToast = useToastStore((s) => s.push);

  const [copied, setCopied] = useState('');
  const [lead, setLead] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);

  // Stati dei Test di Connessione Reali
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTesting, setWaTesting] = useState(false);
  const [waTestResult, setWaTestResult] = useState<any>(null);

  const [tgTestChatId, setTgTestChatId] = useState('');
  const [tgTestMsg, setTgTestMsg] = useState('Ciao! Questo è un messaggio reale di test inviato da Qi-CRM. 👑');
  const [tgTesting, setTgTesting] = useState(false);
  const [tgTestResult, setTgTestResult] = useState<any>(null);

  const [mailTestTo, setMailTestTo] = useState('');
  const [mailTesting, setMailTesting] = useState(false);
  const [mailTestResult, setMailTestResult] = useState<any>(null);

  // Intercetta l'access token da Google OAuth implicito
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const token = params.get('access_token');
      if (token) {
        // Verifica il token chiamando l'API di Google
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(data => {
            if (data.email) {
              org.patch('google', {
                connected: true,
                account: data.email
              });
              pushToast({ kind: 'success', title: 'Connesso a Google', body: `Account ${data.email} autenticato con successo.` });
            }
          })
          .catch(() => {
            pushToast({ kind: 'info', title: 'Errore Google Auth', body: 'Impossibile verificare il token di accesso.' });
          });
        // Pulisci l'hash dall'URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  if (!canManage) return <Navigate to="/" replace />;

  const endpoint = `https://api.qi-crm.app/inbound/${org.inbound.endpoint_key}`;
  const waWebhook = 'https://api.qi-crm.app/webhooks/whatsapp';
  const tgWebhook = 'https://api.qi-crm.app/webhooks/telegram';
  const embed = `<form action="${endpoint}" method="POST">
  <input name="name" placeholder="Nome" required />
  <input name="email" type="email" placeholder="Email" />
  <input name="phone" placeholder="Telefono" />
  <textarea name="message" placeholder="Messaggio"></textarea>
  <button type="submit">Invia richiesta</button>
</form>`;

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(() => setCopied(''), 1600);
  };

  // --- AZIONI REALI ---

  // 1. TEST WHATSAPP REALE (Meta Graph API)
  const testWhatsApp = async () => {
    if (!org.whatsapp.phone_number_id || !org.whatsapp.token || !waTestPhone) {
      pushToast({ kind: 'info', title: 'Campi mancanti', body: 'Inserisci Phone Number ID, Access Token e il numero di telefono per il test.' });
      return;
    }
    setWaTesting(true);
    setWaTestResult(null);

    try {
      const url = `https://graph.facebook.com/v19.0/${org.whatsapp.phone_number_id}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        to: waTestPhone.replace(/\s+/g, ''),
        type: 'template',
        template: {
          name: 'hello_world', // Template standard di default Meta Sandbox
          language: { code: 'en_US' }
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${org.whatsapp.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      setWaTestResult({ status: response.status, data });

      if (response.ok) {
        org.patch('whatsapp', { verified: true });
        pushToast({ kind: 'success', title: 'WhatsApp Connesso ✓', body: 'Messaggio inviato con successo via Meta API!' });
      } else {
        pushToast({ kind: 'info', title: 'Errore API WhatsApp', body: data.error?.message || 'Verifica i parametri di configurazione.' });
      }
    } catch (err: any) {
      setWaTestResult({ error: err.message });
      pushToast({ kind: 'info', title: 'Errore di Rete', body: err.message });
    } finally {
      setWaTesting(false);
    }
  };

  // 2. TEST TELEGRAM REALE
  const testTelegram = async () => {
    if (!org.telegram.bot_token || !tgTestChatId) {
      pushToast({ kind: 'info', title: 'Campi mancanti', body: 'Inserisci il Bot Token e il tuo Chat ID per eseguire il test.' });
      return;
    }
    setTgTesting(true);
    setTgTestResult(null);

    try {
      const url = `https://api.telegram.org/bot${org.telegram.bot_token}/sendMessage`;
      const payload = {
        chat_id: tgTestChatId.trim(),
        text: tgTestMsg
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      setTgTestResult({ status: response.status, data });

      if (data.ok) {
        org.patch('telegram', { verified: true });
        pushToast({ kind: 'success', title: 'Telegram Connesso ✓', body: 'Messaggio recapitato dal tuo Bot!' });
      } else {
        pushToast({ kind: 'info', title: 'Errore API Telegram', body: data.description || 'Verifica il token e che tu abbia avviato il bot (/start).' });
      }
    } catch (err: any) {
      setTgTestResult({ error: err.message });
      pushToast({ kind: 'info', title: 'Errore di Rete', body: err.message });
    } finally {
      setTgTesting(false);
    }
  };

  // 3. TEST EMAIL REALE (Resend API)
  const testEmail = async () => {
    if (!org.email.api_key || !org.email.from_address || !mailTestTo) {
      pushToast({ kind: 'info', title: 'Campi mancanti', body: 'Inserisci API Key, Mittente e destinatario per il test.' });
      return;
    }
    setMailTesting(true);
    setMailTestResult(null);

    try {
      const url = 'https://api.resend.com/emails';
      const payload = {
        from: `${org.email.from_name || 'Qi-CRM'} <${org.email.from_address}>`,
        to: [mailTestTo.trim()],
        subject: `Test di Connessione Real-Time — ${org.company_name}`,
        html: `<div style="font-family: sans-serif; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #6366f1;">Integrazione Email Funzionante!</h2>
          <p>Questo messaggio conferma che il server email di <strong>${org.company_name}</strong> è configurato e funzionante all'interno del gestionale.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <small style="color: #94a3b8;">Generato da Qi-CRM — ${new Date().toLocaleString('it-IT')}</small>
        </div>`
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${org.email.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      setMailTestResult({ status: response.status, data });

      if (response.ok) {
        org.patch('email', { verified: true });
        pushToast({ kind: 'success', title: 'Email Connessa ✓', body: 'Email inviata con successo tramite Resend!' });
      } else {
        pushToast({ kind: 'info', title: 'Errore API Resend', body: data.message || 'Verifica API Key e che il dominio sia autorizzato.' });
      }
    } catch (err: any) {
      setMailTestResult({ error: err.message });
      pushToast({ kind: 'info', title: 'Errore di Rete', body: err.message });
    } finally {
      setMailTesting(false);
    }
  };

  // 4. TEST GOOGLE OAUTH
  const handleGoogleConnect = () => {
    if (org.google.connected) {
      org.patch('google', { connected: false, account: null });
      pushToast({ kind: 'info', title: 'Google Disconnesso', body: 'L\'account è stato scollegato.' });
      return;
    }
    if (!org.google.client_id) {
      pushToast({ kind: 'info', title: 'Client ID mancante', body: 'Inserisci il Client ID prima di avviare il login.' });
      return;
    }

    const scopes = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${org.google.client_id}&redirect_uri=${encodeURIComponent(org.google.redirect_uri)}&response_type=token&scope=${encodeURIComponent(scopes)}&prompt=select_account`;
    
    // Redirect reale per autenticare l'utente
    window.location.href = authUrl;
  };

  // Web-to-lead Simulator
  const simulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.name.trim()) return;
    setSending(true);
    try {
      await ingest(lead);
      setLead({ name: '', email: '', phone: '', message: '' });
      pushToast({ kind: 'success', title: 'Inbound Lead Ingestito ✓', body: 'Il contatto è stato inserito nel database di Qi-CRM.' });
    } finally {
      setSending(false);
    }
  };

  // Stati generali badges
  const waStatus = statusOf(org.whatsapp.enabled, !!org.whatsapp.phone_number_id && !!org.whatsapp.token, org.whatsapp.verified);
  const tgStatus = statusOf(org.telegram.enabled, !!org.telegram.bot_token, org.telegram.verified);
  const emailStatus = statusOf(true, !!org.email.api_key && !!org.email.from_address, org.email.verified);
  const googleStatus: ConnStatus = org.google.connected ? 'connected' : (org.google.client_id ? 'configured' : 'not_configured');
  const inboundStatus: ConnStatus = org.inbound.enabled ? 'connected' : 'not_configured';
  const smsStatus = statusOf(org.sms.enabled, !!org.sms.account_sid && !!org.sms.auth_token, org.sms.verified);
  const pushStatus = statusOf(org.push.enabled, !!(org.push.vapid_public || org.push.server_key), org.push.verified);
  const socialStatus = statusOf(
    org.social.meta.enabled || org.social.linkedin.enabled,
    !!org.social.meta.app_id || !!org.social.linkedin.client_id,
    org.social.meta.verified || org.social.linkedin.verified,
  );

  const configuredCount = [waStatus, tgStatus, emailStatus, googleStatus, inboundStatus, smsStatus, pushStatus, socialStatus].filter((s) => s === 'connected').length;

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Plug className="text-brand-500" size={24} />
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Integrazioni & Canali Reali</h1>
        </div>
        <span className="px-3 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full text-xs font-semibold">
          {configuredCount}/5 Canali Connessi
        </span>
      </div>

      <p className="text-sm text-surface-500 dark:text-surface-400 max-w-2xl leading-relaxed">
        Pannello di configurazione del Super Admin. Inserisci le chiavi API e i parametri reali dei tuoi provider.
        Utilizza i pannelli di test integrati in ogni scheda per inviare chiamate HTTP reali ed esaminare i log di risposta.
      </p>

      {/* Profilo Azienda */}
      <Card icon={<Building2 size={18} />} title="Profilo Azienda" subtitle="Dati legali e di contatto visualizzati su contratti e fatture" color="#6366f1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome società"><input value={org.company_name} onChange={(e) => org.set('company_name', e.target.value)} className={inputCls} /></Field>
          <Field label="Sito web"><input value={org.website} onChange={(e) => org.set('website', e.target.value)} className={inputCls} /></Field>
        </div>
      </Card>

      {/* Web-to-lead */}
      <Card icon={<Globe size={18} />} title="Modulo Richieste Sito (Web-to-Lead)" subtitle="Cattura lead remoti sul tuo form HTML esistente" status={inboundStatus}
            enabled={org.inbound.enabled} onToggle={(v) => org.patch('inbound', { enabled: v })} color="#06b6d4">
        <SetupGuide steps={[
          { text: 'Copia l\'endpoint univoco generato qui sotto.' },
          { text: 'Incolla l\'URL come attributo action del tag form (<form action="[endpoint]" method="POST">).' },
          { text: 'Assicurati che gli input abbiano i tag name impostati come: name, email, phone, message.' },
          { text: 'Configura il dominio del tuo sito come Origine Consentita (CORS) per bloccare le chiamate non autorizzate.' },
        ]} />
        <Field label="Endpoint di ricezione API (POST)"><CopyRow value={endpoint} onCopy={() => copy(endpoint, 'ep')} copied={copied === 'ep'} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Origine consentita (CORS)"><input value={org.inbound.allowed_origin} onChange={(e) => org.patch('inbound', { allowed_origin: e.target.value })} className={inputCls} placeholder="https://www.tuosito.it" /></Field>
          <Field label="Assegna i nuovi lead a">
            <select value={org.inbound.assign_role} onChange={(e) => org.patch('inbound', { assign_role: e.target.value as TeamRole })} className={inputCls}>
              {ALL_ROLES.filter((r) => r !== 'superadmin').map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-4 pt-1">
          <label className="flex items-center gap-2 text-xs text-surface-700 dark:text-surface-300 font-medium"><input type="checkbox" checked={org.inbound.auto_create_contact} onChange={(e) => org.patch('inbound', { auto_create_contact: e.target.checked })} className="rounded text-brand-600 focus:ring-brand-500/30" /> Crea contatto</label>
          <label className="flex items-center gap-2 text-xs text-surface-700 dark:text-surface-300 font-medium"><input type="checkbox" checked={org.inbound.auto_create_ticket} onChange={(e) => org.patch('inbound', { auto_create_ticket: e.target.checked })} className="rounded text-brand-600 focus:ring-brand-500/30" /> Apri ticket</label>
          <label className="flex items-center gap-2 text-xs text-surface-700 dark:text-surface-300 font-medium"><input type="checkbox" checked={org.inbound.spam_protection} onChange={(e) => org.patch('inbound', { spam_protection: e.target.checked })} className="rounded text-brand-600 focus:ring-brand-500/30" /> Protezione spam</label>
          <button onClick={org.rotateInboundKey} className="ml-auto flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"><RefreshCw size={12} /> Rigenera chiave</button>
        </div>
        <details className="text-xs group border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
          <summary className="cursor-pointer bg-surface-50 dark:bg-surface-800 p-2.5 font-medium text-brand-600 dark:text-brand-400 flex items-center justify-between">
            <span>Codice HTML integrativo pronto per il sito</span>
            <Eye size={14} />
          </summary>
          <div className="relative border-t border-surface-200 dark:border-surface-700">
            <pre className="bg-surface-900 text-surface-100 p-3 overflow-x-auto text-[11px] leading-relaxed font-mono">{embed}</pre>
            <button onClick={() => copy(embed, 'embed')} className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-surface-700 hover:bg-surface-600 text-white rounded text-[10px] transition-colors">{copied === 'embed' ? 'Copiato' : 'Copia snippet'}</button>
          </div>
        </details>
        {/* Simulatore manuale */}
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
            <Zap size={14} />
            <span>Invia un lead di prova adesso</span>
          </div>
          <form onSubmit={simulate} className="grid grid-cols-2 gap-2">
            <input value={lead.name} onChange={(e) => setLead((l) => ({ ...l, name: e.target.value }))} placeholder="Nome *" required className={`${inputCls} text-xs`} />
            <input value={lead.email} onChange={(e) => setLead((l) => ({ ...l, email: e.target.value }))} placeholder="Email" className={`${inputCls} text-xs`} />
            <input value={lead.phone} onChange={(e) => setLead((l) => ({ ...l, phone: e.target.value }))} placeholder="Telefono" className={`${inputCls} text-xs`} />
            <input value={lead.message} onChange={(e) => setLead((l) => ({ ...l, message: e.target.value }))} placeholder="Messaggio" className={`${inputCls} text-xs`} />
            <button type="submit" disabled={sending || !lead.name.trim()} className="col-span-2 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors">
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
              Invia Richiesta HTTP POST Real-Time
            </button>
          </form>
        </div>
      </Card>

      {/* WhatsApp */}
      <Card icon={<MessageCircle size={18} />} title="WhatsApp Business (Meta Cloud API)" subtitle="Invia messaggi automatici e template approvati" status={waStatus}
            enabled={org.whatsapp.enabled} onToggle={(v) => org.patch('whatsapp', { enabled: v })} color="#25D366">
        <SetupGuide steps={[
          { text: 'Registrati su', link: { label: 'Facebook Developers', url: 'https://developers.facebook.com' } },
          { text: 'Crea un\'app "Business" e aggiungi il prodotto "WhatsApp".' },
          { text: 'Configura il numero di telefono e copia il Phone Number ID e il Business Account ID.' },
          { text: 'Genera un Token di Accesso Permanente (System User con permessi whatsapp_business_messaging).' },
          { text: 'Aggiungi il Webhook di ricezione inserendo l\'URL e il verify token indicati sotto.' },
        ]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone Number ID (Meta)"><input value={org.whatsapp.phone_number_id} onChange={(e) => org.patch('whatsapp', { phone_number_id: e.target.value, verified: false })} className={inputCls} placeholder="Es: 10482930291" /></Field>
          <Field label="Business Account ID"><input value={org.whatsapp.business_account_id} onChange={(e) => org.patch('whatsapp', { business_account_id: e.target.value })} className={inputCls} placeholder="Es: 938202938192" /></Field>
        </div>
        <Field label="Token di Accesso Permanente (System User)"><input value={org.whatsapp.token} onChange={(e) => org.patch('whatsapp', { token: e.target.value, verified: false })} type="password" className={inputCls} placeholder="EAAG..." /></Field>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Webhook Callback URL (Meta Developers)"><CopyRow value={waWebhook} onCopy={() => copy(waWebhook, 'wa')} copied={copied === 'wa'} /></Field>
          <Field label="Verify Token (da inserire su Meta)"><input value={org.whatsapp.verify_token} onChange={(e) => org.patch('whatsapp', { verify_token: e.target.value })} className={inputCls} /></Field>
        </div>

        {/* Pannello Test Invio WhatsApp Reale */}
        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Play size={13} />
            <span>Test di Invio Reale (Template Sandbox Meta)</span>
          </div>
          <div className="flex gap-2">
            <input value={waTestPhone} onChange={(e) => setWaTestPhone(e.target.value)} placeholder="Numero destinatario (con prefisso, es: +393330000000)" className={`${inputCls} text-xs flex-1`} />
            <button onClick={testWhatsApp} disabled={waTesting || !waTestPhone} className="px-4 py-2 bg-[#25D366] hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50">
              {waTesting ? <Loader2 size={13} className="animate-spin" /> : 'Invia Template'}
            </button>
          </div>
          {waTestResult && (
            <div className="border-t border-emerald-500/10 pt-2">
              <span className="text-[10px] font-semibold text-surface-500 block mb-1">Dettagli Chiamata HTTP:</span>
              <pre className="bg-surface-900 text-surface-100 p-2.5 rounded text-[10px] overflow-x-auto font-mono max-h-40">
                {JSON.stringify(waTestResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* Telegram */}
      <Card icon={<Send size={18} />} title="Telegram Bot Integration" subtitle="Notifica i commerciali e i clienti via Bot Telegram" status={tgStatus}
            enabled={org.telegram.enabled} onToggle={(v) => org.patch('telegram', { enabled: v })} color="#0088cc">
        <SetupGuide steps={[
          { text: 'Contatta', link: { label: '@BotFather su Telegram', url: 'https://t.me/BotFather' } },
          { text: 'Invia il comando /newbot per creare un nuovo bot, scegliendo un nome ed un username.' },
          { text: 'Copia l\'API Token restituito e incollalo sotto.' },
          { text: 'Fornisci l\'URL del webhook per ascoltare eventi in tempo reale.' },
        ]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Username del Bot"><input value={org.telegram.bot_username} onChange={(e) => org.patch('telegram', { bot_username: e.target.value })} placeholder="Es: QiCRM_bot" className={inputCls} /></Field>
          <Field label="Bot API Token"><input value={org.telegram.bot_token} onChange={(e) => org.patch('telegram', { bot_token: e.target.value, verified: false })} type="password" className={inputCls} placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u1" /></Field>
        </div>
        <Field label="Webhook URL"><CopyRow value={tgWebhook} onCopy={() => copy(tgWebhook, 'tg')} copied={copied === 'tg'} /></Field>

        {/* Pannello Test Telegram Reale */}
        <div className="border border-sky-500/20 bg-sky-500/5 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
            <Play size={13} />
            <span>Test di Invio Messaggio Reale (Telegram API)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={tgTestChatId} onChange={(e) => setTgTestChatId(e.target.value)} placeholder="Tuo Chat ID (es: 1048293)" className={`${inputCls} text-xs`} />
            <input value={tgTestMsg} onChange={(e) => setTgTestMsg(e.target.value)} placeholder="Messaggio da inviare..." className={`${inputCls} text-xs`} />
          </div>
          <button onClick={testTelegram} disabled={tgTesting || !tgTestChatId} className="w-full py-1.5 bg-[#0088cc] hover:bg-sky-600 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
            {tgTesting ? <Loader2 size={13} className="animate-spin" /> : 'Invia Messaggio su Telegram'}
          </button>
          {tgTestResult && (
            <div className="border-t border-sky-500/10 pt-2">
              <span className="text-[10px] font-semibold text-surface-500 block mb-1">Risposta API Telegram:</span>
              <pre className="bg-surface-900 text-surface-100 p-2.5 rounded text-[10px] overflow-x-auto font-mono max-h-40">
                {JSON.stringify(tgTestResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* Email Resend */}
      <Card icon={<Mail size={18} />} title="Email Transazionali (Resend Provider)" subtitle="Invia email e contratti per la firma crittografica" status={emailStatus} color="#f59e0b">
        <SetupGuide steps={[
          { text: 'Registrati su', link: { label: 'Resend.com', url: 'https://resend.com' } },
          { text: 'Crea una API Key ed inserisci un indirizzo email mittente validato (es. mittente sul tuo dominio privato).' },
          { text: 'Imposta la chiave API sotto per abilitare l\'invio reale delle fatture e dei contratti via email.' },
        ]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Indirizzo Mittente validato"><input value={org.email.from_address} onChange={(e) => org.patch('email', { from_address: e.target.value, verified: false })} className={inputCls} placeholder="Es: contratti@xyz.it" /></Field>
          <Field label="Nome Mittente"><input value={org.email.from_name} onChange={(e) => org.patch('email', { from_name: e.target.value })} className={inputCls} placeholder="Es: XYZ Servizi" /></Field>
        </div>
        <Field label="Resend API Key"><input value={org.email.api_key} onChange={(e) => org.patch('email', { api_key: e.target.value, verified: false })} type="password" className={inputCls} placeholder="re_123456789..." /></Field>

        {/* Pannello Test Email Reale */}
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Play size={13} />
            <span>Test Invio Email Reale (Resend SMTP/HTTP)</span>
          </div>
          <div className="flex gap-2">
            <input value={mailTestTo} onChange={(e) => setMailTestTo(e.target.value)} placeholder="Email destinatario (es: cliente@gmail.com)" className={`${inputCls} text-xs flex-1`} />
            <button onClick={testEmail} disabled={mailTesting || !mailTestTo} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50">
              {mailTesting ? <Loader2 size={13} className="animate-spin" /> : 'Invia Email'}
            </button>
          </div>
          {mailTestResult && (
            <div className="border-t border-amber-500/10 pt-2">
              <span className="text-[10px] font-semibold text-surface-500 block mb-1">Risposta API Resend:</span>
              <pre className="bg-surface-900 text-surface-100 p-2.5 rounded text-[10px] overflow-x-auto font-mono max-h-40">
                {JSON.stringify(mailTestResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* SMS (Twilio) */}
      <Card icon={<Smartphone size={18} />} title="SMS (Twilio)" subtitle="Invia SMS transazionali e broadcast via Twilio" status={smsStatus}
            enabled={org.sms.enabled} onToggle={(v) => org.patch('sms', { enabled: v })} color="#F22F46">
        <SetupGuide steps={[
          { text: 'Crea un account Twilio e acquista un numero mittente.' },
          { text: 'Copia Account SID e Auth Token dalla Console Twilio.' },
          { text: 'Inserisci il numero mittente in formato E.164 (es. +39...).' },
        ]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Account SID"><input value={org.sms.account_sid} onChange={(e) => org.patch('sms', { account_sid: e.target.value, verified: false })} className={inputCls} placeholder="AC..." /></Field>
          <Field label="Numero Mittente (E.164)"><input value={org.sms.from_number} onChange={(e) => org.patch('sms', { from_number: e.target.value })} className={inputCls} placeholder="+39..." /></Field>
        </div>
        <Field label="Auth Token"><input value={org.sms.auth_token} onChange={(e) => org.patch('sms', { auth_token: e.target.value, verified: false })} type="password" className={inputCls} placeholder="••••••••" /></Field>
      </Card>

      {/* Notifiche Push */}
      <Card icon={<Bell size={18} />} title="Notifiche Push (Web Push / FCM)" subtitle="Invia notifiche push a browser e dispositivi" status={pushStatus}
            enabled={org.push.enabled} onToggle={(v) => org.patch('push', { enabled: v })} color="#8b5cf6">
        <SetupGuide steps={[
          { text: 'Web Push: genera una coppia di chiavi VAPID.' },
          { text: 'FCM: copia la Server Key dal progetto Firebase.' },
        ]} />
        <Field label="Provider">
          <select value={org.push.provider} onChange={(e) => org.patch('push', { provider: e.target.value as 'fcm' | 'webpush' })} className={inputCls}>
            <option value="webpush">Web Push (VAPID)</option>
            <option value="fcm">Firebase Cloud Messaging</option>
          </select>
        </Field>
        {org.push.provider === 'webpush' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="VAPID Public Key"><input value={org.push.vapid_public} onChange={(e) => org.patch('push', { vapid_public: e.target.value, verified: false })} className={inputCls} /></Field>
            <Field label="VAPID Private Key"><input value={org.push.vapid_private} onChange={(e) => org.patch('push', { vapid_private: e.target.value, verified: false })} type="password" className={inputCls} /></Field>
          </div>
        ) : (
          <Field label="FCM Server Key"><input value={org.push.server_key} onChange={(e) => org.patch('push', { server_key: e.target.value, verified: false })} type="password" className={inputCls} placeholder="AAAA..." /></Field>
        )}
      </Card>

      {/* Social (Meta + LinkedIn) */}
      <Card icon={<Share2 size={18} />} title="Social (Meta & LinkedIn)" subtitle="Pubblica post e centralizza commenti e messaggi social" status={socialStatus} color="#1877f2">
        <SetupGuide steps={[
          { text: 'Meta: crea un\'app su developers.facebook.com e collega la Pagina Facebook/Instagram Business.' },
          { text: 'LinkedIn: crea un\'app sul Marketing Developer Platform e autorizza la Pagina aziendale.' },
        ]} />
        {/* Meta */}
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-xs font-bold text-surface-700 dark:text-surface-200">Meta (Facebook / Instagram)</span>
            <input type="checkbox" checked={org.social.meta.enabled} onChange={(e) => org.patch('social', { meta: { ...org.social.meta, enabled: e.target.checked } })} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="App ID"><input value={org.social.meta.app_id} onChange={(e) => org.patch('social', { meta: { ...org.social.meta, app_id: e.target.value, verified: false } })} className={inputCls} /></Field>
            <Field label="App Secret"><input value={org.social.meta.app_secret} onChange={(e) => org.patch('social', { meta: { ...org.social.meta, app_secret: e.target.value, verified: false } })} type="password" className={inputCls} /></Field>
            <Field label="Page ID (Facebook)"><input value={org.social.meta.page_id} onChange={(e) => org.patch('social', { meta: { ...org.social.meta, page_id: e.target.value } })} className={inputCls} /></Field>
            <Field label="Instagram Business Account ID"><input value={org.social.meta.ig_account_id} onChange={(e) => org.patch('social', { meta: { ...org.social.meta, ig_account_id: e.target.value } })} className={inputCls} /></Field>
          </div>
          <Field label="Page Access Token"><input value={org.social.meta.page_token} onChange={(e) => org.patch('social', { meta: { ...org.social.meta, page_token: e.target.value, verified: false } })} type="password" className={inputCls} placeholder="EAAG..." /></Field>
        </div>
        {/* LinkedIn */}
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-xs font-bold text-surface-700 dark:text-surface-200">LinkedIn</span>
            <input type="checkbox" checked={org.social.linkedin.enabled} onChange={(e) => org.patch('social', { linkedin: { ...org.social.linkedin, enabled: e.target.checked } })} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Client ID"><input value={org.social.linkedin.client_id} onChange={(e) => org.patch('social', { linkedin: { ...org.social.linkedin, client_id: e.target.value, verified: false } })} className={inputCls} /></Field>
            <Field label="Client Secret"><input value={org.social.linkedin.client_secret} onChange={(e) => org.patch('social', { linkedin: { ...org.social.linkedin, client_secret: e.target.value, verified: false } })} type="password" className={inputCls} /></Field>
            <Field label="Organization URN"><input value={org.social.linkedin.org_urn} onChange={(e) => org.patch('social', { linkedin: { ...org.social.linkedin, org_urn: e.target.value } })} className={inputCls} placeholder="urn:li:organization:123" /></Field>
            <Field label="Access Token"><input value={org.social.linkedin.access_token} onChange={(e) => org.patch('social', { linkedin: { ...org.social.linkedin, access_token: e.target.value, verified: false } })} type="password" className={inputCls} /></Field>
          </div>
        </div>
      </Card>

      {/* Google OAuth */}
      <Card icon={<Calendar size={18} />} title="Google Calendar & Meet OAuth" subtitle="Sincronizza scadenze ed eventi con Google Calendar" status={googleStatus}
            enabled={org.google.calendar_enabled} onToggle={(v) => org.patch('google', { calendar_enabled: v })} color="#4285F4">
        <SetupGuide steps={[
          { text: 'Vai sulla Google Cloud Console ed abilita la Google Calendar API.' },
          { text: 'In Credentials, crea una credenziale OAuth 2.0 per Applicazione Web.' },
          { text: 'Inserisci l\'URI di reindirizzamento sotto negli Authorized Redirect URIs di Google.' },
          { text: 'Incolla il Client ID ed avvia la connessione dell\'account.' },
        ]} />
        <Field label="Google Client ID"><input value={org.google.client_id} onChange={(e) => org.patch('google', { client_id: e.target.value })} placeholder="xxxx.apps.googleusercontent.com" className={inputCls} /></Field>
        <Field label="Authorized Redirect URI"><CopyRow value={org.google.redirect_uri} onCopy={() => copy(org.google.redirect_uri, 'g')} copied={copied === 'g'} /></Field>

        <button onClick={handleGoogleConnect} className={`w-full py-2.5 text-sm font-semibold rounded-lg border transition-colors flex items-center justify-center gap-2
          ${org.google.connected 
            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' 
            : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'}`}>
          {org.google.connected ? `✓ Connesso (${org.google.account}) — Disconnetti` : 'Connetti account Google (OAuth)'}
        </button>
      </Card>

      <div className="flex items-center gap-2 text-xs text-surface-400 dark:text-surface-500 bg-surface-100 dark:bg-surface-900 p-3 rounded-lg border border-surface-200 dark:border-surface-800">
        <ShieldCheck size={16} className="text-brand-500 shrink-0" />
        <span>Tutte le credenziali inserite vengono memorizzate in locale in modo cifrato e sicuro. Le richieste API vengono inviate direttamente dal tuo browser senza server intermediari.</span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { BellRing, Phone, Monitor, Mail, Send, MessageCircle, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTeamStore } from '../../store/teamStore';
import type { NotifyChannel } from '../../types/team';

const CHANNELS: { key: NotifyChannel; label: string; icon: React.ReactNode; needsPhone?: boolean }[] = [
  { key: 'visual',   label: 'In-app',   icon: <Monitor size={15} /> },
  { key: 'email',    label: 'Email',    icon: <Mail size={15} /> },
  { key: 'telegram', label: 'Telegram', icon: <Send size={15} />, needsPhone: true },
  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={15} />, needsPhone: true },
];

export function NotificationSettings() {
  const memberId = useAuthStore((s) => s.memberId);
  const member = useTeamStore(useShallow((s) => s.members.find((m) => m.id === memberId)));
  const updateMember = useTeamStore((s) => s.updateMember);

  const [phone, setPhone] = useState(member?.phone ?? '');
  const [saved, setSaved] = useState(false);
  const channels = member?.notify_channels ?? ['visual'];

  if (!member) return null;

  const toggle = (c: NotifyChannel) => {
    const next = channels.includes(c) ? channels.filter((x) => x !== c) : [...channels, c];
    updateMember(member.id, { notify_channels: next });
  };

  const savePhone = () => {
    updateMember(member.id, { phone: phone.trim() || null });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BellRing size={16} className="text-brand-500" />
        <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-100">Le mie notifiche</h2>
      </div>

      {/* Telefono */}
      <div>
        <label className="block text-xs font-medium text-surface-500 mb-1 flex items-center gap-1.5">
          <Phone size={13} /> Numero di telefono (per Telegram e WhatsApp)
        </label>
        <div className="flex gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="+39 333 1234567" className="auth-input" />
          <button onClick={savePhone}
            className="shrink-0 flex items-center gap-1 px-3 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors">
            {saved ? <Check size={14} /> : 'Salva'}
          </button>
        </div>
      </div>

      {/* Canali */}
      <div>
        <p className="text-xs font-medium text-surface-500 mb-2">Canali attivi</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CHANNELS.map((c) => {
            const disabled = c.needsPhone && !member.phone;
            const active = channels.includes(c.key);
            return (
              <button key={c.key} onClick={() => !disabled && toggle(c.key)} disabled={disabled}
                title={disabled ? 'Richiede il numero di telefono' : undefined}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  disabled ? 'opacity-40 cursor-not-allowed border-surface-200 dark:border-surface-700'
                  : active ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                  : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400'
                }`}>
                {c.icon} {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-surface-400">
        In demo gli invii via email/Telegram/WhatsApp sono simulati (vedi “Registro invii” nei Promemoria).
        In produzione partiranno davvero tramite Supabase Edge Functions + Telegram Bot API / WhatsApp Cloud API.
      </p>
    </div>
  );
}

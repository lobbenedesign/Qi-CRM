import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { X, Bell, Mail, Send, MessageCircle, Monitor } from 'lucide-react';
import { useRemindersStore } from '../../store/remindersStore';
import { useAuthStore } from '../../store/authStore';
import { useTeamStore } from '../../store/teamStore';
import type { NotifyChannel } from '../../types/team';

interface Props {
  onClose: () => void;
  preset?: { contact_id?: string | null; deal_id?: string | null; ticket_id?: string | null; title?: string };
}

const CHANNELS: { key: NotifyChannel; label: string; icon: React.ReactNode }[] = [
  { key: 'visual',   label: 'In-app',   icon: <Monitor size={14} /> },
  { key: 'email',    label: 'Email',    icon: <Mail size={14} /> },
  { key: 'telegram', label: 'Telegram', icon: <Send size={14} /> },
  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={14} /> },
];

function defaultDateTime(): string {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setSeconds(0, 0);
  // formato yyyy-MM-ddThh:mm per input datetime-local
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateReminderModal({ onClose, preset }: Props) {
  const add = useRemindersStore((s) => s.add);
  const memberId = useAuthStore((s) => s.memberId);
  const member = useTeamStore(useShallow((s) => s.members.find((m) => m.id === memberId)));

  const available = member?.notify_channels ?? ['visual'];
  const [title, setTitle] = useState(preset?.title ?? '');
  const [note, setNote] = useState('');
  const [when, setWhen] = useState(defaultDateTime());
  const [channels, setChannels] = useState<NotifyChannel[]>(available);

  const toggle = (c: NotifyChannel) =>
    setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    add({
      title, note: note || null,
      remind_at: new Date(when).toISOString(),
      channels,
      user_id: memberId ?? 'tm-owner',
      contact_id: preset?.contact_id ?? null,
      deal_id: preset?.deal_id ?? null,
      ticket_id: preset?.ticket_id ?? null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-surface-900 rounded-xl shadow-2xl border
                      border-surface-200 dark:border-surface-700 w-full max-w-md p-6"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-brand-500" />
            <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Nuovo Promemoria</h2>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Titolo *</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Richiamare il cliente" className="auth-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Nota</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="auth-input resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Quando *</label>
            <input required type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="auth-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-2">Canali di notifica</label>
            <div className="grid grid-cols-2 gap-2">
              {CHANNELS.map((c) => {
                const enabled = available.includes(c.key);
                const active = channels.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    disabled={!enabled}
                    onClick={() => toggle(c.key)}
                    title={!enabled ? 'Canale non abilitato nel tuo profilo' : undefined}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                      !enabled ? 'opacity-40 cursor-not-allowed border-surface-200 dark:border-surface-700'
                      : active ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400'
                    }`}
                  >
                    {c.icon} {c.label}
                  </button>
                );
              })}
            </div>
            {(!member?.phone) && (
              <p className="text-[11px] text-amber-600 mt-2">
                ⚠️ Aggiungi il tuo numero in Impostazioni per abilitare Telegram e WhatsApp.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={channels.length === 0}
              className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50">
              Imposta promemoria
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

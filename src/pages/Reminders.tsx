import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  Bell, Plus, Check, Trash2, Monitor, Mail, Send, MessageCircle,
  Clock, CheckCircle2, CalendarPlus,
} from 'lucide-react';
import { useRemindersStore } from '../store/remindersStore';
import { useAuthStore } from '../store/authStore';
import { CreateReminderModal } from '../components/reminders/CreateReminderModal';
import { openGoogleCalendar } from '../lib/googleCalendar';
import type { NotifyChannel } from '../types/team';

const CH_ICON: Record<NotifyChannel, React.ReactNode> = {
  visual: <Monitor size={12} />, email: <Mail size={12} />,
  telegram: <Send size={12} />, whatsapp: <MessageCircle size={12} />,
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function Reminders() {
  const { reminders, deliveries, complete, remove } = useRemindersStore(
    useShallow((s) => ({ reminders: s.reminders, deliveries: s.deliveries, complete: s.complete, remove: s.remove }))
  );
  const memberId = useAuthStore((s) => s.memberId);
  const [showCreate, setShowCreate] = useState(false);

  const mine = reminders.filter((r) => r.user_id === memberId || memberId === 'tm-owner');
  const upcoming = mine.filter((r) => r.status === 'pending').sort((a, b) => +new Date(a.remind_at) - +new Date(b.remind_at));
  const past = mine.filter((r) => r.status !== 'pending').sort((a, b) => +new Date(b.remind_at) - +new Date(a.remind_at));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="text-brand-500" size={22} />
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Promemoria</h1>
          <span className="text-sm text-surface-400 ml-1">{upcoming.length} in programma</span>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors font-medium">
          <Plus size={15} /> Nuovo Promemoria
        </button>
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Clock size={12} /> In programma
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-surface-400 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-6 text-center">
            Nessun promemoria in programma.
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((r) => (
              <div key={r.id} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-500 shrink-0">
                  <Bell size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-900 dark:text-surface-100">{r.title}</p>
                  {r.note && <p className="text-xs text-surface-400">{r.note}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-surface-500">{fmt(r.remind_at)}</span>
                    <span className="flex items-center gap-1">
                      {r.channels.map((c) => (
                        <span key={c} className="text-surface-400" title={c}>{CH_ICON[c]}</span>
                      ))}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openGoogleCalendar({ title: r.title, start: new Date(r.remind_at), details: r.note ?? undefined })}
                  title="Aggiungi a Google Calendar"
                  className="p-1.5 text-surface-400 hover:text-brand-600 rounded transition-colors"><CalendarPlus size={16} /></button>
                <button onClick={() => complete(r.id)} title="Segna come completato"
                  className="p-1.5 text-surface-400 hover:text-trust-high rounded transition-colors"><Check size={16} /></button>
                <button onClick={() => remove(r.id)} title="Elimina"
                  className="p-1.5 text-surface-400 hover:text-risk-high rounded transition-colors"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Storico + registro invii */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section>
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Inviati / completati
          </h2>
          <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-800">
            {past.length === 0 ? (
              <p className="text-sm text-surface-400 p-4 text-center">Niente ancora.</p>
            ) : past.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === 'done' ? 'bg-trust-high' : 'bg-brand-400'}`} />
                <p className="flex-1 text-sm text-surface-700 dark:text-surface-300 truncate">{r.title}</p>
                <span className="text-xs text-surface-400">{r.status === 'done' ? 'Completato' : 'Inviato'}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Send size={12} /> Registro invii
          </h2>
          <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-800 max-h-72 overflow-y-auto">
            {deliveries.length === 0 ? (
              <p className="text-sm text-surface-400 p-4 text-center">Nessun invio registrato.</p>
            ) : deliveries.slice(0, 30).map((d) => (
              <div key={d.id} className="flex items-center gap-2 px-4 py-2 text-xs">
                <span className={d.ok ? 'text-trust-high' : 'text-risk-high'}>{CH_ICON[d.channel]}</span>
                <span className="flex-1 text-surface-600 dark:text-surface-400 truncate">{d.detail}</span>
                <span className="text-surface-400">{new Date(d.at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showCreate && <CreateReminderModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

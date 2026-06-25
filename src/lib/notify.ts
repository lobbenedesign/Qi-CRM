// ============================================================
// SOVRANO — Dispatcher notifiche promemoria.
//
// Canali: 'visual' è REALE (toast in-app). email/telegram/whatsapp
// sono SIMULATI in demo (registrati nel log invii). In produzione
// questi diventeranno chiamate a una Supabase Edge Function che usa:
//   - email    → Resend / SendGrid
//   - telegram → Telegram Bot API (sendMessage al chat_id dell'utente)
//   - whatsapp → WhatsApp Cloud API o Twilio (al numero dell'utente)
// Lo scheduling reale userà un cron (Supabase pg_cron / Edge Schedules).
// ============================================================
import { useTeamStore } from '../store/teamStore';
import { useToastStore } from '../store/toastStore';
import { useRemindersStore } from '../store/remindersStore';
import { logAudit } from './audit';
import type { Reminder, NotifyChannel } from '../types/team';

const CHANNEL_LABEL: Record<NotifyChannel, string> = {
  visual: 'In-app', email: 'Email', telegram: 'Telegram', whatsapp: 'WhatsApp',
};

/** Consegna un promemoria su tutti i canali richiesti dall'utente. */
export function deliverReminder(reminder: Reminder) {
  const member = useTeamStore.getState().members.find((m) => m.id === reminder.user_id);
  const toast = useToastStore.getState();
  const { logDelivery, markSent } = useRemindersStore.getState();

  // Interseca i canali del promemoria con quelli abilitati dall'utente
  const enabled = member?.notify_channels ?? ['visual'];
  const channels = reminder.channels.filter((c) => enabled.includes(c));

  channels.forEach((channel) => {
    if (channel === 'visual') {
      toast.push({ kind: 'reminder', title: `⏰ ${reminder.title}`, body: reminder.note ?? undefined });
      logDelivery({ reminder_id: reminder.id, channel, to: 'in-app', ok: true, detail: 'Notifica visiva mostrata' });
      return;
    }

    if (channel === 'email') {
      const ok = !!member?.email;
      logDelivery({ reminder_id: reminder.id, channel, to: member?.email ?? '—', ok,
        detail: ok ? `Email inviata a ${member!.email}` : 'Nessun indirizzo email' });
      return;
    }

    // telegram / whatsapp richiedono il numero di telefono
    const ok = !!member?.phone;
    logDelivery({ reminder_id: reminder.id, channel, to: member?.phone ?? '—', ok,
      detail: ok ? `${CHANNEL_LABEL[channel]} inviato a ${member!.phone}` : 'Numero di telefono mancante' });
  });

  markSent(reminder.id);
  logAudit('reminder', 'session', reminder.title, { channels });
}

/** Trova e consegna i promemoria scaduti e ancora pending. */
export function dispatchDueReminders() {
  const now = Date.now();
  const due = useRemindersStore.getState().reminders.filter(
    (r) => r.status === 'pending' && new Date(r.remind_at).getTime() <= now,
  );
  due.forEach(deliverReminder);
  return due.length;
}

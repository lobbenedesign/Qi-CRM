import { useEffect } from 'react';
import { dispatchDueReminders } from '../../lib/notify';

/**
 * Controlla i promemoria scaduti ogni 20s (e all'avvio) e li consegna.
 * In produzione lo scheduling sarà server-side (Supabase cron + Edge Function),
 * qui è client-side per la demo.
 */
export function ReminderDispatcher() {
  useEffect(() => {
    dispatchDueReminders();
    const t = setInterval(dispatchDueReminders, 20_000);
    return () => clearInterval(t);
  }, []);
  return null;
}

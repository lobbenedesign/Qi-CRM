import { useState } from 'react';
import {
  Settings as SettingsIcon, User, Database, Bell, Shield,
  RotateCcw, Check, Loader2,
} from 'lucide-react';
import { repo, USING_MOCK } from '../lib/repo';
import { useQueryClient } from '@tanstack/react-query';
import { useCan } from '../hooks/useCan';
import { RoutingSettings } from '../components/team/RoutingSettings';
import { NotificationSettings } from '../components/team/NotificationSettings';
import { MassEmailSettings } from '../components/team/MassEmailSettings';

const sections = [
  { icon: User,     label: 'Profilo',   desc: 'Nome, foto, preferenze personali' },
  { icon: Database, label: 'Supabase',  desc: 'Connessione al database e API keys' },
  { icon: Bell,     label: 'Notifiche', desc: 'Avvisi email e in-app' },
  { icon: Shield,   label: 'Sicurezza', desc: 'Password, 2FA, sessioni attive' },
];

export default function Settings() {
  const qc = useQueryClient();
  const canManage = useCan('team:manage');
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);

  const onReset = async () => {
    if (!confirm('Ripristinare i dati demo? Le modifiche locali andranno perse.')) return;
    setResetting(true);
    repo.resetDemo();                 // ri-seeda il mock DB e svuota gli store persistiti
    await qc.invalidateQueries();
    setDone(true);
    // Reload completo: forza la ri-hydration di tutti gli store Zustand dallo stato iniziale
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="text-brand-500" size={22} />
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Impostazioni</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map(({ icon: Icon, label, desc }) => (
          <button
            key={label}
            className="flex items-start gap-4 p-4 bg-white dark:bg-surface-900 rounded-xl
                       border border-surface-200 dark:border-surface-700
                       hover:border-brand-300 dark:hover:border-brand-700
                       hover:shadow-sm transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30
                            flex items-center justify-center shrink-0 group-hover:bg-brand-100
                            dark:group-hover:bg-brand-900/50 transition-colors">
              <Icon size={18} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="font-medium text-surface-900 dark:text-surface-100 text-sm">{label}</p>
              <p className="text-xs text-surface-400 mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Le mie notifiche */}
      <NotificationSettings />

      {/* Smistamento (solo superadmin) */}
      {canManage && <RoutingSettings />}

      {/* Integrazione Mass Email (solo superadmin) */}
      {canManage && <MassEmailSettings />}

      {/* Demo data controls */}
      {USING_MOCK && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Database size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-surface-900 dark:text-surface-100 text-sm">Modalità demo</p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 max-w-md">
                  Stai usando dati mock locali (localStorage). Collega Supabase in <code className="text-[11px]">.env.local</code> per
                  passare al database reale. Puoi ripristinare i dati demo quando vuoi.
                </p>
              </div>
            </div>
            <button
              onClick={onReset}
              disabled={resetting}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-colors
                         bg-white dark:bg-surface-800 border border-amber-300 dark:border-amber-800
                         text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/20 disabled:opacity-60"
            >
              {done ? <Check size={15} /> : resetting ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
              {done ? 'Ripristinato!' : 'Ripristina dati demo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { Shuffle, TrendingUp, Ticket } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useRoutingStore, type ChannelRouting, type AssignMode, type AssignStrategy } from '../../store/routingStore';
import { ROLE_META, ALL_ROLES } from '../../lib/permissions';
import type { TeamRole } from '../../types/team';

const MODE_LABEL: Record<AssignMode, string> = {
  manual: 'Manuale (scelgo io)',
  role:   'Per ruolo (round-robin)',
  auto:   'Automatico (smistamento intelligente)',
};

const STRATEGY_LABEL: Record<AssignStrategy, string> = {
  round_robin:  'A rotazione',
  least_loaded: 'Chi ha meno carico',
};

function RoutingCard({
  icon, title, subtitle, cfg, onChange, autoNote,
}: {
  icon: React.ReactNode; title: string; subtitle: string;
  cfg: ChannelRouting; onChange: (c: Partial<ChannelRouting>) => void; autoNote: string;
}) {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
          {icon}
        </div>
        <div>
          <p className="font-medium text-surface-900 dark:text-surface-100 text-sm">{title}</p>
          <p className="text-xs text-surface-400">{subtitle}</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-500 mb-1">Modalità di assegnazione</label>
        <select value={cfg.mode} onChange={(e) => onChange({ mode: e.target.value as AssignMode })} className="auth-input">
          {Object.entries(MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {cfg.mode === 'role' && (
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Ruolo destinatario</label>
          <select value={cfg.role ?? ''} onChange={(e) => onChange({ role: e.target.value as TeamRole })} className="auth-input">
            {ALL_ROLES.filter((r) => r !== 'superadmin').map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </select>
        </div>
      )}

      {cfg.mode !== 'manual' && (
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Strategia di bilanciamento</label>
          <select value={cfg.strategy} onChange={(e) => onChange({ strategy: e.target.value as AssignStrategy })} className="auth-input">
            {Object.entries(STRATEGY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      )}

      <p className="text-[11px] text-surface-400">
        {cfg.mode === 'manual' && 'Ogni nuovo elemento resta non assegnato finché non scegli tu la persona.'}
        {cfg.mode === 'role' && `I nuovi elementi vengono distribuiti tra i ${cfg.role ? ROLE_META[cfg.role].label : '—'} attivi.`}
        {cfg.mode === 'auto' && autoNote}
      </p>
    </div>
  );
}

export function RoutingSettings() {
  const { deals, tickets, setDeals, setTickets } = useRoutingStore(
    useShallow((s) => ({ deals: s.deals, tickets: s.tickets, setDeals: s.setDeals, setTickets: s.setTickets }))
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Shuffle size={16} className="text-brand-500" />
        <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-100">Smistamento automatico</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <RoutingCard
          icon={<TrendingUp size={18} />}
          title="Nuovi Deal"
          subtitle="Come assegnare i deal in arrivo"
          cfg={deals}
          onChange={setDeals}
          autoNote="I deal vengono assegnati ai commerciali bilanciando il carico."
        />
        <RoutingCard
          icon={<Ticket size={18} />}
          title="Nuovi Ticket"
          subtitle="Come assegnare i ticket in arrivo"
          cfg={tickets}
          onChange={setTickets}
          autoNote="Ogni ticket va al ruolo competente per categoria (es. richiamo → telefonista) col minor carico."
        />
      </div>
    </div>
  );
}

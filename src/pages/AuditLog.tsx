import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ScrollText, LogIn, Plus, Pencil, Trash2, ArrowRightLeft, Sparkles,
  Download, UserPlus, ShieldQuestion, Ban, CheckCircle2,
} from 'lucide-react';
import { useAuditStore } from '../store/auditStore';
import { useTeamStore } from '../store/teamStore';
import { useCan } from '../hooks/useCan';
import { ROLE_META } from '../lib/permissions';
import type { AuditAction, AuditEntry } from '../types/team';

const ACTION_META: Record<AuditAction, { label: string; icon: React.ReactNode; color: string }> = {
  login:          { label: 'Accesso',            icon: <LogIn size={13} />,          color: '#64748b' },
  logout:         { label: 'Logout',             icon: <LogIn size={13} />,          color: '#64748b' },
  create:         { label: 'Creazione',          icon: <Plus size={13} />,           color: '#22c55e' },
  update:         { label: 'Modifica',           icon: <Pencil size={13} />,         color: '#3b82f6' },
  delete:         { label: 'Eliminazione',       icon: <Trash2 size={13} />,         color: '#ef4444' },
  stage_change:   { label: 'Cambio stage',       icon: <ArrowRightLeft size={13} />, color: '#8b5cf6' },
  ai_capture:     { label: 'Cattura AI',         icon: <Sparkles size={13} />,       color: '#f59e0b' },
  export:         { label: 'Esportazione',       icon: <Download size={13} />,       color: '#06b6d4' },
  invite:         { label: 'Invito',             icon: <UserPlus size={13} />,       color: '#6366f1' },
  role_change:    { label: 'Cambio ruolo',       icon: <ShieldQuestion size={13} />, color: '#6366f1' },
  member_disable: { label: 'Disattivazione',     icon: <Ban size={13} />,            color: '#94a3b8' },
  member_enable:  { label: 'Riattivazione',      icon: <CheckCircle2 size={13} />,   color: '#22c55e' },
  assign:         { label: 'Assegnazione',       icon: <UserPlus size={13} />,       color: '#6366f1' },
  reminder:       { label: 'Promemoria',         icon: <Sparkles size={13} />,       color: '#f59e0b' },
};

const RESOURCE_LABEL: Record<string, string> = {
  contact: 'Contatto', company: 'Azienda', deal: 'Deal', activity: 'Attività',
  automation: 'Automazione', member: 'Membro', session: 'Sessione',
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLog() {
  const canView = useCan('audit:view');
  const entries = useAuditStore((s) => s.entries);
  const members = useTeamStore((s) => s.members);
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');

  if (!canView) return <Navigate to="/" replace />;

  const filtered = entries.filter((e) =>
    (!userFilter || e.user_id === userFilter) &&
    (!actionFilter || e.action === actionFilter),
  );

  // Raggruppa per giorno
  const groups: { day: string; items: AuditEntry[] }[] = [];
  filtered.forEach((e) => {
    const day = new Date(e.timestamp).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    let g = groups.find((x) => x.day === day);
    if (!g) { g = { day, items: [] }; groups.push(g); }
    g.items.push(e);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="text-brand-500" size={22} />
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Audit Log</h1>
        <span className="text-sm text-surface-400 ml-1">{filtered.length} azioni</span>
      </div>

      {/* Filtri */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}
          className="text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800
                     px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand-500/30">
          <option value="">Tutti i dipendenti</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
          className="text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800
                     px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand-500/30">
          <option value="">Tutte le azioni</option>
          {Object.entries(ACTION_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(userFilter || actionFilter) && (
          <button onClick={() => { setUserFilter(''); setActionFilter(''); }}
            className="text-sm text-brand-500 hover:underline">Azzera filtri</button>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-xs text-trust-high">
          <span className="w-2 h-2 rounded-full bg-trust-high animate-pulse" /> Aggiornamento in tempo reale
        </span>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-10 text-center">
          <ScrollText size={36} className="text-surface-300 mx-auto mb-3" />
          <p className="text-sm text-surface-400">Nessuna azione registrata con questi filtri.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.day}>
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 capitalize">{group.day}</h3>
              <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-800">
                {group.items.map((e) => {
                  const am = ACTION_META[e.action];
                  const rm = ROLE_META[e.user_role];
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${am.color}18`, color: am.color }}>
                        {am.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-800 dark:text-surface-100">
                          <span className="font-medium">{e.user_name}</span>
                          <span className="text-surface-500"> · {am.label.toLowerCase()} </span>
                          <span className="text-surface-500">{RESOURCE_LABEL[e.resource]?.toLowerCase()}</span>{' '}
                          <span className="font-medium">{e.target_label}</span>
                        </p>
                      </div>
                      <span className="hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: `${rm.color}18`, color: rm.color }}>
                        {rm.label}
                      </span>
                      <time className="text-xs text-surface-400 shrink-0 tabular-nums w-[150px] text-right">{fmtTime(e.timestamp)}</time>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

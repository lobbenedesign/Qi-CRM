import { useMemo, useState } from 'react';
import { TrendingUp, Target, Gauge, Sparkles, Pencil, Check, Layers } from 'lucide-react';
import { useDeals, usePipelineStages } from '../hooks/useDeals';
import { useTeamStore } from '../store/teamStore';
import { useForecastStore } from '../store/forecastStore';
import { useCan } from '../hooks/useCan';
import { formatCurrency } from '../lib/utils';
import {
  buildRepForecasts, periodOptions, periodLabel, CATEGORY_META, type RepForecast,
} from '../lib/forecast';
import type { PipelineStage } from '../types/crm';

export default function Forecast() {
  const { data: deals = [] } = useDeals();
  const { data: stages = [] } = usePipelineStages();
  const members = useTeamStore((s) => s.members);
  const { getQuota, setQuota, defaultQuota, setDefaultQuota } = useForecastStore();
  const quotas = useForecastStore((s) => s.quotas);
  const canEdit = useCan('team:manage');

  const periods = periodOptions();
  const [period, setPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<number>(0);

  const stageByKey = useMemo(() => {
    const m = new Map<string, PipelineStage>();
    for (const s of stages) m.set(s.stage_key, s);
    return m;
  }, [stages]);

  const ownerOf = (d: { assignee_id: string | null; owner_id: string }) => d.assignee_id ?? d.owner_id;

  const reps = useMemo(
    () => buildRepForecasts({ deals, stageByKey, period, quotaFor: (id) => getQuota(id, period), ownerOf }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deals, stageByKey, period, defaultQuota, quotas],
  );

  const team = useMemo(() => {
    const t = { quota: 0, closed: 0, commit: 0, bestCase: 0, pipeline: 0, weighted: 0, openCount: 0 };
    for (const r of reps) {
      t.quota += r.quota; t.closed += r.closed; t.commit += r.commit;
      t.bestCase += r.bestCase; t.pipeline += r.pipeline; t.weighted += r.weighted; t.openCount += r.openCount;
    }
    return t;
  }, [reps]);

  const attainment = team.quota > 0 ? team.closed / team.quota : 0;
  const gap = Math.max(0, team.quota - team.closed);
  const coverage = gap > 0 ? (team.commit + team.bestCase + team.pipeline) / gap : Infinity;

  // Qi-Forecast AI confidence: quanto del forecast pesato è "solido" (closed+commit)
  const solid = team.closed + team.commit;
  const confidence = team.weighted > 0 ? Math.round((solid / (team.weighted + team.pipeline * 0.5)) * 100) : 0;

  const memberName = (id: string) => {
    const m = members.find((x) => x.id === id);
    return m ? `${m.first_name} ${m.last_name}` : 'Non assegnato';
  };

  const startEdit = (id: string) => { setEditing(id); setDraft(getQuota(id, period)); };
  const saveEdit = (id: string) => { setQuota(id, period, draft); setEditing(null); };

  const maxComposition = Math.max(team.closed, team.commit, team.bestCase, team.pipeline, 1);

  return (
    <div className="flex flex-col h-full gap-4 p-1">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-brand-500" size={22} />
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Forecast & Quota</h1>
            <p className="text-xs text-surface-500">Previsione di vendita pesata per probabilità — {periodLabel(period)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <label className="flex items-center gap-1.5 text-xs text-surface-500">
              Quota default
              <input
                type="number"
                value={defaultQuota}
                onChange={(e) => setDefaultQuota(Number(e.target.value))}
                className="w-24 bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-2 py-1.5 focus:outline-none"
              />
            </label>
          )}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-surface-50 dark:bg-surface-800 text-xs font-semibold rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-1.5 focus:outline-none capitalize"
          >
            {periods.map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
          </select>
        </div>
      </div>

      {/* Team rollup cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
        <Kpi icon={<Target size={15} />} label="Quota team" value={formatCurrency(team.quota)} />
        <Kpi icon={<Check size={15} />} label="Chiuso (vinto)" value={formatCurrency(team.closed)} accent="emerald" />
        <Kpi icon={<TrendingUp size={15} />} label="Forecast pesato" value={formatCurrency(Math.round(team.weighted))} accent="brand" />
        <Kpi icon={<Gauge size={15} />} label="Attainment" value={`${Math.round(attainment * 100)}%`} accent={attainment >= 1 ? 'emerald' : attainment >= 0.6 ? 'amber' : 'red'} />
        <Kpi icon={<Layers size={15} />} label="Coverage gap" value={coverage === Infinity ? '∞' : `${coverage.toFixed(1)}×`} accent={coverage >= 3 ? 'emerald' : 'amber'} />
      </div>

      {/* Composition + AI confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0">
        <div className="lg:col-span-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4">
          <h3 className="text-xs font-bold text-surface-700 dark:text-surface-200 uppercase tracking-wide mb-3">Composizione forecast</h3>
          <div className="space-y-2.5">
            {([
              ['closed', team.closed], ['commit', team.commit], ['best_case', team.bestCase], ['pipeline', team.pipeline],
            ] as const).map(([cat, val]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className={`text-[11px] font-semibold w-28 shrink-0 ${CATEGORY_META[cat].color}`}>{CATEGORY_META[cat].label}</span>
                <div className="flex-1 h-3 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                  <div className={`h-full ${CATEGORY_META[cat].bar} rounded-full transition-all`} style={{ width: `${(val / maxComposition) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-surface-700 dark:text-surface-300 w-24 text-right">{formatCurrency(val)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-brand-600 to-indigo-600 rounded-xl p-4 text-white flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles size={15} />
            <h3 className="text-xs font-bold uppercase tracking-wide">Qi-Forecast AI</h3>
          </div>
          <div className="my-2">
            <p className="text-3xl font-extrabold">{confidence}%</p>
            <p className="text-[11px] opacity-90">Confidenza della previsione</p>
          </div>
          <p className="text-[11px] opacity-90 leading-snug">
            {confidence >= 70
              ? 'Forecast solido: gran parte del valore è in Commit o già chiuso.'
              : confidence >= 40
                ? 'Forecast moderato: rafforza le trattative in Best Case per consolidare.'
                : 'Forecast a rischio: troppo valore in Pipeline iniziale rispetto alla quota.'}
          </p>
        </div>
      </div>

      {/* Per-rep table */}
      <div className="flex-1 min-h-0 overflow-auto bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-surface-50 dark:bg-surface-850 border-b border-surface-200 dark:border-surface-800 text-surface-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">Venditore</th>
              <th className="px-4 py-3 font-medium text-right">Quota</th>
              <th className="px-4 py-3 font-medium text-right">Chiuso</th>
              <th className="px-4 py-3 font-medium text-right hidden md:table-cell">Commit</th>
              <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">Best Case</th>
              <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">Pipeline</th>
              <th className="px-4 py-3 font-medium text-right">Forecast</th>
              <th className="px-4 py-3 font-medium w-40">Attainment</th>
            </tr>
          </thead>
          <tbody>
            {reps.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-surface-400">Nessun deal con data prevista in {periodLabel(period)}.</td></tr>
            )}
            {reps.map((r) => (
              <RepRow
                key={r.memberId} r={r} name={memberName(r.memberId)}
                editing={editing === r.memberId} canEdit={canEdit}
                draft={draft} setDraft={setDraft}
                onStart={() => startEdit(r.memberId)} onSave={() => saveEdit(r.memberId)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: 'brand' | 'emerald' | 'amber' | 'red' }) {
  const color = accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
    : accent === 'amber' ? 'text-amber-600 dark:text-amber-400'
    : accent === 'red' ? 'text-red-600 dark:text-red-400'
    : accent === 'brand' ? 'text-brand-600 dark:text-brand-400'
    : 'text-surface-900 dark:text-surface-100';
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-surface-400 mb-1">{icon}<span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span></div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function RepRow({ r, name, editing, canEdit, draft, setDraft, onStart, onSave }: {
  r: RepForecast; name: string; editing: boolean; canEdit: boolean;
  draft: number; setDraft: (n: number) => void; onStart: () => void; onSave: () => void;
}) {
  const pct = Math.min(100, Math.round(r.attainment * 100));
  const barColor = r.attainment >= 1 ? 'bg-emerald-500' : r.attainment >= 0.6 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <tr className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50/50 dark:hover:bg-surface-800/30">
      <td className="px-4 py-3 font-semibold text-surface-800 dark:text-surface-100">{name}</td>
      <td className="px-4 py-3 text-right">
        {editing ? (
          <span className="inline-flex items-center gap-1">
            <input type="number" value={draft} onChange={(e) => setDraft(Number(e.target.value))}
              className="w-24 bg-surface-50 dark:bg-surface-800 text-xs rounded border border-surface-200 dark:border-surface-700 px-2 py-1 text-right focus:outline-none" autoFocus />
            <button onClick={onSave} className="text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 p-1 rounded"><Check size={13} /></button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-surface-600 dark:text-surface-300">
            {formatCurrency(r.quota)}
            {canEdit && <button onClick={onStart} className="text-surface-300 hover:text-brand-500"><Pencil size={11} /></button>}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.closed)}</td>
      <td className="px-4 py-3 text-right hidden md:table-cell text-surface-600 dark:text-surface-300">{formatCurrency(r.commit)}</td>
      <td className="px-4 py-3 text-right hidden lg:table-cell text-surface-600 dark:text-surface-300">{formatCurrency(r.bestCase)}</td>
      <td className="px-4 py-3 text-right hidden lg:table-cell text-surface-500">{formatCurrency(r.pipeline)}</td>
      <td className="px-4 py-3 text-right font-bold text-brand-600 dark:text-brand-400">{formatCurrency(Math.round(r.weighted))}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] font-bold text-surface-600 dark:text-surface-300 w-9 text-right">{pct}%</span>
        </div>
      </td>
    </tr>
  );
}

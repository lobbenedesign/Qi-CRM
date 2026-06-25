import { Compass, Sparkles, Check } from 'lucide-react';
import type { QuantumDeal, PipelineStage } from '../../types/crm';
import { guidanceForProbability } from '../../lib/salesPath';
import { useSalesPathStore } from '../../store/salesPathStore';

/**
 * Guided Selling / Sales Path — guida operativa per lo stage corrente del deal.
 * Stepper della pipeline + checklist azionabile + next best action.
 */
export function SalesPathGuide({ deal, stages }: { deal: QuantumDeal; stages: PipelineStage[] }) {
  const { toggle, isDone, doneCount } = useSalesPathStore();

  const path = stages
    .filter((s) => !deal.pipeline_id || s.pipeline_id === deal.pipeline_id)
    .sort((a, b) => a.display_order - b.display_order);

  const currentOrder = deal.stage_meta.display_order;
  const guidance = guidanceForProbability(deal.stage_meta.probability);
  const stepIds = guidance.checklist.map((s) => s.id);
  const completed = doneCount(deal.id, deal.stage, stepIds);
  const total = guidance.checklist.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700">
        <span className="flex items-center gap-1.5 text-xs font-bold text-surface-700 dark:text-surface-200">
          <Compass size={14} className="text-brand-500" /> Guida alla vendita
        </span>
        <span className="text-[11px] font-semibold text-surface-500">{completed}/{total} completati</span>
      </div>

      {/* Stepper pipeline */}
      {path.length > 0 && (
        <div className="flex items-center gap-1 px-3 pt-3">
          {path.map((s) => {
            const isCurrent = s.stage_key === deal.stage;
            const isPast = s.display_order < currentOrder;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={s.name}>
                <div
                  className={`h-1.5 w-full rounded-full ${!isCurrent && !isPast ? 'bg-surface-200 dark:bg-surface-700' : ''}`}
                  style={isCurrent || isPast ? { backgroundColor: isCurrent ? s.default_color : `${s.default_color}80` } : undefined}
                />
                <span className={`text-[9px] truncate w-full text-center ${isCurrent ? 'font-bold text-surface-800 dark:text-surface-100' : 'text-surface-400'}`}>
                  {s.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Coaching tip */}
      <div className="px-3 py-2.5">
        <p className="text-[11px] text-surface-600 dark:text-surface-300 leading-snug">{guidance.tip}</p>
      </div>

      {/* Checklist */}
      <div className="px-3 pb-2 space-y-1.5">
        {guidance.checklist.map((step) => {
          const done = isDone(deal.id, deal.stage, step.id);
          return (
            <button
              key={step.id}
              onClick={() => toggle(deal.id, deal.stage, step.id)}
              className="w-full flex items-center gap-2 text-left group"
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-surface-300 dark:border-surface-600 group-hover:border-brand-400'
              }`}>
                {done && <Check size={11} />}
              </span>
              <span className={`text-xs ${done ? 'line-through text-surface-400' : 'text-surface-700 dark:text-surface-200'}`}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="px-3">
        <div className="h-1.5 w-full rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Next best action (AI) */}
      <div className="m-3 mt-2.5 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 text-white px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Sparkles size={12} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Next Best Action</span>
        </div>
        <p className="text-xs leading-snug">{guidance.nextBestAction}</p>
      </div>
    </div>
  );
}

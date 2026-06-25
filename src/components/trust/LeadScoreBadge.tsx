import { Flame } from 'lucide-react';
import type { Contact } from '../../types/crm';
import { computeLeadScore, BAND_COLORS } from '../../lib/leadScore';

/**
 * Quantum Lead Score — punteggio sales-readiness pesato per il Trust del dato.
 * `variant="chip"` = badge compatto per tabelle; `variant="full"` = card con breakdown.
 */
export function LeadScoreBadge({ contact, variant = 'chip' }: { contact: Contact; variant?: 'chip' | 'full' }) {
  const r = computeLeadScore(contact);
  const c = BAND_COLORS[r.band];

  if (variant === 'chip') {
    return (
      <span
        title={`Quantum Lead Score: ${r.score}/100 (${r.label}) — engagement ${r.rawEngagement} × affidabilità ${(r.trustFactor * 100).toFixed(0)}%`}
        className={`inline-flex items-center gap-1 ${c.bg} ${c.text} text-[11px] font-bold px-1.5 py-0.5 rounded`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
        {r.score}
      </span>
    );
  }

  return (
    <div className={`rounded-lg p-3 ${c.bg} border border-current/10`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`flex items-center gap-1.5 text-xs font-bold ${c.text}`}>
          <Flame size={14} /> Quantum Lead Score
        </span>
        <span className={`text-lg font-extrabold ${c.text}`}>{r.score}<span className="text-xs opacity-60">/100</span></span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden mb-2">
        <div className={`h-full ${c.dot}`} style={{ width: `${r.score}%` }} />
      </div>
      <div className="space-y-0.5">
        {r.breakdown.map((b) => (
          <div key={b.label} className="flex items-center justify-between text-[10px] text-surface-500 dark:text-surface-400">
            <span>{b.label}</span>
            <span className={b.points < 0 ? 'text-red-500 font-semibold' : 'font-semibold'}>
              {b.points > 0 ? '+' : ''}{b.points}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-surface-400 mt-2 leading-snug">
        Engagement {r.rawEngagement} × affidabilità dato {(r.trustFactor * 100).toFixed(0)}% = sales-readiness reale.
      </p>
    </div>
  );
}

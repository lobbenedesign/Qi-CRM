// ============================================================
// SALES FORECASTING — categorie di forecast in stile Salesforce
// derivate AUTOMATICAMENTE dalla probabilità dello stage
// (nessuna gestione manuale di categorie come in Salesforce).
//
// Categorie:
//   closed     → stage al 100% (vinto)
//   commit     → prob >= 70% (alta confidenza)
//   best_case  → prob 40–69%
//   pipeline   → prob 1–39%
//   omitted    → stage allo 0% (perso)
// ============================================================

import type { Deal, PipelineStage } from '../types/crm';

export type ForecastCategory = 'closed' | 'commit' | 'best_case' | 'pipeline' | 'omitted';

export const CATEGORY_META: Record<ForecastCategory, { label: string; color: string; bar: string }> = {
  closed:    { label: 'Chiuso (vinto)', color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
  commit:    { label: 'Commit',          color: 'text-brand-600 dark:text-brand-400',     bar: 'bg-brand-500' },
  best_case: { label: 'Best Case',       color: 'text-indigo-600 dark:text-indigo-400',   bar: 'bg-indigo-500' },
  pipeline:  { label: 'Pipeline',        color: 'text-amber-600 dark:text-amber-400',     bar: 'bg-amber-500' },
  omitted:   { label: 'Escluso (perso)', color: 'text-surface-400',                       bar: 'bg-surface-400' },
};

export function categoryOf(probability: number): ForecastCategory {
  if (probability >= 100) return 'closed';
  if (probability <= 0) return 'omitted';
  if (probability >= 70) return 'commit';
  if (probability >= 40) return 'best_case';
  return 'pipeline';
}

/** Periodo (YYYY-MM) di competenza del deal: chiusura se chiuso, altrimenti data prevista. */
export function dealPeriod(deal: Deal): string | null {
  const iso = deal.closed_at ?? deal.expected_close;
  return iso ? iso.slice(0, 7) : null;
}

export interface RepForecast {
  memberId: string;
  quota: number;
  closed: number;        // valore vinto
  commit: number;
  bestCase: number;
  pipeline: number;
  weighted: number;      // closed + Σ(open value × prob)
  openCount: number;
  attainment: number;    // closed / quota (0..1+)
  coverage: number;      // pipeline totale aperta / gap a quota
}

export interface ForecastInput {
  deals: Deal[];
  stageByKey: Map<string, PipelineStage>;
  period: string;                 // YYYY-MM
  quotaFor: (memberId: string) => number;
  ownerOf: (deal: Deal) => string;
}

export function buildRepForecasts(input: ForecastInput): RepForecast[] {
  const { deals, stageByKey, period, quotaFor, ownerOf } = input;
  const map = new Map<string, RepForecast>();

  const ensure = (memberId: string): RepForecast => {
    let r = map.get(memberId);
    if (!r) {
      r = { memberId, quota: quotaFor(memberId), closed: 0, commit: 0, bestCase: 0, pipeline: 0, weighted: 0, openCount: 0, attainment: 0, coverage: 0 };
      map.set(memberId, r);
    }
    return r;
  };

  for (const deal of deals) {
    if (dealPeriod(deal) !== period) continue;
    const stage = stageByKey.get(deal.stage);
    const prob = stage?.probability ?? 0;
    const cat = categoryOf(prob);
    const rep = ensure(ownerOf(deal));
    const v = deal.value || 0;

    switch (cat) {
      case 'closed':    rep.closed += v; rep.weighted += v; break;
      case 'commit':    rep.commit += v; rep.weighted += v * prob / 100; rep.openCount++; break;
      case 'best_case': rep.bestCase += v; rep.weighted += v * prob / 100; rep.openCount++; break;
      case 'pipeline':  rep.pipeline += v; rep.weighted += v * prob / 100; rep.openCount++; break;
      case 'omitted':   break;
    }
  }

  for (const r of map.values()) {
    r.attainment = r.quota > 0 ? r.closed / r.quota : 0;
    const gap = Math.max(0, r.quota - r.closed);
    const openTotal = r.commit + r.bestCase + r.pipeline;
    r.coverage = gap > 0 ? openTotal / gap : (openTotal > 0 ? Infinity : 0);
  }

  return [...map.values()].sort((a, b) => b.weighted - a.weighted);
}

export function periodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const MO = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  return `${MO[m - 1]} ${y}`;
}

/** Lista degli ultimi/prossimi periodi mensili attorno a oggi. */
export function periodOptions(back = 2, fwd = 3): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = -back; i <= fwd; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

// ============================================================
// QUANTUM LEAD SCORE — sales-readiness 0..100
//
// Differenziatore vs HubSpot: il lead scoring classico somma
// solo punti comportamentali. Qui l'engagement viene MOLTIPLICATO
// per il Trust Score del dato: un lead iper-attivo ma con dati
// poco affidabili NON è "caldo" davvero (non è azionabile).
//   final = engagementGrezzo × fattoreTrust
// ============================================================

import type { Contact } from '../types/crm';
import { aggregateTrust } from './trust';

export type LeadBand = 'hot' | 'warm' | 'cold';

export interface LeadScoreResult {
  score: number;          // 0..100 (sales-readiness, già pesato per il Trust)
  rawEngagement: number;  // 0..100 prima del fattore Trust
  trustFactor: number;    // 0.6..1.0 moltiplicatore qualità dato
  band: LeadBand;
  label: string;          // 'Caldo' | 'Tiepido' | 'Freddo'
  breakdown: { label: string; points: number }[];
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

const LIFECYCLE_BONUS: Record<string, number> = {
  subscriber: 0, lead: 5, mql: 10, sql: 18, opportunity: 25, customer: 30, evangelist: 30,
};

function recencyPoints(lastActivity: string | null): number {
  if (!lastActivity) return 0;
  const days = (Date.now() - new Date(lastActivity).getTime()) / 86_400_000;
  if (days <= 7) return 15;
  if (days <= 30) return 8;
  if (days <= 90) return 3;
  return 0;
}

export function computeLeadScore(contact: Contact): LeadScoreResult {
  // --- Engagement comportamentale (i click pesano più delle aperture) ---
  const opens = Math.min(contact.email_opens ?? 0, 20) * 1.5;     // max 30
  const clicks = Math.min(contact.email_clicks ?? 0, 10) * 4;     // max 40
  const views = Math.min(contact.page_views ?? 0, 20) * 1;        // max 20
  const forms = Math.min(contact.form_submissions ?? 0, 5) * 6;   // max 30
  const behavioral = clamp(opens + clicks + views + forms);       // 0..100

  const lifecycle = LIFECYCLE_BONUS[contact.lifecycle_stage] ?? 0;
  const recency = recencyPoints(contact.last_activity);

  const rawEngagement = clamp(behavioral * 0.5 + lifecycle + recency);

  // --- Fattore Trust: 0.6 (dato inaffidabile) .. 1.0 (dato certificato) ---
  const trust = aggregateTrust(contact.field_trust ?? {}).score; // 0..1
  const trustFactor = 0.6 + 0.4 * trust;

  const score = Math.round(clamp(rawEngagement * trustFactor));

  const band: LeadBand = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';
  const label = band === 'hot' ? 'Caldo' : band === 'warm' ? 'Tiepido' : 'Freddo';

  return {
    score,
    rawEngagement: Math.round(rawEngagement),
    trustFactor,
    band,
    label,
    breakdown: [
      { label: 'Engagement email/web', points: Math.round(behavioral * 0.5) },
      { label: 'Maturità lifecycle', points: lifecycle },
      { label: 'Attività recente', points: recency },
      { label: 'Fattore affidabilità dato', points: -Math.round(rawEngagement * (1 - trustFactor)) },
    ],
  };
}

export const BAND_COLORS: Record<LeadBand, { text: string; bg: string; dot: string }> = {
  hot:  { text: 'text-red-600 dark:text-red-400',     bg: 'bg-red-500/10',     dot: 'bg-red-500' },
  warm: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10',   dot: 'bg-amber-500' },
  cold: { text: 'text-sky-600 dark:text-sky-400',     bg: 'bg-sky-500/10',     dot: 'bg-sky-500' },
};

// ============================================================
// SOVRANO — AI Strategy Assistant (motore).
// Risponde a domande sulla pipeline calcolando metriche reali dai
// dati (deal, contatti, insight). Offline e deterministico; quando
// collegheremo un LLM, questa diventa la "tool layer" che il modello
// interroga (function calling) per fondare le risposte sui dati.
// ============================================================
import { repo } from '../repo';
import { computeDealRisk, aggregateTrust } from '../trust';
import { formatCurrency } from '../utils';
import type { Deal, Contact } from '../../types/crm';

export interface AssistantReply {
  text: string;
  bullets?: string[];
  kind: 'pipeline' | 'risk' | 'churn' | 'next' | 'trust' | 'help';
}

export const SUGGESTED_PROMPTS = [
  'Com’è messa la mia pipeline?',
  'Quali deal sono a rischio?',
  'Chi rischia il churn?',
  'Cosa dovrei fare oggi?',
  'Quanto sono affidabili i miei dati?',
];

export async function askAssistant(query: string): Promise<AssistantReply> {
  const q = query.toLowerCase();
  const [deals, contacts, insights] = await Promise.all([
    repo.listDeals() as Promise<Deal[]>,
    repo.listContacts() as Promise<Contact[]>,
    repo.listInsights(),
  ]);

  const stages = await repo.listStages();
  const stageProb = (key: string) => stages.find((s) => s.stage_key === key)?.probability ?? 50;

  const withRisk = deals.map((d) => ({
    ...d,
    _risk: computeDealRisk({
      velocityDays: d.velocity_days,
      hasRiskInsight: (d.ai_insights ?? []).some((i) => i.insight_type === 'risk_alert'),
      sentimentScore: d.contact?.sentiment_score ?? null,
      stageProbability: stageProb(d.stage),
    }),
  }));

  // ----- Pipeline overview -----
  if (q.includes('pipeline') || q.includes('messa') || q.includes('riepilogo') || q.includes('andamento')) {
    const open = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
    const won = deals.filter((d) => d.stage === 'won');
    const lost = deals.filter((d) => d.stage === 'lost');
    const openValue = open.reduce((s, d) => s + d.value, 0);
    const wonValue = won.reduce((s, d) => s + d.value, 0);
    const winRate = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
    const weighted = open.reduce((s, d) => s + d.value * (stageProb(d.stage) / 100), 0);

    return {
      kind: 'pipeline',
      text: `Hai ${open.length} deal aperti per ${formatCurrency(openValue)} di valore totale.`,
      bullets: [
        `Valore ponderato per probabilità: ${formatCurrency(weighted)}`,
        `Vinti: ${won.length} (${formatCurrency(wonValue)}) · Win rate ${winRate}%`,
        `Deal a rischio: ${withRisk.filter((d) => d._risk > 50).length}`,
      ],
    };
  }

  // ----- At-risk deals -----
  if (q.includes('rischio') || q.includes('fermi') || q.includes('stalled') || q.includes('bloccat')) {
    const risky = withRisk.filter((d) => d._risk > 40).sort((a, b) => b._risk - a._risk);
    if (risky.length === 0) return { kind: 'risk', text: '✅ Nessun deal a rischio elevato al momento. Ottimo lavoro!' };
    return {
      kind: 'risk',
      text: `⚠️ ${risky.length} deal richiedono attenzione:`,
      bullets: risky.map((d) => `${d.title} — rischio ${d._risk}% · ${d.next_action ?? 'da seguire'}`),
    };
  }

  // ----- Churn -----
  if (q.includes('churn') || q.includes('abbandon') || q.includes('perder')) {
    const atRisk = contacts.filter((c) => c.churn_risk && c.churn_risk.score > 0.5)
      .sort((a, b) => (b.churn_risk!.score) - (a.churn_risk!.score));
    if (atRisk.length === 0) return { kind: 'churn', text: '✅ Nessun contatto a rischio churn rilevato.' };
    return {
      kind: 'churn',
      text: `${atRisk.length} contatti a rischio churn:`,
      bullets: atRisk.map((c) => `${c.first_name} ${c.last_name} — ${Math.round(c.churn_risk!.score * 100)}%: ${c.churn_risk!.reasons[0]}`),
    };
  }

  // ----- Next actions -----
  if (q.includes('oggi') || q.includes('fare') || q.includes('prossim') || q.includes('azioni') || q.includes('priorit')) {
    const actions: string[] = [];
    insights.filter((i) => !i.is_executed).slice(0, 3).forEach((i) => actions.push(`🧠 ${i.reasoning}`));
    withRisk.filter((d) => d.next_action && d._risk > 40).slice(0, 3)
      .forEach((d) => actions.push(`🔥 ${d.title}: ${d.next_action}`));
    if (actions.length === 0) {
      deals.filter((d) => d.next_action && d.stage !== 'won' && d.stage !== 'lost').slice(0, 3)
        .forEach((d) => actions.push(`→ ${d.title}: ${d.next_action}`));
    }
    return {
      kind: 'next',
      text: 'Ecco le tue priorità per oggi, ordinate per impatto:',
      bullets: actions.length ? actions : ['Nessuna azione urgente. Concentrati sulla prospezione.'],
    };
  }

  // ----- Trust -----
  if (q.includes('affidabil') || q.includes('fiducia') || q.includes('trust') || q.includes('qualit') || q.includes('dati')) {
    const scored = contacts.map((c) => aggregateTrust(c.field_trust).score);
    const avg = scored.length ? Math.round((scored.reduce((s, v) => s + v, 0) / scored.length) * 100) : 0;
    const stale = contacts.filter((c) => aggregateTrust(c.field_trust).needsReview);
    return {
      kind: 'trust',
      text: `Affidabilità media dei dati contatti: ${avg}%.`,
      bullets: [
        `${stale.length} contatti hanno dati da verificare (trust basso o stantio)`,
        stale.length ? `Da rivedere per primi: ${stale.slice(0, 3).map((c) => `${c.first_name} ${c.last_name}`).join(', ')}` : 'Tutti i dati sono freschi ✅',
      ],
    };
  }

  // ----- Fallback -----
  return {
    kind: 'help',
    text: 'Posso analizzare la tua pipeline in tempo reale. Prova a chiedermi:',
    bullets: SUGGESTED_PROMPTS,
  };
}

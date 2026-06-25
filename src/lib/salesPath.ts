// ============================================================
// GUIDED SELLING / SALES PATH — guida operativa per stage.
//
// A differenza di Salesforce Path (guidance legata a stage fissi),
// qui la guida è derivata dalla BANDA DI PROBABILITÀ dello stage,
// così funziona anche con pipeline e stage personalizzati.
// ============================================================

export type PathBand = 'qualify' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface PathStep { id: string; label: string }
export interface StageGuidance {
  band: PathBand;
  title: string;
  tip: string;
  nextBestAction: string;
  checklist: PathStep[];
}

export function bandForProbability(prob: number): PathBand {
  if (prob >= 100) return 'won';
  if (prob <= 0) return 'lost';
  if (prob < 30) return 'qualify';
  if (prob < 60) return 'proposal';
  return 'negotiation';
}

const GUIDANCE: Record<PathBand, StageGuidance> = {
  qualify: {
    band: 'qualify',
    title: 'Qualifica',
    tip: 'Valida bisogno, budget e autorità d’acquisto prima di investire tempo nella proposta.',
    nextBestAction: 'Fissa una call di discovery per confermare budget e tempistiche.',
    checklist: [
      { id: 'q1', label: 'Identifica il decision maker' },
      { id: 'q2', label: 'Conferma il budget disponibile' },
      { id: 'q3', label: 'Definisci la timeline d’acquisto' },
      { id: 'q4', label: 'Mappa i bisogni chiave del cliente' },
    ],
  },
  proposal: {
    band: 'proposal',
    title: 'Proposta',
    tip: 'Costruisci valore concreto: collega la soluzione ai risultati attesi e quantifica il ROI.',
    nextBestAction: 'Invia il preventivo e prenota una call di revisione della proposta.',
    checklist: [
      { id: 'p1', label: 'Invia proposta / preventivo' },
      { id: 'p2', label: 'Quantifica il ROI per il cliente' },
      { id: 'p3', label: 'Anticipa e gestisci le obiezioni' },
      { id: 'p4', label: 'Coinvolgi lo sponsor interno' },
    ],
  },
  negotiation: {
    band: 'negotiation',
    title: 'Negoziazione',
    tip: 'Rimuovi gli ultimi ostacoli e porta il cliente a una data di firma concordata.',
    nextBestAction: 'Proponi una data di firma e invia il contratto da firmare.',
    checklist: [
      { id: 'n1', label: 'Allinea i termini economici' },
      { id: 'n2', label: 'Condividi la bozza di contratto' },
      { id: 'n3', label: 'Concorda la data di firma' },
      { id: 'n4', label: 'Identifica e sblocca i freni residui' },
    ],
  },
  won: {
    band: 'won',
    title: 'Vinto',
    tip: 'Deal chiuso! Garantisci un handoff impeccabile per avviare la relazione col piede giusto.',
    nextBestAction: 'Pianifica il kickoff di onboarding con il cliente.',
    checklist: [
      { id: 'w1', label: 'Handoff a delivery / onboarding' },
      { id: 'w2', label: 'Programma il kickoff' },
      { id: 'w3', label: 'Richiedi referral o recensione' },
    ],
  },
  lost: {
    band: 'lost',
    title: 'Perso',
    tip: 'Trasforma la perdita in apprendimento: registra il motivo e pianifica il re-engagement.',
    nextBestAction: 'Imposta un promemoria di re-engagement tra 3 mesi.',
    checklist: [
      { id: 'l1', label: 'Registra il motivo di perdita' },
      { id: 'l2', label: 'Salva la lezione appresa' },
      { id: 'l3', label: 'Valuta nurturing futuro' },
    ],
  },
};

export function guidanceForProbability(prob: number): StageGuidance {
  return GUIDANCE[bandForProbability(prob)];
}

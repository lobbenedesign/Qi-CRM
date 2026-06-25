// ============================================================
// Qi-Score — Lead Scoring Store
// Regole personalizzabili + score calcolato per contatto
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ScoreRuleType =
  | 'email_open'
  | 'email_click'
  | 'form_submission'
  | 'page_view'
  | 'deal_created'
  | 'deal_won'
  | 'ticket_opened'
  | 'lifecycle_stage'
  | 'lead_status'
  | 'job_title_match'
  | 'company_size'
  | 'industry_match'
  | 'no_activity_decay';

export type ScoreRuleCategory = 'engagement' | 'fit' | 'decay';

export interface ScoreRule {
  id: string;
  name: string;
  type: ScoreRuleType;
  category: ScoreRuleCategory;
  points: number;           // positivi o negativi
  condition?: string;       // valore opzionale (es. "cto|ceo|vp" per job_title_match)
  enabled: boolean;
}

export interface LeadScoreSnapshot {
  contactId: string;
  score: number;             // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: { ruleId: string; ruleName: string; points: number }[];
  computedAt: string;
}

interface LeadScoringState {
  rules: ScoreRule[];
  snapshots: Record<string, LeadScoreSnapshot>; // contactId → snapshot
  isConfigOpen: boolean;

  setConfigOpen: (v: boolean) => void;
  addRule: (rule: ScoreRule) => void;
  updateRule: (id: string, patch: Partial<ScoreRule>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  computeScore: (contactId: string, contactData: ContactScoreInput) => LeadScoreSnapshot;
  getSnapshot: (contactId: string) => LeadScoreSnapshot | null;
}

export interface ContactScoreInput {
  email_opens: number;
  email_clicks: number;
  form_submissions: number;
  page_views: number;
  lifecycle_stage: string;
  lead_status: string;
  job_title: string | null;
  last_activity: string | null;
  has_deal: boolean;
}

const DEFAULT_RULES: ScoreRule[] = [
  { id: 'r1', name: 'Email aperta', type: 'email_open', category: 'engagement', points: 5, enabled: true },
  { id: 'r2', name: 'Click su link email', type: 'email_click', category: 'engagement', points: 10, enabled: true },
  { id: 'r3', name: 'Form compilato', type: 'form_submission', category: 'engagement', points: 15, enabled: true },
  { id: 'r4', name: 'Visita pagina web', type: 'page_view', category: 'engagement', points: 3, enabled: true },
  { id: 'r5', name: 'Deal aperto', type: 'deal_created', category: 'engagement', points: 20, enabled: true },
  { id: 'r6', name: 'Decisore (C-level/VP/Dir)', type: 'job_title_match', category: 'fit', points: 25, condition: 'cto|ceo|cmo|cfo|vp|director|direttore|responsabile', enabled: true },
  { id: 'r7', name: 'Stage MQL o superiore', type: 'lifecycle_stage', category: 'fit', points: 20, condition: 'mql|sql|opportunity|customer', enabled: true },
  { id: 'r8', name: 'Qualificato dal sales', type: 'lead_status', category: 'fit', points: 15, condition: 'qualified', enabled: true },
  { id: 'r9', name: 'Inattivo >30 giorni', type: 'no_activity_decay', category: 'decay', points: -20, enabled: true },
  { id: 'r10', name: 'Non contattato >60 giorni', type: 'no_activity_decay', category: 'decay', points: -35, enabled: true },
];

function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

export const useLeadScoringStore = create<LeadScoringState>()(
  persist(
    (set, get) => ({
      rules: DEFAULT_RULES,
      snapshots: {},
      isConfigOpen: false,

      setConfigOpen: (v) => set({ isConfigOpen: v }),

      addRule: (rule) =>
        set((s) => ({ rules: [...s.rules, rule] })),

      updateRule: (id, patch) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      deleteRule: (id) =>
        set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

      toggleRule: (id) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
        })),

      computeScore: (contactId, data) => {
        const { rules } = get();
        const breakdown: LeadScoreSnapshot['breakdown'] = [];
        let rawScore = 0;

        for (const rule of rules) {
          if (!rule.enabled) continue;
          let pts = 0;

          switch (rule.type) {
            case 'email_open':
              pts = Math.min(data.email_opens, 10) * rule.points;
              break;
            case 'email_click':
              pts = Math.min(data.email_clicks, 5) * rule.points;
              break;
            case 'form_submission':
              pts = Math.min(data.form_submissions, 3) * rule.points;
              break;
            case 'page_view':
              pts = Math.min(data.page_views, 20) * rule.points;
              break;
            case 'deal_created':
              pts = data.has_deal ? rule.points : 0;
              break;
            case 'job_title_match': {
              const jt = (data.job_title ?? '').toLowerCase();
              const pattern = (rule.condition ?? '').toLowerCase();
              const terms = pattern.split('|');
              pts = terms.some((t) => jt.includes(t)) ? rule.points : 0;
              break;
            }
            case 'lifecycle_stage': {
              const stages = (rule.condition ?? '').toLowerCase().split('|');
              pts = stages.includes(data.lifecycle_stage.toLowerCase()) ? rule.points : 0;
              break;
            }
            case 'lead_status': {
              const statuses = (rule.condition ?? '').toLowerCase().split('|');
              pts = statuses.includes(data.lead_status.toLowerCase()) ? rule.points : 0;
              break;
            }
            case 'no_activity_decay': {
              if (!data.last_activity) { pts = rule.points; break; }
              const daysSince = (Date.now() - new Date(data.last_activity).getTime()) / 86400000;
              // r9 = >30gg, r10 = >60gg
              if (rule.id === 'r9' && daysSince > 30) pts = rule.points;
              if (rule.id === 'r10' && daysSince > 60) pts = rule.points;
              break;
            }
          }

          if (pts !== 0) {
            breakdown.push({ ruleId: rule.id, ruleName: rule.name, points: pts });
            rawScore += pts;
          }
        }

        // Clamp 0-100
        const score = Math.max(0, Math.min(100, rawScore));
        const snapshot: LeadScoreSnapshot = {
          contactId,
          score,
          grade: gradeFromScore(score),
          breakdown,
          computedAt: new Date().toISOString(),
        };

        set((s) => ({ snapshots: { ...s.snapshots, [contactId]: snapshot } }));
        return snapshot;
      },

      getSnapshot: (contactId) => get().snapshots[contactId] ?? null,
    }),
    { name: 'qi-crm-lead-scoring-v1' }
  )
);

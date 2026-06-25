import type { TrackedField, TrackedFieldMeta, TrustResult, TrustSource } from '../types/crm';

// Half-life defaults per field type (days)
const HALF_LIFE: Record<string, number> = {
  email:     365,   // email addresses change slowly
  phone:     180,   // phones change more often
  job_title: 180,
  company:   365,
  address:   730,
  default:   180,
};

const REVIEW_THRESHOLD = 0.40;

// Source base confidence
const SOURCE_CONFIDENCE: Record<TrustSource, number> = {
  user:          1.00,
  enrichment:    0.85,
  import:        0.70,
  ai_extracted:  0.65,
};

export function computeTrust(
  meta: TrackedFieldMeta,
  fieldName = 'default',
): TrustResult {
  const halfLife = HALF_LIFE[fieldName] ?? HALF_LIFE.default;
  const ageMs    = Date.now() - new Date(meta.updatedAt).getTime();
  const ageDays  = ageMs / 86_400_000;
  const decay    = Math.pow(0.5, ageDays / halfLife);
  const score    = Math.max(0, Math.min(1, meta.confidence * decay));

  return {
    score,
    ageDays: Math.round(ageDays),
    needsReview: score < REVIEW_THRESHOLD,
    label: score >= 0.75 ? 'high' : score >= 0.45 ? 'medium' : 'low',
  };
}

// Build a fresh TrackedFieldMeta from source
export function buildMeta(source: TrustSource, confidence?: number): TrackedFieldMeta {
  return {
    source,
    confidence: confidence ?? SOURCE_CONFIDENCE[source],
    updatedAt: new Date().toISOString(),
  };
}

// Build a full TrackedField (used for local state)
export function userField<T>(value: T): TrackedField<T> {
  return { value, source: 'user', updatedAt: new Date().toISOString(), confidence: 1 };
}

export function aiField<T>(value: T, confidence = 0.65): TrackedField<T> {
  return { value, source: 'ai_extracted', updatedAt: new Date().toISOString(), confidence };
}

// Aggregate trust across all fields of a record
export function aggregateTrust(fieldTrust: Record<string, TrackedFieldMeta>): TrustResult {
  const keys = Object.keys(fieldTrust);
  if (keys.length === 0) return { score: 0, ageDays: 0, needsReview: true, label: 'low' };

  const scores = keys.map((k) => computeTrust(fieldTrust[k], k).score);
  const avg    = scores.reduce((s, v) => s + v, 0) / scores.length;
  const maxAge = Math.max(
    ...keys.map((k) => computeTrust(fieldTrust[k], k).ageDays),
  );

  return {
    score: avg,
    ageDays: maxAge,
    needsReview: avg < REVIEW_THRESHOLD,
    label: avg >= 0.75 ? 'high' : avg >= 0.45 ? 'medium' : 'low',
  };
}

// Risk score contribution from deal staleness + insights
export function computeDealRisk(params: {
  velocityDays: number | null;
  hasRiskInsight: boolean;
  sentimentScore: number | null;
  stageProbability: number;
}): number {
  let risk = 0;

  if (params.velocityDays !== null && params.velocityDays > 7)  risk += 25;
  if (params.velocityDays !== null && params.velocityDays > 14) risk += 20;
  if (params.hasRiskInsight)                                     risk += 30;
  if (params.sentimentScore !== null && params.sentimentScore < -0.3) risk += 20;
  if (params.stageProbability < 30)                              risk += 10;

  return Math.min(100, risk);
}

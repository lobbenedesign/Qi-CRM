// ============================================================
// SOVRANO CRM — Core TypeScript Types
// Trust Score + Provenance is the core differentiator
// ============================================================

// ----- Trust & Provenance -----

export type TrustSource = 'user' | 'ai_extracted' | 'enrichment' | 'import';

export interface TrackedField<T> {
  value: T;
  source: TrustSource;
  updatedAt: string;      // ISO timestamp
  confidence: number;     // 0..1 initial confidence
}

export interface TrustResult {
  score: number;          // 0..1 current trust (decayed)
  ageDays: number;
  needsReview: boolean;
  label: 'high' | 'medium' | 'low';
}

// ----- Enums -----

export type DealStage = string;

export type LeadStatus =
  | 'new' | 'contacted' | 'qualified' | 'unqualified' | 'customer' | 'lost';

export type LifecycleStage =
  | 'subscriber' | 'lead' | 'mql' | 'sql' | 'opportunity' | 'customer' | 'evangelist';

export type ActivityType =
  | 'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'ai_capture';

export type InsightType =
  | 'micro_move' | 'risk_alert' | 'best_time' | 'churn_warning' | 'next_action';

export type MemoryType =
  | 'episodic' | 'semantic' | 'procedural' | 'long_term';

export type BusinessType =
  | 'b2b' | 'b2c' | 'saas' | 'ecommerce' | 'services' | 'other';

export type UserRole = 'admin' | 'marketing' | 'sales' | 'service' | 'viewer';

// ----- Profile -----

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  business_type: BusinessType;
  timezone: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ----- Company -----

export interface Company {
  id: string;
  owner_id: string | null;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  phone: string | null;
  address: Record<string, string> | null;
  parent_id: string | null;        // Org-Chart
  custom_fields: Record<string, unknown>;
  field_trust: Record<string, TrackedFieldMeta>;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

// ----- Privacy / Consenso (GDPR) -----

export type ConsentChannel = 'email' | 'sms' | 'whatsapp' | 'phone';
export type ConsentPurpose = 'marketing' | 'profiling' | 'third_party';
export type LegalBasis = 'consent' | 'contract' | 'legitimate_interest' | 'legal_obligation';
export type ConsentSourceKind = 'form' | 'landing' | 'booking' | 'web' | 'manual' | 'import' | 'preference_center';

// Evento immutabile per l'accountability (art. 7 GDPR): storico di ogni variazione.
export interface ConsentEvent {
  at: string;                      // ISO timestamp
  action: 'granted' | 'withdrawn' | 'updated';
  marketing: boolean;
  profiling: boolean;
  third_party: boolean;
  channels: ConsentChannel[];
  source: ConsentSourceKind;
  source_ref?: string | null;      // es. id del form/landing
  policy_version: string;
}

export interface ContactConsent {
  marketing: boolean;              // comunicazioni commerciali
  profiling: boolean;              // profilazione (lead/trust scoring, segmentazione)
  third_party: boolean;           // cessione a terzi
  channels: ConsentChannel[];      // canali autorizzati per il marketing
  legal_basis: LegalBasis;
  policy_version: string | null;   // versione informativa accettata
  given_at: string | null;
  withdrawn_at: string | null;
  source: ConsentSourceKind | null;
  log: ConsentEvent[];             // registro consensi (storico)
}

// ----- Contact -----

export interface Contact {
  id: string;
  owner_id: string | null;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  reports_to_id: string | null;    // Org-Chart self-relation
  lead_status: LeadStatus;
  lifecycle_stage: LifecycleStage;
  lead_score: number;
  field_trust: Record<string, TrackedFieldMeta>;
  email_opens: number;
  email_clicks: number;
  page_views: number;
  form_submissions: number;
  last_activity: string | null;
  last_contacted: string | null;
  sentiment_score: number | null;
  churn_risk: ChurnRisk | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  ai_summary: string | null;
  consent?: ContactConsent;        // privacy/consenso (GDPR) — opzionale per retrocompatibilità
  created_at: string;
  updated_at: string;
  // Joined
  company?: Company;
}

// Minimal trust metadata stored in field_trust JSONB
export interface TrackedFieldMeta {
  source: TrustSource;
  confidence: number;
  updatedAt: string;
}

export interface ChurnRisk {
  score: number;           // 0..1
  reasons: string[];
  computed_at: string;
}

// ----- Pipeline Stage -----

export interface PipelineDefinition {
  id: string;
  name: string;
  is_default: boolean;
}

export interface PipelineStage {
  id: string;
  pipeline_id?: string; // Collegamento alla pipeline specifica
  name: string;
  stage_key: DealStage;
  display_order: number;
  default_color: string;
  risk_color: string;
  is_expandable: boolean;
  probability: number;
}

// ----- Deal (Quantum Pipeline) -----

export interface Deal {
  id: string;
  pipeline_id?: string; // Collegamento alla pipeline specifica
  owner_id: string;
  assignee_id: string | null;      // membro del team a cui è assegnato
  contact_id: string | null;
  company_id: string | null;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  risk_score: number;     // 0..100 (Quantum Pipeline)
  velocity_days: number | null;
  is_stalled: boolean;
  expected_close: string | null;
  closed_at: string | null;
  products: DealProduct[];
  field_trust: Record<string, TrackedFieldMeta>;
  next_action: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  contact?: Contact;
  company?: Company;
  ai_insights?: AiInsight[];
}

// Quantum Deal: enriched with visual properties for Pipeline
export interface QuantumDeal extends Deal {
  visual_color: string;   // default_color or risk_color based on risk_score
  should_expand: boolean;
  stage_meta: PipelineStage;
}

export interface DealProduct {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

// ----- Qi-Track (Email Tracking Analytics) -----

export interface QiTrackEvent {
  type: 'open' | 'click';
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

export interface QiTrackData {
  opened: boolean;
  openedAt: string | null;
  clickCount: number;
  lastClickedAt: string | null;
  history: QiTrackEvent[];
}

// ----- Activity -----

export interface Activity {
  id: string;
  user_id: string;
  contact_id: string | null;
  deal_id: string | null;
  type: ActivityType;
  subject: string | null;
  body: string | null;
  source: TrustSource;    // Zero-Entry: was this user or AI?
  confidence: number;
  duration_min: number | null;
  completed: boolean;
  due_at: string | null;
  extracted_fields: Record<string, unknown> | null;
  qi_track?: QiTrackData; // Dati reali di email tracking
  created_at: string;
  updated_at: string;
}

// ----- Sentiment -----

export interface SentimentLog {
  id: string;
  contact_id: string;
  score: number;          // -1..1
  source: 'email' | 'chat' | 'call' | 'note';
  keywords: string[];
  created_at: string;
}

// ----- AI Insights (Micro-Moves) -----

export interface AiInsight {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  insight_type: InsightType;
  reasoning: string;
  action_payload: ActionPayload | null;
  confidence: number;
  is_executed: boolean;
  created_at: string;
}

export interface ActionPayload {
  type: 'send_email' | 'schedule_call' | 'send_reel' | 'update_field' | 'create_task';
  template?: string;
  subject?: string;
  body?: string;
  field?: string;
  value?: unknown;
  scheduled_at?: string;
}

// ----- AI Memory (4 types) -----

export interface AiMemory {
  id: string;
  user_id: string;
  memory_type: MemoryType;
  title: string;
  content: string;
  contact_id: string | null;
  deal_id: string | null;
  company_id: string | null;
  importance: number;
  last_recalled: string | null;
  created_at: string;
  updated_at: string;
}

// ----- KPI / Dashboard -----

export interface KpiCard {
  id: string;
  label: string;
  value: number | string;
  previous?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  sparkline?: number[];
}

// ----- Command Palette -----

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category: 'navigate' | 'create' | 'search' | 'action';
  action: () => void;
  keywords?: string[];
}

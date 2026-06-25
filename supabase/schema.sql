-- ============================================================
-- SOVRANO CRM — Supabase Schema
-- PostgreSQL + pgvector + RLS
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE trust_source AS ENUM ('user', 'ai_extracted', 'enrichment', 'import');
CREATE TYPE deal_stage   AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');
CREATE TYPE activity_type AS ENUM ('note', 'call', 'email', 'meeting', 'stage_change', 'ai_capture');
CREATE TYPE insight_type  AS ENUM ('micro_move', 'risk_alert', 'best_time', 'churn_warning', 'next_action');
CREATE TYPE memory_type   AS ENUM ('episodic', 'semantic', 'procedural', 'long_term');
CREATE TYPE business_type AS ENUM ('b2b', 'b2c', 'saas', 'ecommerce', 'services', 'other');
CREATE TYPE lead_status   AS ENUM ('new', 'contacted', 'qualified', 'unqualified', 'customer', 'lost');
CREATE TYPE lifecycle_stage AS ENUM ('subscriber','lead','mql','sql','opportunity','customer','evangelist');

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'sales'
                CHECK (role IN ('admin','marketing','sales','service','viewer')),
  business_type business_type NOT NULL DEFAULT 'b2b',
  timezone      TEXT NOT NULL DEFAULT 'Europe/Rome',
  preferences   JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMPANIES
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID REFERENCES profiles(id),
  name        TEXT NOT NULL,
  domain      TEXT,
  industry    TEXT,
  size        TEXT,
  website     TEXT,
  phone       TEXT,
  address     JSONB,
  -- Corporate hierarchy (Org-Chart Auto-Coesivo)
  parent_id   UUID REFERENCES companies(id),
  -- Trust Score: custom fields carry provenance
  custom_fields JSONB NOT NULL DEFAULT '{}',
  field_trust   JSONB NOT NULL DEFAULT '{}',
  -- AI
  embedding   vector(1536),
  ai_summary  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONTACTS
-- ============================================================

CREATE TABLE IF NOT EXISTS contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID REFERENCES profiles(id),
  company_id      UUID REFERENCES companies(id),
  first_name      TEXT,
  last_name       TEXT,
  email           TEXT UNIQUE,
  phone           TEXT,
  job_title       TEXT,
  department      TEXT,
  -- Org-Chart: who does this person report to?
  reports_to_id   UUID REFERENCES contacts(id),
  -- Lead management
  lead_status     lead_status NOT NULL DEFAULT 'new',
  lifecycle_stage lifecycle_stage NOT NULL DEFAULT 'lead',
  lead_score      INTEGER NOT NULL DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
  -- Trust Score per field (core Sovrano differentiator)
  field_trust     JSONB NOT NULL DEFAULT '{}',
  -- Example structure:
  -- { "email": {"source":"user","confidence":1.0,"updatedAt":"2026-06-22T..."},
  --   "phone": {"source":"import","confidence":0.8,"updatedAt":"2025-01-10T..."} }
  -- Behavioral signals
  email_opens     INTEGER NOT NULL DEFAULT 0,
  email_clicks    INTEGER NOT NULL DEFAULT 0,
  page_views      INTEGER NOT NULL DEFAULT 0,
  form_submissions INTEGER NOT NULL DEFAULT 0,
  last_activity   TIMESTAMPTZ,
  last_contacted  TIMESTAMPTZ,
  -- Sentiment (from GLM schema)
  sentiment_score DECIMAL(3,2),
  churn_risk      JSONB,
  -- AI
  tags            TEXT[],
  custom_fields   JSONB NOT NULL DEFAULT '{}',
  embedding       vector(1536),
  ai_summary      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PIPELINE STAGES (Quantum Pipeline)
-- ============================================================

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  stage_key       deal_stage NOT NULL,
  display_order   INTEGER NOT NULL,
  -- Quantum Pipeline visual params (from GLM)
  default_color   TEXT NOT NULL DEFAULT '#64748b',
  risk_color      TEXT NOT NULL DEFAULT '#ef4444',
  is_expandable   BOOLEAN NOT NULL DEFAULT false,
  probability     INTEGER NOT NULL DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default stages
INSERT INTO pipeline_stages (name, stage_key, display_order, default_color, risk_color, is_expandable, probability) VALUES
  ('Lead',          'lead',         1, '#94a3b8', '#ef4444', false, 10),
  ('Qualificato',   'qualified',    2, '#3b82f6', '#ef4444', false, 30),
  ('Proposta',      'proposal',     3, '#8b5cf6', '#f97316', true,  50),
  ('Negoziazione',  'negotiation',  4, '#f59e0b', '#ef4444', true,  70),
  ('Vinto',         'won',          5, '#22c55e', '#22c55e', false, 100),
  ('Perso',         'lost',         6, '#ef4444', '#ef4444', false, 0);

-- ============================================================
-- DEALS (Quantum Pipeline)
-- ============================================================

CREATE TABLE IF NOT EXISTS deals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id         UUID REFERENCES profiles(id) NOT NULL,
  contact_id       UUID REFERENCES contacts(id),
  company_id       UUID REFERENCES companies(id),
  title            TEXT NOT NULL,
  value            DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  currency         TEXT NOT NULL DEFAULT 'EUR',
  stage            deal_stage NOT NULL DEFAULT 'lead',
  -- Quantum Pipeline: computed risk
  risk_score       INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  velocity_days    INTEGER,
  is_stalled       BOOLEAN NOT NULL DEFAULT false,
  -- Dates
  expected_close   TIMESTAMPTZ,
  closed_at        TIMESTAMPTZ,
  -- Products / line items
  products         JSONB NOT NULL DEFAULT '[]',
  -- Trust Score
  field_trust      JSONB NOT NULL DEFAULT '{}',
  -- AI
  next_action      TEXT,
  ai_insights_json JSONB NOT NULL DEFAULT '[]',
  tags             TEXT[],
  custom_fields    JSONB NOT NULL DEFAULT '{}',
  embedding        vector(1536),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACTIVITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS activities (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES profiles(id) NOT NULL,
  contact_id   UUID REFERENCES contacts(id),
  deal_id      UUID REFERENCES deals(id),
  type         activity_type NOT NULL,
  subject      TEXT,
  body         TEXT,
  -- Provenance (Zero-Entry Capture)
  source       trust_source NOT NULL DEFAULT 'user',
  confidence   DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  -- Call/meeting metadata
  duration_min INTEGER,
  completed    BOOLEAN NOT NULL DEFAULT false,
  due_at       TIMESTAMPTZ,
  -- AI extracted fields from this activity
  extracted_fields JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SENTIMENT LOGS (from GLM schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS sentiment_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id   UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  score        DECIMAL(4,3) NOT NULL CHECK (score BETWEEN -1 AND 1),
  source       TEXT NOT NULL CHECK (source IN ('email','chat','call','note')),
  keywords     TEXT[],
  raw_text     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI INSIGHTS (Micro-Moves, from GLM schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_insights (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id        UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id     UUID REFERENCES contacts(id) ON DELETE CASCADE,
  insight_type   insight_type NOT NULL,
  reasoning      TEXT NOT NULL,
  -- Pre-prepared action payload (instant execution)
  action_payload JSONB,
  -- Confidence
  confidence     DECIMAL(3,2) NOT NULL DEFAULT 0.7,
  is_executed    BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI MEMORY SYSTEM (4 types, from ChatGPT)
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_memories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES profiles(id) NOT NULL,
  memory_type  memory_type NOT NULL,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  -- Related entities
  contact_id   UUID REFERENCES contacts(id),
  deal_id      UUID REFERENCES deals(id),
  company_id   UUID REFERENCES companies(id),
  -- Vector for semantic recall
  embedding    vector(1536),
  importance   DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  last_recalled TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTOMATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS automations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id     UUID REFERENCES profiles(id) NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  trigger_def  JSONB NOT NULL,
  workflow     JSONB NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT false,
  run_count    INTEGER NOT NULL DEFAULT 0,
  last_run_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_contacts_email      ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_owner      ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company    ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON contacts(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_reports_to ON contacts(reports_to_id);

CREATE INDEX IF NOT EXISTS idx_deals_owner         ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage         ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_risk_score    ON deals(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_deals_close         ON deals(expected_close);

CREATE INDEX IF NOT EXISTS idx_activities_contact  ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal     ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_created  ON activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sentiment_contact   ON sentiment_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_created   ON sentiment_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insights_deal    ON ai_insights(deal_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_contact ON ai_insights(contact_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_exec    ON ai_insights(is_executed);

-- Vector similarity indexes (pgvector)
CREATE INDEX IF NOT EXISTS idx_contacts_embedding  ON contacts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_deals_embedding     ON deals    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_memories_embedding  ON ai_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations    ENABLE ROW LEVEL SECURITY;

-- Profiles: own record only (admin sees all)
CREATE POLICY "profile_own"   ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "profile_admin" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Contacts, Deals, Companies: owner or admin
CREATE POLICY "contacts_owner" ON contacts FOR ALL USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "companies_owner" ON companies FOR ALL USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "deals_owner" ON deals FOR ALL USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Activities: related to owned contacts/deals
CREATE POLICY "activities_own" ON activities FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- AI tables: own user
CREATE POLICY "ai_insights_own"  ON ai_insights  FOR ALL USING (
  EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND deals.owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM contacts WHERE contacts.id = contact_id AND contacts.owner_id = auth.uid())
);
CREATE POLICY "ai_memories_own"  ON ai_memories  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "automations_own"  ON automations  FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "sentiment_own"    ON sentiment_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM contacts WHERE contacts.id = contact_id AND contacts.owner_id = auth.uid())
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Semantic search on contacts via pgvector
CREATE OR REPLACE FUNCTION search_contacts_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count     int   DEFAULT 10
)
RETURNS TABLE (id uuid, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT contacts.id, 1 - (contacts.embedding <=> query_embedding) AS similarity
  FROM contacts
  WHERE contacts.embedding IS NOT NULL
    AND 1 - (contacts.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Semantic search on ai_memories (RAG)
CREATE OR REPLACE FUNCTION search_memories_semantic(
  query_embedding vector(1536),
  p_user_id       uuid,
  match_count     int DEFAULT 5
)
RETURNS TABLE (id uuid, content text, memory_type memory_type, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT m.id, m.content, m.memory_type,
         1 - (m.embedding <=> query_embedding) AS similarity
  FROM ai_memories m
  WHERE m.user_id = p_user_id
    AND m.embedding IS NOT NULL
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_contacts_updated   BEFORE UPDATE ON contacts   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_companies_updated  BEFORE UPDATE ON companies  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_deals_updated      BEFORE UPDATE ON deals      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_activities_updated BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_memories_updated   BEFORE UPDATE ON ai_memories FOR EACH ROW EXECUTE FUNCTION update_updated_at();

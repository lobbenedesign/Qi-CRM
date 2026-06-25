// ============================================================
// SOVRANO — Seed data realistico per il backend mock.
// Date calcolate relative a "now" così i Trust Score decadono
// in modo realistico (alcuni campi freschi, altri stantii).
// ============================================================
import type {
  Profile, Company, Contact, PipelineStage, Deal, Activity, AiInsight,
  TrackedFieldMeta, TrustSource, PipelineDefinition, ContactConsent, ConsentChannel,
} from '../../types/crm';
import type { Ticket } from '../../types/team';

const now = Date.now();
const DAY = 86_400_000;
const ago = (days: number) => new Date(now - days * DAY).toISOString();
const ahead = (days: number) => new Date(now + days * DAY).toISOString();

function meta(source: TrustSource, ageDays: number, confidence = 1): TrackedFieldMeta {
  return { source, confidence, updatedAt: ago(ageDays) };
}

export const CURRENT_USER_ID = 'user-giuseppe';

export const seedProfile: Profile = {
  id: CURRENT_USER_ID,
  full_name: 'Giuseppe Lobbene',
  avatar_url: null,
  role: 'admin',
  business_type: 'b2b',
  timezone: 'Europe/Rome',
  preferences: {},
  created_at: ago(120),
  updated_at: ago(2),
};

// ----- Pipelines -----
export const seedPipelines: PipelineDefinition[] = [
  { id: 'pipe-default', name: 'Pipeline Vendite', is_default: true },
  { id: 'pipe-onboarding', name: 'Onboarding Clienti', is_default: false },
  { id: 'pipe-renewals', name: 'Rinnovi & Upgrade', is_default: false },
];

// ----- Pipeline stages -----
export const seedStages: PipelineStage[] = [
  // Sales Pipeline (pipe-default)
  { id: 'stg-lead',        pipeline_id: 'pipe-default', name: 'Lead',         stage_key: 'lead',        display_order: 1, default_color: '#64748b', risk_color: '#f59e0b', is_expandable: false, probability: 10 },
  { id: 'stg-qualified',   pipeline_id: 'pipe-default', name: 'Qualificato',  stage_key: 'qualified',   display_order: 2, default_color: '#3b82f6', risk_color: '#f59e0b', is_expandable: false, probability: 30 },
  { id: 'stg-proposal',    pipeline_id: 'pipe-default', name: 'Proposta',     stage_key: 'proposal',    display_order: 3, default_color: '#6366f1', risk_color: '#ef4444', is_expandable: true,  probability: 55 },
  { id: 'stg-negotiation', pipeline_id: 'pipe-default', name: 'Negoziazione', stage_key: 'negotiation', display_order: 4, default_color: '#8b5cf6', risk_color: '#ef4444', is_expandable: true,  probability: 75 },
  { id: 'stg-won',         pipeline_id: 'pipe-default', name: 'Vinto',        stage_key: 'won',         display_order: 5, default_color: '#22c55e', risk_color: '#22c55e', is_expandable: false, probability: 100 },
  { id: 'stg-lost',        pipeline_id: 'pipe-default', name: 'Perso',        stage_key: 'lost',        display_order: 6, default_color: '#94a3b8', risk_color: '#94a3b8', is_expandable: false, probability: 0 },
  
  // Onboarding (pipe-onboarding)
  { id: 'stg-onb-kickoff',   pipeline_id: 'pipe-onboarding', name: 'Kickoff',         stage_key: 'onb_kickoff',   display_order: 1, default_color: '#64748b', risk_color: '#f59e0b', is_expandable: false, probability: 10 },
  { id: 'stg-onb-setup',     pipeline_id: 'pipe-onboarding', name: 'Configurazione',  stage_key: 'onb_setup',     display_order: 2, default_color: '#3b82f6', risk_color: '#f59e0b', is_expandable: false, probability: 40 },
  { id: 'stg-onb-training',  pipeline_id: 'pipe-onboarding', name: 'Formazione',      stage_key: 'onb_training',  display_order: 3, default_color: '#6366f1', risk_color: '#ef4444', is_expandable: true,  probability: 70 },
  { id: 'stg-onb-completed', pipeline_id: 'pipe-onboarding', name: 'Completato',      stage_key: 'onb_completed', display_order: 4, default_color: '#22c55e', risk_color: '#22c55e', is_expandable: false, probability: 100 },

  // Renewals (pipe-renewals)
  { id: 'stg-ren-discovery',   pipeline_id: 'pipe-renewals', name: 'Analisi Rinnovo',       stage_key: 'ren_discovery',   display_order: 1, default_color: '#64748b', risk_color: '#f59e0b', is_expandable: false, probability: 20 },
  { id: 'stg-ren-negotiation', pipeline_id: 'pipe-renewals', name: 'Negoziazione Rinnovo',  stage_key: 'ren_negotiation', display_order: 2, default_color: '#8b5cf6', risk_color: '#ef4444', is_expandable: true,  probability: 60 },
  { id: 'stg-ren-signed',      pipeline_id: 'pipe-renewals', name: 'Rinnovato',             stage_key: 'ren_signed',      display_order: 3, default_color: '#22c55e', risk_color: '#22c55e', is_expandable: false, probability: 100 },
  { id: 'stg-ren-churned',     pipeline_id: 'pipe-renewals', name: 'Perso / Churned',       stage_key: 'ren_churned',     display_order: 4, default_color: '#ef4444', risk_color: '#ef4444', is_expandable: false, probability: 0 },
];

// ----- Companies -----
export const seedCompanies: Company[] = [
  {
    id: 'cmp-acme', owner_id: CURRENT_USER_ID, name: 'Acme Industries',
    domain: 'acme.com', industry: 'Manifatturiero', size: '201-500', website: 'https://acme.com',
    phone: '+39 02 1234567', address: { city: 'Milano', country: 'IT' }, parent_id: null,
    custom_fields: {}, field_trust: { name: meta('user', 5), domain: meta('enrichment', 40, 0.85) },
    ai_summary: 'Cliente enterprise, alto potenziale di upsell sul reparto logistica.',
    created_at: ago(90), updated_at: ago(5),
  },
  {
    id: 'cmp-nexus', owner_id: CURRENT_USER_ID, name: 'Nexus SRL',
    domain: 'nexus.it', industry: 'SaaS', size: '51-200', website: 'https://nexus.it',
    phone: '+39 06 9876543', address: { city: 'Roma', country: 'IT' }, parent_id: null,
    custom_fields: {}, field_trust: { name: meta('user', 2), domain: meta('user', 2) },
    ai_summary: 'Scale-up in forte crescita, decision-maker reattivo.',
    created_at: ago(60), updated_at: ago(3),
  },
  {
    id: 'cmp-techstart', owner_id: CURRENT_USER_ID, name: 'TechStart',
    domain: 'techstart.io', industry: 'Software', size: '11-50', website: 'https://techstart.io',
    phone: null, address: { city: 'Torino', country: 'IT' }, parent_id: null,
    custom_fields: {}, field_trust: { name: meta('import', 200), domain: meta('import', 200, 0.7) },
    ai_summary: '⚠️ Segnali di churn: engagement in calo da 3 settimane.',
    created_at: ago(210), updated_at: ago(25),
  },
  {
    id: 'cmp-globex', owner_id: CURRENT_USER_ID, name: 'Globex Corporation',
    domain: 'globex.com', industry: 'Finanza', size: '500+', website: 'https://globex.com',
    phone: '+39 02 5550000', address: { city: 'Milano', country: 'IT' }, parent_id: null,
    custom_fields: {}, field_trust: { name: meta('user', 15), domain: meta('enrichment', 15, 0.85) },
    ai_summary: 'Grande conto, ciclo di vendita lungo. Multipli stakeholder.',
    created_at: ago(75), updated_at: ago(8),
  },
  {
    id: 'cmp-fabrica', owner_id: CURRENT_USER_ID, name: 'Fabrica Digitale',
    domain: 'fabricadigitale.it', industry: 'Agenzia', size: '11-50', website: 'https://fabricadigitale.it',
    phone: '+39 011 4445566', address: { city: 'Bologna', country: 'IT' }, parent_id: null,
    custom_fields: {}, field_trust: { name: meta('user', 1) },
    ai_summary: 'Nuovo lead inbound, alta intenzione d\'acquisto.',
    created_at: ago(10), updated_at: ago(1),
  },
];

// ----- Contacts -----
const _seedContactsRaw: Contact[] = [
  {
    id: 'ct-rossi', owner_id: CURRENT_USER_ID, company_id: 'cmp-acme',
    first_name: 'Mario', last_name: 'Rossi', email: 'mario.rossi@acme.com', phone: '+39 333 1112233',
    job_title: 'Direttore Acquisti', department: 'Procurement', reports_to_id: null,
    lead_status: 'qualified', lifecycle_stage: 'opportunity', lead_score: 82,
    field_trust: { email: meta('user', 3), phone: meta('ai_extracted', 12, 0.65), job_title: meta('enrichment', 30, 0.85) },
    email_opens: 14, email_clicks: 5, page_views: 22, form_submissions: 2,
    last_activity: ago(2), last_contacted: ago(2), sentiment_score: 0.6, churn_risk: null,
    tags: ['decision-maker', 'enterprise'], custom_fields: {},
    ai_summary: 'Interessato a contratto annuale, sensibile al ROI.', created_at: ago(85), updated_at: ago(2),
  },
  {
    id: 'ct-bianchi', owner_id: CURRENT_USER_ID, company_id: 'cmp-acme',
    first_name: 'Laura', last_name: 'Bianchi', email: 'l.bianchi@acme.com', phone: null,
    job_title: 'CFO', department: 'Finance', reports_to_id: null,
    lead_status: 'contacted', lifecycle_stage: 'sql', lead_score: 65,
    field_trust: { email: meta('user', 20), job_title: meta('user', 20) },
    email_opens: 6, email_clicks: 1, page_views: 8, form_submissions: 0,
    last_activity: ago(9), last_contacted: ago(9), sentiment_score: 0.2, churn_risk: null,
    tags: ['budget-holder'], custom_fields: {},
    ai_summary: 'Approva il budget. Va coinvolta nella fase di proposta.', created_at: ago(80), updated_at: ago(9),
  },
  {
    id: 'ct-verdi', owner_id: CURRENT_USER_ID, company_id: 'cmp-nexus',
    first_name: 'Giulia', last_name: 'Verdi', email: 'giulia@nexus.it', phone: '+39 348 5556677',
    job_title: 'CEO', department: 'Management', reports_to_id: null,
    lead_status: 'qualified', lifecycle_stage: 'opportunity', lead_score: 91,
    field_trust: { email: meta('user', 1), phone: meta('user', 1), job_title: meta('user', 1) },
    email_opens: 20, email_clicks: 9, page_views: 35, form_submissions: 3,
    last_activity: ago(1), last_contacted: ago(1), sentiment_score: 0.8, churn_risk: null,
    tags: ['hot', 'decision-maker'], custom_fields: {},
    ai_summary: 'Lead caldissimo, pronta a chiudere entro il mese.', created_at: ago(55), updated_at: ago(1),
  },
  {
    id: 'ct-neri', owner_id: CURRENT_USER_ID, company_id: 'cmp-techstart',
    first_name: 'Paolo', last_name: 'Neri', email: 'paolo.neri@techstart.io', phone: null,
    job_title: 'CTO', department: 'Engineering', reports_to_id: null,
    lead_status: 'unqualified', lifecycle_stage: 'lead', lead_score: 28,
    field_trust: { email: meta('import', 200, 0.7), job_title: meta('import', 200, 0.7) },
    email_opens: 1, email_clicks: 0, page_views: 2, form_submissions: 0,
    last_activity: ago(24), last_contacted: ago(24), sentiment_score: -0.4,
    churn_risk: { score: 0.72, reasons: ['Nessuna risposta da 3 settimane', 'Engagement email crollato'], computed_at: ago(2) },
    tags: ['at-risk'], custom_fields: {},
    ai_summary: '⚠️ A rischio. Ultimo contatto 24 giorni fa.', created_at: ago(200), updated_at: ago(24),
  },
  {
    id: 'ct-ferrari', owner_id: CURRENT_USER_ID, company_id: 'cmp-globex',
    first_name: 'Anna', last_name: 'Ferrari', email: 'a.ferrari@globex.com', phone: '+39 335 7778899',
    job_title: 'Head of Operations', department: 'Operations', reports_to_id: null,
    lead_status: 'contacted', lifecycle_stage: 'sql', lead_score: 70,
    field_trust: { email: meta('enrichment', 15, 0.85), phone: meta('ai_extracted', 5, 0.65) },
    email_opens: 9, email_clicks: 3, page_views: 14, form_submissions: 1,
    last_activity: ago(6), last_contacted: ago(6), sentiment_score: 0.4, churn_risk: null,
    tags: ['enterprise'], custom_fields: {},
    ai_summary: 'Influencer chiave nel processo decisionale di Globex.', created_at: ago(70), updated_at: ago(6),
  },
  {
    id: 'ct-conti', owner_id: CURRENT_USER_ID, company_id: 'cmp-fabrica',
    first_name: 'Marco', last_name: 'Conti', email: 'marco@fabricadigitale.it', phone: '+39 320 1239876',
    job_title: 'Founder', department: 'Management', reports_to_id: null,
    lead_status: 'new', lifecycle_stage: 'lead', lead_score: 55,
    field_trust: { email: meta('user', 1), phone: meta('ai_extracted', 1, 0.65) },
    email_opens: 3, email_clicks: 2, page_views: 6, form_submissions: 1,
    last_activity: ago(1), last_contacted: null, sentiment_score: 0.5, churn_risk: null,
    tags: ['inbound', 'new'], custom_fields: {},
    ai_summary: 'Lead inbound fresco, da qualificare con una call.', created_at: ago(10), updated_at: ago(1),
  },
];

// Consensi privacy demo (per dimostrare il gate del marketing). ct-neri non ha consenso.
function mkConsent(marketing: boolean, profiling: boolean, channels: ConsentChannel[], withdrawn = false): ContactConsent {
  const at = ago(10);
  return {
    marketing, profiling, third_party: false, channels,
    legal_basis: 'consent', policy_version: '2026-06-v1',
    given_at: at, withdrawn_at: withdrawn ? ago(1) : null, source: 'form',
    log: [{ at, action: 'granted', marketing, profiling, third_party: false, channels, source: 'form', source_ref: null, policy_version: '2026-06-v1' }],
  };
}
const DEMO_CONSENT: Record<string, ContactConsent> = {
  'ct-rossi':   mkConsent(true,  true,  ['email', 'whatsapp']),
  'ct-bianchi': mkConsent(true,  false, ['email']),
  'ct-verdi':   mkConsent(true,  true,  ['email', 'sms']),
  'ct-neri':    mkConsent(false, false, []),                    // nessun consenso marketing
  'ct-ferrari': mkConsent(true,  true,  ['email']),
  'ct-conti':   mkConsent(true,  false, ['email']),
};
export const seedContacts: Contact[] = _seedContactsRaw.map((c) => ({ ...c, consent: DEMO_CONSENT[c.id] }));

// ----- Deals -----
export const seedDeals: Deal[] = [
  {
    id: 'dl-acme-annual', pipeline_id: 'pipe-default', owner_id: CURRENT_USER_ID, assignee_id: 'tm-comm', contact_id: 'ct-rossi', company_id: 'cmp-acme',
    title: 'Acme — Contratto annuale Enterprise', value: 48000, currency: 'EUR', stage: 'negotiation',
    risk_score: 0, velocity_days: 12, is_stalled: false, expected_close: ahead(14), closed_at: null,
    products: [{ id: 'p1', name: 'Licenza Enterprise', quantity: 1, unit_price: 48000 }],
    field_trust: { value: meta('user', 3) }, next_action: 'Inviare contratto rivisto a Mario Rossi',
    tags: ['enterprise'], custom_fields: {}, created_at: ago(40), updated_at: ago(2),
  },
  {
    id: 'dl-nexus-pro', pipeline_id: 'pipe-default', owner_id: CURRENT_USER_ID, assignee_id: 'tm-comm', contact_id: 'ct-verdi', company_id: 'cmp-nexus',
    title: 'Nexus — Piano Pro 50 seats', value: 22000, currency: 'EUR', stage: 'proposal',
    risk_score: 0, velocity_days: 6, is_stalled: false, expected_close: ahead(10), closed_at: null,
    products: [{ id: 'p2', name: 'Pro Seat', quantity: 50, unit_price: 440 }],
    field_trust: { value: meta('user', 1) }, next_action: 'Follow-up sulla proposta inviata ieri',
    tags: ['hot'], custom_fields: {}, created_at: ago(20), updated_at: ago(1),
  },
  {
    id: 'dl-globex-pilot', pipeline_id: 'pipe-default', owner_id: CURRENT_USER_ID, assignee_id: 'tm-comm', contact_id: 'ct-ferrari', company_id: 'cmp-globex',
    title: 'Globex — Progetto pilota', value: 75000, currency: 'EUR', stage: 'qualified',
    risk_score: 0, velocity_days: 45, is_stalled: true, expected_close: ahead(60), closed_at: null,
    products: [{ id: 'p3', name: 'Pilot Package', quantity: 1, unit_price: 75000 }],
    field_trust: { value: meta('ai_extracted', 20, 0.65) }, next_action: 'Sollecitare decisione: fermo da 45 giorni',
    tags: ['enterprise', 'slow'], custom_fields: {}, created_at: ago(50), updated_at: ago(20),
  },
  {
    id: 'dl-techstart-renew', pipeline_id: 'pipe-default', owner_id: CURRENT_USER_ID, assignee_id: 'tm-comm', contact_id: 'ct-neri', company_id: 'cmp-techstart',
    title: 'TechStart — Rinnovo annuale', value: 12000, currency: 'EUR', stage: 'qualified',
    risk_score: 0, velocity_days: 60, is_stalled: true, expected_close: ahead(20), closed_at: null,
    products: [{ id: 'p4', name: 'Rinnovo', quantity: 1, unit_price: 12000 }],
    field_trust: { value: meta('import', 200, 0.7) }, next_action: '⚠️ Rischio churn — chiamata urgente',
    tags: ['at-risk'], custom_fields: {}, created_at: ago(200), updated_at: ago(24),
  },
  {
    id: 'dl-fabrica-new', pipeline_id: 'pipe-default', owner_id: CURRENT_USER_ID, assignee_id: 'tm-tel', contact_id: 'ct-conti', company_id: 'cmp-fabrica',
    title: 'Fabrica — Setup iniziale', value: 8500, currency: 'EUR', stage: 'lead',
    risk_score: 0, velocity_days: 3, is_stalled: false, expected_close: ahead(30), closed_at: null,
    products: [{ id: 'p5', name: 'Starter', quantity: 1, unit_price: 8500 }],
    field_trust: { value: meta('user', 1) }, next_action: 'Qualificare con una discovery call',
    tags: ['inbound'], custom_fields: {}, created_at: ago(8), updated_at: ago(1),
  },
  {
    id: 'dl-acme-logistics', pipeline_id: 'pipe-default', owner_id: CURRENT_USER_ID, assignee_id: 'tm-comm', contact_id: 'ct-bianchi', company_id: 'cmp-acme',
    title: 'Acme — Modulo Logistica (upsell)', value: 18000, currency: 'EUR', stage: 'won',
    risk_score: 0, velocity_days: 18, is_stalled: false, expected_close: ago(5), closed_at: ago(5),
    products: [{ id: 'p6', name: 'Modulo Logistica', quantity: 1, unit_price: 18000 }],
    field_trust: { value: meta('user', 5) }, next_action: null,
    tags: ['upsell', 'won'], custom_fields: {}, created_at: ago(35), updated_at: ago(5),
  },
  // Onboarding Pipeline (pipe-onboarding)
  {
    id: 'dl-onb-acme', pipeline_id: 'pipe-onboarding', owner_id: CURRENT_USER_ID, assignee_id: 'tm-conf', contact_id: 'ct-rossi', company_id: 'cmp-acme',
    title: 'Acme — Onboarding Logistica', value: 499, currency: 'EUR', stage: 'onb_setup',
    risk_score: 0, velocity_days: 2, is_stalled: false, expected_close: ahead(15), closed_at: null,
    products: [{ id: 'prod-onboarding', name: 'Setup & Onboarding Premium', quantity: 1, unit_price: 499 }],
    field_trust: {}, next_action: 'Configurare tenant e importare anagrafiche',
    tags: ['onboarding'], custom_fields: {}, created_at: ago(3), updated_at: ago(1),
  },
  // Renewals Pipeline (pipe-renewals)
  {
    id: 'dl-ren-nexus', pipeline_id: 'pipe-renewals', owner_id: CURRENT_USER_ID, assignee_id: 'tm-comm', contact_id: 'ct-verdi', company_id: 'cmp-nexus',
    title: 'Nexus — Rinnovo Software 2027', value: 3840, currency: 'EUR', stage: 'ren_discovery',
    risk_score: 0, velocity_days: 1, is_stalled: false, expected_close: ahead(90), closed_at: null,
    products: [{ id: 'prod-saas-lite', name: 'Qi-CRM Abbonamento Lite', quantity: 11, unit_price: 29 }],
    field_trust: {}, next_action: 'Verificare ticket aperti prima della proposta',
    tags: ['rinnovo'], custom_fields: {}, created_at: ago(2), updated_at: ago(1),
  },
];

// ----- AI Insights -----
export const seedInsights: AiInsight[] = [
  {
    id: 'ai-1', deal_id: 'dl-globex-pilot', contact_id: 'ct-ferrari', insight_type: 'risk_alert',
    reasoning: 'Deal fermo da 45 giorni, oltre il doppio del ciclo medio. Probabilità di slittamento alta.',
    action_payload: { type: 'schedule_call', subject: 'Check-in Globex', scheduled_at: ahead(1) },
    confidence: 0.78, is_executed: false, created_at: ago(2),
  },
  {
    id: 'ai-2', deal_id: 'dl-techstart-renew', contact_id: 'ct-neri', insight_type: 'churn_warning',
    reasoning: 'Engagement email crollato del 90%, nessuna risposta da 24 giorni. Rischio churn 72%.',
    action_payload: { type: 'send_email', subject: 'Ci manchi — offerta dedicata', template: 'win_back' },
    confidence: 0.72, is_executed: false, created_at: ago(2),
  },
  {
    id: 'ai-3', deal_id: 'dl-nexus-pro', contact_id: 'ct-verdi', insight_type: 'best_time',
    reasoning: 'Giulia apre le email il martedì mattina. Invia il follow-up domani alle 9:00 per massimizzare l\'apertura.',
    action_payload: { type: 'send_email', subject: 'Follow-up proposta Nexus', scheduled_at: ahead(1) },
    confidence: 0.66, is_executed: false, created_at: ago(1),
  },
];

// ----- Tickets -----
export const seedTickets: Ticket[] = [
  { id: 'tk-1', code: 'TKT-001', title: 'Richiamare per preventivo logistica', description: 'Il cliente ha richiesto un preventivo aggiornato per il modulo logistica.', status: 'open',        priority: 'high',   category: 'callback', assignee_id: 'tm-tel',   contact_id: 'ct-rossi',   company_id: 'cmp-acme',     deal_id: 'dl-acme-annual', created_by: CURRENT_USER_ID, created_at: ago(1), updated_at: ago(1), due_at: ahead(1) },
  { id: 'tk-2', code: 'TKT-002', title: 'Configurare ambiente di prova Nexus',  description: 'Setup tenant di prova per la demo Pro 50 seats.',                     status: 'in_progress', priority: 'medium', category: 'config',   assignee_id: 'tm-conf',  contact_id: 'ct-verdi',   company_id: 'cmp-nexus',    deal_id: 'dl-nexus-pro',   created_by: CURRENT_USER_ID, created_at: ago(2), updated_at: ago(1), due_at: ahead(2) },
  { id: 'tk-3', code: 'TKT-003', title: 'Verificare fattura Acme #2231',         description: 'Discrepanza importo IVA sulla fattura.',                               status: 'waiting',     priority: 'low',    category: 'admin',    assignee_id: 'tm-admin', contact_id: 'ct-bianchi', company_id: 'cmp-acme',     deal_id: null,             created_by: CURRENT_USER_ID, created_at: ago(3), updated_at: ago(2), due_at: null },
  { id: 'tk-4', code: 'TKT-004', title: 'Lead inbound da qualificare',           description: 'Form demo compilato da Fabrica Digitale.',                             status: 'open',        priority: 'urgent', category: 'callback', assignee_id: 'tm-tel',   contact_id: 'ct-conti',   company_id: 'cmp-fabrica',  deal_id: 'dl-fabrica-new', created_by: CURRENT_USER_ID, created_at: ago(1), updated_at: ago(1), due_at: ahead(1) },
  { id: 'tk-5', code: 'TKT-005', title: 'Follow-up proposta Globex',             description: 'Sollecitare decisione sul progetto pilota.',                           status: 'open',        priority: 'high',   category: 'sales',    assignee_id: 'tm-comm',  contact_id: 'ct-ferrari', company_id: 'cmp-globex',   deal_id: 'dl-globex-pilot',created_by: CURRENT_USER_ID, created_at: ago(2), updated_at: ago(2), due_at: ahead(3) },
];

// ----- Activities -----
export const seedActivities: Activity[] = [
  { id: 'act-1', user_id: CURRENT_USER_ID, contact_id: 'ct-rossi', deal_id: 'dl-acme-annual', type: 'call', subject: 'Call di allineamento', body: 'Discusso ROI e tempistiche. Mario chiede contratto rivisto.', source: 'user', confidence: 1, duration_min: 30, completed: true, due_at: null, extracted_fields: null, created_at: ago(2), updated_at: ago(2) },
  { id: 'act-2', user_id: CURRENT_USER_ID, contact_id: 'ct-verdi', deal_id: 'dl-nexus-pro', type: 'email', subject: 'Inviata proposta Pro 50 seats', body: 'Proposta commerciale con sconto volume.', source: 'user', confidence: 1, duration_min: null, completed: true, due_at: null, extracted_fields: null, created_at: ago(1), updated_at: ago(1) },
  { id: 'act-3', user_id: CURRENT_USER_ID, contact_id: 'ct-conti', deal_id: 'dl-fabrica-new', type: 'ai_capture', subject: 'Lead inbound da form', body: 'Compilato form "Richiedi demo". Interessato a setup completo.', source: 'ai_extracted', confidence: 0.65, duration_min: null, completed: true, due_at: null, extracted_fields: { interesse: 'setup completo', budget: '~10k' }, created_at: ago(1), updated_at: ago(1) },
  { id: 'act-4', user_id: CURRENT_USER_ID, contact_id: 'ct-ferrari', deal_id: 'dl-globex-pilot', type: 'meeting', subject: 'Demo prodotto', body: 'Demo a 4 stakeholder. Feedback positivo ma decisione rimandata.', source: 'user', confidence: 1, duration_min: 60, completed: true, due_at: null, extracted_fields: null, created_at: ago(20), updated_at: ago(20) },
  { id: 'act-5', user_id: CURRENT_USER_ID, contact_id: 'ct-rossi', deal_id: 'dl-acme-annual', type: 'note', subject: 'Promemoria', body: 'Preparare confronto prezzi vs competitor per la prossima call.', source: 'user', confidence: 1, duration_min: null, completed: false, due_at: ahead(2), extracted_fields: null, created_at: ago(1), updated_at: ago(1) },
];

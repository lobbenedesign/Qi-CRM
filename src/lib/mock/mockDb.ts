// ============================================================
// SOVRANO — In-memory mock DB con persistenza localStorage.
// Simula latenza di rete così la UI (loading/optimistic) si
// comporta come col backend reale. Swappabile con Supabase.
// ============================================================
import type { Company, Contact, Deal, PipelineStage, Activity, AiInsight, Profile, PipelineDefinition } from '../../types/crm';
import type { Ticket } from '../../types/team';
import {
  seedProfile, seedStages, seedCompanies, seedContacts, seedDeals,
  seedActivities, seedInsights, seedTickets, seedPipelines,
} from './seed';

const STORAGE_KEY = 'qi-crm-mock-db-v1';

interface DbShape {
  profile: Profile;
  stages: PipelineStage[];
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
  insights: AiInsight[];
  tickets: Ticket[];
  pipelines: PipelineDefinition[];
}

function freshSeed(): DbShape {
  return {
    profile: structuredClone(seedProfile),
    stages: structuredClone(seedStages),
    companies: structuredClone(seedCompanies),
    contacts: structuredClone(seedContacts),
    deals: structuredClone(seedDeals),
    activities: structuredClone(seedActivities),
    insights: structuredClone(seedInsights),
    tickets: structuredClone(seedTickets),
    pipelines: structuredClone(seedPipelines),
  };
}

function load(): DbShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DbShape;
      // Migrazione se mancano le pipeline
      if (!parsed.pipelines) {
        parsed.pipelines = structuredClone(seedPipelines);
      }
      return parsed;
    }
  } catch { /* ignore */ }
  const seeded = freshSeed();
  persist(seeded);
  return seeded;
}

function persist(db: DbShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch { /* ignore quota */ }
}

let db: DbShape = load();

/** Reset al seed iniziale (usato dal pulsante "Ripristina demo"). */
export function resetMockDb() {
  // Wipe completo: oltre al mock DB, azzera anche tutti gli store Zustand
  // persistiti (chiavi qi-crm-* e residui sovrano-*), così l'intera app
  // si ri-seeda dallo stato iniziale dopo un reload.
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('qi-crm-') || k.startsWith('sovrano-'))
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
  db = freshSeed();
  persist(db);
}

/** Simula la latenza di rete. */
const latency = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 180));

function save() { persist(db); }

export const mockDb = {
  // ---- raw access (sync) for joins ----
  _db: () => db,

  // ---- Profile ----
  async getProfile() { await latency(); return structuredClone(db.profile); },

  // ---- Pipelines ----
  async listPipelines() {
    await latency();
    return structuredClone(db.pipelines);
  },

  // ---- Stages ----
  async listStages() {
    await latency();
    return structuredClone(db.stages).sort((a, b) => a.display_order - b.display_order);
  },
  async createStage(input: Partial<PipelineStage>) {
    await latency();
    const maxOrder = db.stages.reduce((max, s) => Math.max(max, s.display_order), 0);
    const newStage: PipelineStage = {
      id: `stg-${crypto.randomUUID().slice(0, 8)}`,
      pipeline_id: input.pipeline_id ?? 'pipe-default',
      name: input.name ?? 'Nuova Fase',
      stage_key: input.stage_key ?? `custom_${Date.now()}`,
      display_order: maxOrder + 1,
      default_color: input.default_color ?? '#6366f1',
      risk_color: input.risk_color ?? '#ef4444',
      is_expandable: input.is_expandable ?? false,
      probability: input.probability ?? 50,
    };
    db.stages.push(newStage);
    save();
    return structuredClone(newStage);
  },
  async updateStage(id: string, patch: Partial<PipelineStage>) {
    await latency();
    const idx = db.stages.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error('Stage not found');
    const oldKey = db.stages[idx].stage_key;
    db.stages[idx] = { ...db.stages[idx], ...patch };
    // Se la chiave della fase è cambiata, aggiorna i deal associati
    if (patch.stage_key && patch.stage_key !== oldKey) {
      db.deals = db.deals.map((d) => d.stage === oldKey ? { ...d, stage: patch.stage_key! } : d);
    }
    save();
    return structuredClone(db.stages[idx]);
  },
  async deleteStage(id: string) {
    await latency();
    const sorted = [...db.stages].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error('Stage not found');
    const targetStage = sorted[idx];

    // Rimuovi la fase
    db.stages = db.stages.filter((s) => s.id !== id);

    // Calcola la fase di ripiego (safest step)
    let fallbackKey = 'lead'; // fallback generale
    if (db.stages.length > 0) {
      const newSorted = sorted.filter((s) => s.id !== id);
      const fallbackIdx = Math.max(0, idx - 1);
      fallbackKey = newSorted[fallbackIdx].stage_key;
    }

    // Ri-mappa i deal della fase eliminata a quella di ripiego
    db.deals = db.deals.map((d) => d.stage === targetStage.stage_key ? { ...d, stage: fallbackKey, updated_at: new Date().toISOString() } : d);
    
    save();
    return { success: true, fallbackKey };
  },
  async reorderStages(stageIds: string[]) {
    await latency();
    stageIds.forEach((id, index) => {
      const idx = db.stages.findIndex((s) => s.id === id);
      if (idx >= 0) {
        db.stages[idx].display_order = index + 1;
      }
    });
    save();
    return true;
  },

  // ---- Companies ----
  async listCompanies() {
    await latency();
    return structuredClone(db.companies).sort((a, b) => a.name.localeCompare(b.name));
  },
  async createCompany(input: Partial<Company>) {
    await latency();
    const company: Company = {
      id: `cmp-${crypto.randomUUID().slice(0, 8)}`,
      owner_id: db.profile.id, name: input.name ?? 'Senza nome',
      domain: input.domain ?? null, industry: input.industry ?? null, size: input.size ?? null,
      website: input.website ?? null, phone: input.phone ?? null, address: input.address ?? null,
      parent_id: input.parent_id ?? null, custom_fields: {},
      field_trust: input.field_trust ?? { name: { source: 'user', confidence: 1, updatedAt: new Date().toISOString() } },
      ai_summary: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    db.companies.push(company); save();
    return structuredClone(company);
  },
  async updateCompany(id: string, patch: Partial<Company>) {
    await latency();
    const i = db.companies.findIndex((c) => c.id === id);
    if (i < 0) throw new Error('Company not found');
    db.companies[i] = { ...db.companies[i], ...patch, updated_at: new Date().toISOString() };
    save();
    return structuredClone(db.companies[i]);
  },
  async deleteCompany(id: string) {
    await latency();
    db.companies = db.companies.filter((c) => c.id !== id);
    save();
  },

  // ---- Contacts ----
  async listContacts() {
    await latency();
    return structuredClone(db.contacts)
      .map((c) => ({ ...c, company: db.companies.find((co) => co.id === c.company_id) }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  async getContact(id: string) {
    await latency();
    const c = db.contacts.find((x) => x.id === id);
    if (!c) throw new Error('Contact not found');
    return {
      ...structuredClone(c),
      company: db.companies.find((co) => co.id === c.company_id),
    };
  },
  async createContact(input: Partial<Contact>) {
    await latency();
    const contact: Contact = {
      id: `ct-${crypto.randomUUID().slice(0, 8)}`,
      owner_id: db.profile.id, company_id: input.company_id ?? null,
      first_name: input.first_name ?? null, last_name: input.last_name ?? null,
      email: input.email ?? null, phone: input.phone ?? null,
      job_title: input.job_title ?? null, department: input.department ?? null,
      reports_to_id: input.reports_to_id ?? null,
      lead_status: input.lead_status ?? 'new', lifecycle_stage: input.lifecycle_stage ?? 'lead',
      lead_score: input.lead_score ?? 0,
      field_trust: input.field_trust ?? {},
      email_opens: 0, email_clicks: 0, page_views: 0, form_submissions: 0,
      last_activity: null, last_contacted: null, sentiment_score: null, churn_risk: null,
      tags: input.tags ?? [], custom_fields: {}, ai_summary: null,
      consent: input.consent,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    db.contacts.push(contact); save();
    return structuredClone(contact);
  },
  async updateContact(id: string, patch: Partial<Contact>) {
    await latency();
    const i = db.contacts.findIndex((c) => c.id === id);
    if (i < 0) throw new Error('Contact not found');
    db.contacts[i] = { ...db.contacts[i], ...patch, updated_at: new Date().toISOString() };
    save();
    return structuredClone(db.contacts[i]);
  },
  async deleteContact(id: string) {
    await latency();
    db.contacts = db.contacts.filter((c) => c.id !== id);
    save();
  },

  // ---- Deals ----
  async listDeals() {
    await latency();
    return structuredClone(db.deals)
      .map((d) => ({
        ...d,
        contact: db.contacts.find((c) => c.id === d.contact_id),
        company: db.companies.find((co) => co.id === d.company_id),
        ai_insights: db.insights.filter((ins) => ins.deal_id === d.id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  async createDeal(input: Partial<Deal>) {
    await latency();
    const deal: Deal = {
      id: `dl-${crypto.randomUUID().slice(0, 8)}`,
      pipeline_id: input.pipeline_id ?? 'pipe-default',
      owner_id: db.profile.id, assignee_id: input.assignee_id ?? null,
      contact_id: input.contact_id ?? null, company_id: input.company_id ?? null,
      title: input.title ?? 'Nuovo deal', value: input.value ?? 0, currency: input.currency ?? 'EUR',
      stage: input.stage ?? 'lead', risk_score: 0, velocity_days: 0, is_stalled: false,
      expected_close: input.expected_close ?? null, closed_at: null, products: input.products ?? [],
      field_trust: input.field_trust ?? {}, next_action: input.next_action ?? null,
      tags: input.tags ?? [], custom_fields: {},
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    db.deals.push(deal); save();
    return structuredClone(deal);
  },
  async updateDeal(id: string, patch: Partial<Deal>) {
    await latency();
    const i = db.deals.findIndex((d) => d.id === id);
    if (i < 0) throw new Error('Deal not found');
    db.deals[i] = { ...db.deals[i], ...patch, updated_at: new Date().toISOString() };
    save();
    return structuredClone(db.deals[i]);
  },
  async deleteDeal(id: string) {
    await latency();
    db.deals = db.deals.filter((d) => d.id !== id);
    save();
  },

  // ---- Activities ----
  async listActivities(filter?: { contactId?: string; dealId?: string }) {
    await latency();
    let items = structuredClone(db.activities);
    if (filter?.contactId) items = items.filter((a) => a.contact_id === filter.contactId);
    if (filter?.dealId) items = items.filter((a) => a.deal_id === filter.dealId);
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  async createActivity(input: Partial<Activity>) {
    await latency();
    const activity: Activity = {
      id: `act-${crypto.randomUUID().slice(0, 8)}`,
      user_id: db.profile.id, contact_id: input.contact_id ?? null, deal_id: input.deal_id ?? null,
      type: input.type ?? 'note', subject: input.subject ?? null, body: input.body ?? null,
      source: input.source ?? 'user', confidence: input.confidence ?? 1,
      duration_min: input.duration_min ?? null, completed: input.completed ?? true,
      due_at: input.due_at ?? null, extracted_fields: input.extracted_fields ?? null,
      qi_track: input.qi_track ?? undefined,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    db.activities.push(activity); save();
    return structuredClone(activity);
  },
  async updateActivity(id: string, patch: Partial<Activity>) {
    await latency();
    const i = db.activities.findIndex((a) => a.id === id);
    if (i < 0) throw new Error('Activity not found');
    db.activities[i] = { ...db.activities[i], ...patch, updated_at: new Date().toISOString() };
    save();
    return structuredClone(db.activities[i]);
  },

  // ---- Insights ----
  async listInsights() {
    await latency();
    return structuredClone(db.insights).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  },

  // ---- Tickets ----
  async listTickets() {
    await latency();
    return structuredClone(db.tickets)
      .map((t) => ({
        ...t,
        contact: db.contacts.find((c) => c.id === t.contact_id),
        company: db.companies.find((c) => c.id === t.company_id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  async createTicket(input: Partial<Ticket>) {
    await latency();
    const n = db.tickets.length + 1;
    const ticket: Ticket = {
      id: `tk-${crypto.randomUUID().slice(0, 8)}`,
      code: `TKT-${String(n).padStart(3, '0')}`,
      title: input.title ?? 'Nuovo ticket', description: input.description ?? null,
      status: input.status ?? 'open', priority: input.priority ?? 'medium',
      category: input.category ?? 'support', assignee_id: input.assignee_id ?? null,
      contact_id: input.contact_id ?? null, company_id: input.company_id ?? null, deal_id: input.deal_id ?? null,
      created_by: db.profile.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      due_at: input.due_at ?? null,
    };
    db.tickets.push(ticket); save();
    return structuredClone(ticket);
  },
  async updateTicket(id: string, patch: Partial<Ticket>) {
    await latency();
    const i = db.tickets.findIndex((t) => t.id === id);
    if (i < 0) throw new Error('Ticket not found');
    db.tickets[i] = { ...db.tickets[i], ...patch, updated_at: new Date().toISOString() };
    save();
    return structuredClone(db.tickets[i]);
  },
  async deleteTicket(id: string) {
    await latency();
    db.tickets = db.tickets.filter((t) => t.id !== id);
    save();
  },
};

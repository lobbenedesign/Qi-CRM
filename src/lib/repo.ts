// ============================================================
// SOVRANO — Repository layer (data-access abstraction).
//
// Tutta l'app passa da qui per leggere/scrivere dati. Oggi punta
// al backend mock in-memory. Quando configurerai Supabase (env
// VITE_SUPABASE_URL + ANON_KEY), basterà aggiungere l'impl
// `supabaseRepo` e cambiare il dispatch: NESSUN componente o hook
// va riscritto.
// ============================================================
import { mockDb, resetMockDb } from './mock/mockDb';

/** true se Supabase NON è configurato → usiamo il mock. */
export const USING_MOCK =
  !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes('<') ||
  import.meta.env.VITE_SUPABASE_URL.includes('YOUR_PROJECT') ||
  import.meta.env.VITE_SUPABASE_URL === '';

// Il repo mock espone esattamente la stessa shape che avrà quello Supabase.
export const repo = {
  // Profile
  getProfile: mockDb.getProfile,

  // Pipelines
  listPipelines: mockDb.listPipelines,

  // Stages
  listStages: mockDb.listStages,
  createStage: mockDb.createStage,
  updateStage: mockDb.updateStage,
  deleteStage: mockDb.deleteStage,
  reorderStages: mockDb.reorderStages,

  // Companies
  listCompanies: mockDb.listCompanies,
  createCompany: mockDb.createCompany,
  updateCompany: mockDb.updateCompany,
  deleteCompany: mockDb.deleteCompany,

  // Contacts
  listContacts: mockDb.listContacts,
  getContact: mockDb.getContact,
  createContact: mockDb.createContact,
  updateContact: mockDb.updateContact,
  deleteContact: mockDb.deleteContact,

  // Deals
  listDeals: mockDb.listDeals,
  createDeal: mockDb.createDeal,
  updateDeal: mockDb.updateDeal,
  deleteDeal: mockDb.deleteDeal,

  // Activities
  listActivities: mockDb.listActivities,
  createActivity: mockDb.createActivity,
  updateActivity: mockDb.updateActivity,

  // Insights
  listInsights: mockDb.listInsights,

  // Tickets
  listTickets: mockDb.listTickets,
  createTicket: mockDb.createTicket,
  updateTicket: mockDb.updateTicket,
  deleteTicket: mockDb.deleteTicket,

  // Demo controls
  resetDemo: resetMockDb,
};

export type Repo = typeof repo;

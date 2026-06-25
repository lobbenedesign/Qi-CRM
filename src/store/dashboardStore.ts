import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
export type DashboardVisibility = 'private' | 'everyone' | 'teams';

export type ReportWidgetType =
  | 'kpis'
  | 'monthly_revenue'
  | 'deals_by_stage'
  | 'ai_insights'
  | 'ticket_status'
  | 'ticket_prio'
  | 'task_productivity'
  | 'document_engagement'
  | 'forecast'
  | 'today_reminders'
  | 'my_tickets'
  | 'upcoming_deadlines'
  | 'recent_documents';

export type ReportDateRange = '7d' | '30d' | '90d' | '365d' | 'all';

export interface ReportFilters {
  dateRange: ReportDateRange;
  ownerId: string | null;    // member id or null = all
  teamId: string | null;     // team id or null = all
}

/** A saved (customised) report instance */
export interface SavedReport {
  id: string;
  name: string;
  widgetType: ReportWidgetType;
  filters: ReportFilters;
  createdAt: string;
  createdBy: string; // member id
}

/** A dashboard configuration */
export interface DashboardConfig {
  id: string;
  name: string;
  visibility: DashboardVisibility;
  allowedTeamIds: string[];
  allowedMemberIds: string[];
  reportIds: string[];   // ordered list of SavedReport IDs
  createdBy: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
//  Seed data
// ─────────────────────────────────────────────
const now = () => new Date().toISOString();

const DEFAULT_FILTERS: ReportFilters = { dateRange: 'all', ownerId: null, teamId: null };

const DEFAULT_REPORTS: SavedReport[] = [
  { id: 'r-kpis',        name: 'KPI Principali CRM',                 widgetType: 'kpis',               filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
  { id: 'r-rev',         name: 'Grafico Ricavi Mensili',              widgetType: 'monthly_revenue',    filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
  { id: 'r-stage',       name: 'Deal per Stage di Pipeline',          widgetType: 'deals_by_stage',     filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
  { id: 'r-ai',          name: 'Insight AI & Mosse Consigliate',      widgetType: 'ai_insights',        filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
  { id: 'r-tkt-status',  name: 'Volume Ticket per Stato',             widgetType: 'ticket_status',      filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
  { id: 'r-tkt-prio',    name: 'Criticità Assistenza',                widgetType: 'ticket_prio',        filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
  { id: 'r-tasks',       name: 'Produttività e Completamento Task',   widgetType: 'task_productivity',  filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
  { id: 'r-docs',        name: 'Engagement Documenti Gated',          widgetType: 'document_engagement',filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
  { id: 'r-forecast',    name: 'Sales Forecast (Qi-Forecast)',        widgetType: 'forecast',           filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
  { id: 'r-today-reminders', name: 'Promemoria di oggi',              widgetType: 'today_reminders',    filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
  { id: 'r-my-tickets',      name: 'Ticket da gestire',               widgetType: 'my_tickets',         filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
  { id: 'r-upcoming-deadlines', name: 'Scadenze imminenti',           widgetType: 'upcoming_deadlines', filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
  { id: 'r-recent-documents',name: 'Documenti recenti',               widgetType: 'recent_documents',   filters: DEFAULT_FILTERS, createdAt: now(), createdBy: 'tm-owner' },
];

const DEFAULT_DASHBOARDS: DashboardConfig[] = [
  {
    id: 'dash-sales',
    name: 'Home / Panoramica',
    visibility: 'everyone',
    allowedTeamIds: [],
    allowedMemberIds: [],
    reportIds: ['r-kpis', 'r-today-reminders', 'r-my-tickets', 'r-upcoming-deadlines', 'r-recent-documents', 'r-forecast', 'r-stage'],
    createdBy: 'tm-owner',
    createdAt: now(),
  },
  {
    id: 'dash-service',
    name: 'Analisi Service (Ticket)',
    visibility: 'everyone',
    allowedTeamIds: [],
    allowedMemberIds: [],
    reportIds: ['r-tkt-status', 'r-tkt-prio'],
    createdBy: 'tm-owner',
    createdAt: now(),
  },
  {
    id: 'dash-productivity',
    name: 'Coda & Task Agenti',
    visibility: 'everyone',
    allowedTeamIds: [],
    allowedMemberIds: [],
    reportIds: ['r-tasks'],
    createdBy: 'tm-owner',
    createdAt: now(),
  },
  {
    id: 'dash-docs',
    name: 'Vault Documenti',
    visibility: 'everyone',
    allowedTeamIds: [],
    allowedMemberIds: [],
    reportIds: ['r-docs'],
    createdBy: 'tm-owner',
    createdAt: now(),
  },
];

// Pre-defined dashboard templates
export const DASHBOARD_TEMPLATES: {
  id: string;
  name: string;
  description: string;
  icon: string;
  reportIds: string[];
}[] = [
  {
    id: 'tpl-sales',
    name: 'Home / Panoramica',
    description: 'KPI generali, promemoria di oggi, task operativi e insight principali.',
    icon: '☀️',
    reportIds: ['r-kpis', 'r-today-reminders', 'r-my-tickets', 'r-upcoming-deadlines', 'r-recent-documents', 'r-forecast', 'r-stage'],
  },
  {
    id: 'tpl-service',
    name: 'Service & Assistenza',
    description: 'Stato e criticità dei ticket di assistenza clienti.',
    icon: '🎫',
    reportIds: ['r-tkt-status', 'r-tkt-prio'],
  },
  {
    id: 'tpl-productivity',
    name: 'Produttività Team',
    description: 'Task completati, coda di esecuzione e impegni del team.',
    icon: '✅',
    reportIds: ['r-tasks'],
  },
  {
    id: 'tpl-custom',
    name: 'Dashboard Personalizzata',
    description: 'Parti da zero e aggiungi i report che preferisci.',
    icon: '⚡',
    reportIds: [],
  },
];

// Library catalogue for UI display
export const REPORT_LIBRARY_CATALOG: {
  widgetType: ReportWidgetType;
  name: string;
  desc: string;
  category: string;
}[] = [
  { widgetType: 'kpis',               name: 'KPI Principali CRM',               desc: 'Pipeline aperta, deal attivi, win rate e contatti totali.',          category: 'Vendite' },
  { widgetType: 'monthly_revenue',    name: 'Grafico Ricavi Mensili',            desc: 'Curva storica delle entrate commerciali degli ultimi mesi.',          category: 'Vendite' },
  { widgetType: 'deals_by_stage',     name: 'Deal per Stage di Pipeline',        desc: 'Distribuzione grafica dei deal attivi sulle colonne Kanban.',         category: 'Vendite' },
  { widgetType: 'ai_insights',        name: 'Insight AI & Mosse Consigliate',    desc: 'Alert automatici elaborati da agenti AI su contatti e churn risk.',   category: 'Intelligenza' },
  { widgetType: 'ticket_status',      name: 'Volume Ticket per Stato',           desc: 'Andamento del volume e risoluzione dei ticket di assistenza.',        category: 'Assistenza' },
  { widgetType: 'ticket_prio',        name: 'Criticità Assistenza',             desc: 'Conteggio complessivo dei ticket divisi per livello di criticità.',    category: 'Assistenza' },
  { widgetType: 'task_productivity',  name: 'Produttività e Task',               desc: 'Statistiche e percentuali di svolgimento dei task di email/call.',    category: 'Produttività' },
  { widgetType: 'document_engagement',name: 'Engagement Documenti',              desc: 'Classifica dei documenti più aperti con tracking dei tempi di lettura.', category: 'Documenti' },
  { widgetType: 'forecast',           name: 'Sales Forecast (Qi-Forecast)',      desc: 'Widget predittivo per stimare i ricavi basati sulla probabilità dei deal.', category: 'Vendite' },
  { widgetType: 'today_reminders',    name: 'Promemoria di oggi',                desc: 'Lista rapida dei promemoria in scadenza oggi.',                      category: 'Operatività' },
  { widgetType: 'my_tickets',         name: 'I miei Ticket',                     desc: 'Visione rapida dei ticket di assistenza a me assegnati.',            category: 'Operatività' },
  { widgetType: 'upcoming_deadlines', name: 'Scadenze imminenti',                desc: 'Documenti o contratti in scadenza nei prossimi 7 giorni.',           category: 'Operatività' },
  { widgetType: 'recent_documents',   name: 'Documenti recenti',                 desc: 'Lista degli ultimi file e documenti caricati o visualizzati.',       category: 'Operatività' },
];

// ─────────────────────────────────────────────
//  Store interface
// ─────────────────────────────────────────────
interface DashboardState {
  dashboards: DashboardConfig[];
  savedReports: SavedReport[];
  activeDashId: string;

  // Dashboard actions
  setActiveDash: (id: string) => void;
  createDashboard: (opts: {
    name: string;
    visibility: DashboardVisibility;
    allowedTeamIds: string[];
    allowedMemberIds: string[];
    templateReportIds: string[];
    createdBy: string;
  }) => DashboardConfig;
  deleteDashboard: (id: string) => void;
  updateDashboard: (id: string, patch: Partial<Pick<DashboardConfig, 'name' | 'visibility' | 'allowedTeamIds' | 'allowedMemberIds'>>) => void;

  // Widget order / removal inside a dashboard
  addReportToDash: (dashId: string, reportId: string) => void;
  removeReportFromDash: (dashId: string, reportId: string) => void;
  moveReportInDash: (dashId: string, index: number, direction: 'up' | 'down') => void;

  // Saved reports ("My Reports") actions
  saveReport: (opts: {
    name: string;
    widgetType: ReportWidgetType;
    filters: ReportFilters;
    createdBy: string;
  }) => SavedReport;
  updateReport: (id: string, patch: Partial<Pick<SavedReport, 'name' | 'filters'>>) => void;
  deleteReport: (id: string) => void;
}

// ─────────────────────────────────────────────
//  Store implementation
// ─────────────────────────────────────────────
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      dashboards: DEFAULT_DASHBOARDS,
      savedReports: DEFAULT_REPORTS,
      activeDashId: 'dash-sales',

      setActiveDash: (activeDashId) => set({ activeDashId }),

      createDashboard: ({ name, visibility, allowedTeamIds, allowedMemberIds, templateReportIds, createdBy }) => {
        // Clone the template reports so each dashboard gets its own copies
        const clonedReportIds: string[] = templateReportIds.map((originalId) => {
          const orig = get().savedReports.find((r) => r.id === originalId);
          if (!orig) return null as unknown as string;
          const cloned: SavedReport = {
            ...orig,
            id: `r-${Math.random().toString(36).substring(2, 10)}`,
            createdAt: now(),
            createdBy,
          };
          set((s) => ({ savedReports: [...s.savedReports, cloned] }));
          return cloned.id;
        }).filter(Boolean);

        const newDash: DashboardConfig = {
          id: `dash-${Math.random().toString(36).substring(2, 10)}`,
          name,
          visibility,
          allowedTeamIds,
          allowedMemberIds,
          reportIds: clonedReportIds,
          createdBy,
          createdAt: now(),
        };
        set((s) => ({ dashboards: [...s.dashboards, newDash], activeDashId: newDash.id }));
        return newDash;
      },

      deleteDashboard: (id) =>
        set((s) => ({
          dashboards: s.dashboards.filter((d) => d.id !== id),
          activeDashId: s.activeDashId === id ? (s.dashboards[0]?.id ?? '') : s.activeDashId,
        })),

      updateDashboard: (id, patch) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),

      addReportToDash: (dashId, reportId) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === dashId && !d.reportIds.includes(reportId)
              ? { ...d, reportIds: [...d.reportIds, reportId] }
              : d
          ),
        })),

      removeReportFromDash: (dashId, reportId) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === dashId ? { ...d, reportIds: d.reportIds.filter((r) => r !== reportId) } : d
          ),
        })),

      moveReportInDash: (dashId, index, direction) =>
        set((s) => {
          const dash = s.dashboards.find((d) => d.id === dashId);
          if (!dash) return {};
          const ids = [...dash.reportIds];
          const targetIdx = direction === 'up' ? index - 1 : index + 1;
          if (targetIdx < 0 || targetIdx >= ids.length) return {};
          [ids[index], ids[targetIdx]] = [ids[targetIdx], ids[index]];
          return {
            dashboards: s.dashboards.map((d) => (d.id === dashId ? { ...d, reportIds: ids } : d)),
          };
        }),

      saveReport: ({ name, widgetType, filters, createdBy }) => {
        const newReport: SavedReport = {
          id: `r-${Math.random().toString(36).substring(2, 10)}`,
          name,
          widgetType,
          filters,
          createdAt: now(),
          createdBy,
        };
        set((s) => ({ savedReports: [...s.savedReports, newReport] }));
        return newReport;
      },

      updateReport: (id, patch) =>
        set((s) => ({
          savedReports: s.savedReports.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      deleteReport: (id) => {
        // Also remove the report from all dashboards
        set((s) => ({
          savedReports: s.savedReports.filter((r) => r.id !== id),
          dashboards: s.dashboards.map((d) => ({
            ...d,
            reportIds: d.reportIds.filter((rid) => rid !== id),
          })),
        }));
      },
    }),
    { name: 'qi-crm-dashboards-v1' }
  )
);

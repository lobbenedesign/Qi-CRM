import { useState, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  Users, TrendingUp, DollarSign, Target, ArrowUpRight, ArrowDownRight,
  Sparkles, Loader2, AlertTriangle, ChevronUp, ChevronDown, Trash2, Plus,
  LayoutDashboard, FileText, CheckSquare, Ticket as TicketIcon, BarChart3, X,
  Settings, Eye, Filter, BookOpen, Pencil, Lock, Globe, Users2, Save,
  CalendarDays, ChevronRight, Bell, CalendarClock, FolderOpen, CheckCircle2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { useDeals, usePipelineStages } from '../hooks/useDeals';
import { useContacts } from '../hooks/useContacts';
import { useInsights } from '../hooks/useInsights';
import { useDealsStore } from '../store/dealsStore';
import { useContactsStore } from '../store/contactsStore';
import { useAuthStore } from '../store/authStore';
import { useTickets } from '../hooks/useTickets';
import { useTasksStore } from '../store/tasksStore';
import { useDocumentsStore } from '../store/documentsStore';
import { useTeamStore } from '../store/teamStore';
import { useRemindersStore } from '../store/remindersStore';
import { useDeadlinesStore } from '../store/deadlinesStore';
import { ForecastWidget } from '../components/dashboard/ForecastWidget';
import {
  useDashboardStore,
  REPORT_LIBRARY_CATALOG,
  DASHBOARD_TEMPLATES,
} from '../store/dashboardStore';
import type {
  DashboardVisibility,
  ReportFilters,
  ReportWidgetType,
  SavedReport,
} from '../store/dashboardStore';
import { cn, formatCurrency } from '../lib/utils';

const DAY = 86_400_000;
const isToday = (iso: string) => {
  const d = new Date(iso); const n = new Date();
  return d.toDateString() === n.toDateString();
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

// ─── Static revenue trend ──────────────────────────────────────────────────
const revenueTrend = [
  { month: 'Gen', value: 42000 },
  { month: 'Feb', value: 55000 },
  { month: 'Mar', value: 48000 },
  { month: 'Apr', value: 70000 },
  { month: 'Mag', value: 65000 },
  { month: 'Giu', value: 88000 },
];

// ─── KPI Card ─────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}
function KpiCard({ label, value, change, icon, color }: KpiCardProps) {
  const positive = change >= 0;
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4 rounded-xl shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-surface-500 dark:text-surface-400 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold text-surface-900 dark:text-surface-50 mt-1">{value}</p>
        </div>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>{icon}</div>
      </div>
      <div className={cn('flex items-center gap-1 mt-2 text-[11px] font-medium', positive ? 'text-trust-high' : 'text-risk-high')}>
        {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(change)}% vs mese scorso
      </div>
    </div>
  );
}

// ─── Date-range helper label ───────────────────────────────────────────────
const DATE_RANGE_LABELS: Record<string, string> = {
  '7d': 'Ultimi 7 giorni',
  '30d': 'Ultimi 30 giorni',
  '90d': 'Ultimi 90 giorni',
  '365d': 'Ultimo anno',
  'all': 'Tutto il periodo',
};

// ─── Visibility badge ─────────────────────────────────────────────────────
function VisibilityBadge({ vis }: { vis: DashboardVisibility }) {
  if (vis === 'private')  return <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400"><Lock size={10} /> Privata</span>;
  if (vis === 'teams')    return <span className="flex items-center gap-1 text-[10px] text-brand-600 dark:text-brand-400"><Users2 size={10} /> Solo team</span>;
  return <span className="flex items-center gap-1 text-[10px] text-trust-high"><Globe size={10} /> Tutti</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Dashboard component
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { isLoading: l1 } = useDeals();
  const { isLoading: l2 } = useContacts();
  const { data: tickets = [], isLoading: l3 } = useTickets();
  usePipelineStages();

  const { data: insights = [] } = useInsights();
  const deals       = useDealsStore((s) => s.deals);
  const stages      = useDealsStore((s) => s.stages);
  const contacts    = useContactsStore((s) => s.contacts);
  const profile     = useAuthStore((s) => s.profile);
  const memberId    = useAuthStore((s) => s.memberId);
  const members     = useTeamStore((s) => s.members);
  const { tasks }   = useTasksStore();
  const { documents } = useDocumentsStore();
  const reminders   = useRemindersStore((s) => s.reminders);
  const deadlines   = useDeadlinesStore((s) => s.deadlines);

  const { dashboards, savedReports, activeDashId, setActiveDash, createDashboard, deleteDashboard, updateDashboard, addReportToDash, removeReportFromDash, moveReportInDash, saveReport, updateReport, deleteReport, } = useDashboardStore(
    useShallow((s) => ({ dashboards: s.dashboards, savedReports: s.savedReports, activeDashId: s.activeDashId, setActiveDash: s.setActiveDash, createDashboard: s.createDashboard, deleteDashboard: s.deleteDashboard, updateDashboard: s.updateDashboard, addReportToDash: s.addReportToDash, removeReportFromDash: s.removeReportFromDash, moveReportInDash: s.moveReportInDash, saveReport: s.saveReport, updateReport: s.updateReport, deleteReport: s.deleteReport }))
  );

  // ── Local UI state ────────────────────────────────────────────────────────
  const [showLibrary, setShowLibrary]       = useState(false);
  const [showNewDash, setShowNewDash]       = useState(false);
  const [showMyReports, setShowMyReports]   = useState(false);
  const [showDashSettings, setShowDashSettings] = useState(false);
  const [libraryCategory, setLibraryCategory] = useState<string>('Tutti');

  // New dashboard wizard
  const [newDashName, setNewDashName]       = useState('');
  const [newDashVis, setNewDashVis]         = useState<DashboardVisibility>('everyone');
  const [newDashTemplate, setNewDashTemplate] = useState('tpl-sales');

  // Report customiser (add from library)
  const [pendingWidget, setPendingWidget]   = useState<ReportWidgetType | null>(null);
  const [pendingName, setPendingName]       = useState('');
  const [pendingFilters, setPendingFilters] = useState<ReportFilters>({
    dateRange: 'all', ownerId: null, teamId: null,
  });

  // My reports – inline edit
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editReportName, setEditReportName]   = useState('');
  const [editReportFilters, setEditReportFilters] = useState<ReportFilters>({
    dateRange: 'all', ownerId: null, teamId: null,
  });

  const currentDash = dashboards.find((d) => d.id === activeDashId) ?? dashboards[0];
  const firstName   = (profile?.full_name ?? 'Giuseppe').split(' ')[0];

  // ── Library categories (useMemo must be before any early return) ──────────
  const libraryCategories = useMemo(
    () => ['Tutti', ...Array.from(new Set(REPORT_LIBRARY_CATALOG.map((i) => i.category)))],
    [],
  );

  if (l1 || l2 || l3) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-500" size={28} /></div>;
  }

  // ── CRM calculations (used inside widget renderers via filter helpers) ──────
  const wonDeals   = deals.filter((d) => d.stage === 'won');
  const lostDeals  = deals.filter((d) => d.stage === 'lost');
  const winRate    = wonDeals.length + lostDeals.length
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
    : 0;

  const documentsWithViews = documents
    .filter((d) => d.viewsLog && d.viewsLog.length > 0)
    .map((d) => ({
      name: d.name,
      viewsCount: d.viewsLog?.length || 0,
      totalDuration: d.viewsLog?.reduce((acc, curr) => acc + curr.durationSeconds, 0) || 0,
    }))
    .sort((a, b) => b.viewsCount - a.viewsCount);

  // ── Filter helpers ─────────────────────────────────────────────────────────
  /** Apply date-range filter to an ISO date string */
  const withinDateRange = (dateStr: string, range: string) => {
    if (range === 'all') return true;
    const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[range] ?? 99999;
    return new Date(dateStr) >= new Date(Date.now() - days * 86400_000);
  };

  /** Filter deals by a report's saved filters */
  const filteredDeals = (filters: ReportFilters) =>
    deals.filter((d) => {
      const okDate = withinDateRange(d.closed_at ?? new Date().toISOString(), filters.dateRange);
      return okDate;
    });

  /** Filter tickets */
  const filteredTickets = (filters: ReportFilters) =>
    tickets.filter((t) => withinDateRange(t.created_at ?? new Date().toISOString(), filters.dateRange));

  /** Filter tasks */
  const filteredTasks = (filters: ReportFilters) => {
    let arr = tasks;
    if (filters.ownerId) arr = arr.filter((t) => t.assigneeId === filters.ownerId);
    return arr;
  };

  // ── Library categories (already declared above before early return) ────────

  // ── Report widget renderer ─────────────────────────────────────────────────
  const renderWidget = (report: SavedReport, idx: number) => {
    const { widgetType, filters, name: reportName } = report;
    const dashLen = currentDash?.reportIds.length ?? 0;
    const isFirst = idx === 0;
    const isLast  = idx === dashLen - 1;

    const headerControls = (
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button disabled={isFirst} onClick={() => moveReportInDash(currentDash.id, idx, 'up')}
          className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded disabled:opacity-20 text-surface-400">
          <ChevronUp size={13} />
        </button>
        <button disabled={isLast} onClick={() => moveReportInDash(currentDash.id, idx, 'down')}
          className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded disabled:opacity-20 text-surface-400">
          <ChevronDown size={13} />
        </button>
        <button onClick={() => removeReportFromDash(currentDash.id, report.id)}
          className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 text-risk-high rounded">
          <Trash2 size={13} />
        </button>
      </div>
    );

    // ── KPIs ─────────────────────────────────────────────────────────────────
    if (widgetType === 'kpis') {
      const fd = filteredDeals(filters);
      const fOpen = fd.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
      const fWon  = fd.filter((d) => d.stage === 'won');
      const fLost = fd.filter((d) => d.stage === 'lost');
      const fValue = fOpen.reduce((s, d) => s + d.value, 0);
      const fWin   = fWon.length + fLost.length
        ? Math.round((fWon.length / (fWon.length + fLost.length)) * 100)
        : winRate;
      return (
        <div key={report.id} className="lg:col-span-2 group relative border border-transparent hover:border-brand-500/30 rounded-xl transition-all">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[10px] text-surface-400 uppercase tracking-wider font-semibold flex items-center gap-1">
              <Filter size={9} /> {DATE_RANGE_LABELS[filters.dateRange]}
            </p>
            {headerControls}
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Pipeline aperta" value={formatCurrency(fValue)} change={12.4} icon={<DollarSign size={18} className="text-brand-600" />} color="bg-brand-50 dark:bg-brand-900/30" />
            <KpiCard label="Deal attivi"      value={String(fOpen.length)}  change={8.1}  icon={<TrendingUp size={18} className="text-trust-high" />} color="bg-green-50 dark:bg-green-900/30" />
            <KpiCard label="Contatti"         value={String(contacts.length)} change={5.2} icon={<Users size={18} className="text-amber-600" />} color="bg-amber-50 dark:bg-amber-900/30" />
            <KpiCard label="Win rate"         value={`${fWin}%`}            change={5.0}  icon={<Target size={18} className="text-purple-600" />} color="bg-purple-50 dark:bg-purple-900/30" />
          </div>
        </div>
      );
    }

    // ── Forecast Widget ──────────────────────────────────────────────────────
    if (widgetType === 'forecast') {
      return (
        <div key={report.id} className="lg:col-span-1 group relative">
          <div className="absolute right-2 top-2 z-10">{headerControls}</div>
          <ForecastWidget targetAmount={100000} />
        </div>
      );
    }

    // ── Monthly revenue ────────────────────────────────────────────────────
    if (widgetType === 'monthly_revenue') {
      return (
        <div key={report.id} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 group relative">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-450 flex items-center gap-1.5"><DollarSign size={14} /> {reportName}</h2>
            {headerControls}
          </div>
          <p className="text-[10px] text-surface-400 mb-3 flex items-center gap-1"><CalendarDays size={9} /> {DATE_RANGE_LABELS[filters.dateRange]}</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revenueTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Ricavi']} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // ── Deals by stage ────────────────────────────────────────────────────
    if (widgetType === 'deals_by_stage') {
      const fd = filteredDeals(filters);
      const sd = stages.filter((s) => s.stage_key !== 'lost').map((s) => ({
        stage: s.name.length > 8 ? s.name.slice(0, 7) + '.' : s.name,
        deals: fd.filter((d) => d.stage === s.stage_key).length,
      }));
      return (
        <div key={report.id} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 group relative">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-450 flex items-center gap-1.5"><BarChart3 size={14} /> {reportName}</h2>
            {headerControls}
          </div>
          <p className="text-[10px] text-surface-400 mb-3 flex items-center gap-1"><CalendarDays size={9} /> {DATE_RANGE_LABELS[filters.dateRange]}</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sd} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="stage" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="deals" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // ── AI Insights ────────────────────────────────────────────────────────
    if (widgetType === 'ai_insights') {
      return (
        <div key={report.id} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 group relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-450 flex items-center gap-1.5"><Sparkles size={14} className="text-brand-500" /> Insight AI consigliati</h2>
            {headerControls}
          </div>
          <ul className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
            {insights.map((ins) => (
              <li key={ins.id} className="flex items-start gap-2 text-xs">
                <span className={cn('w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5',
                  ins.insight_type === 'churn_warning' || ins.insight_type === 'risk_alert'
                    ? 'bg-risk-high/10 text-risk-high' : 'bg-brand-50 dark:bg-brand-900/30 text-brand-500')}>
                  <Sparkles size={12} />
                </span>
                <div>
                  <p className="text-surface-700 dark:text-surface-300 leading-normal">{ins.reasoning}</p>
                  <span className="text-[10px] text-surface-400 uppercase tracking-wide">Confidenza {Math.round(ins.confidence * 100)}%</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // ── Ticket status ─────────────────────────────────────────────────────
    if (widgetType === 'ticket_status') {
      const ft = filteredTickets(filters);
      const tbs = [
        { name: 'Aperti',    value: ft.filter((t) => t.status === 'open').length,        color: '#3b82f6' },
        { name: 'In Corso',  value: ft.filter((t) => t.status === 'in_progress').length,  color: '#f59e0b' },
        { name: 'In Attesa', value: ft.filter((t) => t.status === 'waiting').length,       color: '#8b5cf6' },
        { name: 'Risolti',   value: ft.filter((t) => t.status === 'resolved').length,      color: '#22c55e' },
      ];
      return (
        <div key={report.id} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 group relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-450 flex items-center gap-1.5"><TicketIcon size={14} /> {reportName}</h2>
            {headerControls}
          </div>
          <div className="flex items-center justify-between gap-4 h-[180px]">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={tbs.filter((x) => x.value > 0)} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                  {tbs.map((entry, i) => <Cell key={`c-${i}`} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 text-xs">
              {tbs.map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span>{t.name}</span>
                  </div>
                  <span className="font-bold">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── Ticket priority ───────────────────────────────────────────────────
    if (widgetType === 'ticket_prio') {
      const ft = filteredTickets(filters);
      const prios = [
        { priority: 'Bassa',   count: ft.filter((t) => t.priority === 'low').length,    cls: 'bg-surface-400' },
        { priority: 'Media',   count: ft.filter((t) => t.priority === 'medium').length, cls: 'bg-blue-500' },
        { priority: 'Alta',    count: ft.filter((t) => t.priority === 'high').length,   cls: 'bg-amber-500' },
        { priority: 'Urgente', count: ft.filter((t) => t.priority === 'urgent').length, cls: 'bg-risk-high animate-pulse' },
      ];
      return (
        <div key={report.id} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 group relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-450 flex items-center gap-1.5"><AlertTriangle size={14} /> Criticità Assistenza</h2>
            {headerControls}
          </div>
          <div className="space-y-3.5 pr-1">
            {prios.map((p, i) => (
              <div key={i} className="space-y-1 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-surface-700 dark:text-surface-300">{p.priority}</span>
                  <span className="font-bold">{p.count} ticket</span>
                </div>
                <div className="w-full bg-surface-100 dark:bg-surface-800 h-2 rounded-full overflow-hidden">
                  <div className={`${p.cls} h-full rounded-full transition-all`}
                    style={{ width: p.count > 0 ? `${(p.count / Math.max(1, ft.length)) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Task productivity ─────────────────────────────────────────────────
    if (widgetType === 'task_productivity') {
      const ft = filteredTasks(filters);
      const tot = ft.length;
      const comp = ft.filter((t) => t.status === 'completed').length;
      const pend = ft.filter((t) => t.status === 'pending').length;
      const cr   = tot > 0 ? Math.round((comp / tot) * 100) : 0;
      const ownerName = filters.ownerId
        ? members.find((m) => m.id === filters.ownerId)
          ? `${members.find((m) => m.id === filters.ownerId)!.first_name} ${members.find((m) => m.id === filters.ownerId)!.last_name}`
          : 'Membro'
        : null;
      return (
        <div key={report.id} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 group relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-surface-450 flex items-center gap-1.5"><CheckSquare size={14} /> {reportName}</h2>
              {ownerName && <p className="text-[10px] text-brand-500 font-medium mt-0.5">{ownerName}</p>}
            </div>
            {headerControls}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-brand-600 dark:text-brand-400">{cr}%</span>
              <div className="text-xs">
                <p className="font-bold text-surface-800 dark:text-white">Tasso di Completamento</p>
                <p className="text-[10px] text-surface-400 uppercase">{comp} eseguiti su {tot} totali</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-surface-50 dark:bg-surface-850 p-2.5 rounded-lg border border-surface-150 dark:border-surface-800">
                <span className="block text-[10px] text-surface-400 uppercase">Da Eseguire</span>
                <span className="text-lg font-bold text-surface-800 dark:text-white">{pend}</span>
              </div>
              <div className="bg-surface-50 dark:bg-surface-850 p-2.5 rounded-lg border border-surface-150 dark:border-surface-800">
                <span className="block text-[10px] text-surface-400 uppercase">Completati</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{comp}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Document engagement ───────────────────────────────────────────────
    if (widgetType === 'document_engagement') {
      return (
        <div key={report.id} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 group relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-450 flex items-center gap-1.5"><FileText size={14} /> Engagement Documenti</h2>
            {headerControls}
          </div>
          <div className="space-y-3.5 max-h-[180px] overflow-y-auto pr-1">
            {documentsWithViews.length === 0 ? (
              <p className="text-xs text-surface-400 text-center py-6">Nessun log di lettura registrato.</p>
            ) : (
              documentsWithViews.map((doc, i) => (
                <div key={i} className="flex justify-between items-center text-xs border-b border-surface-100 dark:border-surface-800 pb-2 last:border-b-0 last:pb-0">
                  <div className="truncate flex-1 pr-4">
                    <span className="font-semibold text-surface-800 dark:text-white truncate block">{doc.name}</span>
                    <span className="text-[10px] text-surface-400 uppercase block mt-0.5">Tempo totale: {doc.totalDuration}s</span>
                  </div>
                  <span className="bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-brand-500/20">
                    {doc.viewsCount} vis.
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    // ── Today Reminders ───────────────────────────────────────────────
    if (widgetType === 'today_reminders') {
      const myReminders = reminders.filter((r) => r.status === 'pending');
      const todayReminders = myReminders.filter((r) => isToday(r.remind_at) || new Date(r.remind_at).getTime() < Date.now());
      return (
        <div key={report.id} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 group relative">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-450 flex items-center gap-1.5"><Bell size={14} /> {reportName} {todayReminders.length > 0 && <span className="bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded text-[10px]">{todayReminders.length}</span>}</h2>
            {headerControls}
          </div>
          <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
            {todayReminders.length === 0 ? <Empty text="Nessun promemoria per oggi 🎉" /> : todayReminders.map(r => {
              const overdue = new Date(r.remind_at).getTime() < Date.now();
              return <Row key={r.id} icon={<Bell size={14} className={overdue ? 'text-risk-high' : 'text-amber-500'} />} title={r.title} meta={new Date(r.remind_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} badge={overdue ? { text: 'scaduto', color: '#ef4444' } : undefined} />
            })}
          </div>
        </div>
      );
    }

    // ── My Tickets (Operativo) ───────────────────────────────────────────────
    if (widgetType === 'my_tickets') {
      const isOwner = memberId === 'tm-owner';
      const myTickets = tickets.filter((t) => (isOwner || t.assignee_id === memberId) && t.status !== 'closed' && t.status !== 'resolved');
      return (
        <div key={report.id} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 group relative">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-450 flex items-center gap-1.5"><TicketIcon size={14} /> {reportName} {myTickets.length > 0 && <span className="bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded text-[10px]">{myTickets.length}</span>}</h2>
            {headerControls}
          </div>
          <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
            {myTickets.length === 0 ? <Empty text="Nessun ticket aperto" /> : myTickets.slice(0, 5).map(t => (
              <Row key={t.id} icon={<TicketIcon size={14} className="text-brand-500" />} title={t.title} meta={t.code} badge={t.priority === 'urgent' ? { text: 'urgente', color: '#ef4444' } : t.priority === 'high' ? { text: 'alta', color: '#f59e0b' } : undefined} />
            ))}
          </div>
        </div>
      );
    }

    // ── Upcoming Deadlines ───────────────────────────────────────────────
    if (widgetType === 'upcoming_deadlines') {
      const soonDeadlines = deadlines.filter((d) => d.status !== 'completed' && new Date(d.due_date).getTime() < Date.now() + 7 * DAY)
        .sort((a, b) => +new Date(a.due_date) - +new Date(b.due_date));
      return (
        <div key={report.id} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 group relative">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-450 flex items-center gap-1.5"><CalendarClock size={14} /> {reportName} {soonDeadlines.length > 0 && <span className="bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded text-[10px]">{soonDeadlines.length}</span>}</h2>
            {headerControls}
          </div>
          <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
            {soonDeadlines.length === 0 ? <Empty text="Nessuna scadenza a breve" /> : soonDeadlines.map(d => {
              const overdue = new Date(d.due_date).getTime() < Date.now();
              return <Row key={d.id} icon={overdue ? <AlertTriangle size={14} className="text-risk-high" /> : <CalendarClock size={14} className="text-amber-500" />} title={d.title} meta={`${new Date(d.due_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}${d.amount ? ` · ${formatCurrency(d.amount)}` : ''}`} badge={overdue ? { text: 'scaduta', color: '#ef4444' } : undefined} />
            })}
          </div>
        </div>
      );
    }

    // ── Recent Documents (Operativo) ───────────────────────────────────────────────
    if (widgetType === 'recent_documents') {
      const recentDocs = [...documents].slice(0, 5);
      return (
        <div key={report.id} className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 group relative">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-450 flex items-center gap-1.5"><FolderOpen size={14} /> {reportName}</h2>
            {headerControls}
          </div>
          <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
            {recentDocs.length === 0 ? <Empty text="Nessun documento" /> : recentDocs.map(d => (
              <Row key={d.id} icon={d.verified ? <CheckCircle2 size={14} className="text-trust-high" /> : <FolderOpen size={14} className="text-surface-400" />} title={d.name} meta={d.from ?? 'documento'} />
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreateDashboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDashName.trim()) return;
    const tpl = DASHBOARD_TEMPLATES.find((t) => t.id === newDashTemplate);
    createDashboard({
      name: newDashName.trim(),
      visibility: newDashVis,
      allowedTeamIds: [],
      allowedMemberIds: [],
      templateReportIds: tpl?.reportIds ?? [],
      createdBy: memberId ?? 'tm-owner',
    });
    setNewDashName('');
    setNewDashVis('everyone');
    setNewDashTemplate('tpl-sales');
    setShowNewDash(false);
  };

  const openLibraryForWidget = (wt: ReportWidgetType) => {
    const libItem = REPORT_LIBRARY_CATALOG.find((i) => i.widgetType === wt);
    setPendingWidget(wt);
    setPendingName(libItem?.name ?? '');
    setPendingFilters({ dateRange: 'all', ownerId: null, teamId: null });
  };

  const handleSaveAndAddReport = () => {
    if (!pendingWidget || !currentDash) return;
    const newRep = saveReport({
      name: pendingName,
      widgetType: pendingWidget,
      filters: pendingFilters,
      createdBy: memberId ?? 'tm-owner',
    });
    addReportToDash(currentDash.id, newRep.id);
    setPendingWidget(null);
    setShowLibrary(false);
  };

  const handleStartEditReport = (rep: SavedReport) => {
    setEditingReportId(rep.id);
    setEditReportName(rep.name);
    setEditReportFilters({ ...rep.filters });
  };

  const handleSaveEditReport = () => {
    if (!editingReportId) return;
    updateReport(editingReportId, { name: editReportName, filters: editReportFilters });
    setEditingReportId(null);
  };

  // ── Filter editor sub-component ────────────────────────────────────────────
  const FilterEditor = ({
    filters, onChange,
  }: {
    filters: ReportFilters;
    onChange: (f: ReportFilters) => void;
  }) => (
    <div className="space-y-3 mt-3 p-3 bg-surface-50 dark:bg-surface-850 rounded-xl border border-surface-200 dark:border-surface-800">
      <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 flex items-center gap-1"><Filter size={9} /> Filtri del report</p>
      <div>
        <label className="block text-[10px] text-surface-400 mb-1">Intervallo di tempo</label>
        <select value={filters.dateRange}
          onChange={(e) => onChange({ ...filters, dateRange: e.target.value as ReportFilters['dateRange'] })}
          className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-2 py-1.5 text-xs text-surface-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/25">
          {Object.entries(DATE_RANGE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-surface-400 mb-1">Responsabile (assegnatario)</label>
        <select value={filters.ownerId ?? ''}
          onChange={(e) => onChange({ ...filters, ownerId: e.target.value || null })}
          className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-2 py-1.5 text-xs text-surface-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/25">
          <option value="">Tutti i membri</option>
          {members.filter((m) => m.status === 'active').map((m) => (
            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
          ))}
        </select>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Top bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">{greeting()}, {firstName}</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5 flex items-center gap-1.5">
            <span>Qi-CRM Home e Monitoraggio</span>
            <span className="text-surface-300 dark:text-surface-700">·</span>
            <span>{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Dashboard selector */}
          <div className="relative flex items-center bg-white dark:bg-surface-900 rounded-lg px-3 py-1.5 border border-surface-200 dark:border-surface-800 shadow-sm gap-2">
            <LayoutDashboard size={14} className="text-surface-500 shrink-0" />
            <select value={activeDashId} onChange={(e) => setActiveDash(e.target.value)}
              className="bg-transparent text-xs font-bold text-surface-700 dark:text-surface-200 pr-5 focus:outline-none cursor-pointer appearance-none max-w-[160px] truncate"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '12px',
              }}>
              {dashboards.map((d) => (
                <option key={d.id} value={d.id} className="bg-white dark:bg-surface-900">{d.name}</option>
              ))}
            </select>
            {currentDash && <VisibilityBadge vis={currentDash.visibility} />}
          </div>

          {/* Settings for current dash */}
          <button onClick={() => setShowDashSettings(true)} title="Impostazioni Dashboard"
            className="p-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg text-surface-600 dark:text-surface-300 transition-colors">
            <Settings size={15} />
          </button>

          {/* My Reports */}
          <button onClick={() => setShowMyReports(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 text-xs font-bold rounded-lg transition-colors">
            <BookOpen size={13} /> I Miei Report
          </button>

          {/* New dashboard */}
          <button onClick={() => setShowNewDash(true)} title="Nuova Dashboard"
            className="p-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg text-surface-600 dark:text-surface-300 transition-colors">
            <Plus size={16} />
          </button>

          {/* Add report */}
          <button onClick={() => setShowLibrary(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
            <BarChart3 size={13} /> Aggiungi Report
          </button>
        </div>
      </div>

      {/* ── Dashboard widgets grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {currentDash?.reportIds.map((rid, idx) => {
          const report = savedReports.find((r) => r.id === rid);
          if (!report) return null;
          return renderWidget(report, idx);
        })}

        {/* Empty state */}
        {(!currentDash || currentDash.reportIds.length === 0) && (
          <div className="lg:col-span-2 flex flex-col items-center justify-center py-20 text-center">
            <BarChart3 size={40} className="text-surface-300 dark:text-surface-700 mb-3" />
            <p className="text-sm font-semibold text-surface-500">Dashboard vuota</p>
            <p className="text-xs text-surface-400 mt-1 mb-4">Aggiungi report dalla libreria per iniziare.</p>
            <button onClick={() => setShowLibrary(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors">
              <Plus size={13} /> Aggiungi Report
            </button>
          </div>
        )}
      </div>

      {/* ── Footer watermark ── */}
      <p className="text-[10px] text-surface-400 text-center pt-2">
        Powered by <span className="font-semibold text-surface-500">Giuseppe Lobbene / Lobbenedesign</span>
      </p>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL: New Dashboard ── */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {showNewDash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateDashboard}
            className="bg-white dark:bg-surface-900 p-6 rounded-2xl border border-surface-200 dark:border-surface-800 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2"><Plus size={16} className="text-brand-500" /> Nuova Dashboard</h3>
              <button type="button" onClick={() => setShowNewDash(false)} className="text-surface-400 hover:text-surface-600"><X size={16} /></button>
            </div>

            {/* Template picker */}
            <div>
              <label className="block text-[10px] font-bold text-surface-450 uppercase mb-2">Scegli Template</label>
              <div className="grid grid-cols-2 gap-2">
                {DASHBOARD_TEMPLATES.map((tpl) => (
                  <button key={tpl.id} type="button" onClick={() => setNewDashTemplate(tpl.id)}
                    className={cn('p-3 rounded-xl border text-left transition-all', newDashTemplate === tpl.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-850')}>
                    <span className="text-xl block mb-1">{tpl.icon}</span>
                    <p className="text-xs font-bold text-surface-800 dark:text-white leading-tight">{tpl.name}</p>
                    <p className="text-[10px] text-surface-400 mt-0.5 leading-relaxed">{tpl.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[10px] font-bold text-surface-450 uppercase mb-1">Nome Dashboard</label>
              <input type="text" required value={newDashName} onChange={(e) => setNewDashName(e.target.value)}
                className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/25"
                placeholder="es. Cruscotto Commerciale Q3" />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-[10px] font-bold text-surface-450 uppercase mb-2">Visibilità</label>
              <div className="flex gap-2">
                {(['private', 'everyone', 'teams'] as DashboardVisibility[]).map((v) => (
                  <button key={v} type="button" onClick={() => setNewDashVis(v)}
                    className={cn('flex-1 py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all', newDashVis === v
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800')}>
                    {v === 'private' ? '🔒 Privata' : v === 'everyone' ? '🌐 Tutti' : '👥 Team'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewDash(false)}
                className="px-3 py-1.5 text-xs text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg">Annulla</button>
              <button type="submit"
                className="px-4 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg shadow-sm">Crea Dashboard</button>
            </div>
          </form>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL: Dashboard Settings ── */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {showDashSettings && currentDash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-900 p-6 rounded-2xl border border-surface-200 dark:border-surface-800 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2"><Settings size={15} className="text-brand-500" /> Impostazioni Dashboard</h3>
              <button onClick={() => setShowDashSettings(false)} className="text-surface-400 hover:text-surface-600"><X size={16} /></button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-surface-450 uppercase mb-1">Nome</label>
              <input type="text" defaultValue={currentDash.name}
                onBlur={(e) => updateDashboard(currentDash.id, { name: e.target.value })}
                className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/25" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-surface-450 uppercase mb-2">Visibilità</label>
              <div className="flex gap-2">
                {(['private', 'everyone', 'teams'] as DashboardVisibility[]).map((v) => (
                  <button key={v} onClick={() => updateDashboard(currentDash.id, { visibility: v })}
                    className={cn('flex-1 py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all', currentDash.visibility === v
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800')}>
                    {v === 'private' ? '🔒 Privata' : v === 'everyone' ? '🌐 Tutti' : '👥 Team'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-surface-100 dark:border-surface-800 flex justify-between items-center">
              <button onClick={() => { deleteDashboard(currentDash.id); setShowDashSettings(false); }}
                className="text-xs text-risk-high hover:underline flex items-center gap-1"><Trash2 size={12} /> Elimina dashboard</button>
              <button onClick={() => setShowDashSettings(false)}
                className="px-4 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg">Chiudi</button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL: Report Library ── */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-surface-150 dark:border-surface-800">
              <h3 className="text-sm font-bold flex items-center gap-2"><BarChart3 size={16} className="text-brand-500" /> Libreria dei Report</h3>
              <button onClick={() => { setShowLibrary(false); setPendingWidget(null); }} className="text-surface-400 hover:text-surface-600"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Category tabs */}
              <div className="flex gap-1 p-4 pb-0 flex-wrap">
                {libraryCategories.map((cat) => (
                  <button key={cat} onClick={() => setLibraryCategory(cat)}
                    className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors', libraryCategory === cat
                      ? 'bg-brand-600 text-white'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700')}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Items */}
              <div className="space-y-1 p-4">
                {REPORT_LIBRARY_CATALOG.filter(
                  (i) => libraryCategory === 'Tutti' || i.category === libraryCategory
                ).map((item) => {
                  const isSelected = pendingWidget === item.widgetType;
                  const alreadyIn = currentDash?.reportIds.some((rid) => {
                    const rep = savedReports.find((r) => r.id === rid);
                    return rep?.widgetType === item.widgetType;
                  });
                  return (
                    <div key={item.widgetType}>
                      <button onClick={() => openLibraryForWidget(item.widgetType)}
                        className={cn('w-full flex items-start justify-between gap-4 p-3 rounded-xl border text-left transition-all',
                          isSelected
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                            : 'border-surface-150 dark:border-surface-800/80 hover:bg-surface-50/50 dark:hover:bg-surface-850/10')}>
                        <div className="text-xs space-y-0.5 flex-1">
                          <p className="font-bold text-surface-850 dark:text-white flex items-center gap-1.5">
                            {item.name}
                            {alreadyIn && <span className="text-[9px] bg-surface-200 dark:bg-surface-700 text-surface-500 px-1.5 py-0.5 rounded-full font-normal">già presente</span>}
                          </p>
                          <p className="text-[11px] text-surface-450 leading-relaxed">{item.desc}</p>
                          <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-semibold">{item.category}</span>
                        </div>
                        <ChevronRight size={14} className={cn('mt-1 shrink-0 transition-transform', isSelected ? 'rotate-90 text-brand-500' : 'text-surface-400')} />
                      </button>

                      {/* Inline customiser */}
                      {isSelected && (
                        <div className="mx-3 mb-2 p-4 border border-brand-200 dark:border-brand-900/50 bg-brand-50/50 dark:bg-brand-900/10 rounded-xl space-y-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Personalizza prima di aggiungere</p>
                          <div>
                            <label className="block text-[10px] text-surface-400 mb-1">Nome personalizzato</label>
                            <input type="text" value={pendingName} onChange={(e) => setPendingName(e.target.value)}
                              className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-1.5 text-xs text-surface-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/25" />
                          </div>
                          <FilterEditor filters={pendingFilters} onChange={setPendingFilters} />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setPendingWidget(null)} className="px-3 py-1 text-xs text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg">Annulla</button>
                            <button onClick={handleSaveAndAddReport}
                              className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg">
                              <Save size={11} /> Salva in I Miei Report &amp; Aggiungi
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-surface-150 dark:border-surface-800 flex justify-end">
              <button onClick={() => { setShowLibrary(false); setPendingWidget(null); }}
                className="px-4 py-2 border border-surface-250 dark:border-surface-750 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-semibold rounded-lg">
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL: My Reports ── */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {showMyReports && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 max-w-xl w-full shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-5 border-b border-surface-150 dark:border-surface-800">
              <h3 className="text-sm font-bold flex items-center gap-2"><Eye size={16} className="text-brand-500" /> I Miei Report</h3>
              <button onClick={() => { setShowMyReports(false); setEditingReportId(null); }} className="text-surface-400 hover:text-surface-600"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {savedReports.length === 0 && (
                <p className="text-xs text-surface-400 text-center py-8">Nessun report salvato. Aggiungi report dalla libreria.</p>
              )}
              {savedReports.map((rep) => {
                const libItem = REPORT_LIBRARY_CATALOG.find((i) => i.widgetType === rep.widgetType);
                const isEditing = editingReportId === rep.id;
                const ownerMember = rep.filters.ownerId ? members.find((m) => m.id === rep.filters.ownerId) : null;
                return (
                  <div key={rep.id} className={cn('rounded-xl border p-3 transition-all',
                    isEditing ? 'border-brand-400 bg-brand-50/40 dark:bg-brand-900/10' : 'border-surface-150 dark:border-surface-800')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input type="text" value={editReportName} onChange={(e) => setEditReportName(e.target.value)}
                            className="w-full bg-white dark:bg-surface-800 border border-brand-300 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500/25" />
                        ) : (
                          <p className="text-xs font-bold text-surface-850 dark:text-white truncate">{rep.name}</p>
                        )}
                        <p className="text-[10px] text-surface-400 mt-0.5">{libItem?.category} · {DATE_RANGE_LABELS[rep.filters.dateRange]}{ownerMember ? ` · ${ownerMember.first_name}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isEditing ? (
                          <>
                            <button onClick={() => handleStartEditReport(rep)} className="p-1.5 text-surface-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"><Pencil size={12} /></button>
                            <button onClick={() => { addReportToDash(currentDash?.id ?? '', rep.id); setShowMyReports(false); }}
                              className="p-1.5 text-surface-400 hover:text-trust-high hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Aggiungi alla dashboard corrente">
                              <Plus size={12} />
                            </button>
                            <button onClick={() => deleteReport(rep.id)} className="p-1.5 text-surface-400 hover:text-risk-high hover:bg-risk-high/10 rounded-lg transition-colors"><Trash2 size={12} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditingReportId(null)} className="p-1 text-surface-400 hover:text-surface-600"><X size={12} /></button>
                            <button onClick={handleSaveEditReport}
                              className="flex items-center gap-1 px-2 py-1 bg-brand-600 text-white text-[10px] font-bold rounded-lg"><Save size={10} /> Salva</button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditing && (
                      <FilterEditor filters={editReportFilters} onChange={setEditReportFilters} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-surface-150 dark:border-surface-800 flex justify-end">
              <button onClick={() => { setShowMyReports(false); setEditingReportId(null); }}
                className="px-4 py-2 border border-surface-250 dark:border-surface-750 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-semibold rounded-lg">
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ icon, title, meta, badge, onClick }: { icon: React.ReactNode; title: string; meta: string; badge?: { text: string; color: string }; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors text-left border border-transparent hover:border-surface-200 dark:hover:border-surface-700">
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-surface-800 dark:text-surface-100 truncate">{title}</p>
        <p className="text-[10px] text-surface-400 truncate">{meta}</p>
      </div>
      {badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wide" style={{ backgroundColor: `${badge.color}20`, color: badge.color }}>{badge.text}</span>}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-surface-400 py-6 text-center">{text}</p>;
}

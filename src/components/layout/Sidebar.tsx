import { NavLink } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import {
  LayoutDashboard, Users, Building2, TrendingUp,
  Zap, BarChart3, Bot, Users2, ScrollText,
  Ticket, Bell, Plug, Settings, ChevronLeft, Crown,
  Calendar, FileText, FolderOpen, Mail, MessageSquare, CheckSquare,
  Target, GitBranch, LineChart, Megaphone, Share2
} from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { can, type Permission } from '../../lib/permissions';
import { cn } from '../../lib/utils';

interface NavItem { to: string; icon: typeof Users; label: string; perm: Permission; tour?: string; }

const NAV: NavItem[] = [
  // 1. Core Operations
  { to: '/',            icon: LayoutDashboard, label: 'Home',        perm: 'dashboard:view' },
  { to: '/contacts',    icon: Users,           label: 'Contatti',    perm: 'contacts:view', tour: 'nav-contacts' },
  { to: '/companies',   icon: Building2,       label: 'Clienti',     perm: 'companies:view' },
  { to: '/pipeline',    icon: TrendingUp,      label: 'Pipeline',    perm: 'pipeline:view', tour: 'nav-pipeline' },
  { to: '/forecast',    icon: LineChart,       label: 'Forecast',    perm: 'analytics:view' },
  { to: '/tickets',     icon: Ticket,          label: 'Ticket',      perm: 'tickets:view', tour: 'nav-tickets' },
  { to: '/inbox',       icon: MessageSquare,   label: 'Inbox Chat',  perm: 'tickets:view' },
  { to: '/tasks',       icon: CheckSquare,     label: 'Task Coda',    perm: 'dashboard:view' },


  // 2. Billing & Admin Documents
  { to: '/contracts',   icon: FileText,        label: 'Contratti',    perm: 'contracts:view', tour: 'nav-contracts2' },
  { to: '/quotes',      icon: FileText,        label: 'Preventivi',   perm: 'invoices:view' },
  { to: '/invoices',    icon: ScrollText,      label: 'Fatture',     perm: 'invoices:view', tour: 'nav-invoices' },
  { to: '/documents',   icon: FolderOpen,      label: 'Documenti',    perm: 'contracts:view', tour: 'nav-documents' },
  { to: '/deadlines',   icon: Calendar,        label: 'Scadenzario',  perm: 'deadlines:view', tour: 'nav-deadlines' },

  // 3. Marketing & Operations Automation
  { to: '/marketing',   icon: Mail,            label: 'Marketing',   perm: 'marketing:view' },
  { to: '/broadcast',   icon: Megaphone,       label: 'Broadcast',   perm: 'marketing:view' },
  { to: '/social',      icon: Share2,          label: 'Social',      perm: 'marketing:view' },
  { to: '/sequences',   icon: GitBranch,        label: 'Qi-Flow',     perm: 'marketing:view' },
  { to: '/lead-scoring',icon: Target,           label: 'Qi-Score',    perm: 'contacts:view' },
  { to: '/reminders',   icon: Bell,            label: 'Promemoria',  perm: 'reminders:view', tour: 'nav-reminders' },
  { to: '/automations', icon: Zap,             label: 'Automazioni', perm: 'automations:view', tour: 'nav-automations' },
  { to: '/analytics',   icon: BarChart3,       label: 'Analytics',   perm: 'analytics:view' },

  // 4. AI & Collaboration
  { to: '/ai',          icon: Bot,             label: 'AI Hub',      perm: 'ai:view', tour: 'nav-ai' },

  // 5. System Administration (Superadmin / Management)
  { to: '/team',        icon: Users2,          label: 'Team',         perm: 'team:manage', tour: 'nav-team' },
  { to: '/integrations', icon: Plug,           label: 'Integrazioni', perm: 'team:manage', tour: 'nav-integrations' },
  { to: '/audit',       icon: ScrollText,      label: 'Audit Log',    perm: 'audit:view', tour: 'nav-audit' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore(
    useShallow((s) => ({ sidebarCollapsed: s.sidebarCollapsed, toggleSidebar: s.toggleSidebar }))
  );
  const role = useAuthStore((s) => s.role);

  const items = NAV.filter((n) => can(role ?? undefined, n.perm));

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-surface-200 dark:border-surface-800',
        'bg-white dark:bg-surface-950 transition-all duration-200 shrink-0',
        sidebarCollapsed ? 'w-14' : 'w-60',
      )}
    >
      {/* Logo */}
      <div data-tour="logo" className="flex items-center gap-2 px-4 h-14 border-b border-surface-200 dark:border-surface-800">
        <Crown className="text-brand-600 shrink-0" size={22} />
        {!sidebarCollapsed && (
          <span className="font-semibold text-surface-900 dark:text-surface-100 tracking-tight text-lg">
            Qi-CRM
          </span>
        )}
      </div>

      {/* Nav */}
      <nav data-tour="nav" className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
        {items.map(({ to, icon: Icon, label, tour }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            data-tour={tour}
            className={({ isActive }) => cn('sidebar-item', isActive && 'active')}
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-surface-200 dark:border-surface-800 flex flex-col gap-1">
        <NavLink
          to="/settings"
          className={({ isActive }) => cn('sidebar-item', isActive && 'active')}
          title={sidebarCollapsed ? 'Impostazioni' : undefined}
        >
          <Settings size={18} className="shrink-0" />
          {!sidebarCollapsed && <span>Impostazioni</span>}
        </NavLink>

        <button
          onClick={toggleSidebar}
          className="sidebar-item justify-center"
          title={sidebarCollapsed ? 'Espandi' : 'Comprimi'}
        >
          <ChevronLeft
            size={18}
            className={cn('transition-transform', sidebarCollapsed && 'rotate-180')}
          />
        </button>
      </div>
    </aside>
  );
}

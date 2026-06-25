import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, TrendingUp, Ticket, Bell, FileText, ReceiptText } from 'lucide-react';
import { can } from '../../lib/permissions';
import { useAuthStore } from '../../store/authStore';
import { useQuickCreateStore, type QuickTarget } from '../../store/quickCreateStore';

interface Item { label: string; icon: React.ReactNode; perm: string; modal?: Exclude<QuickTarget, null>; to?: string; }

const ITEMS: Item[] = [
  { label: 'Nuovo contatto',   icon: <Users size={15} />,       perm: 'contacts:create', modal: 'contact' },
  { label: 'Nuovo deal',       icon: <TrendingUp size={15} />,  perm: 'deals:create',    modal: 'deal' },
  { label: 'Nuovo ticket',     icon: <Ticket size={15} />,      perm: 'tickets:create',  modal: 'ticket' },
  { label: 'Nuovo promemoria', icon: <Bell size={15} />,        perm: 'reminders:view',  modal: 'reminder' },
  { label: 'Nuovo contratto',  icon: <FileText size={15} />,    perm: 'contracts:create', to: '/contracts' },
  { label: 'Nuova fattura',    icon: <ReceiptText size={15} />, perm: 'invoices:create',  to: '/invoices' },
];

/** Menu globale di creazione rapida ("+") — accesso a 1 click da qualsiasi pagina. */
export function QuickAdd() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);
  const openModal = useQuickCreateStore((s) => s.open);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const items = ITEMS.filter((i) => can(role ?? undefined, i.perm));
  if (items.length === 0) return null;

  const run = (i: Item) => {
    setOpen(false);
    if (i.modal) openModal(i.modal);
    else if (i.to) navigate(i.to);
  };

  return (
    <div className="relative" ref={ref} data-tour="quickadd">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Crea nuovo"
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus size={16} /> <span className="hidden sm:inline">Crea</span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-56 bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700 shadow-lg py-1 z-50">
          {items.map((i) => (
            <button key={i.label}
              onClick={() => run(i)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
              <span className="text-surface-400">{i.icon}</span> {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Users, TrendingUp, Building2, Bot, X,
  CornerDownLeft, User as UserIcon,
} from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { repo } from '../../lib/repo';
import { cn, formatCurrency } from '../../lib/utils';
import type { Contact, Company, Deal } from '../../types/crm';

interface Item {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  group: string;
  action: () => void;
}

export function CommandPalette() {
  const { commandOpen, closeCommand } = useUiStore(
    useShallow((s) => ({ commandOpen: s.commandOpen, closeCommand: s.closeCommand }))
  );
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [data, setData] = useState<{ contacts: Contact[]; companies: Company[]; deals: Deal[] }>({
    contacts: [], companies: [], deals: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const navItems: Item[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, group: 'Naviga', action: () => navigate('/') },
    { id: 'contacts',  label: 'Contatti',  icon: <Users size={16} />,           group: 'Naviga', action: () => navigate('/contacts') },
    { id: 'companies', label: 'Aziende',   icon: <Building2 size={16} />,       group: 'Naviga', action: () => navigate('/companies') },
    { id: 'pipeline',  label: 'Pipeline',  icon: <TrendingUp size={16} />,      group: 'Naviga', action: () => navigate('/pipeline') },
    { id: 'ai',        label: 'AI Assistant', icon: <Bot size={16} />,          group: 'Naviga', action: () => navigate('/ai') },
    { id: 'new-contact', label: 'Nuovo Contatto', description: 'Crea un contatto', icon: <Users size={16} />, group: 'Azioni', action: () => navigate('/contacts?new=1') },
    { id: 'new-deal',  label: 'Nuovo Deal', description: 'Crea un deal',         icon: <TrendingUp size={16} />, group: 'Azioni', action: () => navigate('/pipeline?new=1') },
  ];

  // Carica entità quando si apre
  useEffect(() => {
    if (!commandOpen) return;
    setQuery(''); setSelected(0);
    setTimeout(() => inputRef.current?.focus(), 50);
    Promise.all([repo.listContacts(), repo.listCompanies(), repo.listDeals()]).then(([c, co, d]) =>
      setData({ contacts: c as Contact[], companies: co as Company[], deals: d as Deal[] }),
    );
  }, [commandOpen]);

  const q = query.trim().toLowerCase();

  const entityItems: Item[] = q
    ? [
        ...data.contacts
          .filter((c) => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(q))
          .slice(0, 5)
          .map((c) => ({
            id: `c-${c.id}`, label: `${c.first_name} ${c.last_name}`, description: c.email ?? c.job_title ?? '',
            icon: <UserIcon size={16} />, group: 'Contatti', action: () => navigate('/contacts'),
          })),
        ...data.companies
          .filter((c) => `${c.name} ${c.domain}`.toLowerCase().includes(q))
          .slice(0, 4)
          .map((c) => ({
            id: `co-${c.id}`, label: c.name, description: c.industry ?? c.domain ?? '',
            icon: <Building2 size={16} />, group: 'Aziende', action: () => navigate('/companies'),
          })),
        ...data.deals
          .filter((d) => d.title.toLowerCase().includes(q))
          .slice(0, 4)
          .map((d) => ({
            id: `d-${d.id}`, label: d.title, description: formatCurrency(d.value, d.currency),
            icon: <TrendingUp size={16} />, group: 'Deal', action: () => navigate('/pipeline'),
          })),
      ]
    : [];

  const filteredNav = q
    ? navItems.filter((i) => i.label.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q))
    : navItems;

  const allItems = [...filteredNav, ...entityItems];

  // ⌘K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        commandOpen ? closeCommand() : useUiStore.getState().openCommand();
      }
      if (e.key === 'Escape' && commandOpen) closeCommand();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandOpen, closeCommand]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && allItems[selected]) { allItems[selected].action(); closeCommand(); }
  };

  if (!commandOpen) return null;

  // Raggruppa preservando l'ordine
  const groups: { name: string; items: Item[] }[] = [];
  allItems.forEach((item) => {
    let g = groups.find((x) => x.name === item.group);
    if (!g) { g = { name: item.group, items: [] }; groups.push(g); }
    g.items.push(item);
  });
  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={closeCommand}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-surface-900 rounded-xl shadow-2xl
                   border border-surface-200 dark:border-surface-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
          <Search size={16} className="text-surface-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={onKeyDown}
            placeholder="Cerca contatti, aziende, deal o esegui un comando…"
            className="flex-1 bg-transparent text-sm text-surface-900 dark:text-surface-100
                       placeholder:text-surface-400 outline-none"
          />
          <button onClick={closeCommand} className="text-surface-400 hover:text-surface-600"><X size={16} /></button>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {allItems.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-surface-400">Nessun risultato per "{query}"</div>
          ) : (
            groups.map((group) => (
              <div key={group.name}>
                <div className="px-4 py-1.5 text-[11px] font-semibold text-surface-400 uppercase tracking-wide">
                  {group.name}
                </div>
                {group.items.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { item.action(); closeCommand(); }}
                      onMouseEnter={() => setSelected(idx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors',
                        idx === selected
                          ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                          : 'text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800',
                      )}
                    >
                      <span className="text-surface-400">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.label}</div>
                        {item.description && <div className="text-xs text-surface-400 truncate">{item.description}</div>}
                      </div>
                      {idx === selected && <CornerDownLeft size={13} className="text-surface-300 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-surface-200 dark:border-surface-700 flex gap-4 text-xs text-surface-400">
          <span>↑↓ naviga</span><span>↵ esegui</span><span>esc chiudi</span>
        </div>
      </div>
    </div>
  );
}

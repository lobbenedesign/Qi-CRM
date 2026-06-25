import { useState, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Bell, LogOut, User as UserIcon, Database, HelpCircle } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useTourStore } from '../../store/tourStore';
import { USING_MOCK } from '../../lib/repo';
import { ROLE_META } from '../../lib/permissions';
import { initials } from '../../lib/utils';
import { QuickAdd } from './QuickAdd';

export function Header() {
  const { openCommand, toggleDarkMode, darkMode, toggleNotif } = useUiStore(
    useShallow((s) => ({ openCommand: s.openCommand, toggleDarkMode: s.toggleDarkMode, darkMode: s.darkMode, toggleNotif: s.toggleNotif }))
  );
  const { profile, signOut, role } = useAuthStore(
    useShallow((s) => ({ profile: s.profile, signOut: s.signOut, role: s.role }))
  );
  const startTour = useTourStore((s) => s.start);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [first, last] = (profile?.full_name ?? 'Giuseppe Lobbene').split(' ');

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const onLogout = () => {
    signOut();
    navigate('/login');
  };

  return (
    <header className="flex items-center h-14 px-4 gap-3 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950 shrink-0">
      {/* Search trigger — opens Command Palette */}
      <button
        data-tour="cmdk"
        onClick={openCommand}
        className="flex items-center gap-2 flex-1 max-w-md px-3 py-1.5 rounded-md
                   bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400
                   text-sm hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      >
        <Search size={15} />
        <span>Cerca o esegui un comando…</span>
        <kbd className="ml-auto text-xs bg-surface-200 dark:bg-surface-700 px-1.5 py-0.5 rounded font-mono">
          ⌘K
        </kbd>
      </button>

      {USING_MOCK && (
        <span className="hidden md:flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400
                         bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full font-medium">
          <Database size={12} />
          Demo (dati mock)
        </span>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        <QuickAdd />

        <button
          onClick={() => startTour(false)}
          title="Avvia il tour guidato"
          className="p-2 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800
                     text-surface-500 dark:text-surface-400 transition-colors"
        >
          <HelpCircle size={18} />
        </button>

        <button
          data-tour="notifications"
          onClick={toggleNotif}
          className="p-2 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800
                     text-surface-500 dark:text-surface-400 transition-colors"
        >
          <Bell size={18} />
        </button>

        <button
          data-tour="theme"
          onClick={toggleDarkMode}
          className="p-2 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800
                     text-surface-500 dark:text-surface-400 transition-colors"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Avatar + menu */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center
                       text-white text-xs font-semibold cursor-pointer hover:bg-brand-600 transition-colors"
          >
            {initials(first, last)}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 w-52 bg-white dark:bg-surface-900 rounded-lg
                            border border-surface-200 dark:border-surface-700 shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-surface-100 dark:border-surface-800">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                  {profile?.full_name ?? 'Utente'}
                </p>
                <p className="text-xs" style={{ color: role ? ROLE_META[role].color : undefined }}>
                  {role ? ROLE_META[role].label : 'Utente'}
                </p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700
                           dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                <UserIcon size={14} /> Profilo
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-risk-high
                           hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                <LogOut size={14} /> Esci
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

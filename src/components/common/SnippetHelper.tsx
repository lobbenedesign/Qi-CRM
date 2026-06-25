import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useSnippetsStore, type Snippet } from '../../store/snippetsStore';
import { Hash, Sparkles, MessageSquare, Search } from 'lucide-react';

interface SnippetHelperProps {
  onSelect: (text: string) => void;
  className?: string;
}

export function SnippetHelper({ onSelect, className = '' }: SnippetHelperProps) {
  const { snippets, incrementSnippetUse } = useSnippetsStore(
    useShallow((s) => ({ snippets: s.snippets, incrementSnippetUse: s.incrementSnippetUse }))
  );
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = snippets.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.shortcut.toLowerCase().includes(search.toLowerCase()) ||
    s.text.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (snippet: Snippet) => {
    onSelect(snippet.text);
    incrementSnippetUse(snippet.id);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 bg-brand-500/10 dark:bg-brand-500/20 px-2 py-1 rounded-md transition-all"
        title="Inserisci una risposta rapida o snippet"
      >
        <Hash size={12} />
        <span>Snippets</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearch('');
            }}
          />
          <div className="absolute right-0 bottom-8 z-50 w-72 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-2.5 bg-surface-50 dark:bg-surface-850 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
              <span className="text-[11px] font-bold text-surface-700 dark:text-surface-300 flex items-center gap-1">
                <Sparkles size={11} className="text-brand-500" />
                <span>Libreria Risposte Rapide</span>
              </span>
              <span className="text-[9px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 px-1 py-0.5 rounded">
                Pre-configurate
              </span>
            </div>

            {/* Search Input */}
            <div className="p-2 border-b border-surface-100 dark:border-surface-800 flex items-center gap-1.5">
              <Search size={12} className="text-surface-400" />
              <input
                type="text"
                placeholder="Cerca per shortcut (es. #prezzi)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-[11px] focus:outline-none placeholder:text-surface-400 dark:placeholder:text-surface-550 text-surface-900 dark:text-white"
                autoFocus
              />
            </div>

            {/* List */}
            <div className="max-h-48 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="w-full text-left p-2.5 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-surface-950 dark:text-white truncate">
                      {s.name}
                    </span>
                    <span className="font-mono text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                      {s.shortcut}
                    </span>
                  </div>
                  <p className="text-[10px] text-surface-450 truncate w-full">
                    {s.text}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-4 text-center text-[11px] text-surface-500 italic flex flex-col items-center gap-1">
                  <MessageSquare size={16} className="opacity-50" />
                  <span>Nessuno snippet trovato</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

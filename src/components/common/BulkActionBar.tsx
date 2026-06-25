import { X } from 'lucide-react';

export interface BulkAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
}

/** Barra flottante con le azioni di massa, visibile quando ci sono elementi selezionati. */
export function BulkActionBar({ count, actions, onClear }: Props) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 animate-[slideIn_0.2s_ease-out]">
      <div className="flex items-center gap-1 bg-surface-900 dark:bg-surface-800 text-white rounded-xl shadow-2xl px-2 py-1.5 border border-surface-700">
        <span className="text-sm font-medium px-3 flex items-center gap-2">
          <span className="bg-brand-500 text-white text-xs rounded-full px-2 py-0.5">{count}</span>
          selezionati
        </span>
        <div className="w-px h-6 bg-surface-700 mx-1" />
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              a.danger ? 'text-red-300 hover:bg-red-500/20' : 'text-surface-200 hover:bg-surface-700'
            }`}
          >
            {a.icon} {a.label}
          </button>
        ))}
        <button onClick={onClear} className="p-1.5 text-surface-400 hover:text-white transition-colors ml-1" title="Deseleziona">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

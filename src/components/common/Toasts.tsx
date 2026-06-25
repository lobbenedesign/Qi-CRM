import { Bell, X, CheckCircle2, Info } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useToastStore } from '../../store/toastStore';

export function Toasts() {
  const { toasts, dismiss } = useToastStore(
    useShallow((s) => ({ toasts: s.toasts, dismiss: s.dismiss }))
  );
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[120] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <div key={t.id}
          className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700
                     rounded-xl shadow-2xl p-3 flex items-start gap-3 animate-[slideIn_0.2s_ease-out]">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            t.kind === 'reminder' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-500'
            : t.kind === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-trust-high'
            : 'bg-brand-50 dark:bg-brand-900/30 text-brand-500'
          }`}>
            {t.kind === 'reminder' ? <Bell size={16} /> : t.kind === 'success' ? <CheckCircle2 size={16} /> : <Info size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{t.title}</p>
            {t.body && <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{t.body}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-surface-400 hover:text-surface-600 shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

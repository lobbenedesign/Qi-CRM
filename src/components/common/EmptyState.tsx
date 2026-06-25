interface Props {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: { label: string; icon?: React.ReactNode; onClick: () => void };
}

/** Stato vuoto illustrato con call-to-action. */
export function EmptyState({ icon, title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-400 mb-4">
        {icon}
      </div>
      <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">{title}</p>
      {subtitle && <p className="text-xs text-surface-400 mt-1 max-w-xs">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {action.icon} {action.label}
        </button>
      )}
    </div>
  );
}

import { CheckCircle2, AlertCircle, Circle } from 'lucide-react';

export type ConnStatus = 'not_configured' | 'configured' | 'connected';

const META: Record<ConnStatus, { label: string; color: string; icon: React.ReactNode }> = {
  not_configured: { label: 'Da configurare', color: '#94a3b8', icon: <Circle size={11} /> },
  configured:     { label: 'Configurato',    color: '#f59e0b', icon: <AlertCircle size={11} /> },
  connected:      { label: 'Connesso',       color: '#22c55e', icon: <CheckCircle2 size={11} /> },
};

export function StatusBadge({ status }: { status: ConnStatus }) {
  const m = META[status];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${m.color}20`, color: m.color }}>
      {m.icon} {m.label}
    </span>
  );
}

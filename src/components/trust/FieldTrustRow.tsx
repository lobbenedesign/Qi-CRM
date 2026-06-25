import type { ReactNode } from 'react';
import { computeTrust } from '../../lib/trust';
import { TrustBadge } from './TrustBadge';
import type { TrackedFieldMeta } from '../../types/crm';

interface Props {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  fieldKey?: string;
  meta?: TrackedFieldMeta;
}

/** Riga campo con badge Trust Score basato sulla provenienza + decay. */
export function FieldTrustRow({ icon, label, value, fieldKey, meta }: Props) {
  const trust = meta ? computeTrust(meta, fieldKey) : null;
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-surface-100 dark:border-surface-800 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-surface-400 shrink-0">{icon}</span>}
        <div className="min-w-0">
          <p className="text-[11px] text-surface-400 uppercase tracking-wide">{label}</p>
          <p className="text-sm text-surface-800 dark:text-surface-100 truncate">
            {value || <span className="text-surface-300">—</span>}
          </p>
        </div>
      </div>
      {trust && <TrustBadge trust={trust} showAge compact />}
    </div>
  );
}

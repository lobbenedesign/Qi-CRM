import { cn } from '../../lib/utils';
import type { TrustResult } from '../../types/crm';

interface Props {
  trust: TrustResult;
  showAge?: boolean;
  compact?: boolean;
}

const LABEL_MAP = { high: 'Alto', medium: 'Medio', low: 'Basso' };

export function TrustBadge({ trust, showAge, compact }: Props) {
  return (
    <span className={cn('trust-badge', trust.label)} title={`Trust score: ${(trust.score * 100).toFixed(0)}%`}>
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor:
            trust.label === 'high' ? '#22c55e' :
            trust.label === 'medium' ? '#f59e0b' : '#ef4444',
        }}
      />
      {!compact && <span>{LABEL_MAP[trust.label]}</span>}
      {showAge && trust.ageDays > 0 && (
        <span className="opacity-60">· {trust.ageDays}gg</span>
      )}
    </span>
  );
}

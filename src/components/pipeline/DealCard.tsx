import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import type { QuantumDeal } from '../../types/crm';
import { formatCurrency, formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { AssigneeAvatar } from '../team/AssigneePicker';

interface Props {
  deal: QuantumDeal;
  onClick?: () => void;
}

export function DealCard({ deal, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeftColor: deal.visual_color,
    borderLeftWidth: 3,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'deal-card select-none',
        isDragging && 'opacity-50 scale-[0.98]',
        deal.is_stalled && 'ring-2 ring-risk-high/30',
        deal.should_expand && 'p-4',
      )}
    >
      {/* Risk alert banner */}
      {deal.is_stalled && (
        <div className="flex items-center gap-1.5 text-xs text-risk-high mb-2 font-medium">
          <AlertTriangle size={12} />
          <span>Deal a rischio — {deal.risk_score}% rischio</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-surface-800 dark:text-surface-100 leading-snug">
          {deal.title}
        </p>
        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 shrink-0">
          {formatCurrency(deal.value, deal.currency)}
        </span>
      </div>

      {/* Contact */}
      {deal.contact && (
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
          {deal.contact.first_name} {deal.contact.last_name}
        </p>
      )}

      {/* AI Next Action */}
      {deal.next_action && (
        <div className="mt-2 text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded">
          <TrendingUp size={11} className="inline mr-1" />
          {deal.next_action}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-100 dark:border-surface-700">
        <div className="flex items-center gap-1 text-xs text-surface-400">
          {deal.expected_close && (
            <>
              <Calendar size={11} />
              <span>{formatDate(deal.expected_close)}</span>
            </>
          )}
        </div>
        <AssigneeAvatar memberId={deal.assignee_id} size={24} />
      </div>
    </div>
  );
}

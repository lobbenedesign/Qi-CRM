import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { PipelineStage, QuantumDeal } from '../../types/crm';
import { formatCurrency, cn } from '../../lib/utils';
import { DealCard } from './DealCard';

interface Props {
  stage: PipelineStage;
  deals: QuantumDeal[];
  onAddDeal?: () => void;
  onDealClick?: (id: string) => void;
}

export function PipelineColumn({ stage, deals, onAddDeal, onDealClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.stage_key ?? stage.id });

  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="pipeline-col flex flex-col" style={{ minWidth: 260, maxWidth: 300 }}>
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-t-lg border-b-2"
        style={{ borderBottomColor: stage.risk_color ?? '#6366f1' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-surface-800 dark:text-surface-100">
            {stage.name}
          </span>
          <span className="text-xs bg-surface-200 dark:bg-surface-700 text-surface-600
                           dark:text-surface-400 rounded-full px-1.5 py-0.5 font-medium">
            {deals.length}
          </span>
        </div>
        {onAddDeal && (
          <button
            onClick={onAddDeal}
            className="w-6 h-6 rounded-md flex items-center justify-center
                       text-surface-400 hover:text-brand-600 hover:bg-brand-50
                       dark:hover:bg-brand-900/20 transition-colors"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Total value */}
      <div className="px-3 py-1.5 text-xs text-surface-400 dark:text-surface-500 bg-surface-50 dark:bg-surface-900/50">
        {formatCurrency(totalValue)}
        {stage.probability !== null && stage.probability !== undefined && (
          <span className="ml-1 text-surface-300">· {stage.probability}% prob.</span>
        )}
      </div>

      {/* Cards area */}
      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 flex flex-col gap-2 p-2 rounded-b-lg overflow-y-auto transition-colors',
            isOver ? 'bg-brand-50 dark:bg-brand-900/20' : 'bg-surface-100/50 dark:bg-surface-900/30',
          )}
          style={{ minHeight: 120 }}
        >
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={() => onDealClick?.(deal.id)} />
          ))}

          {deals.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-xs text-surface-400 text-center">
                Nessun deal
                <br />
                <span className="opacity-60">Trascina qui</span>
              </p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

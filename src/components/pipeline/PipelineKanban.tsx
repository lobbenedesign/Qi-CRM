import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { Loader2, RefreshCw } from 'lucide-react';
import { useDeals, useMoveDeal, usePipelineStages } from '../../hooks/useDeals';
import { useDealsStore } from '../../store/dealsStore';
import { useCan } from '../../hooks/useCan';
import type { DealStage, QuantumDeal } from '../../types/crm';
import { PipelineColumn } from './PipelineColumn';
import { DealCard } from './DealCard';
import { DealDetailDrawer } from './DealDetailDrawer';
import { CreateDealModal } from './CreateDealModal';
import { TransitionGateModal } from './TransitionGateModal';
import { repo } from '../../lib/repo';

export function PipelineKanban({ assigneeFilter }: { assigneeFilter?: string | null }) {
  const [searchParams] = useSearchParams();
  const { isLoading: dealsLoading, error } = useDeals();
  const { data: stages = [], isLoading: stagesLoading } = usePipelineStages();
  const activePipelineId = useDealsStore((s) => s.activePipelineId);
  const moveDeal = useMoveDeal();
  const getDealsByStage = useDealsStore((s) => s.getDealsByStage);
  const getQuantumDeals = useDealsStore((s) => s.getQuantumDeals);
  const canCreate = useCan('deals:create');

  const [activeDeal, setActiveDeal] = useState<QuantumDeal | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);

  useEffect(() => {
    const qid = searchParams.get('openDealId');
    if (qid) {
      setOpenDealId(qid);
    }
  }, [searchParams]);

  const [addStage, setAddStage] = useState<DealStage | null>(null);
  const [pendingTransition, setPendingTransition] = useState<{
    deal: QuantumDeal;
    targetStageKey: DealStage;
    targetStageName: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const activeStages = stages.filter((s) => (s.pipeline_id || 'pipe-default') === activePipelineId);

  if (dealsLoading || stagesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-surface-400">
        <RefreshCw size={24} className="mb-2" />
        <p className="text-sm">Errore nel caricamento dei deal</p>
      </div>
    );
  }

  const onDragStart = ({ active }: DragStartEvent) => {
    const deal = getQuantumDeals().find((d) => d.id === active.id);
    setActiveDeal(deal ?? null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDeal(null);
    if (!over || active.id === over.id) return;

    const dealId = active.id as string;

    // over.id is a stage_key (column droppable) or a deal id
    const targetStage = activeStages.find((s) => s.stage_key === over.id);
    if (targetStage?.stage_key) {
      const deal = getQuantumDeals().find((d) => d.id === dealId);
      if (deal) {
        const needsValue = ['proposal', 'negotiation', 'won'].includes(targetStage.stage_key);
        const needsCloseDate = ['proposal', 'negotiation', 'won'].includes(targetStage.stage_key);
        const needsChannel = ['negotiation', 'won'].includes(targetStage.stage_key);

        const lacksValue = needsValue && (!deal.value || deal.value === 0);
        const lacksCloseDate = needsCloseDate && !deal.expected_close;
        const lacksChannel = needsChannel && !deal.custom_fields?.['prop-canale-acquisizione'];

        if (lacksValue || lacksCloseDate || lacksChannel) {
          setPendingTransition({
            deal,
            targetStageKey: targetStage.stage_key as DealStage,
            targetStageName: targetStage.name,
          });
          return;
        }
      }
      moveDeal.mutate({ id: dealId, stage: targetStage.stage_key as DealStage });
      return;
    }

    // Dropped over another deal — find its stage
    const allDeals = getQuantumDeals();
    const overDeal = allDeals.find((d) => d.id === over.id);
    if (overDeal && overDeal.stage !== activeDeal?.stage) {
      const overStage = activeStages.find((s) => s.stage_key === overDeal.stage);
      if (overStage) {
        const deal = getQuantumDeals().find((d) => d.id === dealId);
        if (deal) {
          const needsValue = ['proposal', 'negotiation', 'won'].includes(overStage.stage_key);
          const needsCloseDate = ['proposal', 'negotiation', 'won'].includes(overStage.stage_key);
          const needsChannel = ['negotiation', 'won'].includes(overStage.stage_key);

          const lacksValue = needsValue && (!deal.value || deal.value === 0);
          const lacksCloseDate = needsCloseDate && !deal.expected_close;
          const lacksChannel = needsChannel && !deal.custom_fields?.['prop-canale-acquisizione'];

          if (lacksValue || lacksCloseDate || lacksChannel) {
            setPendingTransition({
              deal,
              targetStageKey: overStage.stage_key as DealStage,
              targetStageName: overStage.name,
            });
            return;
          }
        }
      }
      moveDeal.mutate({ id: dealId, stage: overDeal.stage });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {activeStages.map((stage) => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            deals={getDealsByStage(stage.stage_key as DealStage).filter((d) => !assigneeFilter || d.assignee_id === assigneeFilter)}
            onDealClick={setOpenDealId}
            onAddDeal={canCreate ? () => setAddStage(stage.stage_key as DealStage) : undefined}
          />
        ))}
      </div>

      {openDealId && <DealDetailDrawer dealId={openDealId} onClose={() => setOpenDealId(null)} />}
      {addStage && <CreateDealModal defaultStage={addStage} onClose={() => setAddStage(null)} />}
      
      {pendingTransition && (
        <TransitionGateModal
          deal={pendingTransition.deal}
          targetStageKey={pendingTransition.targetStageKey}
          targetStageName={pendingTransition.targetStageName}
          onClose={() => setPendingTransition(null)}
          onConfirm={async (patch) => {
            await repo.updateDeal(pendingTransition.deal.id, patch);
            moveDeal.mutate({ id: pendingTransition.deal.id, stage: pendingTransition.targetStageKey });
            setPendingTransition(null);
          }}
        />
      )}

      <DragOverlay>
        {activeDeal && (
          <div className="rotate-2 opacity-95 shadow-2xl w-64">
            <DealCard deal={activeDeal} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

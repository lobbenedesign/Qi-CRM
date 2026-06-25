import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { TrendingUp, Plus, User, Settings, Layers } from 'lucide-react';
import { PipelineKanban } from '../components/pipeline/PipelineKanban';
import { CreateDealModal } from '../components/pipeline/CreateDealModal';
import { PipelineSettingsModal } from '../components/pipeline/PipelineSettingsModal';
import { useCan } from '../hooks/useCan';
import { useAuthStore } from '../store/authStore';
import { usePipelines } from '../hooks/useDeals';
import { useDealsStore } from '../store/dealsStore';

export default function Pipeline() {
  const canCreate = useCan('deals:create');
  const canManage = useCan('pipeline:manage');
  const memberId = useAuthStore((s) => s.memberId);
  const [mineOnly, setMineOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Carica le pipeline
  usePipelines();
  const { pipelines, activePipelineId, setActivePipelineId } = useDealsStore(
    useShallow((s) => ({ pipelines: s.pipelines, activePipelineId: s.activePipelineId, setActivePipelineId: s.setActivePipelineId }))
  );

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-brand-500" size={22} />
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">
              Pipeline Quantistica
            </h1>
          </div>

          {/* Selettore Pipeline Premium */}
          {pipelines.length > 0 && (
            <div className="relative flex items-center bg-surface-100 dark:bg-surface-800 rounded-lg px-2.5 py-1 border border-surface-200 dark:border-surface-700">
              <Layers size={14} className="text-surface-500 mr-2" />
              <select
                value={activePipelineId}
                onChange={(e) => setActivePipelineId(e.target.value)}
                className="bg-transparent text-sm font-medium text-surface-700 dark:text-surface-200 pr-6 focus:outline-none cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right center',
                  backgroundSize: '12px'
                }}
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface-50 dark:bg-surface-900">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button onClick={() => setMineOnly((v) => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              mineOnly ? 'bg-brand-600 text-white' : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}>
            <User size={14} /> I miei deal
          </button>
          
          {canManage && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
              title="Configura Colonne"
            >
              <Settings size={18} />
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700
                         text-white text-sm rounded-lg transition-colors font-medium"
            >
              <Plus size={15} />
              Nuovo Deal
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <PipelineKanban assigneeFilter={mineOnly ? memberId : null} />
      </div>

      {showCreate && <CreateDealModal onClose={() => setShowCreate(false)} />}
      {showSettings && <PipelineSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

import { useState } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Settings, Save } from 'lucide-react';
import {
  usePipelineStages,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages,
  useDeals,
} from '../../hooks/useDeals';
import type { PipelineStage } from '../../types/crm';

interface Props {
  onClose: () => void;
}

export function PipelineSettingsModal({ onClose }: Props) {
  const { data: stages = [] } = usePipelineStages();
  const { data: deals = [] } = useDeals();

  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const reorderStages = useReorderStages();

  const [newStageName, setNewStageName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PipelineStage>>({});

  // Riordina le fasi spostandole in alto o in basso
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const list = [...stages].sort((a, b) => a.display_order - b.display_order);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Scambia gli elementi
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const ids = list.map((s) => s.id);
    await reorderStages.mutateAsync(ids);
  };

  const handleCreate = async () => {
    if (!newStageName.trim()) return;
    
    // Genera key a partire dal nome
    const key = newStageName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    await createStage.mutateAsync({
      name: newStageName,
      stage_key: key,
      probability: 50,
      default_color: '#6366f1',
      risk_color: '#ef4444',
      is_expandable: false,
    });

    setNewStageName('');
  };

  const handleStartEdit = (stage: PipelineStage) => {
    setEditingId(stage.id);
    setEditForm(stage);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name) return;
    await updateStage.mutateAsync({
      id: editingId,
      patch: editForm,
    });
    setEditingId(null);
  };

  const handleDelete = async (stage: PipelineStage) => {
    const stageDeals = deals.filter((d) => d.stage === stage.stage_key);
    
    // Trova la fase di fallback
    const sorted = [...stages].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((s) => s.id === stage.id);
    let fallbackName = 'Lead';
    if (sorted.length > 1) {
      const remaining = sorted.filter((s) => s.id !== stage.id);
      const fallbackIdx = Math.max(0, idx - 1);
      fallbackName = remaining[fallbackIdx].name;
    }

    let warningMsg = `Eliminare la colonna "${stage.name}"?`;
    if (stageDeals.length > 0) {
      warningMsg = `Attenzione: ci sono ${stageDeals.length} deal in questa colonna. Verranno spostati automaticamente alla fase più sicura disponibile ("${fallbackName}"). Continuare?`;
    }

    if (!confirm(warningMsg)) return;
    await deleteStage.mutateAsync(stage.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-surface-900 rounded-xl shadow-2xl border
                   border-surface-200 dark:border-surface-700 w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="text-brand-500" size={20} />
            <div>
              <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Configura Colonne Pipeline</h2>
              <p className="text-xs text-surface-400">Modifica, riordina o elimina gli stage della pipeline di vendita</p>
            </div>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-650">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Aggiungi Nuova Colonna */}
          <div className="bg-surface-50 dark:bg-surface-800/40 rounded-xl p-4 border border-surface-200 dark:border-surface-700/60">
            <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Plus size={14} /> Nuova Fase Pipeline
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="es. Presentazione Demo..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-700
                           bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 outline-none
                           focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
              <button
                onClick={handleCreate}
                disabled={!newStageName.trim() || createStage.isPending}
                className="px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors
                           disabled:opacity-60 flex items-center gap-1.5 font-medium text-sm"
              >
                Aggiungi
              </button>
            </div>
          </div>

          {/* Lista delle Colonne Attuali */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-3">Colonne Attuali</h3>
            
            <div className="space-y-2">
              {[...stages].sort((a, b) => a.display_order - b.display_order).map((stage, index, arr) => {
                const isEditing = editingId === stage.id;
                const stageDeals = deals.filter((d) => d.stage === stage.stage_key);

                return (
                  <div
                    key={stage.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5
                               bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700/50 rounded-xl"
                  >
                    {isEditing ? (
                      /* Form di Modifica */
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="flex flex-col">
                          <label className="text-[10px] text-surface-400 uppercase font-semibold mb-1">Nome fase</label>
                          <input
                            type="text"
                            value={editForm.name ?? ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="px-2 py-1 border border-surface-200 dark:border-surface-700 rounded bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 outline-none text-xs"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] text-surface-400 uppercase font-semibold mb-1">Chiave univoca</label>
                          <input
                            type="text"
                            value={editForm.stage_key ?? ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, stage_key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_') }))}
                            className="px-2 py-1 border border-surface-200 dark:border-surface-700 rounded bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 outline-none text-xs"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] text-surface-400 uppercase font-semibold mb-1">Probabilità (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editForm.probability ?? 0}
                            onChange={(e) => setEditForm(prev => ({ ...prev, probability: Number(e.target.value) || 0 }))}
                            className="px-2 py-1 border border-surface-200 dark:border-surface-700 rounded bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 outline-none text-xs"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] text-surface-400 uppercase font-semibold mb-1">Colore Default</label>
                          <input
                            type="color"
                            value={editForm.default_color ?? '#64748b'}
                            onChange={(e) => setEditForm(prev => ({ ...prev, default_color: e.target.value }))}
                            className="w-full h-7 rounded border border-surface-200 dark:border-surface-700 cursor-pointer"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Vista Statica */
                      <div className="flex items-center gap-3">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: stage.default_color }} />
                        <div>
                          <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                            {stage.name}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-50 dark:bg-surface-700 text-surface-400">
                              key: {stage.stage_key}
                            </span>
                          </p>
                          <p className="text-xs text-surface-400">
                            Probabilità: {stage.probability}% · {stageDeals.length} deal attivi
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Azioni */}
                    <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="p-1.5 text-success-600 hover:bg-success-50 dark:hover:bg-success-950/20 rounded-md transition-colors"
                            title="Salva modifiche"
                          >
                            <Save size={15} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-md transition-colors text-xs"
                          >
                            Annulla
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Pulsanti per riordinare */}
                          <button
                            disabled={index === 0}
                            onClick={() => handleMove(index, 'up')}
                            className="p-1.5 text-surface-400 hover:text-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-md disabled:opacity-30 transition-colors"
                            title="Sposta su"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            disabled={index === arr.length - 1}
                            onClick={() => handleMove(index, 'down')}
                            className="p-1.5 text-surface-400 hover:text-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-md disabled:opacity-30 transition-colors"
                            title="Sposta giù"
                          >
                            <ArrowDown size={14} />
                          </button>
                          
                          {/* Modifica */}
                          <button
                            onClick={() => handleStartEdit(stage)}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-md transition-colors text-xs font-semibold"
                          >
                            Modifica
                          </button>

                          {/* Elimina (impediamo di eliminare se c'è solo 1 fase rimasta) */}
                          <button
                            disabled={arr.length <= 1}
                            onClick={() => handleDelete(stage)}
                            className="p-1.5 text-risk-high hover:bg-risk-high/10 rounded-md disabled:opacity-30 transition-colors"
                            title="Elimina colonna"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end p-5 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/20 rounded-b-xl shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors font-medium"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

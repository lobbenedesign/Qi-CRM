import { usePlaybookStore } from '../../store/playbookStore';
import { BookOpen, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { DealStage } from '../../types/crm';

interface Props {
  dealId: string;
  stage: DealStage;
}

// Riferimento stabile: un default `{}` creato dentro il selettore zustand cambia a ogni
// render e provoca un loop infinito ("getSnapshot should be cached" → Maximum update depth).
const EMPTY_PROGRESS: Record<string, boolean | string> = {};

export function PlaybookWidget({ dealId, stage }: Props) {
  const playbooks = usePlaybookStore(s => s.playbooks);
  const dealProgress = usePlaybookStore(s => s.dealProgress[dealId]) ?? EMPTY_PROGRESS;
  const updateProgress = usePlaybookStore(s => s.updateProgress);

  const currentPlaybook = playbooks.find(p => p.stage === stage);

  if (!currentPlaybook) {
    return null; // Nessun playbook configurato per questo stage
  }

  const items = currentPlaybook.items;
  const completedCount = items.filter(i => {
    if (i.type === 'checkbox') return dealProgress[i.id] === true;
    if (i.type === 'text') return !!dealProgress[i.id];
    return false;
  }).length;
  const percent = Math.round((completedCount / items.length) * 100);

  return (
    <div className="bg-surface-50 dark:bg-surface-850 rounded-xl border border-surface-200 dark:border-surface-800 overflow-hidden">
      <div className="p-3 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex justify-between items-start">
        <div className="flex gap-2">
          <BookOpen className="text-brand-500 shrink-0 mt-0.5" size={16} />
          <div>
            <h4 className="text-sm font-bold text-surface-900 dark:text-surface-50 leading-tight">
              Playbook: {currentPlaybook.title}
            </h4>
            <p className="text-[10px] text-surface-500 mt-0.5">{currentPlaybook.description}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{percent}%</span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 w-full bg-surface-200 dark:bg-surface-800">
        <div 
          className="h-full bg-brand-500 transition-all duration-300" 
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="p-3 space-y-3">
        {items.map(item => {
          const isDone = item.type === 'checkbox' ? dealProgress[item.id] === true : !!dealProgress[item.id];
          return (
            <div key={item.id} className="flex gap-2 items-start">
              {item.type === 'checkbox' ? (
                <button
                  type="button"
                  onClick={() => updateProgress(dealId, item.id, !dealProgress[item.id])}
                  className="mt-0.5 shrink-0"
                >
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-brand-500" />
                  ) : (
                    <Circle size={16} className="text-surface-300 dark:text-surface-600 hover:text-surface-400" />
                  )}
                </button>
              ) : (
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-brand-500" />
                  ) : (
                    <Circle size={16} className="text-surface-300 dark:text-surface-600" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <label 
                  className={cn(
                    "text-xs font-medium block cursor-pointer transition-colors",
                    isDone ? "text-surface-500 line-through" : "text-surface-800 dark:text-surface-200",
                    item.isMandatory && !isDone && "text-surface-900 dark:text-surface-50"
                  )}
                  onClick={() => item.type === 'checkbox' && updateProgress(dealId, item.id, !dealProgress[item.id])}
                >
                  {item.title} {item.isMandatory && <span className="text-risk-high ml-0.5">*</span>}
                </label>
                {item.type === 'text' && (
                  <input
                    type="text"
                    value={(dealProgress[item.id] as string) || ''}
                    onChange={(e) => updateProgress(dealId, item.id, e.target.value)}
                    placeholder="Inserisci nota..."
                    className="mt-1 w-full text-xs px-2 py-1.5 rounded bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 outline-none focus:ring-1 focus:ring-brand-500"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

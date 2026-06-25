import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useNavigate } from 'react-router-dom';
import { useTasksStore } from '../../store/tasksStore';
import { useContactsStore } from '../../store/contactsStore';
import { useCompaniesStore } from '../../store/companiesStore';
import { useDealsStore } from '../../store/dealsStore';
import { useTickets } from '../../hooks/useTickets';
import { taskRecordPath } from '../../lib/taskNav';
import {
  X, Check, ChevronRight, ChevronLeft, Calendar,
  Play, Phone, Mail, CheckSquare, ExternalLink
} from 'lucide-react';

export function TaskExecutionOverlay() {
  const navigate = useNavigate();

  const { tasks, executingQueueId, executingTaskIds, currentExecIdx, nextExecutionTask, prevExecutionTask, stopExecution, updateTask } = useTasksStore(
    useShallow((s) => ({ tasks: s.tasks, executingQueueId: s.executingQueueId, executingTaskIds: s.executingTaskIds, currentExecIdx: s.currentExecIdx, nextExecutionTask: s.nextExecutionTask, prevExecutionTask: s.prevExecutionTask, stopExecution: s.stopExecution, updateTask: s.updateTask }))
  );

  const { contacts } = useContactsStore();
  const { companies } = useCompaniesStore();
  const { getQuantumDeals } = useDealsStore();
  const { data: tickets = [] } = useTickets();

  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');

  if (!executingQueueId || currentExecIdx < 0 || currentExecIdx >= executingTaskIds.length) {
    return null;
  }

  const taskId = executingTaskIds[currentExecIdx];
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;

  // Find associated entity name
  let assocName = 'Nessuna associazione';
  if (task.associatedType === 'contact') {
    const c = contacts.find(item => item.id === task.associatedId);
    assocName = c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : 'Contatto Sconosciuto';
  } else if (task.associatedType === 'company') {
    const cp = companies.find(item => item.id === task.associatedId);
    assocName = cp ? cp.name : 'Azienda Sconosciuta';
  } else if (task.associatedType === 'deal') {
    const dl = getQuantumDeals().find(item => item.id === task.associatedId);
    assocName = dl ? dl.title : 'Deal Sconosciuto';
  } else if (task.associatedType === 'ticket') {
    const tk = tickets.find(item => item.id === task.associatedId);
    assocName = tk ? tk.title : 'Ticket Sconosciuto';
  }


  const handleNavigateToEntity = () => {
    const p = taskRecordPath(task);
    if (p) navigate(p);
  };

  // Apre automaticamente il record del task all'indice indicato.
  const navigateToTaskIdx = (idx: number) => {
    const t = tasks.find((x) => x.id === executingTaskIds[idx]);
    const p = t ? taskRecordPath(t) : null;
    if (p) navigate(p);
  };

  // Avanza al task successivo aprendone il record (o chiude la coda se finita).
  const advance = () => {
    const nextIdx = currentExecIdx + 1;
    if (nextIdx < executingTaskIds.length) navigateToTaskIdx(nextIdx);
    else navigate('/tasks');
    nextExecutionTask();
  };

  const handleSkip = () => advance();

  const handlePrev = () => {
    const prevIdx = currentExecIdx - 1;
    if (prevIdx >= 0) navigateToTaskIdx(prevIdx);
    prevExecutionTask();
  };

  const handleCompleteTask = () => {
    updateTask(task.id, { status: 'completed' });
    advance();
  };

  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate) return;
    updateTask(task.id, { dueDate: rescheduleDate });
    setShowReschedule(false);
    setRescheduleDate('');
    advance(); // Passa al task successivo aprendone il record
  };

  const progressPercent = ((currentExecIdx) / executingTaskIds.length) * 100;
  const taskNumber = currentExecIdx + 1;
  const totalTasks = executingTaskIds.length;

  const TYPE_ICONS = {
    todo: <CheckSquare size={14} className="text-surface-500" />,
    call: <Phone size={14} className="text-blue-500 animate-pulse" />,
    email: <Mail size={14} className="text-brand-500" />
  };

  const PRIO_COLORS = {
    high: 'bg-risk-high/15 text-risk-high border-risk-high/20',
    medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
    low: 'bg-surface-150 text-surface-600 dark:bg-surface-800 dark:text-surface-400 border-surface-200 dark:border-surface-700'
  };

  return (
    <div className="sticky top-0 z-45 w-full bg-white/85 dark:bg-surface-950/85 backdrop-blur-md border-b border-surface-200 dark:border-surface-800/80 shadow-md">
      <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Execution status & progress */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-md border border-brand-500/20 text-xs font-bold uppercase tracking-wider">
            <Play size={11} fill="currentColor" /> Task Queue
          </div>
          <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">
            {taskNumber} di {totalTasks} ({Math.round((taskNumber / totalTasks) * 100)}%)
          </span>
        </div>

        {/* Middle: Active Task Card Details */}
        <div className="flex-1 min-w-0 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2 bg-surface-50 dark:bg-surface-900 border border-surface-150 dark:border-surface-800 px-3 py-1.5 rounded-lg max-w-xl min-w-0">
            {TYPE_ICONS[task.type]}
            <span className="text-xs font-bold text-surface-900 dark:text-surface-100 truncate">
              {task.title}
            </span>
            <span className="text-surface-300 dark:text-surface-700">|</span>
            <button 
              onClick={handleNavigateToEntity}
              className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline shrink-0"
            >
              <ExternalLink size={10} />
              {assocName}
            </button>
            <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded capitalize ${PRIO_COLORS[task.priority]}`}>
              {task.priority}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePrev}
            disabled={currentExecIdx === 0}
            className="p-1.5 bg-surface-100 dark:bg-surface-900 hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Precedente"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={handleSkip}
            className="p-1.5 bg-surface-100 dark:bg-surface-900 hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-lg transition-colors"
            title="Salta / Prossimo"
          >
            <ChevronRight size={16} />
          </button>

          {/* Reschedule Button & Popover */}
          <div className="relative">
            <button
              onClick={() => setShowReschedule(!showReschedule)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-100 dark:bg-surface-900 hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 text-xs font-semibold rounded-lg transition-colors"
              title="Riprogramma"
            >
              <Calendar size={13} />
              Riprogramma
            </button>

            {showReschedule && (
              <form 
                onSubmit={handleReschedule}
                className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-3 rounded-lg shadow-xl flex flex-col gap-2 w-48 animate-fade-in"
              >
                <div className="text-[10px] font-bold text-surface-450 uppercase">Nuova data task</div>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="text-xs rounded border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-2 py-1 outline-none text-surface-900 dark:text-white"
                />
                <div className="flex gap-1.5">
                  <button 
                    type="button" 
                    onClick={() => setShowReschedule(false)} 
                    className="flex-1 py-1 text-[10px] font-semibold hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 rounded"
                  >
                    Annulla
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-1 text-[10px] font-semibold bg-brand-600 text-white rounded"
                  >
                    Salva
                  </button>
                </div>
              </form>
            )}
          </div>

          <button
            onClick={handleCompleteTask}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            <Check size={13} />
            Completa
          </button>

          <div className="w-px bg-surface-200 dark:bg-surface-800 h-5 my-0.5 mx-1" />

          <button
            onClick={stopExecution}
            className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-900 rounded-lg transition-colors"
            title="Ferma Esecuzione"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Progress timeline bar */}
      <div className="w-full bg-surface-200 dark:bg-surface-800 h-[2px]">
        <div 
          className="bg-brand-500 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

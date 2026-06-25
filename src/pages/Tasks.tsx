import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useNavigate } from 'react-router-dom';
import { useTasksStore, type Task } from '../store/tasksStore';
import { useContactsStore } from '../store/contactsStore';
import { useCompaniesStore } from '../store/companiesStore';
import { useDealsStore } from '../store/dealsStore';
import { useTeamStore } from '../store/teamStore';
import { useTickets } from '../hooks/useTickets';
import { useToastStore } from '../store/toastStore';
import { 
  CheckSquare, Plus, Play, Trash2, Calendar, 
  Phone, Mail, CheckCircle2, Circle
} from 'lucide-react';

export default function Tasks() {
  const navigate = useNavigate();


  const { tasks, queues, activeQueueId, setActiveQueueId, addTask, updateTask, deleteTask, addQueue, deleteQueue, startExecution } = useTasksStore(
    useShallow((s) => ({ tasks: s.tasks, queues: s.queues, activeQueueId: s.activeQueueId, setActiveQueueId: s.setActiveQueueId, addTask: s.addTask, updateTask: s.updateTask, deleteTask: s.deleteTask, addQueue: s.addQueue, deleteQueue: s.deleteQueue, startExecution: s.startExecution }))
  );

  const { contacts } = useContactsStore();
  const { companies } = useCompaniesStore();
  const { getQuantumDeals } = useDealsStore();
  const { data: tickets = [] } = useTickets();
  const { members } = useTeamStore();
  const pushToast = useToastStore((s) => s.push);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNewQueueModal, setShowNewQueueModal] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');

  // New task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    type: 'todo' as 'todo' | 'email' | 'call',
    priority: 'medium' as 'low' | 'medium' | 'high',
    associatedType: 'contact' as 'contact' | 'company' | 'deal' | 'ticket' | null,
    associatedId: '',
    assigneeId: members[0]?.first_name || 'Giuseppe',
    queueId: 'all',
    dueDate: new Date().toISOString().split('T')[0],
    reminderTime: '',
    notes: ''
  });

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Filter tasks based on selected queue and conditions
  const filteredTasks = tasks.filter((t) => {
    const inQueue = activeQueueId === 'all' || t.queueId === activeQueueId;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return inQueue && matchesStatus && matchesType && matchesPriority;
  });

  // Launch execution queue
  const handleStartQueue = () => {
    const pendingInQueue = filteredTasks.filter(t => t.status === 'pending');
    if (pendingInQueue.length === 0) {
      pushToast({ title: 'Coda vuota', body: 'Non ci sono task in sospeso da eseguire in questa coda.', kind: 'info' });
      return;
    }
    const taskIds = pendingInQueue.map(t => t.id);
    startExecution(taskIds, activeQueueId);
    
    // Redirect to the first task's associated page
    const firstTask = pendingInQueue[0];
    if (firstTask.associatedType && firstTask.associatedId) {
      if (firstTask.associatedType === 'contact') {
        navigate(`/contacts?openContactId=${firstTask.associatedId}`);
      } else if (firstTask.associatedType === 'company') {
        navigate(`/companies?openCompanyId=${firstTask.associatedId}`);
      } else if (firstTask.associatedType === 'deal') {
        navigate(`/pipeline?openDealId=${firstTask.associatedId}`);
      } else if (firstTask.associatedType === 'ticket') {
        navigate(`/tickets?openTicketId=${firstTask.associatedId}`);
      }
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    addTask({
      title: taskForm.title,
      type: taskForm.type,
      priority: taskForm.priority,
      associatedType: taskForm.associatedType || null,
      associatedId: taskForm.associatedId || null,
      assigneeId: taskForm.assigneeId,
      queueId: taskForm.queueId === 'all' ? 'q-inbound' : taskForm.queueId,
      dueDate: taskForm.dueDate,
      notes: taskForm.notes,
      reminderTime: taskForm.reminderTime || null
    });

    setTaskForm({
      title: '',
      type: 'todo',
      priority: 'medium',
      associatedType: 'contact',
      associatedId: '',
      assigneeId: members[0]?.first_name || 'Giuseppe',
      queueId: 'all',
      dueDate: new Date().toISOString().split('T')[0],
      reminderTime: '',
      notes: ''
    });
    setShowCreateModal(false);
  };

  const handleCreateQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueueName.trim()) return;
    const newId = addQueue(newQueueName);
    setActiveQueueId(newId);
    setNewQueueName('');
    setShowNewQueueModal(false);
  };

  const getAssocName = (t: Task) => {
    if (!t.associatedId) return 'Nessuno';
    if (t.associatedType === 'contact') {
      const c = contacts.find(item => item.id === t.associatedId);
      return c ? `${c.first_name || ''} ${c.last_name || ''}` : 'Contatto';
    } else if (t.associatedType === 'company') {
      const cp = companies.find(item => item.id === t.associatedId);
      return cp ? cp.name : 'Azienda';
    } else if (t.associatedType === 'deal') {
      const dl = getQuantumDeals().find(item => item.id === t.associatedId);
      return dl ? dl.title : 'Deal';
    } else if (t.associatedType === 'ticket') {
      const tk = tickets.find(item => item.id === t.associatedId);
      return tk ? tk.title : 'Ticket';
    }
    return 'Entità';
  };

  const TYPE_BADGES = {
    todo: <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-700"><CheckSquare size={11} /> To Do</span>,
    call: <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"><Phone size={11} /> Chiamata</span>,
    email: <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20"><Mail size={11} /> Email</span>
  };

  const PRIO_LABELS = {
    low: <span className="text-surface-400">Bassa</span>,
    medium: <span className="text-amber-500 font-semibold">Media</span>,
    high: <span className="text-risk-high font-bold">Alta</span>
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-5 p-1 overflow-hidden">
      {/* Sidebar: Queues and list filters */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
        {/* Queues list */}
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-surface-400">Code di Task</span>
            <button 
              onClick={() => setShowNewQueueModal(true)} 
              className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 text-brand-600 dark:text-brand-400 rounded transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {queues.map((q) => {
              const pendingCount = tasks.filter(t => t.queueId === q.id && t.status === 'pending').length;
              const isSelected = activeQueueId === q.id;
              return (
                <div key={q.id} className="flex justify-between items-center group">
                  <button
                    onClick={() => setActiveQueueId(q.id)}
                    className={`flex-1 text-left text-xs font-semibold px-2.5 py-2 rounded-lg transition-colors truncate ${
                      isSelected 
                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20' 
                        : 'text-surface-650 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-850'
                    }`}
                  >
                    {q.name}
                  </button>
                  {q.id !== 'all' && (
                    <button 
                      onClick={() => deleteQueue(q.id)}
                      className="p-1 hover:text-risk-high text-surface-300 dark:text-surface-700 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  {pendingCount > 0 && (
                    <span className="ml-1.5 bg-surface-100 dark:bg-surface-800 text-[10px] font-bold text-surface-500 px-1.5 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action button */}
        {filteredTasks.filter(t => t.status === 'pending').length > 0 && (
          <button
            onClick={handleStartQueue}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md transform hover:-translate-y-0.5 duration-150"
          >
            <Play size={14} fill="currentColor" />
            Avvia Coda di Lavoro
          </button>
        )}
      </div>

      {/* Main Task List panel */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto">
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 shadow-sm space-y-4">
          {/* Header filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="text-brand-500 animate-pulse" size={22} />
              <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">Coda Attività</h1>
              <span className="text-xs text-surface-400">({filteredTasks.length} task trovati)</span>
            </div>
            
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              <Plus size={14} /> Crea Task
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5 border-t border-b border-surface-150 dark:border-surface-800 py-3">
            {/* Status Select */}
            <div className="flex items-center gap-1 bg-surface-50 dark:bg-surface-850 px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-750">
              <span className="text-[10px] font-bold text-surface-450 uppercase">Stato</span>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)} 
                className="bg-transparent text-xs font-medium text-surface-700 dark:text-surface-200 focus:outline-none"
              >
                <option value="pending" className="bg-white dark:bg-surface-900">In Sospeso</option>
                <option value="completed" className="bg-white dark:bg-surface-900">Completati</option>
                <option value="all" className="bg-white dark:bg-surface-900">Tutti</option>
              </select>
            </div>

            {/* Type Select */}
            <div className="flex items-center gap-1 bg-surface-50 dark:bg-surface-850 px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-750">
              <span className="text-[10px] font-bold text-surface-450 uppercase">Tipo</span>
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)} 
                className="bg-transparent text-xs font-medium text-surface-700 dark:text-surface-200 focus:outline-none"
              >
                <option value="all" className="bg-white dark:bg-surface-900">Qualsiasi</option>
                <option value="todo" className="bg-white dark:bg-surface-900">To Do</option>
                <option value="call" className="bg-white dark:bg-surface-900">Chiamata</option>
                <option value="email" className="bg-white dark:bg-surface-900">Email</option>
              </select>
            </div>

            {/* Priority Select */}
            <div className="flex items-center gap-1 bg-surface-50 dark:bg-surface-850 px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-750">
              <span className="text-[10px] font-bold text-surface-450 uppercase">Priorità</span>
              <select 
                value={priorityFilter} 
                onChange={(e) => setPriorityFilter(e.target.value)} 
                className="bg-transparent text-xs font-medium text-surface-700 dark:text-surface-200 focus:outline-none"
              >
                <option value="all" className="bg-white dark:bg-surface-900">Qualsiasi</option>
                <option value="high" className="bg-white dark:bg-surface-900">Alta</option>
                <option value="medium" className="bg-white dark:bg-surface-900">Media</option>
                <option value="low" className="bg-white dark:bg-surface-900">Bassa</option>
              </select>
            </div>
          </div>

          {/* Task Grid/Table */}
          <div className="overflow-x-auto">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-surface-400">
                <CheckSquare size={36} className="mx-auto mb-2 text-surface-300" />
                <p className="text-xs">Nessun task corrisponde ai filtri selezionati.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-850/60 border-b border-surface-200 dark:border-surface-800 text-surface-500 font-semibold uppercase tracking-wider">
                    <th className="p-3 w-8"></th>
                    <th className="p-3">Attività</th>
                    <th className="p-3">Associazione</th>
                    <th className="p-3">Priorità</th>
                    <th className="p-3">Scadenza</th>
                    <th className="p-3">Incaricato</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((t) => {
                    const isCompleted = t.status === 'completed';
                    return (
                      <tr 
                        key={t.id} 
                        className={`border-b border-surface-150 dark:border-surface-800/80 hover:bg-surface-50/40 dark:hover:bg-surface-850/20 transition-all ${
                          isCompleted ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <button
                            onClick={() => updateTask(t.id, { status: isCompleted ? 'pending' : 'completed' })}
                            className="text-surface-400 hover:text-brand-600 transition-colors"
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={16} className="text-green-500" />
                            ) : (
                              <Circle size={16} />
                            )}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className={`font-semibold text-surface-850 dark:text-surface-100 ${
                              isCompleted ? 'line-through' : ''
                            }`}>
                              {t.title}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              {TYPE_BADGES[t.type]}
                              {t.notes && (
                                <span className="text-[10px] text-surface-450 truncate max-w-[200px]" title={t.notes}>
                                  {t.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {t.associatedId ? (
                            <span className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 font-semibold">
                              {getAssocName(t)}
                            </span>
                          ) : (
                            <span className="text-surface-400">Nessuna</span>
                          )}
                        </td>
                        <td className="p-3">{PRIO_LABELS[t.priority]}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-surface-500">
                            <Calendar size={11} />
                            {t.dueDate}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded font-medium text-surface-700 dark:text-surface-300">
                            {t.assigneeId}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => deleteTask(t.id)}
                            className="p-1 text-surface-300 hover:text-risk-high rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal: New Queue */}
      {showNewQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <form onSubmit={handleCreateQueue} className="bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-800 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold">Crea Nuova Coda</h3>
            <div>
              <label className="block text-[10px] font-bold text-surface-400 uppercase mb-1">Nome Coda</label>
              <input 
                type="text" 
                required
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
                className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-750 rounded-lg text-surface-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/25"
                placeholder="es. Recall Clienti Estero"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewQueueModal(false)} className="px-3 py-1.5 text-xs text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg">Annulla</button>
              <button type="submit" className="px-4 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg">Salva</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create Task */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <form onSubmit={handleCreateTask} className="bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-800 max-w-lg w-full space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-2 border-b border-surface-100 dark:border-surface-800">
              <h3 className="text-sm font-bold">Crea Nuovo Task</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-surface-400 hover:text-surface-600"><Trash2 size={16} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-surface-450 uppercase mb-1">Titolo Task</label>
                <input 
                  type="text" 
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-750 rounded-lg text-surface-900 dark:text-white outline-none"
                  placeholder="Cosa occorre fare?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-surface-450 uppercase mb-1">Tipologia</label>
                  <select 
                    value={taskForm.type}
                    onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value as any })}
                    className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-750 rounded-lg text-surface-900 dark:text-white outline-none"
                  >
                    <option value="todo">To Do (Da Fare)</option>
                    <option value="call">Chiamata</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-surface-450 uppercase mb-1">Priorità</label>
                  <select 
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-750 rounded-lg text-surface-900 dark:text-white outline-none"
                  >
                    <option value="low">Bassa</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-surface-450 uppercase mb-1">Incaricato</label>
                  <select 
                    value={taskForm.assigneeId}
                    onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                    className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-750 rounded-lg text-surface-900 dark:text-white outline-none"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.first_name}>{m.first_name} {m.last_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-surface-450 uppercase mb-1">Coda di Lavoro</label>
                  <select 
                    value={taskForm.queueId}
                    onChange={(e) => setTaskForm({ ...taskForm, queueId: e.target.value })}
                    className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-750 rounded-lg text-surface-900 dark:text-white outline-none"
                  >
                    {queues.map(q => (
                      <option key={q.id} value={q.id}>{q.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-surface-450 uppercase mb-1">Scadenza</label>
                  <input 
                    type="date"
                    required
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-750 rounded-lg text-surface-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-surface-450 uppercase mb-1">Reminder</label>
                  <input 
                    type="time"
                    value={taskForm.reminderTime}
                    onChange={(e) => setTaskForm({ ...taskForm, reminderTime: e.target.value })}
                    className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-750 rounded-lg text-surface-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-surface-450 uppercase mb-1">Associa a Entità</label>
                  <select 
                    value={taskForm.associatedType || ''}
                    onChange={(e) => setTaskForm({ ...taskForm, associatedType: (e.target.value || null) as any, associatedId: '' })}
                    className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-750 rounded-lg text-surface-900 dark:text-white outline-none"
                  >
                    <option value="">Nessuna associazione</option>
                    <option value="contact">Contatto</option>
                    <option value="company">Azienda</option>
                    <option value="deal">Deal</option>
                    <option value="ticket">Ticket</option>
                  </select>
                </div>

                {taskForm.associatedType && (
                  <div>
                    <label className="block text-[10px] font-bold text-surface-450 uppercase mb-1">Scegli Elemento</label>
                    <select 
                      required
                      value={taskForm.associatedId}
                      onChange={(e) => setTaskForm({ ...taskForm, associatedId: e.target.value })}
                      className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-750 rounded-lg text-surface-900 dark:text-white outline-none"
                    >
                      <option value="">Seleziona...</option>
                      
                      {taskForm.associatedType === 'contact' && contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>
                      ))}

                      {taskForm.associatedType === 'company' && companies.map(cp => (
                        <option key={cp.id} value={cp.id}>{cp.name}</option>
                      ))}

                      {taskForm.associatedType === 'deal' && getQuantumDeals().map(d => (
                        <option key={d.id} value={d.id}>{d.title} ({d.stage})</option>
                      ))}

                      {taskForm.associatedType === 'ticket' && tickets.map(t => (
                        <option key={t.id} value={t.id}>[{t.status.toUpperCase()}] {t.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-surface-450 uppercase mb-1">Note integrative</label>
                <textarea 
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-200 dark:border-surface-750 rounded-lg text-surface-900 dark:text-white outline-none resize-none"
                  rows={2}
                  placeholder="Dettagli extra..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-surface-100 dark:border-surface-800">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-3 py-2 text-xs text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg">Annulla</button>
              <button type="submit" className="px-5 py-2 bg-brand-600 text-white text-xs font-bold rounded-lg shadow-sm">Crea Task</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

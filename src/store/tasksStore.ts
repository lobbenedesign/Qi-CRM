import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Task {
  id: string;
  title: string;
  type: 'todo' | 'email' | 'call';
  priority: 'low' | 'medium' | 'high';
  associatedType: 'contact' | 'company' | 'deal' | 'ticket' | null;
  associatedId: string | null;
  assigneeId: string; // user name/id
  queueId: string; // 'all' or queue-xxx
  dueDate: string;
  notes: string;
  status: 'pending' | 'completed';
  reminderTime: string | null;
}

export interface TaskQueue {
  id: string;
  name: string;
}

interface TasksState {
  tasks: Task[];
  queues: TaskQueue[];
  activeQueueId: string;
  
  // Execution flow state
  executingQueueId: string | null;
  executingTaskIds: string[];
  currentExecIdx: number;

  setActiveQueueId: (id: string) => void;
  addTask: (task: Omit<Task, 'id' | 'status'>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addQueue: (name: string) => string;
  deleteQueue: (id: string) => void;

  startExecution: (taskIds: string[], queueId: string) => void;
  nextExecutionTask: () => void;
  prevExecutionTask: () => void;
  stopExecution: () => void;
}

const DEFAULT_QUEUES: TaskQueue[] = [
  { id: 'all', name: 'Tutti i Task' },
  { id: 'q-inbound', name: 'Inbound Leads Follow-up' },
  { id: 'q-support', name: 'Risoluzione Ticket Critici' }
];

const DEFAULT_TASKS: Task[] = [
  {
    id: 't-1',
    title: 'Chiamare Marco Verdi per rinnovo contratto',
    type: 'call',
    priority: 'high',
    associatedType: 'contact',
    associatedId: 'ct-verdi', // Marco Verdi (id reale nel seed)
    assigneeId: 'Giuseppe',
    queueId: 'q-inbound',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    notes: 'Discutere sconto del 10% se rinnova entro il mese.',
    status: 'pending',
    reminderTime: '10:00'
  },
  {
    id: 't-2',
    title: 'Inviare email presentazione a Acme Corp',
    type: 'email',
    priority: 'medium',
    associatedType: 'company',
    associatedId: 'cmp-acme',
    assigneeId: 'Giuseppe',
    queueId: 'q-inbound',
    dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    notes: 'Allegare presentazione pdf del Quantum CRM.',
    status: 'pending',
    reminderTime: '14:30'
  },
  {
    id: 't-3',
    title: 'Verifica dettagli tecnici per ticket TKT-001',
    type: 'todo',
    priority: 'low',
    associatedType: 'ticket',
    associatedId: 'tk-1',
    assigneeId: 'Luca',
    queueId: 'q-support',
    dueDate: new Date().toISOString().split('T')[0],
    notes: 'Controllare i log di sistema per identificare il blocco dell\'importazione.',
    status: 'pending',
    reminderTime: null
  }
];

export const useTasksStore = create<TasksState>()(
  persist(
    (set) => ({
      tasks: DEFAULT_TASKS,
      queues: DEFAULT_QUEUES,
      activeQueueId: 'all',
      executingQueueId: null,
      executingTaskIds: [],
      currentExecIdx: -1,

      setActiveQueueId: (activeQueueId) => set({ activeQueueId }),

      addTask: (taskInput) => {
        const newTask: Task = {
          ...taskInput,
          id: `task-${Math.random().toString(36).substring(2, 10)}`,
          status: 'pending'
        };
        set((s) => ({ tasks: [...s.tasks, newTask] }));
      },

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
        })),

      deleteTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id)
        })),

      addQueue: (name) => {
        const id = `q-${Math.random().toString(36).substring(2, 10)}`;
        set((s) => ({
          queues: [...s.queues, { id, name }]
        }));
        return id;
      },

      deleteQueue: (id) =>
        set((s) => ({
          queues: s.queues.filter((q) => q.id !== id),
          activeQueueId: s.activeQueueId === id ? 'all' : s.activeQueueId
        })),

      startExecution: (taskIds, queueId) => {
        set({
          executingQueueId: queueId,
          executingTaskIds: taskIds,
          currentExecIdx: taskIds.length > 0 ? 0 : -1
        });
      },

      nextExecutionTask: () => {
        set((s) => {
          const nextIdx = s.currentExecIdx + 1;
          if (nextIdx < s.executingTaskIds.length) {
            return { currentExecIdx: nextIdx };
          }
          return { executingQueueId: null, executingTaskIds: [], currentExecIdx: -1 };
        });
      },

      prevExecutionTask: () => {
        set((s) => {
          const prevIdx = s.currentExecIdx - 1;
          if (prevIdx >= 0) {
            return { currentExecIdx: prevIdx };
          }
          return {};
        });
      },

      stopExecution: () => {
        set({
          executingQueueId: null,
          executingTaskIds: [],
          currentExecIdx: -1
        });
      }
    }),
    {
      name: 'qi-crm-tasks-v2'
    }
  )
);

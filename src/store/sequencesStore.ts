// ============================================================
// Qi-Flow — Email Sequences Store
// Cadenze multi-step con email, task, chiamate
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SequenceStepType = 'email' | 'task' | 'call' | 'wait';
export type SequenceStatus = 'active' | 'paused' | 'draft';
export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'bounced' | 'replied' | 'unsubscribed';

export interface SequenceStep {
  id: string;
  type: SequenceStepType;
  delayDays: number;      // giorni dopo il passo precedente (0 = stesso giorno)
  delayHours: number;     // ore aggiuntive
  subject?: string;       // per email
  body?: string;          // per email (HTML/testo)
  taskTitle?: string;     // per task
  taskNote?: string;
  callScript?: string;    // per chiamate
  sendAt?: 'anytime' | 'morning' | 'afternoon' | 'evening'; // orario preferito invio email
}

export interface Sequence {
  id: string;
  name: string;
  description: string;
  status: SequenceStatus;
  steps: SequenceStep[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  enrolledCount: number;
  openRate: number;       // 0-1
  replyRate: number;      // 0-1
  clickRate: number;      // 0-1
}

export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  status: EnrollmentStatus;
  currentStep: number;    // indice step corrente
  enrolledAt: string;
  nextActionAt: string | null;
  completedAt: string | null;
  stepsLog: {
    stepId: string;
    executedAt: string;
    result: 'sent' | 'opened' | 'clicked' | 'replied' | 'failed' | 'skipped';
  }[];
}

interface SequencesState {
  sequences: Sequence[];
  enrollments: SequenceEnrollment[];

  addSequence: (seq: Sequence) => void;
  updateSequence: (id: string, patch: Partial<Sequence>) => void;
  deleteSequence: (id: string) => void;
  duplicateSequence: (id: string) => void;

  addStep: (sequenceId: string, step: SequenceStep) => void;
  updateStep: (sequenceId: string, stepId: string, patch: Partial<SequenceStep>) => void;
  deleteStep: (sequenceId: string, stepId: string) => void;
  reorderSteps: (sequenceId: string, steps: SequenceStep[]) => void;

  enroll: (enrollment: SequenceEnrollment) => void;
  updateEnrollment: (id: string, patch: Partial<SequenceEnrollment>) => void;
  unenroll: (enrollmentId: string) => void;
  getEnrollmentsForContact: (contactId: string) => SequenceEnrollment[];
  getEnrollmentsForSequence: (sequenceId: string) => SequenceEnrollment[];
}

const DEMO_SEQUENCES: Sequence[] = [
  {
    id: 'seq-1',
    name: '🚀 Onboarding New Lead',
    description: 'Sequenza di benvenuto per nuovi lead dal sito web',
    status: 'active',
    enrolledCount: 24,
    openRate: 0.68,
    replyRate: 0.12,
    clickRate: 0.31,
    tags: ['inbound', 'nuovo-lead'],
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    steps: [
      {
        id: 's1-1',
        type: 'email',
        delayDays: 0,
        delayHours: 1,
        subject: 'Benvenuto in {{org_name}} — ecco come possiamo aiutarti',
        body: '<p>Ciao {{first_name}},</p><p>Grazie per aver compilato il nostro form. Siamo qui per aiutarti a raggiungere i tuoi obiettivi.</p><p>Puoi prenotare una demo gratuita di 30 minuti qui: <a href="#">Prenota ora</a></p>',
        sendAt: 'morning',
      },
      {
        id: 's1-2',
        type: 'wait',
        delayDays: 2,
        delayHours: 0,
      },
      {
        id: 's1-3',
        type: 'email',
        delayDays: 0,
        delayHours: 0,
        subject: '3 modi in cui {{org_name}} può aiutare {{company}}',
        body: '<p>Ciao {{first_name}},</p><p>Volevo condividere con te 3 casi d\'uso che i nostri clienti trovano più utili...</p>',
        sendAt: 'morning',
      },
      {
        id: 's1-4',
        type: 'task',
        delayDays: 4,
        delayHours: 0,
        taskTitle: 'Chiama {{first_name}} per follow-up',
        taskNote: 'Verifica se ha ricevuto le email e se ha domande.',
      },
      {
        id: 's1-5',
        type: 'email',
        delayDays: 7,
        delayHours: 0,
        subject: 'Ultima chance: offerta riservata per {{first_name}}',
        body: '<p>Ciao {{first_name}},</p><p>Non voglio disturbarti oltre, ma vorrei farti sapere che abbiamo un\'offerta speciale attiva fino a fine mese.</p>',
        sendAt: 'afternoon',
      },
    ],
  },
  {
    id: 'seq-2',
    name: '🔄 Re-engagement Lead Freddo',
    description: 'Riattiva contatti inattivi da più di 60 giorni',
    status: 'active',
    enrolledCount: 11,
    openRate: 0.42,
    replyRate: 0.08,
    clickRate: 0.19,
    tags: ['re-engagement', 'cold'],
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    steps: [
      {
        id: 's2-1',
        type: 'email',
        delayDays: 0,
        delayHours: 0,
        subject: 'Tutto bene, {{first_name}}?',
        body: '<p>Ciao {{first_name}},</p><p>Sono passati un po\' di mesi dall\'ultima volta che ci siamo sentiti. Come stai? Posso aiutarti con qualcosa?</p>',
        sendAt: 'morning',
      },
      {
        id: 's2-2',
        type: 'wait',
        delayDays: 5,
        delayHours: 0,
      },
      {
        id: 's2-3',
        type: 'call',
        delayDays: 0,
        delayHours: 0,
        callScript: 'Ciao {{first_name}}, ti chiamo per capire se ci sono aggiornamenti nel tuo progetto e se possiamo esserti utili.',
      },
    ],
  },
  {
    id: 'seq-3',
    name: '🏆 Post-Demo Follow-up',
    description: 'Sequenza dopo una demo per chiudere il deal',
    status: 'draft',
    enrolledCount: 0,
    openRate: 0,
    replyRate: 0,
    clickRate: 0,
    tags: ['post-demo', 'chiusura'],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    steps: [
      {
        id: 's3-1',
        type: 'email',
        delayDays: 0,
        delayHours: 2,
        subject: 'Riepilogo della nostra demo — prossimi passi',
        body: '<p>Ciao {{first_name}},</p><p>Grazie per il tempo dedicato oggi. Ecco i punti chiave che abbiamo discusso...</p>',
        sendAt: 'anytime',
      },
      {
        id: 's3-2',
        type: 'task',
        delayDays: 1,
        delayHours: 0,
        taskTitle: 'Invia proposta commerciale a {{first_name}}',
        taskNote: 'Personalizza la proposta in base ai punti discussi nella demo.',
      },
    ],
  },
];

export const useSequencesStore = create<SequencesState>()(
  persist(
    (set, get) => ({
      sequences: DEMO_SEQUENCES,
      enrollments: [],

      addSequence: (seq) =>
        set((s) => ({ sequences: [...s.sequences, seq] })),

      updateSequence: (id, patch) =>
        set((s) => ({
          sequences: s.sequences.map((sq) =>
            sq.id === id ? { ...sq, ...patch, updatedAt: new Date().toISOString() } : sq,
          ),
        })),

      deleteSequence: (id) =>
        set((s) => ({
          sequences: s.sequences.filter((sq) => sq.id !== id),
          enrollments: s.enrollments.filter((e) => e.sequenceId !== id),
        })),

      duplicateSequence: (id) => {
        const { sequences } = get();
        const original = sequences.find((s) => s.id === id);
        if (!original) return;
        const copy: Sequence = {
          ...original,
          id: `seq-${Date.now()}`,
          name: `${original.name} (copia)`,
          status: 'draft',
          enrolledCount: 0,
          openRate: 0,
          replyRate: 0,
          clickRate: 0,
          steps: original.steps.map((st) => ({ ...st, id: `${st.id}-copy` })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ sequences: [...s.sequences, copy] }));
      },

      addStep: (sequenceId, step) =>
        set((s) => ({
          sequences: s.sequences.map((sq) =>
            sq.id === sequenceId
              ? { ...sq, steps: [...sq.steps, step], updatedAt: new Date().toISOString() }
              : sq,
          ),
        })),

      updateStep: (sequenceId, stepId, patch) =>
        set((s) => ({
          sequences: s.sequences.map((sq) =>
            sq.id === sequenceId
              ? {
                  ...sq,
                  steps: sq.steps.map((st) => (st.id === stepId ? { ...st, ...patch } : st)),
                  updatedAt: new Date().toISOString(),
                }
              : sq,
          ),
        })),

      deleteStep: (sequenceId, stepId) =>
        set((s) => ({
          sequences: s.sequences.map((sq) =>
            sq.id === sequenceId
              ? {
                  ...sq,
                  steps: sq.steps.filter((st) => st.id !== stepId),
                  updatedAt: new Date().toISOString(),
                }
              : sq,
          ),
        })),

      reorderSteps: (sequenceId, steps) =>
        set((s) => ({
          sequences: s.sequences.map((sq) =>
            sq.id === sequenceId ? { ...sq, steps, updatedAt: new Date().toISOString() } : sq,
          ),
        })),

      enroll: (enrollment) =>
        set((s) => ({ enrollments: [...s.enrollments, enrollment] })),

      updateEnrollment: (id, patch) =>
        set((s) => ({
          enrollments: s.enrollments.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      unenroll: (enrollmentId) =>
        set((s) => ({
          enrollments: s.enrollments.filter((e) => e.id !== enrollmentId),
        })),

      getEnrollmentsForContact: (contactId) =>
        get().enrollments.filter((e) => e.contactId === contactId),

      getEnrollmentsForSequence: (sequenceId) =>
        get().enrollments.filter((e) => e.sequenceId === sequenceId),
    }),
    { name: 'qi-crm-sequences-v1' }
  )
);

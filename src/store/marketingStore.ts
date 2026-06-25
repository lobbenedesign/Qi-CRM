import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QuantumForm {
  id: string;
  name: string;
  template: 'registration' | 'contact_us' | 'newsletter' | 'ebook';
  themeColor: string;
  buttonText: string;
  fields: string[]; // references to contact properties (e.g. 'first_name', 'last_name', 'email', 'phone', or custom properties)
  submissionsCount: number;
  successMessage: string;
  notificationEmail: string;
  followUpSubject: string;
  followUpBody: string;
  // Lead Generation → Pipeline: crea un Deal alla submission
  createDeal?: boolean;
  dealStage?: string;     // stage_key del deal generato (default 'lead')
  dealValue?: number;     // valore stimato del deal (default 0)
}

export interface FormSubmission {
  id: string;
  formId: string;
  submittedAt: string;
  data: Record<string, string>;
}

interface MarketingState {
  forms: QuantumForm[];
  submissions: FormSubmission[];
  addForm: (form: Omit<QuantumForm, 'id' | 'submissionsCount'>) => string;
  deleteForm: (id: string) => void;
  updateForm: (id: string, patch: Partial<QuantumForm>) => void;
  submitForm: (formId: string, data: Record<string, string>) => void;
}

const DEFAULT_FORMS: QuantumForm[] = [
  {
    id: 'form-newsletter',
    name: 'Iscrizione Newsletter Generale',
    template: 'newsletter',
    themeColor: '#6366f1',
    buttonText: 'Iscriviti Ora',
    fields: ['first_name', 'email'],
    submissionsCount: 12,
    successMessage: 'Grazie per esserti iscritto alla nostra newsletter!',
    notificationEmail: 'commerciale@qi-crm.it',
    followUpSubject: 'Benvenuto nella nostra community!',
    followUpBody: 'Ciao,\n\ngrazie per esserti iscritto. Riceverai presto aggiornamenti esclusivi sul mercato B2B.\n\nA presto,\nIl Team Qi-CRM'
  },
  {
    id: 'form-contattaci',
    name: 'Modulo Richiesta Demo',
    template: 'contact_us',
    themeColor: '#10b981',
    buttonText: 'Richiedi Demo Gratuita',
    fields: ['first_name', 'last_name', 'email', 'phone', 'prop-linkedin'],
    submissionsCount: 4,
    successMessage: 'Richiesta ricevuta! Un nostro consulente ti contatterà nelle prossime 2 ore.',
    notificationEmail: 'info@qi-crm.it',
    followUpSubject: 'Conferma Ricezione Richiesta Demo Qi-CRM',
    followUpBody: 'Ciao,\n\nabbiamo ricevuto la tua richiesta di demo. A breve ti contatteremo per fissare una call di approfondimento.\n\nCordiali saluti,\nGiuseppe Lobbene',
    createDeal: true,
    dealStage: 'lead',
    dealValue: 0
  }
];

const DEFAULT_SUBMISSIONS: FormSubmission[] = [
  {
    id: 'sub-1',
    formId: 'form-newsletter',
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    data: { first_name: 'Alessandro', email: 'alessandro@nexus.it' }
  },
  {
    id: 'sub-2',
    formId: 'form-contattaci',
    submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    data: { first_name: 'Filippo', last_name: 'Neri', email: 'filippo.neri@techstart.io', phone: '+39 333 998877', 'prop-linkedin': 'https://linkedin.com/in/filippo-neri' }
  }
];

export const useMarketingStore = create<MarketingState>()(
  persist(
    (set) => ({
      forms: DEFAULT_FORMS,
      submissions: DEFAULT_SUBMISSIONS,

      addForm: (f) => {
        const id = `form-${Math.random().toString(36).substring(2, 10)}`;
        set((s) => ({
          forms: [...s.forms, { ...f, id, submissionsCount: 0 }]
        }));
        return id;
      },

      deleteForm: (id) =>
        set((s) => ({
          forms: s.forms.filter((f) => f.id !== id),
          submissions: s.submissions.filter((sub) => sub.formId !== id)
        })),

      updateForm: (id, patch) =>
        set((s) => ({
          forms: s.forms.map((f) => (f.id === id ? { ...f, ...patch } : f))
        })),

      submitForm: (formId, data) =>
        set((s) => {
          const submission: FormSubmission = {
            id: `sub-${Math.random().toString(36).substring(2, 10)}`,
            formId,
            submittedAt: new Date().toISOString(),
            data
          };
          return {
            submissions: [submission, ...s.submissions],
            forms: s.forms.map((f) =>
              f.id === formId ? { ...f, submissionsCount: f.submissionsCount + 1 } : f
            )
          };
        }),
    }),
    {
      name: 'qi-crm-marketing-forms-v1',
    }
  )
);

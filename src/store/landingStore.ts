import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LandingPage {
  id: string;
  name: string;
  title: string;
  urlSlug: string;
  metaDescription: string;
  theme: 'dark_gradient' | 'glassmorphism' | 'clean_tech';
  headerText: string;
  bodyText: string;
  associatedFormId: string;
  published: boolean;
  publishedAt: string | null;
}

interface LandingState {
  pages: LandingPage[];
  addPage: (page: Omit<LandingPage, 'id' | 'publishedAt'>) => string;
  deletePage: (id: string) => void;
  updatePage: (id: string, patch: Partial<LandingPage>) => void;
}

const DEFAULT_PAGES: LandingPage[] = [
  {
    id: 'page-beta',
    name: 'Qi-CRM Beta Program',
    title: 'Unisciti al Programma Beta di Qi-CRM',
    urlSlug: 'beta-program',
    metaDescription: 'Ottieni l\'accesso anticipato alla piattaforma CRM basata su intelligenza artificiale locale.',
    theme: 'glassmorphism',
    headerText: 'Sperimenta il Futuro delle Relazioni B2B',
    bodyText: 'Qi-CRM è la prima piattaforma di coordinazione neurale per team commerciali. Compila il modulo qui sotto per essere inserito nella lista d\'attesa prioritaria.',
    associatedFormId: 'form-contattaci',
    published: true,
    publishedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
  },
  {
    id: 'page-newsletter',
    name: 'Iscrizione Newsletter Premium',
    title: 'Newsletter Esclusiva Qi-CRM',
    urlSlug: 'newsletter-premium',
    metaDescription: 'Report mensili sulle migliori strategie commerciali e automazioni basate su AI.',
    theme: 'dark_gradient',
    headerText: 'Resta sempre aggiornato sui Trend del CRM',
    bodyText: 'Unisciti a oltre 5.000 leader aziendali che ricevono mensilmente i nostri insights strategici sul CRM e sull\'automazione dei processi.',
    associatedFormId: 'form-newsletter',
    published: true,
    publishedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  }
];

export const useLandingStore = create<LandingState>()(
  persist(
    (set) => ({
      pages: DEFAULT_PAGES,

      addPage: (p) => {
        const id = `page-${Math.random().toString(36).substring(2, 10)}`;
        set((s) => ({
          pages: [...s.pages, { ...p, id, publishedAt: p.published ? new Date().toISOString() : null }]
        }));
        return id;
      },

      deletePage: (id) =>
        set((s) => ({
          pages: s.pages.filter((p) => p.id !== id)
        })),

      updatePage: (id, patch) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id === id) {
              const publishedAt = patch.published !== undefined
                ? (patch.published ? (p.publishedAt || new Date().toISOString()) : null)
                : p.publishedAt;
              return { ...p, ...patch, publishedAt };
            }
            return p;
          })
        }))
    }),
    {
      name: 'qi-crm-landing-pages-v1'
    }
  )
);

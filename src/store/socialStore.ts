import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// SOCIAL STUDIO — pianificazione post e inbox social unificata
// (Meta: Facebook/Instagram, LinkedIn). Connessioni simulate:
// l'integrazione reale richiede le API Graph di Meta e LinkedIn.
// ============================================================

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin';

export interface SocialConnection {
  platform: SocialPlatform;
  connected: boolean;
  account: string | null;
}

export interface SocialPost {
  id: string;
  platforms: SocialPlatform[];
  content: string;
  scheduledAt: string;            // ISO
  status: 'scheduled' | 'published';
  metrics: { likes: number; comments: number; shares: number };
  created_at: string;
}

export interface SocialInteraction {
  id: string;
  platform: SocialPlatform;
  type: 'comment' | 'dm';
  author: string;
  text: string;
  receivedAt: string;
  status: 'new' | 'replied';
  reply: string | null;
}

interface SocialState {
  connections: SocialConnection[];
  posts: SocialPost[];
  interactions: SocialInteraction[];
  toggleConnection: (platform: SocialPlatform, account?: string) => void;
  addPost: (p: Omit<SocialPost, 'id' | 'status' | 'metrics' | 'created_at'>) => void;
  publishPost: (id: string) => void;
  removePost: (id: string) => void;
  reply: (id: string, text: string) => void;
}

const now = () => new Date().toISOString();
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

const DEFAULT_CONNECTIONS: SocialConnection[] = [
  { platform: 'facebook', connected: true, account: 'Qi-CRM Official' },
  { platform: 'instagram', connected: false, account: null },
  { platform: 'linkedin', connected: true, account: 'Qi-CRM' },
];

const DEFAULT_POSTS: SocialPost[] = [
  { id: 'sp-1', platforms: ['facebook', 'linkedin'], content: '🚀 Abbiamo lanciato il nuovo modulo Forecast! Previsioni di vendita pesate per probabilità.', scheduledAt: inDays(1), status: 'scheduled', metrics: { likes: 0, comments: 0, shares: 0 }, created_at: now() },
  { id: 'sp-2', platforms: ['linkedin'], content: 'Come il Trust Score cambia la qualità dei dati nel CRM. Leggi il nostro approfondimento.', scheduledAt: inDays(-2), status: 'published', metrics: { likes: 48, comments: 6, shares: 9 }, created_at: now() },
];

const DEFAULT_INTERACTIONS: SocialInteraction[] = [
  { id: 'si-1', platform: 'instagram', type: 'comment', author: '@marco.designs', text: 'Bellissimo tool, fa anche email marketing?', receivedAt: now(), status: 'new', reply: null },
  { id: 'si-2', platform: 'facebook', type: 'dm', author: 'Laura Bianchi', text: 'Avete un piano per piccole agenzie?', receivedAt: now(), status: 'new', reply: null },
  { id: 'si-3', platform: 'linkedin', type: 'comment', author: 'Giorgio Vitale', text: 'Complimenti per il Forecast pesato!', receivedAt: now(), status: 'replied', reply: 'Grazie Giorgio! 🙏' },
];

export const useSocialStore = create<SocialState>()(
  persist(
    (set) => ({
      connections: DEFAULT_CONNECTIONS,
      posts: DEFAULT_POSTS,
      interactions: DEFAULT_INTERACTIONS,
      toggleConnection: (platform, account) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.platform === platform
              ? { ...c, connected: !c.connected, account: !c.connected ? (account ?? 'Account collegato') : null }
              : c,
          ),
        })),
      addPost: (p) =>
        set((s) => ({
          posts: [{ ...p, id: `sp-${crypto.randomUUID().slice(0, 8)}`, status: 'scheduled', metrics: { likes: 0, comments: 0, shares: 0 }, created_at: now() }, ...s.posts],
        })),
      publishPost: (id) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id
              ? { ...p, status: 'published', metrics: { likes: Math.floor(Math.random() * 60) + 5, comments: Math.floor(Math.random() * 12), shares: Math.floor(Math.random() * 15) } }
              : p,
          ),
        })),
      removePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
      reply: (id, text) =>
        set((s) => ({ interactions: s.interactions.map((i) => (i.id === id ? { ...i, status: 'replied', reply: text } : i)) })),
    }),
    { name: 'qi-crm-social-v1' },
  ),
);

export const PLATFORM_META: Record<SocialPlatform, { label: string; color: string; guide: string }> = {
  facebook:  { label: 'Facebook',  color: '#1877f2', guide: 'Collega la Pagina Facebook via Meta Graph API (permessi pages_manage_posts, pages_read_engagement).' },
  instagram: { label: 'Instagram', color: '#e1306c', guide: 'Collega un account Instagram Business tramite Meta Graph API (instagram_basic, instagram_manage_comments).' },
  linkedin:  { label: 'LinkedIn',  color: '#0a66c2', guide: 'Collega la Pagina aziendale LinkedIn via Marketing Developer Platform (w_organization_social).' },
};

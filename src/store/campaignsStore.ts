import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CampaignAudience {
  id: string;
  name: string;
  description: string;
  contactCount: number;
}

export interface CampaignBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'spacer';
  content: string; // HTML string, image URL, or button label
  url?: string; // For images/buttons
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  audienceId: string;
  template: 'newsletter' | 'launch' | 'event' | 'custom';
  fromName: string;
  fromAddress: string;
  guardianAiActive: boolean;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  blocks: CampaignBlock[];
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    excluded: number;
  };
  sentAt: string | null;
}

interface CampaignsState {
  audiences: CampaignAudience[];
  campaigns: EmailCampaign[];
  addAudience: (aud: Omit<CampaignAudience, 'id'>) => void;
  addCampaign: (campaign: Omit<EmailCampaign, 'id' | 'status' | 'sentAt' | 'stats'>) => string;
  deleteCampaign: (id: string) => void;
  updateCampaign: (id: string, patch: Partial<EmailCampaign>) => void;
  sendCampaign: (id: string) => void;
}

const DEFAULT_AUDIENCES: CampaignAudience[] = [
  { id: 'aud-1', name: 'Tutti i Contatti', description: 'Tutti i contatti attivi nel CRM', contactCount: 245 },
  { id: 'aud-2', name: 'Clienti VIP 2025', description: 'Hanno chiuso almeno un deal > 5k', contactCount: 42 },
];

const DEFAULT_CAMPAIGNS: EmailCampaign[] = [
  {
    id: 'campaign-1',
    name: 'Lancio Qi-CRM V2.0',
    subject: 'La rivoluzione neurale per il tuo team commerciale è qui',
    audienceId: 'aud-1',
    template: 'launch',
    fromName: 'Giuseppe Lobbene',
    fromAddress: 'giuseppe@qi-crm.it',
    guardianAiActive: true,
    status: 'sent',
    blocks: [
      { id: 'b1', type: 'image', content: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200&h=400' },
      { id: 'b2', type: 'text', content: '<h2>Il nuovo CRM è online</h2><p>Abbiamo rivoluzionato il modo di fare vendite.</p>' },
      { id: 'b3', type: 'button', content: 'Scopri di più', url: 'https://qi-crm.app' }
    ],
    stats: { sent: 142, opened: 85, clicked: 32, bounced: 1, unsubscribed: 2, excluded: 28 },
    sentAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  },
  {
    id: 'campaign-2',
    name: 'Newsletter di Giugno 2026',
    subject: '5 Consigli per raddoppiare le vendite B2B questo mese',
    audienceId: 'aud-1',
    template: 'newsletter',
    fromName: 'Lobbenedesign Team',
    fromAddress: 'marketing@qi-crm.it',
    guardianAiActive: false,
    status: 'draft',
    blocks: [
      { id: 'b1', type: 'text', content: '<h1>I consigli del mese</h1><p>Ecco 5 tattiche per migliorare le performance del team commerciale.</p>' }
    ],
    stats: { sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, excluded: 0 },
    sentAt: null
  }
];

export const useCampaignsStore = create<CampaignsState>()(
  persist(
    (set) => ({
      audiences: DEFAULT_AUDIENCES,
      campaigns: DEFAULT_CAMPAIGNS,

      addAudience: (aud) =>
        set((s) => ({ audiences: [...s.audiences, { ...aud, id: `aud-${Math.random().toString(36).substring(2, 10)}` }] })),

      addCampaign: (c) => {
        const id = `campaign-${Math.random().toString(36).substring(2, 10)}`;
        set((s) => ({
          campaigns: [...s.campaigns, { ...c, id, status: 'draft', sentAt: null, stats: { sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, excluded: 0 } }]
        }));
        return id;
      },

      deleteCampaign: (id) =>
        set((s) => ({
          campaigns: s.campaigns.filter((c) => c.id !== id)
        })),

      updateCampaign: (id, patch) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c))
        })),

      sendCampaign: (id) =>
        set((s) => {
          const camp = s.campaigns.find(c => c.id === id);
          if (!camp) return s;
          const audience = s.audiences.find(a => a.id === camp.audienceId);
          const count = audience ? audience.contactCount : 0;
          return {
            campaigns: s.campaigns.map((c) =>
              c.id === id
                ? { 
                    ...c, 
                    status: 'sent', 
                    sentAt: new Date().toISOString(),
                    stats: {
                      sent: count,
                      opened: Math.floor(count * 0.45),
                      clicked: Math.floor(count * 0.12),
                      bounced: Math.floor(count * 0.02),
                      unsubscribed: Math.floor(count * 0.01),
                      excluded: Math.floor(count * 0.05),
                    }
                  }
                : c
            )
          };
        })
    }),
    {
      name: 'qi-crm-campaigns-v1'
    }
  )
);

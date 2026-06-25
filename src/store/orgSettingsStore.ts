import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TeamRole } from '../types/team';

export interface OrgSettings {
  company_name: string;
  website: string;

  // Google OAuth + Calendar/Meet
  google: {
    calendar_enabled: boolean; meet_enabled: boolean; connected: boolean; account: string | null;
    client_id: string; client_secret: string; redirect_uri: string;
  };
  // WhatsApp Cloud API (Meta)
  whatsapp: {
    enabled: boolean; verified: boolean;
    phone_number_id: string; business_account_id: string; token: string; verify_token: string;
  };
  // Telegram Bot
  telegram: { enabled: boolean; verified: boolean; bot_token: string; bot_username: string };
  // Email transazionale (es. notifiche, inviti)
  email: { provider: 'resend' | 'sendgrid' | 'smtp'; verified: boolean; from_address: string; from_name: string; api_key: string; domain: string };

  // Email Marketing (Qi-Campaigns Mass Broadcast)
  mass_email: { 
    provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun'; 
    verified: boolean; 
    host: string; 
    port: string; 
    api_key: string; 
    from_address: string; 
    from_name: string; 
  };

  // SMS transazionali / broadcast (Twilio)
  sms: { enabled: boolean; verified: boolean; account_sid: string; auth_token: string; from_number: string };

  // Notifiche Push (Web Push / Firebase Cloud Messaging)
  push: { enabled: boolean; verified: boolean; provider: 'fcm' | 'webpush'; server_key: string; vapid_public: string; vapid_private: string };

  // Social (Meta Graph: Facebook/Instagram + LinkedIn)
  social: {
    meta: { enabled: boolean; verified: boolean; app_id: string; app_secret: string; page_id: string; page_token: string; ig_account_id: string };
    linkedin: { enabled: boolean; verified: boolean; client_id: string; client_secret: string; org_urn: string; access_token: string };
  };

  // Cattura lead dal sito (web-to-lead)
  inbound: {
    enabled: boolean; endpoint_key: string;
    auto_create_contact: boolean; auto_create_ticket: boolean;
    assign_role: TeamRole; allowed_origin: string; spam_protection: boolean;
  };

  // Branding / white-label
  branding: { logo_url: string; accent_color: string; login_subtitle: string };

  // Orari di lavoro & SLA
  business_hours: { timezone: string; start: string; end: string; days: number[]; sla_first_response_h: number };

  // Sicurezza
  security: { require_2fa: boolean; session_timeout_min: number; password_min_length: number; ip_allowlist: string };
}

const genKey = () => `sov_${crypto.randomUUID().replace(/-/g, '').slice(0, 28)}`;

const defaults: OrgSettings = {
  company_name: 'XYZ S.r.l.',
  website: 'https://www.xyz.it',
  google:   { calendar_enabled: false, meet_enabled: false, connected: false, account: null, client_id: '', client_secret: '', redirect_uri: 'https://app.qi-crm.app/oauth/google/callback' },
  whatsapp: { enabled: false, verified: false, phone_number_id: '', business_account_id: '', token: '', verify_token: 'sovrano_verify' },
  telegram: { enabled: false, verified: false, bot_token: '', bot_username: '' },
  email:    { provider: 'resend', verified: false, from_address: 'noreply@xyz.it', from_name: 'XYZ S.r.l.', api_key: '', domain: 'xyz.it' },
  mass_email: { provider: 'sendgrid', verified: false, host: 'smtp.sendgrid.net', port: '587', api_key: '', from_address: 'newsletter@xyz.it', from_name: 'XYZ Marketing' },
  sms:      { enabled: false, verified: false, account_sid: '', auth_token: '', from_number: '' },
  push:     { enabled: false, verified: false, provider: 'webpush', server_key: '', vapid_public: '', vapid_private: '' },
  social:   {
    meta:     { enabled: false, verified: false, app_id: '', app_secret: '', page_id: '', page_token: '', ig_account_id: '' },
    linkedin: { enabled: false, verified: false, client_id: '', client_secret: '', org_urn: '', access_token: '' },
  },
  inbound:  { enabled: true, endpoint_key: genKey(), auto_create_contact: true, auto_create_ticket: true, assign_role: 'telefonista', allowed_origin: 'https://www.xyz.it', spam_protection: true },
  branding: { logo_url: '', accent_color: '#6366f1', login_subtitle: 'Il CRM che tratta il dato come entità viva' },
  business_hours: { timezone: 'Europe/Rome', start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5], sla_first_response_h: 4 },
  security: { require_2fa: false, session_timeout_min: 480, password_min_length: 8, ip_allowlist: '' },
};

interface OrgState extends OrgSettings {
  set: <K extends keyof OrgSettings>(key: K, value: OrgSettings[K]) => void;
  patch: <K extends keyof OrgSettings>(key: K, value: Partial<OrgSettings[K]>) => void;
  rotateInboundKey: () => void;
}

export const useOrgSettingsStore = create<OrgState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (key, value) => set({ [key]: value } as Pick<OrgSettings, typeof key>),
      patch: (key, value) =>
        set((s) => ({ [key]: { ...(s[key] as object), ...value } } as Pick<OrgSettings, typeof key>)),
      rotateInboundKey: () => set((s) => ({ inbound: { ...s.inbound, endpoint_key: genKey() } })),
    }),
    { name: 'qi-crm-org-v2' },
  ),
);

// ============================================================
// SOVRANO — Multi-utente: ruoli, membri team, inviti, audit log.
// ============================================================

export type TeamRole = string;

export interface TeamRoleDefinition {
  key: string;
  label: string;
  description: string;
  color: string;
  permissions: string[];
  is_custom: boolean;
}

export interface TeamGroup {
  id: string;
  name: string;
  competence_area: string;
  leader_id: string; // ID del team leader
  member_ids: string[]; // ID dei membri del team (subordinati)
  created_at: string;
}

export type MemberStatus = 'active' | 'invited' | 'disabled';

export interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;          // per notifiche Telegram/WhatsApp
  role: TeamRole;
  status: MemberStatus;
  invite_token: string | null;   // valorizzato finché 'invited'
  password_set: boolean;
  notify_channels: NotifyChannel[];
  created_at: string;
  last_active_at: string | null;
}

export type NotifyChannel = 'visual' | 'email' | 'telegram' | 'whatsapp';

// ----- Reminder -----

export interface Reminder {
  id: string;
  title: string;
  note: string | null;
  remind_at: string;             // ISO quando scatta
  channels: NotifyChannel[];
  user_id: string;               // membro destinatario
  contact_id: string | null;
  deal_id: string | null;
  ticket_id: string | null;
  status: 'pending' | 'sent' | 'done';
  created_at: string;
}

// Esito di consegna su un canale (registro invii)
export interface DeliveryLog {
  id: string;
  reminder_id: string;
  channel: NotifyChannel;
  to: string;                    // email o telefono
  ok: boolean;
  detail: string;
  at: string;
}

export type AuditAction =
  | 'login' | 'logout'
  | 'create' | 'update' | 'delete'
  | 'stage_change' | 'ai_capture' | 'export'
  | 'invite' | 'role_change' | 'member_disable' | 'member_enable'
  | 'assign' | 'reminder';

export type AuditResource =
  | 'contact' | 'company' | 'deal' | 'activity'
  | 'automation' | 'member' | 'session' | 'ticket';

// ----- Ticket -----

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
// La categoria determina il ruolo competente per lo smistamento automatico
export type TicketCategory = 'support' | 'admin' | 'config' | 'callback' | 'sales';

export interface Ticket {
  id: string;
  code: string;                   // es. TKT-014
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assignee_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  due_at: string | null;
}

export interface AuditEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_role: TeamRole;
  action: AuditAction;
  resource: AuditResource;
  target_label: string;          // es. "Mario Rossi", "Acme — Contratto"
  timestamp: string;             // ISO con secondi
  meta?: Record<string, unknown>;
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TeamMember, TeamRole } from '../types/team';

const now = () => new Date().toISOString();
const token = () => crypto.randomUUID().replace(/-/g, '').slice(0, 24);

// Membri demo: puoi accedere con queste email (password qualsiasi) per
// provare i diversi ruoli. La password reale non è richiesta in demo.
const allCh: TeamMember['notify_channels'] = ['visual', 'email', 'telegram', 'whatsapp'];

const seedMembers: TeamMember[] = [
  { id: 'tm-owner', first_name: 'Giuseppe', last_name: 'Lobbene', email: 'giuseppelobbene@gmail.com', phone: '+39 333 0000001', role: 'superadmin',     status: 'active', invite_token: null, password_set: true, notify_channels: allCh,                       created_at: now(), last_active_at: now() },
  { id: 'tm-comm',  first_name: 'Marco',    last_name: 'Bianchi',  email: 'marco@sovrano.it',          phone: '+39 333 0000002', role: 'commerciale',    status: 'active', invite_token: null, password_set: true, notify_channels: ['visual', 'email', 'telegram'], created_at: now(), last_active_at: new Date(Date.now() - 3600_000).toISOString() },
  { id: 'tm-admin', first_name: 'Anna',     last_name: 'Ferrari',  email: 'anna@sovrano.it',           phone: '+39 333 0000003', role: 'amministrativo', status: 'active', invite_token: null, password_set: true, notify_channels: ['visual', 'email'],            created_at: now(), last_active_at: new Date(Date.now() - 7200_000).toISOString() },
  { id: 'tm-conf',  first_name: 'Luca',     last_name: 'Verdi',    email: 'luca@sovrano.it',           phone: null,              role: 'configuratore',  status: 'active', invite_token: null, password_set: true, notify_channels: ['visual'],                     created_at: now(), last_active_at: null },
  { id: 'tm-tel',   first_name: 'Sara',     last_name: 'Conti',    email: 'sara@sovrano.it',           phone: '+39 333 0000005', role: 'telefonista',    status: 'active', invite_token: null, password_set: true, notify_channels: ['visual', 'whatsapp'],         created_at: now(), last_active_at: new Date(Date.now() - 600_000).toISOString() },
  { id: 'tm-inv',   first_name: 'Paolo',    last_name: 'Neri',     email: 'paolo@sovrano.it',          phone: null,              role: 'commerciale',    status: 'invited', invite_token: token(), password_set: false, notify_channels: ['visual', 'email'],          created_at: now(), last_active_at: null },
];

interface TeamState {
  members: TeamMember[];

  getByEmail: (email: string) => TeamMember | undefined;
  getByToken: (t: string) => TeamMember | undefined;

  invite: (data: { first_name: string; last_name: string; email: string; phone?: string; role: TeamRole }) => TeamMember;
  acceptInvite: (t: string, _password: string) => TeamMember | null;
  updateRole: (id: string, role: TeamRole) => void;
  setStatus: (id: string, status: TeamMember['status']) => void;
  updateMember: (id: string, patch: Partial<Pick<TeamMember, 'phone' | 'notify_channels' | 'first_name' | 'last_name'>>) => void;
  remove: (id: string) => void;
  touch: (id: string) => void;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      members: seedMembers,

      getByEmail: (email) => get().members.find((m) => m.email.toLowerCase() === email.toLowerCase()),
      getByToken: (t) => get().members.find((m) => m.invite_token === t),

      invite: ({ first_name, last_name, email, phone, role }) => {
        const member: TeamMember = {
          id: `tm-${crypto.randomUUID().slice(0, 8)}`,
          first_name, last_name, email, phone: phone ?? null, role,
          status: 'invited', invite_token: token(), password_set: false,
          notify_channels: phone ? ['visual', 'email', 'telegram', 'whatsapp'] : ['visual', 'email'],
          created_at: now(), last_active_at: null,
        };
        set((s) => ({ members: [member, ...s.members] }));
        return member;
      },

      acceptInvite: (t, _password) => {
        const member = get().members.find((m) => m.invite_token === t);
        if (!member) return null;
        const updated: TeamMember = { ...member, status: 'active', password_set: true, invite_token: null, last_active_at: now() };
        set((s) => ({ members: s.members.map((m) => (m.id === member.id ? updated : m)) }));
        return updated;
      },

      updateRole: (id, role) =>
        set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, role } : m)) })),

      setStatus: (id, status) =>
        set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, status } : m)) })),

      updateMember: (id, patch) =>
        set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),

      remove: (id) => set((s) => ({ members: s.members.filter((m) => m.id !== id) })),

      touch: (id) =>
        set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, last_active_at: now() } : m)) })),
    }),
    { name: 'qi-crm-team-v1' },
  ),
);

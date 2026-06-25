import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seedProfile } from '../lib/mock/seed';
import { useTeamStore } from './teamStore';
import type { Profile } from '../types/crm';
import type { TeamRole } from '../types/team';

interface AuthSession {
  email: string;
  loggedAt: string;
}

interface AuthState {
  session: AuthSession | null;
  profile: Profile | null;
  role: TeamRole | null;
  memberId: string | null;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, _password: string, fullName: string) => Promise<void>;
  signOut: () => void;
}

/**
 * Mock auth con ruoli. signIn cerca il membro del team per email:
 * - se esiste e attivo → accede col suo ruolo e nome
 * - altrimenti → fallback superadmin (proprietario demo)
 * Quando collegheremo Supabase, qui useremo supabase.auth + la tabella profiles.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      profile: null,
      role: null,
      memberId: null,

      signIn: async (email, password) => {
        await new Promise((r) => setTimeout(r, 300));

        // Login superadmin prestabilito (id: superadmin / password: superadmin2026!)
        const id = email.trim().toLowerCase();
        if (id === 'superadmin' && password === 'superadmin2026!') {
          set({
            session: { email: 'superadmin', loggedAt: new Date().toISOString() },
            profile: { ...seedProfile },
            role: 'superadmin',
            memberId: 'tm-owner',
          });
          useTeamStore.getState().touch('tm-owner');
          return;
        }

        const member = useTeamStore.getState().getByEmail(email);

        if (member && member.status === 'active') {
          set({
            session: { email, loggedAt: new Date().toISOString() },
            profile: { ...seedProfile, id: member.id, full_name: `${member.first_name} ${member.last_name}` },
            role: member.role,
            memberId: member.id,
          });
          useTeamStore.getState().touch(member.id);
        } else {
          // Proprietario / demo → superadmin
          set({
            session: { email, loggedAt: new Date().toISOString() },
            profile: { ...seedProfile },
            role: 'superadmin',
            memberId: 'tm-owner',
          });
          useTeamStore.getState().touch('tm-owner');
        }
      },

      signUp: async (email, _password, fullName) => {
        await new Promise((r) => setTimeout(r, 300));
        set({
          session: { email, loggedAt: new Date().toISOString() },
          profile: { ...seedProfile, full_name: fullName || seedProfile.full_name },
          role: 'superadmin',
          memberId: 'tm-owner',
        });
      },

      signOut: () => set({ session: null, profile: null, role: null, memberId: null }),
    }),
    { name: 'qi-crm-auth-v1' },
  ),
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TeamGroup } from '../types/team';

interface TeamGroupState {
  groups: TeamGroup[];
  createGroup: (name: string, competence_area: string, leader_id: string, member_ids: string[]) => void;
  updateGroup: (id: string, patch: Partial<Omit<TeamGroup, 'id' | 'created_at'>>) => void;
  deleteGroup: (id: string) => void;
}

const DEFAULT_GROUPS: TeamGroup[] = [
  {
    id: 'grp-sales',
    name: 'Team Commerciale & Sales',
    competence_area: 'Vendite e Pipeline',
    leader_id: 'tm-comm', // Marco Bianchi
    member_ids: ['tm-tel'], // Sara Conti
    created_at: new Date().toISOString(),
  },
  {
    id: 'grp-tech',
    name: 'Team Tecnico & Configurazioni',
    competence_area: 'Configurazione Deal e Prodotti',
    leader_id: 'tm-conf', // Luca Verdi
    member_ids: [],
    created_at: new Date().toISOString(),
  }
];

export const useTeamGroupStore = create<TeamGroupState>()(
  persist(
    (set) => ({
      groups: DEFAULT_GROUPS,

      createGroup: (name, competence_area, leader_id, member_ids) => {
        const newGroup: TeamGroup = {
          id: `grp-${crypto.randomUUID().slice(0, 8)}`,
          name,
          competence_area,
          leader_id,
          member_ids,
          created_at: new Date().toISOString(),
        };
        set((s) => ({ groups: [...s.groups, newGroup] }));
      },

      updateGroup: (id, patch) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),

      deleteGroup: (id) =>
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
        })),
    }),
    {
      name: 'qi-crm-team-groups-v1',
    }
  )
);

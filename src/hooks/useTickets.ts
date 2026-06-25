import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repo } from '../lib/repo';
import { logAudit } from '../lib/audit';
import type { Ticket } from '../types/team';

const TICKETS_KEY = ['tickets'];

export function useTickets() {
  return useQuery({
    queryKey: TICKETS_KEY,
    queryFn: async () => (await repo.listTickets()) as Ticket[],
    staleTime: 20_000,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticket: Partial<Ticket>) => repo.createTicket(ticket),
    onSuccess: (created) => {
      logAudit('create', 'ticket', `${created.code} — ${created.title}`);
      if (created.assignee_id) logAudit('assign', 'ticket', created.code, { to: created.assignee_id });
      qc.invalidateQueries({ queryKey: TICKETS_KEY });
    },
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Ticket> }) => repo.updateTicket(id, patch),
    onSuccess: (updated, vars) => {
      if (vars.patch.assignee_id !== undefined) logAudit('assign', 'ticket', updated.code, { to: updated.assignee_id });
      else logAudit('update', 'ticket', updated.code);
      qc.invalidateQueries({ queryKey: TICKETS_KEY });
    },
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => repo.deleteTicket(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TICKETS_KEY }),
  });
}

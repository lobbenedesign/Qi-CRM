// ============================================================
// SOVRANO — Motore di assegnazione (smistamento) deal & ticket.
// Tre modalità: manuale, per ruolo, automatico (categoria→ruolo +
// bilanciamento carico). Round-robin e least-loaded.
// ============================================================
import { useTeamStore } from '../store/teamStore';
import { useRoutingStore, type AssignStrategy } from '../store/routingStore';
import { useDealsStore } from '../store/dealsStore';
import type { TeamRole, TeamMember, TicketCategory, Ticket } from '../types/team';

// Categoria ticket → ruolo competente per lo smistamento automatico
export const CATEGORY_ROLE: Record<TicketCategory, TeamRole> = {
  support:  'amministrativo',
  admin:    'amministrativo',
  config:   'configuratore',
  callback: 'telefonista',
  sales:    'commerciale',
};

/** Membri attivi, opzionalmente filtrati per ruolo. */
export function activePool(role?: TeamRole | null): TeamMember[] {
  const members = useTeamStore.getState().members.filter((m) => m.status === 'active');
  return role ? members.filter((m) => m.role === role) : members;
}

/** Carico corrente per membro (deal aperti + ticket aperti assegnati). */
function loadMap(tickets: Ticket[]): Record<string, number> {
  const load: Record<string, number> = {};
  const deals = useDealsStore.getState().deals;
  deals.forEach((d) => {
    if (d.assignee_id && d.stage !== 'won' && d.stage !== 'lost') load[d.assignee_id] = (load[d.assignee_id] ?? 0) + 1;
  });
  tickets.forEach((t) => {
    if (t.assignee_id && t.status !== 'closed' && t.status !== 'resolved') load[t.assignee_id] = (load[t.assignee_id] ?? 0) + 1;
  });
  return load;
}

function pickByStrategy(pool: TeamMember[], strategy: AssignStrategy, rrKey: string, tickets: Ticket[]): string | null {
  if (pool.length === 0) return null;
  if (strategy === 'least_loaded') {
    const load = loadMap(tickets);
    return [...pool].sort((a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0))[0].id;
  }
  // round_robin
  const idx = useRoutingStore.getState().bumpRr(rrKey, pool.length);
  return pool[idx].id;
}

/** Risolve l'assegnatario di un nuovo DEAL secondo la config di routing. */
export function resolveDealAssignee(tickets: Ticket[] = []): string | null {
  const cfg = useRoutingStore.getState().deals;
  if (cfg.mode === 'manual') return null;
  const role = cfg.mode === 'role' ? cfg.role : 'commerciale';
  const pool = activePool(role);
  return pickByStrategy(pool, cfg.strategy, `deal:${role ?? 'all'}`, tickets);
}

/** Risolve l'assegnatario di un nuovo TICKET secondo la config di routing. */
export function resolveTicketAssignee(category: TicketCategory, tickets: Ticket[] = []): string | null {
  const cfg = useRoutingStore.getState().tickets;
  if (cfg.mode === 'manual') return null;
  // 'auto' → ruolo derivato dalla categoria; 'role' → ruolo fisso in config
  const role = cfg.mode === 'auto' ? CATEGORY_ROLE[category] : cfg.role;
  const pool = activePool(role);
  return pickByStrategy(pool, cfg.strategy, `ticket:${role ?? 'all'}`, tickets);
}

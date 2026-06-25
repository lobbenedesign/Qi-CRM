import { useAuthStore } from '../store/authStore';
import { can, type Permission } from '../lib/permissions';

/** Restituisce true se il ruolo dell'utente corrente ha il permesso. */
export function useCan(perm: Permission): boolean {
  const role = useAuthStore((s) => s.role);
  return can(role ?? undefined, perm);
}

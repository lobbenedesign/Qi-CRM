// ============================================================
// SOVRANO — Helper di audit logging.
// Registra l'azione dell'utente corrente nello store audit e
// aggiorna il "last_active_at" del membro. Chiamato dai hook di
// mutazione (create/update/delete) e dall'autenticazione.
// ============================================================
import { useAuditStore } from '../store/auditStore';
import { useAuthStore } from '../store/authStore';
import { useTeamStore } from '../store/teamStore';
import type { AuditAction, AuditResource } from '../types/team';

export function logAudit(
  action: AuditAction,
  resource: AuditResource,
  target_label: string,
  meta?: Record<string, unknown>,
) {
  const { memberId, role, profile } = useAuthStore.getState();
  if (!memberId || !role) return;

  useAuditStore.getState().log({
    user_id: memberId,
    user_name: profile?.full_name ?? 'Utente',
    user_role: role,
    action,
    resource,
    target_label,
    meta,
  });
  useTeamStore.getState().touch(memberId);
}

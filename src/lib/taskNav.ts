import type { Task } from '../store/tasksStore';

/**
 * Percorso della scheda dell'entità associata a un task (apre il drawer
 * di dettaglio via query param). Condiviso da Tasks page e barra di esecuzione coda.
 */
export function taskRecordPath(task: Pick<Task, 'associatedType' | 'associatedId'>): string | null {
  if (!task.associatedType || !task.associatedId) return null;
  switch (task.associatedType) {
    case 'contact': return `/contacts?openContactId=${task.associatedId}`;
    case 'company': return `/companies?openCompanyId=${task.associatedId}`;
    case 'deal':    return `/pipeline?openDealId=${task.associatedId}`;
    case 'ticket':  return `/tickets?openTicketId=${task.associatedId}`;
    default:        return null;
  }
}

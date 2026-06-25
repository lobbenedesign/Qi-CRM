import { useQuickCreateStore } from '../../store/quickCreateStore';
import { useShallow } from 'zustand/shallow';
import { CreateContactModal } from '../contacts/CreateContactModal';
import { CreateDealModal } from '../pipeline/CreateDealModal';
import { CreateTicketModal } from '../tickets/CreateTicketModal';
import { CreateReminderModal } from '../reminders/CreateReminderModal';

/** Monta a livello di layout i modal aperti dal Quick-Add globale. */
export function QuickCreateHost() {
  const { target, close } = useQuickCreateStore(
    useShallow((s) => ({ target: s.target, close: s.close }))
  );
  if (!target) return null;
  switch (target) {
    case 'contact':  return <CreateContactModal onClose={close} />;
    case 'deal':     return <CreateDealModal onClose={close} />;
    case 'ticket':   return <CreateTicketModal onClose={close} />;
    case 'reminder': return <CreateReminderModal onClose={close} />;
    default:         return null;
  }
}

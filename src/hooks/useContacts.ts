import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repo } from '../lib/repo';
import { useContactsStore } from '../store/contactsStore';
import { logAudit } from '../lib/audit';
import type { Contact } from '../types/crm';

const contactLabel = (c: Partial<Contact>) => `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Contatto';

const CONTACTS_KEY = ['contacts'];

export function useContacts() {
  const { setContacts, setLoading } = useContactsStore();

  return useQuery({
    queryKey: CONTACTS_KEY,
    queryFn: async () => {
      setLoading(true);
      const contacts = (await repo.listContacts()) as Contact[];
      setContacts(contacts);
      setLoading(false);
      return contacts;
    },
    staleTime: 30_000,
  });
}

export function useContact(id: string | null) {
  return useQuery({
    queryKey: ['contact', id],
    enabled: !!id,
    queryFn: async () => (await repo.getContact(id!)) as Contact,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Partial<Contact>) => repo.createContact(contact),
    onSuccess: (created) => {
      logAudit('create', 'contact', contactLabel(created));
      qc.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  const { updateContact } = useContactsStore();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Contact> }) =>
      repo.updateContact(id, patch),
    onMutate: ({ id, patch }) => updateContact(id, patch),
    onSuccess: (updated) => logAudit('update', 'contact', contactLabel(updated)),
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: ['contact', id] });
      qc.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  const { removeContact } = useContactsStore();

  return useMutation({
    mutationFn: async (id: string) => repo.deleteContact(id),
    onMutate: (id) => {
      const c = useContactsStore.getState().contacts.find((x) => x.id === id);
      removeContact(id);
      logAudit('delete', 'contact', c ? contactLabel(c) : 'Contatto');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CONTACTS_KEY }),
  });
}

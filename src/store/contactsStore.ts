import { create } from 'zustand';
import type { Contact } from '../types/crm';

interface ContactsState {
  contacts: Contact[];
  selectedId: string | null;
  isLoading: boolean;
  searchQuery: string;

  setContacts: (contacts: Contact[]) => void;
  setLoading: (v: boolean) => void;
  setSearchQuery: (q: string) => void;
  selectContact: (id: string | null) => void;

  addContact: (contact: Contact) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  removeContact: (id: string) => void;

  getFiltered: () => Contact[];
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  selectedId: null,
  isLoading: false,
  searchQuery: '',

  setContacts:    (contacts) => set({ contacts }),
  setLoading:     (v)        => set({ isLoading: v }),
  setSearchQuery: (q)        => set({ searchQuery: q }),
  selectContact:  (id)       => set({ selectedId: id }),

  addContact: (contact) =>
    set((s) => ({ contacts: [...s.contacts, contact] })),

  updateContact: (id, patch) =>
    set((s) => ({
      contacts: s.contacts.map((c) =>
        c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c,
      ),
    })),

  removeContact: (id) =>
    set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),

  getFiltered: () => {
    const { contacts, searchQuery } = get();
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.first_name?.toLowerCase().includes(q) ||
        c.last_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.name?.toLowerCase().includes(q),
    );
  },
}));

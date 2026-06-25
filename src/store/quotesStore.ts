import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InvoiceItem } from './invoicesStore';

export interface Quote {
  id: string;
  number: string;
  contact_id: string;
  deal_id: string | null;
  issue_date: string;
  expiry_date: string;
  items: InvoiceItem[];
  notes: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

interface QuotesState {
  quotes: Quote[];
  addQuote: (quote: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'status' | 'sent_at'>) => Quote;
  updateQuote: (id: string, patch: Partial<Quote>) => void;
  removeQuote: (id: string) => void;
}

export const useQuotesStore = create<QuotesState>()(
  persist(
    (set) => ({
      quotes: [
        {
          id: 'quote-demo-1',
          number: 'PREV-2026-001',
          contact_id: 'ct-rossi',
          deal_id: 'dl-acme-annual',
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
          items: [
            { description: 'Licenza Enterprise CRM 1 Anno', quantity: 1, unit_price: 12000, vat_rate: 22 },
            { description: 'Setup e Migrazione Dati', quantity: 1, unit_price: 3500, vat_rate: 22 }
          ],
          notes: 'Validità offerta 30 giorni. Il setup include importazione anagrafiche e 2 ore di formazione.',
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sent_at: null,
        }
      ],
      addQuote: (input) => {
        const newQuote: Quote = {
          ...input,
          id: `quote-${crypto.randomUUID().slice(0, 8)}`,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sent_at: null,
        };
        set((state) => ({ quotes: [newQuote, ...state.quotes] }));
        return newQuote;
      },
      updateQuote: (id, patch) =>
        set((state) => ({
          quotes: state.quotes.map((q) =>
            q.id === id ? { ...q, ...patch, updated_at: new Date().toISOString() } : q
          ),
        })),
      removeQuote: (id) =>
        set((state) => ({
          quotes: state.quotes.filter((q) => q.id !== id),
        })),
    }),
    { name: 'qi-crm-quotes-v2' }
  )
);

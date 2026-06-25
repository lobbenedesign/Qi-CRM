import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number; // e.g. 22 for 22% VAT
}

export interface Invoice {
  id: string;
  number: string;
  contact_id: string;
  deal_id: string | null;
  issue_date: string;
  due_date: string;
  items: InvoiceItem[];
  notes: string;
  status: 'draft' | 'sent' | 'paid' | 'late' | 'cancelled';
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

interface InvoicesState {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'status' | 'sent_at'>) => Invoice;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  removeInvoice: (id: string) => void;
}

export const useInvoicesStore = create<InvoicesState>()(
  persist(
    (set) => ({
      invoices: [
        {
          id: 'inv-demo-1',
          number: 'FATT-2026-001',
          contact_id: 'ct-rossi',
          deal_id: 'dl-acme-annual',
          issue_date: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
          due_date: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().split('T')[0],
          items: [
            { description: 'Consulenza Strategica CRM setup', quantity: 1, unit_price: 1500, vat_rate: 22 },
            { description: 'Licenze annuali premium utente aggiuntivo', quantity: 5, unit_price: 120, vat_rate: 22 }
          ],
          notes: 'Pagamento tramite bonifico bancario entro 30 giorni data fattura. Indicare codice fattura in causale.',
          status: 'paid',
          created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          sent_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'inv-demo-2',
          number: 'FATT-2026-002',
          contact_id: 'ct-verdi',
          deal_id: 'dl-nexus-pro',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
          items: [
            { description: 'Implementazione integrazione WhatsApp Business API', quantity: 1, unit_price: 2500, vat_rate: 22 }
          ],
          notes: 'Pagamento 50% all\'ordine e 50% a fine lavori.',
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sent_at: null,
        }
      ],
      addInvoice: (input) => {
        const newInv: Invoice = {
          ...input,
          id: `inv-${crypto.randomUUID().slice(0, 8)}`,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sent_at: null,
        };
        set((state) => ({ invoices: [newInv, ...state.invoices] }));
        return newInv;
      },
      updateInvoice: (id, patch) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, ...patch, updated_at: new Date().toISOString() } : inv
          ),
        })),
      removeInvoice: (id) =>
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== id),
        })),
    }),
    { name: 'qi-crm-invoices-v2' }
  )
);

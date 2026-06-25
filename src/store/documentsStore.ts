import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DocSource = 'email_inbound' | 'upload' | 'signed_contract' | 'invoice';
export type DocKind = 'contract' | 'invoice' | 'id_document' | 'po' | 'receipt' | 'other';

export interface DocumentViewLog {
  id: string;
  email: string;
  viewedAt: string;
  durationSeconds: number;
}

export interface CrmDocument {
  id: string;
  name: string;
  kind: DocKind;
  source: DocSource;
  deal_id: string | null;
  contact_id: string | null;
  from: string | null;          // mittente (email) quando arriva via email
  size_kb: number;
  received_at: string;
  verified: boolean;            // provenienza/integrità verificata (es. SPF/DKIM lato backend)
  sha256: string | null;        // impronta del file per integrità
  note: string | null;
  
  // Tracked link metrics
  requireEmail?: boolean;
  sharedLinkToken?: string | null;
  viewsLog?: DocumentViewLog[];
}

interface DocumentsState {
  documents: CrmDocument[];
  addDocument: (doc: Omit<CrmDocument, 'id' | 'received_at'>) => CrmDocument;
  removeDocument: (id: string) => void;
  generateSharedLink: (id: string, requireEmail: boolean) => string;
  logDocumentView: (id: string, email: string, durationSeconds: number) => void;
}

const ago = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

export const useDocumentsStore = create<DocumentsState>()(
  persist(
    (set) => ({
      documents: [
        { 
          id: 'doc-1', 
          name: 'NDA_controfirmato_AcmeCorp.pdf', 
          kind: 'contract', 
          source: 'email_inbound', 
          deal_id: 'dl-acme-annual', 
          contact_id: 'ct-rossi', 
          from: 'mario.rossi@acme.com', 
          size_kb: 248, 
          received_at: ago(30), 
          verified: true, 
          sha256: 'a9c8f3b202e88a385f0b58e727918d3bbf40e0b3c61719b0d3a5a78cc31d87ab', 
          note: 'Documento controfirmato dal cliente, agganciato automaticamente al deal.',
          requireEmail: true,
          sharedLinkToken: 'token-nda-acme',
          viewsLog: [
            { id: 'v-1', email: 'mario.rossi@acme.com', viewedAt: ago(29), durationSeconds: 45 },
            { id: 'v-2', email: 'segreteria@acme.com', viewedAt: ago(28), durationSeconds: 15 }
          ]
        },
        { id: 'doc-2', name: 'Visura_camerale_Acme.pdf', kind: 'id_document', source: 'email_inbound', deal_id: 'dl-acme-annual', contact_id: 'ct-rossi', from: 'amministrazione@acme.com', size_kb: 512, received_at: ago(50), verified: true, sha256: null, note: null },
        { id: 'doc-3', name: 'Ordine_acquisto_Nexus_44.pdf', kind: 'po', source: 'email_inbound', deal_id: 'dl-nexus-pro', contact_id: 'ct-verdi', from: 'giulia@nexus.it', size_kb: 132, received_at: ago(6), verified: false, sha256: null, note: 'In attesa di verifica mittente.' },
      ],
      
      addDocument: (input) => {
        const doc: CrmDocument = { 
          ...input, 
          id: `doc-${crypto.randomUUID().slice(0, 8)}`, 
          received_at: new Date().toISOString(),
          viewsLog: []
        };
        set((s) => ({ documents: [doc, ...s.documents] }));
        return doc;
      },

      removeDocument: (id) => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

      generateSharedLink: (id, requireEmail) => {
        const token = `lnk-${Math.random().toString(36).substring(2, 10)}`;
        set((s) => ({
          documents: s.documents.map((d) => 
            d.id === id 
              ? { ...d, requireEmail, sharedLinkToken: token, viewsLog: d.viewsLog || [] } 
              : d
          )
        }));
        return token;
      },

      logDocumentView: (id, email, durationSeconds) => {
        set((s) => ({
          documents: s.documents.map((d) => {
            if (d.id !== id) return d;
            const logEntry: DocumentViewLog = {
              id: `vlog-${Math.random().toString(36).substring(2, 10)}`,
              email,
              viewedAt: new Date().toISOString(),
              durationSeconds
            };
            return {
              ...d,
              viewsLog: [...(d.viewsLog || []), logEntry]
            };
          })
        }));
      }
    }),
    { name: 'qi-crm-documents-v3' },
  ),
);

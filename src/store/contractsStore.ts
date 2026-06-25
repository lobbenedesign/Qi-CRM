import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SignatureMetadata {
  ip: string;
  timestamp: string;
  otp_code: string;
  hash: string;
  publicKey: string;
  signature: string;
}

export interface Contract {
  id: string;
  title: string;
  contact_id: string;
  deal_id: string;
  template_type: 'nda' | 'sale' | 'service' | 'custom';
  content: string;
  value: number;
  status: 'draft' | 'sent' | 'signed' | 'rejected';
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  signed_at: string | null;
  signature_metadata: SignatureMetadata | null;
}

interface ContractsState {
  contracts: Contract[];
  addContract: (contract: Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'status' | 'sent_at' | 'signed_at' | 'signature_metadata'>) => Contract;
  updateContract: (id: string, patch: Partial<Contract>) => void;
  signContract: (id: string, metadata: SignatureMetadata) => void;
  removeContract: (id: string) => void;
}

export const useContractsStore = create<ContractsState>()(
  persist(
    (set) => ({
      contracts: [
        {
          id: 'ctr-nda-demo',
          title: 'Accordo di Riservatezza NDA - Qi-CRM Corp',
          contact_id: 'ct-rossi', // Mock contact from seed
          deal_id: 'dl-acme-annual',
          template_type: 'nda',
          content: 'Questo Accordo di Riservatezza ("Accordo") è stipulato tra Qi-CRM S.r.l. e il Cliente per proteggere le informazioni riservate scambiate durante le trattative commerciali...',
          value: 0,
          status: 'signed',
          created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
          sent_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          signed_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
          signature_metadata: {
            ip: '194.242.129.23',
            timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
            otp_code: '482910',
            hash: 'a9c8f3b202e88a385f0b58e727918d3bbf40e0b3c61719b0d3a5a78cc31d87ab',
            publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Y1o...',
            signature: 'T3JnYW5pemF0aW9uYWwgU2lnbmF0dXJlIHZlcmlmaWVkIGJ5IFNvdnJhbm8='
          }
        }
      ],
      addContract: (input) => {
        const newContract: Contract = {
          ...input,
          id: `ctr-${crypto.randomUUID().slice(0, 8)}`,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sent_at: null,
          signed_at: null,
          signature_metadata: null,
        };
        set((state) => ({ contracts: [newContract, ...state.contracts] }));
        return newContract;
      },
      updateContract: (id, patch) =>
        set((state) => ({
          contracts: state.contracts.map((c) =>
            c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c
          ),
        })),
      signContract: (id, metadata) =>
        set((state) => ({
          contracts: state.contracts.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'signed',
                  signed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  signature_metadata: metadata,
                }
              : c
          ),
        })),
      removeContract: (id) =>
        set((state) => ({
          contracts: state.contracts.filter((c) => c.id !== id),
        })),
    }),
    { name: 'qi-crm-contracts-v2' }
  )
);

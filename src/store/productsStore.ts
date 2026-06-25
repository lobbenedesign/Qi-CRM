import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  description: string;
}

interface ProductsState {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  deleteProduct: (id: string) => void;
}

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-saas-lite',
    name: 'Qi-CRM Abbonamento Lite',
    sku: 'QI-SAAS-LITE',
    price: 29.00,
    description: 'Licenza d\'uso mensile per singolo utente, funzioni base.'
  },
  {
    id: 'prod-saas-pro',
    name: 'Qi-CRM Abbonamento Professional',
    sku: 'QI-SAAS-PRO',
    price: 79.00,
    description: 'Licenza d\'uso mensile con AI Hub locale, RAG e firma elettronica.'
  },
  {
    id: 'prod-onboarding',
    name: 'Setup & Onboarding Premium',
    sku: 'QI-ONBOARD-PREM',
    price: 499.00,
    description: 'Configurazione iniziale delle pipeline, importazione dati e formazione del team (4 ore).'
  },
  {
    id: 'prod-consulting',
    name: 'Consulenza Strategica Oraria',
    sku: 'QI-CONSULT-HR',
    price: 120.00,
    description: 'Supporto dedicato per ottimizzazione processi commerciali ed integrazioni API.'
  }
];

export const useProductsStore = create<ProductsState>()(
  persist(
    (set) => ({
      products: DEFAULT_PRODUCTS,

      addProduct: (p) =>
        set((s) => {
          const newProduct: Product = {
            ...p,
            id: `prod-${crypto.randomUUID().slice(0, 8)}`,
          };
          return { products: [...s.products, newProduct] };
        }),

      deleteProduct: (id) =>
        set((s) => ({
          products: s.products.filter((p) => p.id !== id),
        })),
    }),
    {
      name: 'qi-crm-products-catalog-v1',
    }
  )
);

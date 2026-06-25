# Qi-CRM

CRM moderno che tratta il **dato come entità viva**: ogni informazione ha una provenienza e un **Trust Score** che decade nel tempo. Pensato per essere più semplice e completo dei CRM tradizionali (HubSpot, Salesforce), con un occhio a vendite, marketing omnicanale e automazioni.

> **Gira subito in modalità demo** — senza backend né credenziali. Cloni, installi, avvii: trovi un CRM già popolato con dati realistici.

## ✨ Funzionalità principali

- **Vendite** — Pipeline Kanban (drag & drop), Forecast & Quota con *forecast categories*, Quantum Lead Score, Preventivi/Fatture (stampa PDF), Contratti con firma crittografica (Web Crypto API).
- **Marketing & comunicazione** — Form e Landing pubbliche (lead → Deal in pipeline), Broadcast omnicanale (Email/SMS/WhatsApp/Telegram/Push con A/B test), Sequenze, Social Studio, Promemoria multicanale.
- **Operazioni** — Tasks con coda "work-the-queue", Ticket con smistamento automatico, Inbox condivisa, Scadenzario, Documenti.
- **Intelligence** — Trust Score & provenienza del dato, AI Hub locale (Gemini Nano `window.ai`), Analytics (recharts), Org-Chart (reactflow).
- **Amministrazione** — Ruoli & permessi (RBAC), Audit Log, Team, Integrazioni guidate, Booking pubblico.

## 🧱 Stack tecnico

React 19 + TypeScript · Vite · Tailwind CSS v3 · Zustand (con `persist`) · TanStack Query · React Router · @dnd-kit · reactflow · recharts · lucide-react · Tauri 2 (desktop) · Web Crypto API · Gemini Nano.

Architettura dettagliata: vedi **[technical_interview.md](./technical_interview.md)**.

## 🚀 Avvio rapido

```bash
npm install
npm run dev          # http://localhost:5173 — modalità demo
```

Login demo: usa l'utente preimpostato, oppure `marco@…` / `anna@…` / `luca@…` / `sara@…` per provare ruoli diversi (password qualsiasi).

### Build & desktop

```bash
npm run build        # type-check + build di produzione
npm run preview      # anteprima della build
npm run tauri:dev    # app desktop (Tauri) in sviluppo
npm run tauri:build  # eseguibile desktop
```

## 🔌 Collegare Supabase (uscire dalla demo)

1. Copia `.env.example` in `.env.local` e compila `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
2. Applica lo schema in `supabase/schema.sql`.
3. Fornisci l'implementazione `supabaseRepo` in [`src/lib/repo.ts`](./src/lib/repo.ts).

Quando le variabili sono presenti, `USING_MOCK` diventa `false` e l'app usa il backend reale — **senza riscrivere hook o componenti** (pattern repository). In Impostazioni è disponibile **"Reset dati demo"** per ripristinare lo stato iniziale.

## 📂 Struttura

```
src/
├── pages/          # una pagina per route (lazy-loaded)
├── components/     # UI riutilizzabile (layout, pipeline, trust, team, …)
├── store/          # stato globale Zustand (persistito in localStorage)
├── hooks/          # data-fetching con TanStack Query
├── lib/            # repo (mock↔Supabase), trust, leadScore, forecast, …
└── lib/mock/       # backend demo in-memory + seed
```

## 📌 Note

- `TODO.md` raccoglie bug noti e migliorie pianificate.
- Modalità demo e dati mock sono volutamente inclusi: l'app è una vetrina funzionante anche offline.

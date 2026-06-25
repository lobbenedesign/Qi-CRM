# Guida Tecnica per Colloquio — Sovrano CRM (Architettura & Dettaglio Codice)

Questo documento descrive in dettaglio l'architettura tecnica del progetto **Sovrano CRM**, analizzando file per file e spiegando dove e perché abbiamo usato **Node.js**, **React**, **Zustand**, **Tauri**, **Web Crypto API** e **Gemini Nano**.

---

## 1. Node.js: Ambiente di Sviluppo, Bundling & Runtime di Build

### Dove viene usato nel progetto?
Node.js viene utilizzato esclusivamente come **ambiente di sviluppo e compilazione**. Non è presente nel pacchetto di produzione finale dell'utente (che viene eseguito dal browser o dalla WebView nativa di Tauri).

* **Gestione dei Pacchetti (`package.json`)**: Gestisce le dipendenze e gli script npm.
* **Vite (`vite.config.ts`)**: Il bundler ultra-veloce che gestisce il server di sviluppo locale (`npm run dev`) con Hot Module Replacement (HMR) e la build di produzione (`npm run build`).
* **PostCSS & Tailwind CSS (`postcss.config.js`, `tailwind.config.js`)**: Il preprocessore CSS che compila il design system in base alle classi usate nei file `.tsx`.
* **TypeScript Compiler (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`)**: Configura la compilazione del codice TypeScript in JavaScript standard (ESNext).

### Dettaglio Dipendenze in [package.json](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/package.json):
* `"devDependencies"` (es. `@vitejs/plugin-react`, `typescript`, `postcss`): Strumenti eseguiti su Node per compilare il frontend.
* `"scripts"`: Comandi Node.js come `vite` per avviare il dev server o `tsc -b && vite build` per compilare il codice.

---

## 2. React (con TypeScript): L'Interfaccia Utente Dichiarativa

### Dove viene usato nel progetto?
React viene utilizzato per creare l'intera interfaccia utente interattiva della Single Page Application (SPA).

* **Punto di Ingresso (`src/main.tsx` e `src/App.tsx`)**:
  * In [main.tsx](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/main.tsx) usiamo `createRoot` da `react-dom/client` per montare l'applicazione React nell'elemento `#root` del DOM di `index.html`.
  * In [App.tsx](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/App.tsx) usiamo `lazy` e `Suspense` per implementare il **Code Splitting**, caricando le pagine (come `Dashboard`, `Contacts`, `Companies`, `Invoices`) solo quando l'utente vi naviga.
* **Componenti UI (`src/components/` e `src/pages/`)**:
  * **React Router DOM** (`BrowserRouter`, `Routes`, `Route`, `Navigate`) gestisce la navigazione client-side senza ricaricare la pagina.
  * **React Hooks**:
    * `useState`: Gestione dello stato locale (es. stato di apertura dei drawer o dei modali).
    * `useEffect`: Sincronizzazione con API esterne (es. caricamento dei contatti o calcoli dinamici).
    * `useRef`: Riferimenti agli elementi del DOM (es. canvas di firma digitale o ancoraggi dei menu).
    * `useMemo` / `useCallback`: Ottimizzazione delle performance per evitare calcoli ridondanti.
  * **Librerie UI integrate in React**:
    * `@dnd-kit/core` & `@dnd-kit/sortable` (in `Pipeline.tsx`): Per gestire il drag & drop nativo e riordinare le colonne o spostare i deal.
    * `reactflow` (in `OrgChart.tsx`): Per renderizzare l'organigramma degli utenti e la struttura di reporting del team tramite nodi interattivi.
    * `recharts` (in `Analytics.tsx` e `Dashboard.tsx`): Per generare grafici reattivi (linee, barre, torte) legati allo stato di React.

---

## 3. Gestione dello Stato Globale: Zustand (Invece di Redux)

### Perché abbiamo scelto Zustand al posto di Redux?
In sede di colloquio, questa è una domanda classica. La risposta è:
1. **Zero Boilerplate**: Redux richiede *actions*, *reducers*, *action creators*, *store configurations* e molta scrittura ripetitiva. Zustand si definisce in un singolo file usando una singola funzione `create`.
2. **Performance e Semplicità**: Zustand non avvolge l'app in un Context Provider (evitando rendering non necessari di massa). Utilizza hook basati su selettori per sottoscrivere i componenti solo alle porzioni di stato di cui hanno bisogno.
3. **Persistenza Nativa**: Tramite il middleware `persist` di Zustand, lo stato viene salvato automaticamente in `localStorage` o `sessionStorage`, rendendo l'applicazione "offline-first" in modo estremamente semplice.

### Dove viene usato nel progetto?
* In `src/store/`:
  * [dealsStore.ts](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/store/dealsStore.ts): Gestisce i deal della pipeline, il calcolo algoritmico del rischio (`computeDealRisk`), l'aggiunta, modifica, riordino ed eliminazione delle colonne (stage) e lo spostamento logico dei deal orfani.
  * [companiesStore.ts](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/store/companiesStore.ts): Gestisce le aziende clienti.
  * [contactsStore.ts](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/store/contactsStore.ts): Gestisce i singoli contatti associati.
  * [contractsStore.ts](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/store/contractsStore.ts): Gestisce i contratti digitali e le relative chiavi crittografiche.

### Ottimizzazione React 19 riscontrata:
* **Risoluzione Loop Infiniti (`Maximum update depth exceeded`)**: Con React 19, i selettori Zustand che restituiscono nuovi riferimenti di array filtrati al volo (es. `.filter(...)`) causavano re-render continui. Abbiamo risolto spostando il filtraggio del selettore fuori dallo store Zustand e gestendolo direttamente con `useMemo` nel corpo del componente React.

---

## 4. Richieste Asincrone e Caching: TanStack Query (React Query)

### Dove viene usato nel progetto?
* Avvolge l'intera applicazione in [main.tsx](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/main.tsx) con `<QueryClientProvider client={queryClient}>`.
* Viene usato nei custom hooks (`src/hooks/`) per gestire le richieste asincrone verso Supabase.

### Perché è stato usato?
* Gestisce automaticamente lo stato di caricamento (`isLoading`), errore (`isError`) e successo.
* Implementa meccanismi di **Caching** (es. `staleTime: 60000`) per evitare richieste duplicate al database.
* Consente l'**invalidazione immediata della cache** tramite mutazioni. Ad esempio, quando una colonna della pipeline viene modificata, invalida la query dei deal forzando un aggiornamento istantaneo e reattivo dei dati visualizzati.

---

## 5. Wrapper Desktop: Tauri (Rust + TypeScript)

### Dove viene usato nel progetto?
* Tutta la cartella `src-tauri/` contiene la configurazione e il codice Rust che compila l'app desktop.
* Nel frontend (`src/`), usiamo `@tauri-apps/api` per comunicare con il sistema operativo (es. invio di notifiche native o scrittura di file sul disco locale).

### Perché Tauri invece di Electron?
* **Dimensione del Binario**: Electron include Chromium e Node.js (~150MB+ a vuoto). Tauri usa la WebView nativa del sistema operativo dell'utente (WebKit/Safari su macOS, WebView2/Edge su Windows) generando un eseguibile di soli ~10-15MB.
* **Consumo di Risorse**: Tauri consuma pochissima memoria RAM rispetto ad Electron.
* **Sicurezza & Performance**: Rust gestisce in totale sicurezza le operazioni di basso livello, offrendo prestazioni eccezionali.

---

## 6. Sicurezza e Crittografia: Web Crypto API (JavaScript Nativo)

### Dove viene usato nel progetto?
* Nella pagina dei contratti [Contracts.tsx](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/pages/Contracts.tsx) per generare firme elettroniche certificate per i documenti legali.

### Dettaglio Logica Crittografica:
1. **Generazione Chiavi**: Usiamo `window.crypto.subtle.generateKey` per creare una coppia di chiavi asimmetriche **RSA-PSS** (chiave pubblica per la verifica, chiave privata per firmare) con algoritmo di hashing **SHA-256**.
2. **Firma**: Usiamo `window.crypto.subtle.sign` per firmare l'hash del contenuto del contratto con la chiave privata dell'utente.
3. **Verifica**: Permette di verificare che il contratto non sia stato manomesso decifrando la firma con la chiave pubblica dell'utente.

---

## 7. AI Locale: Gemini Nano (window.ai)

### Dove viene usato nel progetto?
* In `src/lib/ai/geminiNano.ts` e nella pagina dell'hub AI [AiHub.tsx](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/pages/AiHub.tsx).

### Perché questa scelta?
* **Privacy Totale**: Il modello LLM (Large Language Model) viene eseguito localmente sul computer del client tramite il motore AI integrato del browser Google Chrome (`window.ai.languageModel`).
* **Zero Costi Cloud**: Nessuna chiamata a server esterni a pagamento (es. OpenAI API o Google Cloud API).
* **RAG Locale (Retrieval-Augmented Generation)**: Passiamo i dati CRM correnti (deal, contatti, scadenze) direttamente come contesto locale al prompt, consentendo all'utente di fare domande intelligenti offline sui propri dati aziendali in totale sicurezza.

---

> **Nota sul branding:** il prodotto è stato rinominato **Qi-CRM** (ex *Sovrano*). La cartella del repo resta `MyCRM/sovrano`. Le sezioni seguenti (8+) documentano l'architettura aggiunta dopo la prima stesura.

---

## 8. Pattern Repository & Modalità Demo (mock ↔ Supabase)

### Dove viene usato nel progetto?
* [src/lib/repo.ts](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/lib/repo.ts) è l'**unico punto di accesso ai dati** di tutta l'app. Ogni hook e componente importa `repo`, mai direttamente il database.
* Il flag `USING_MOCK` è `true` quando le variabili d'ambiente Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) mancano o sono placeholder. In quel caso `repo` instrada al backend mock in-memory [src/lib/mock/mockDb.ts](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/lib/mock/mockDb.ts), con dati iniziali in [src/lib/mock/seed.ts](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/lib/mock/seed.ts) e persistenza su `localStorage`.

### Perché questa scelta?
* **Demo zero-config**: chi clona il repo da GitHub vede subito un CRM funzionante e popolato, senza credenziali né backend. Il badge "Demo (dati mock)" indica questa modalità.
* **Switch a Supabase senza riscrivere la UI**: per andare in produzione basta fornire un'implementazione `supabaseRepo` con la stessa interfaccia e cambiare il dispatch in `repo.ts`. Nessun hook/componente cambia. Questo è il vantaggio chiave del pattern repository: la UI dipende da un'**astrazione**, non da un'implementazione concreta.
* `mockDb` simula anche la **latenza** di rete e usa `structuredClone` per restituire copie immutabili (come farebbe un vero backend), così i bug di mutazione condivisa emergono già in demo.

---

## 9. Trust Score & Provenienza del Dato (il differenziatore)

### Dove viene usato nel progetto?
* [src/lib/trust.ts](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/lib/trust.ts), visualizzato tramite `components/trust/TrustBadge.tsx` e `FieldTrustRow.tsx` nelle schede di contatti/aziende/deal.

### Dettaglio logica
* Ogni campo "tracciato" porta un metadato `{ source, confidence, updatedAt }` (`field_trust` sui record).
* `computeTrust` applica un **decadimento esponenziale** (`Math.pow(0.5, ageDays / halfLife)`): il dato perde affidabilità col tempo, con emivita diversa per tipo di campo (email 365gg, telefono 180gg…). La fonte pesa la confidenza iniziale (`user` 1.0, `enrichment` 0.85, `import` 0.70, `ai_extracted` 0.65).
* `aggregateTrust` media i punteggi dei campi → etichetta `high | medium | low` e flag `needsReview`.
* **Intento di business**: trattare il dato come "entità viva" che invecchia, evidenziando cosa va riverificato. È il tratto che distingue Qi-CRM dai CRM tradizionali.

---

## 10. Quantum Lead Score & Sales Forecasting

### Dove
* [src/lib/leadScore.ts](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/lib/leadScore.ts) + `components/trust/LeadScoreBadge.tsx` (lista Contatti + drawer).
* [src/lib/forecast.ts](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/lib/forecast.ts) + [src/pages/Forecast.tsx](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/pages/Forecast.tsx) + `store/forecastStore.ts`.

### Logica e intento
* **Quantum Lead Score**: a differenza del lead scoring classico (somma di punti), l'engagement comportamentale (aperture/click/visite/form) viene **moltiplicato per il Trust Score** del dato. Un lead iper-attivo ma con dati inaffidabili non è "caldo" davvero, perché non è azionabile. Scritto come **funzione pura** TypeScript (facile da testare, nessun side-effect).
* **Forecast**: le *forecast categories* in stile Salesforce (Closed/Commit/Best Case/Pipeline) sono **derivate automaticamente** dalla probabilità dello stage (`lib/forecast.ts`), senza gestione manuale. La pagina calcola forecast pesato (`Σ valore × probabilità`), attainment vs **quota** per venditore (`forecastStore`, persistito) e una "Qi-Forecast AI confidence".

---

## 11. Ruoli & Permessi (RBAC dinamico)

### Dove
* [src/lib/permissions.ts](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/lib/permissions.ts) con la funzione `can(role, permission)` + `store/roleStore.ts` (ruoli editabili a runtime).

### Logica
* `can` ritorna `true` se il ruolo possiede il permesso **oppure il wildcard `'*'`** (il `superadmin` ha `'*'`).
* La **Sidebar** (`components/layout/Sidebar.tsx`) filtra le voci con `can(role, n.perm)`; le pagine sensibili fanno gating (`useCan('...')`) e redirect. `ROLE_META`/`ALL_ROLES` sono esposti via `Proxy` per restare reattivi all'aggiunta di ruoli custom.
* Ruoli demo: `superadmin`, `commerciale`, `amministrativo`, `configuratore`, `telefonista` (login con `marco@`, `anna@`, `luca@`, `sara@…`). Ogni azione sensibile viene registrata in `auditStore` via `lib/audit.ts`.

---

## 12. Routing, Layout & Code Splitting

### Dove
* [src/App.tsx](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/src/App.tsx): tutte le pagine sono `lazy()` + `<Suspense>` (code splitting per route). Rotte **pubbliche** (login, invito, form-demo, landing, document gate, booking) fuori dal layout; rotte **protette** dentro `<ProtectedRoute>` → `<DashboardLayout>`.
* `DashboardLayout` monta gli elementi globali persistenti tra le pagine: `Sidebar`, `Header`, `CommandPalette`, `NotificationsPanel`, `TourOverlay`, `Toasts`, `ReminderDispatcher`, `QuickCreateHost` e la **barra di esecuzione coda task** (`TaskExecutionOverlay`).

### Nota sul flusso "work-the-queue"
* In `Tasks.tsx` → "Avvia Coda di Lavoro" chiama `startExecution` e naviga al primo task. `TaskExecutionOverlay` legge lo stato di esecuzione dallo store e, ad ogni *Completa/Salta/Precedente*, **apre automaticamente la scheda** del task successivo via query param (`?openContactId=`, `?openCompanyId=`, `?openDealId=`, `?openTicketId=`) gestiti dalle rispettive pagine. La mappatura è centralizzata in `lib/taskNav.ts`.

---

## 13. Design System & Theming (Tailwind v3)

### Dove
* [tailwind.config.js](file:///Users/giuseppelobbene/Desktop/APP%20PYTHON%20-%20FLUTTER%20ARCHIVE/MyCRM/sovrano/tailwind.config.js): palette custom `brand`/`surface` (scala estesa con shade intermedi 150/250/350/450/550/650/750/850/955), `trust`, `risk`. `darkMode: 'class'`.

### Convenzione critica
* L'app è **light di default**; il tema scuro è attivato dalla classe `dark`. Le classi vanno **sempre** scritte *light-first* con coppia `dark:` — es. `bg-white dark:bg-surface-900`, `text-surface-900 dark:text-surface-100`, `border-surface-200 dark:border-surface-800`. Usare token scuri "nudi" (`bg-surface-900`) li rende scuri anche in light mode (bug riscontrato e corretto su alcune pagine). Eccezioni legittime: `text-white` su pulsanti colorati, overlay `bg-black/xx`, blocchi `<pre>` di codice volutamente scuri.

---

## 14. Mappa Moduli Funzionali (pagina → store/lib)

* **Vendite**: `Pipeline` (Kanban @dnd-kit, `dealsStore`) · `Forecast` (`forecast.ts`) · `Quotes`/`Invoices` (`quotesStore`/`invoicesStore`, stampa PDF via `window.print`) · `Contracts` (firma WebCrypto).
* **Marketing & Comunicazione**: `Marketing` (form, landing, campagne email, snippet/template, chatflow) · `Broadcast` (multicanale + A/B, `broadcastStore`) · `Social` (`socialStore`) · `Sequences` (`sequencesStore`) · `Reminders` (multicanale, `notify.ts` dispatcher).
* **Operazioni**: `Tasks` (coda + esecuzione) · `Tickets` (assegnazione, `routingStore`) · `QuantumInbox` (`inboxStore`) · `Deadlines` · `Documents`.
* **Intelligence**: `Analytics`/`Dashboard` (recharts) · `AiHub` (Gemini Nano) · `LeadScoring` (`leadScoringStore`).
* **Amministrazione**: `Team`/`Audit`/`Integrations`/`Settings` · Org-Chart (reactflow).

---

## 15. Pagine Pubbliche & Lead Capture

### Dove
* Rotte fuori dall'autenticazione: `/form-demo/:id`, `/landing/:slug`, `/document/:id`, `/book/:memberId`, `/book/team/:teamId`.

### Logica e intento
* I **form** e le **landing** alla submission creano in automatico **Contatto + Attività** e — se il form ha `createDeal` — un **Deal in pipeline** (`repo.createDeal`), tracciando la provenienza nel Trust Score (`source: 'import'`). È il ponte *Lead Generation → CRM*.
* Il **Booking pubblico** genera gli slot dagli orari di lavoro in `orgSettingsStore` (`lib/slots.ts`), crea contatto + attività *meeting* + promemoria al membro, e offre "Aggiungi a Google Calendar" (`lib/googleCalendar.ts`). Variante team con round-robin sui commerciali attivi.

---

## 16. Pubblicazione & Configurazione

* **Script** (`package.json`): `npm run dev` (Vite + HMR), `npm run build` (`tsc -b && vite build`), `npm run preview`, `npm run tauri:dev` / `tauri:build` per il desktop.
* **Modalità demo di default**: senza `.env.local` l'app funziona con dati mock — ideale per una demo pubblica su GitHub. Per collegare Supabase: creare `.env.local` con `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, applicare `supabase/schema.sql`, fornire `supabaseRepo` in `repo.ts`.
* **Stack runtime**: React 19 + TypeScript, Vite, Tailwind v3, Zustand (con `persist`), TanStack Query, React Router, @dnd-kit, reactflow, recharts, lucide-react, Tauri 2, Web Crypto API, Gemini Nano (`window.ai`).

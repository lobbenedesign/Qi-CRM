# Integrazione Dashboard e "Il mio giorno"

Questo piano descrive l'approccio per fondere la pagina operativa "Il mio giorno" (`Today.tsx`) con la "Dashboard" analitica (`Dashboard.tsx`), creando un unico hub centrale (Home) che offra sia visione strategica che azione immediata.

## Analisi Attuale
- **Il mio giorno (`Today.tsx`)**: È fortemente orientata all'azione. Mostra un saluto personalizzato e 4 sezioni rapide (Promemoria di oggi, Ticket da gestire, Scadenze imminenti, Documenti recenti).
- **Dashboard (`Dashboard.tsx`)**: È un costruttore di report flessibile gestito da `dashboardStore.ts`. Permette di creare più dashboard con widget analitici (KPI, Forecast, Pipeline, ecc.). Tutte le funzionalità frontend (calcoli, store) sono pienamente operative. Il backend è attualmente gestito tramite i Mock Repository (come il resto dell'app, in attesa del task Supabase).

## Proposed Changes

Per unificare le due viste senza perdere funzionalità, trasformeremo le sezioni de "Il mio giorno" in **Widget Operativi** all'interno della libreria dei widget della Dashboard, impostandoli come predefiniti nella vista principale.

### 1. Store & Libreria Widget
Espanderemo il catalogo dei widget (`REPORT_LIBRARY_CATALOG` in `dashboardStore.ts`) per supportare i nuovi tipi:
- `widgetType: 'today_reminders'` (Promemoria di oggi)
- `widgetType: 'my_tickets'` (Ticket da gestire)
- `widgetType: 'upcoming_deadlines'` (Scadenze imminenti)
- `widgetType: 'recent_documents'` (Documenti recenti)

Modificheremo le Dashboard predefinite in modo che la primissima (o una creata ad hoc per l'utente) sia chiamata "Il mio giorno" o "Panoramica" e contenga di default questi nuovi widget assieme ai KPI fondamentali.

### 2. Modifiche ai Componenti

#### [MODIFY] `src/store/dashboardStore.ts`
- Aggiunta dei nuovi tipi di widget operativi a `ReportWidgetType`.
- Aggiunta dei widget nel `REPORT_LIBRARY_CATALOG` (categoria "Operatività").
- Aggiornamento di `DASHBOARD_TEMPLATES` per includere una fusione tra analisi e operatività nel template base.

#### [MODIFY] `src/pages/Dashboard.tsx`
- Implementazione del rendering dei nuovi widget operativi nel metodo `renderWidget`.
- Importazione della UI specifica da `Today.tsx` (le liste compatte con le icone e i badge) riadattata come componente widget, mantenendo lo stile armonizzato della Dashboard.
- Aggiunta del saluto ("Buongiorno, {Nome}") nell'header della Dashboard per mantenere il tocco personale che c'era in `Today.tsx`.

#### [DELETE] `src/pages/Today.tsx`
- La rotta e il componente separati verranno eliminati.
- Aggiorneremo i link della Sidebar per far puntare "Home" direttamente alla Dashboard.

## User Review Required

> [!IMPORTANT]
> **Conferma sul Layout**
> Visto che la Dashboard attuale ha i widget a larghezza intera o divisi a metà schermo (col-span-1 o col-span-2), le sezioni operative verranno inserite come widget affiancati. Sei d'accordo con l'idea di avere un **unico hub centrale** configurabile, in cui il template di default mixa i KPI analitici con i task di oggi?

> [!NOTE]
> **Stato Backend**
> Hai chiesto di assicurarsi che la dashboard sia operativa: confermo che tutte le logiche di rendering, calcolo e persistenza locale sono funzionanti. Il backend è operativo sulla logica *Mock* (tutti i calcoli si basano su `dealsStore`, `tasksStore` ecc. perfettamente allineati). Quando implementeremo Supabase reale, non ci sarà bisogno di toccare questi componenti frontend.

## Verification Plan
- Assicurarsi che i nuovi widget operativi reagiscano in tempo reale ai cambiamenti nello store (es. completando un promemoria sparisce dal widget).
- Controllare che la creazione di nuove dashboard funzioni e permetta di mescolare widget analitici (grafici) con widget operativi (liste).
- Verificare che i filtri data della dashboard si applichino o vengano ignorati dai widget operativi a seconda della logica (es. "Scadenze imminenti" guarda sempre ai prossimi 7 giorni a prescindere dal filtro globale della dashboard).

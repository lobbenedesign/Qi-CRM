# TODO — Qi-CRM (bug noti & migliorie da implementare)

Lista raccolta durante l'audit ramificato di pagine, pulsanti e funzioni (giugno 2026).
Stato attuale: app in **modalità demo** (dati mock in `localStorage`, Supabase non collegato).
`tsc -b` pulito e `npm run build` verde.

> Legenda: ✅ fatto · 🔴 alta · 🟠 media · 🟢 bassa/cosmetica

---

## Bug

1. ✅ **Task di default con ID entità inesistenti** — `src/store/tasksStore.ts`
   Puntavano a `ct-1`/`cp-1`/`tkt-1` (assenti nel seed) → "Avvia Coda" apriva schede vuote.
   Corretti in `ct-verdi` / `cmp-acme` / `tk-1`.

2. ✅ **FK demo non allineate al seed** — contratti/documenti/fatture/preventivi
   `contractsStore`, `documentsStore`, `invoicesStore`, `quotesStore` usavano `ct-1`/`dl-1`/`dl-2`/`ct-2`.
   Allineati agli ID reali (`ct-rossi`, `ct-verdi`, `dl-acme-annual`, `dl-nexus-pro`) → i nomi
   di contatto/deal collegati ora si risolvono.

3. ✅ **Store persistiti non versionati + "Reset dati demo" incompleto**
   `resetMockDb()` resettava solo il mock DB, lasciando stale gli store Zustand. Ora svuota
   tutte le chiavi `qi-crm-*`/`sovrano-*` e il reset in Impostazioni fa un reload completo.
   Bumpate le versioni delle chiavi `persist` degli store con seed modificato.

4. ✅ **Residui di branding "Sovrano"**
   Chiavi `persist` standardizzate a `qi-crm-*` (incluso `qi-crm-mock-db-v1`), nome export
   CSV → `contatti-qi-crm.csv`. Titolo `technical_interview.md` annotato come Qi-CRM.

5. ✅ **Feedback con `alert()` → toast**
   `Tasks.tsx` e `Broadcast.tsx` e `Contacts.tsx` ora usano `toastStore`.
   (`PublicDocumentGate.tsx` resta con `alert` perché è pagina pubblica senza `<Toasts/>`.)

6. ✅ **Enrollment sequenze/journey**
   Le sequenze già iscrivevano davvero (`sequencesStore.enroll`); il **journey** ora registra
   le iscrizioni incrementando i `runs` (`automationsStore.updateJourney`). Feedback via toast.
   Bonus: corretto il **tema dark-only** del modale "Iscrizione di Massa".

7. 🟢 **Icone brand social generiche** — `src/pages/Social.tsx`
   `lucide-react` non espone più `Facebook/Instagram/Linkedin`: usiamo icone generiche.
   Valutare SVG brand inline per fedeltà visiva.

---

## Bug (continua)

A. ✅ **Lista Contatti vuota al primo caricamento** — `src/pages/Contacts.tsx`
   Il `useMemo` di `contacts` chiamava `getFiltered()` ma non dipendeva dall'array contatti
   (`getFiltered` è un riferimento stabile): restava fermo allo stato iniziale vuoto mentre i dati
   arrivavano async → lista vuota ("Nessun contatto corrisponde al segmento") nonostante il badge
   mostrasse 6. Aggiunte `allContactsList` e `searchQuery` alle dipendenze del memo.

B. ✅ **Qi-Score (Lead Scoring) mostrava 0 contatti + pulsante "Ricalcola tutti" poco visibile**
   `src/pages/LeadScoring.tsx` leggeva `contactsStore`/`dealsStore` senza innescare il fetch:
   aperta direttamente mostrava 0 contatti. Aggiunti `useContacts()`/`useDeals()`. Inoltre il
   pulsante "Ricalcola tutti" (header, grigio) era facile da non notare: aggiunto un pulsante
   d'azione **dentro** l'avviso e migliorato il contrasto del testo amber in tema chiaro.

C. ✅ **Loop di render infinito aprendo un deal** (critico) — `DealDetailDrawer.tsx` + `PlaybookWidget.tsx`
   Due selettori zustand ritornavano un nuovo riferimento a ogni render
   ("getSnapshot should be cached" → "Maximum update depth exceeded", crash della scheda deal):
   `useCustomPropertiesStore(s => s.properties.filter(...))` e `usePlaybookStore(s => s.dealProgress[dealId] || {})`.
   Risolti selezionando riferimenti stabili (filtro in `useMemo`; default `{}` come costante di modulo).

---

## Privacy & GDPR

P1. ✅ **Layer consensi base** — modello `ContactConsent` su `Contact` (`types/crm.ts`),
    libreria `lib/consent.ts` (informativa, gate `canSendMarketing`/`canProfile`, registro eventi),
    raccolta consenso su Form/Landing/Booking (checkbox + link informativa, blocco invio senza accettazione),
    **enforcement nel Broadcast** (esclude i non-consenzienti per canale, con conteggio),
    `ConsentCard` nel drawer contatto, pagina pubblica `/privacy` (informativa art. 13).

P2. 🟠 **Estendere il gate consenso** a Campagne email (`Marketing.tsx`/`campaignsStore`) e
    **Sequenze** (`sequencesStore`): oggi filtrano per engagement, non per consenso. Da allineare a `canSendMarketing`.

P3. ✅ **Modulo consenso digitale firmabile** — `consentStore` + pagina pubblica `/consent/:token`
    (`PublicConsent.tsx`): il cliente concede le singole sezioni (marketing+canali, profilazione,
    terze parti) e firma → scrive `contact.consent` via `repo.updateContact` (i gate si attivano).
    ⏳ Resta: link "Gestisci preferenze/Disiscriviti" nel footer delle email.

P4. ✅ **Diritti GDPR nel drawer** — nel `ConsentManageModal`: **esporta dati** (portabilità, JSON),
    **revoca consensi** (registra `withdrawn_at` nel log). Cancellazione (oblio) via cestino esistente.
    Aggiunto anche il **footer email** "Gestisci preferenze / Disiscriviti" (`unsubscribeFooter`) con
    nota nel Broadcast. ⏳ Resta: link reale nel footer delle email inviate (richiede backend invio).

P5. ✅ **Modulo cartaceo + controfirma** — `ConsentManageModal` nel drawer contatto:
    genera link digitale, **registra il consenso ricevuto su carta** impostando le concessioni
    (scrive `contact.consent` + controfirma operatore), e **stampa il modulo** (window.print)
    con caselle da barrare e righe firma cliente/azienda.

P6. 🟢 **Profilazione gated** — `Quantum Lead Score`/segmentazione comportamentale dovrebbero
    rispettare `canProfile()` (oggi calcolati per tutti).

---

## Qualità del codice

8. ⏳ **Lint — `npm run lint`** (88 problemi residui, build NON impattato)
   ✅ Risolte le 2 violazioni **pericolose** `react-hooks/rules-of-hooks` (hook condizionali in
   `Documents.tsx` e `PublicDocumentGate.tsx` → possibili crash "rendered fewer hooks").
   Residui stilistici da ripulire in un pass dedicato:
   - 49 `@typescript-eslint/no-explicit-any` (tipizzare gli `any`)
   - 15 `react-hooks/purity` (`Date.now`/`Math.random` in render → spostare in `useMemo`/stato)
   - 8 `react-hooks/set-state-in-effect`
   - 4 `no-unused-vars`, 3 `exhaustive-deps`, 3 `no-unused-expressions`

---

## Migliorie / Funzionalità future

9. 🔴 **Collegare Supabase reale** — `src/lib/repo.ts` (`USING_MOCK`), `src/lib/supabase.ts`
   Aggiungere impl `supabaseRepo`, `.env.local` (vedi `.env.example`), applicare `supabase/schema.sql`.
   Allo switch sparisce il badge "Demo (dati mock)". Nessun hook/componente va riscritto.

10. ✅ **`.env.example` + README per GitHub**
    Creato `.env.example` (variabili documentate). README sostituito con descrizione del progetto,
    avvio rapido, build/desktop e guida al collegamento Supabase. `.env.local` già coperto da
    `.gitignore` (`*.local`) → nessun rischio di leak chiavi.

11. 🔴 **Delivery reale dei canali** (oggi simulata)
    ✅ **Campi di configurazione superadmin PRONTI** in Integrazioni + `orgSettingsStore`:
    Email transazionale (Resend/SendGrid/SMTP), Email Marketing (SMTP/SendGrid/SES/Mailgun),
    WhatsApp Cloud API (Meta, con test reale), Telegram Bot (test reale), Google OAuth,
    Web-to-Lead, **SMS (Twilio)**, **Push (Web Push/FCM)**, **Social (Meta FB/IG + LinkedIn)**.
    ⏳ Resta da implementare l'**invio reale** lato backend: Supabase Edge Functions che leggono
    queste credenziali e chiamano i provider, + scheduling (pg_cron) per sequenze/broadcast.
    Da collegare anche: il Social Studio (`socialStore`) alle credenziali `orgSettings.social`.

12. 🟢 **Avanzamento coda task: opzioni extra**
    Skip-con-motivo, log attività automatico al completamento, statistiche "task/giorno".

13. 🟢 **Lazy-load dei grafici** — `vendor-charts` (recharts) ~433kB
    Già in chunk separato; valutare import dinamico solo quando la sezione è visibile.

14. 🟢 **Gemini Nano fallback** — `src/lib/ai/geminiNano.ts`
    `window.ai` solo su Chrome con flag. Prevedere fallback esplicito o provider cloud opzionale.

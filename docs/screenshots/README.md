# Screenshot del manuale

Questa cartella contiene le immagini referenziate dal **Manuale d'uso** in
[`../../GUIDA.md`](../../GUIDA.md) (sezione 11).

## Come (ri)generarle

### Automatico (consigliato)
Con il dev server avviato (`npm run dev`), in un altro terminale:
```bash
npm i -D playwright        # una tantum (usa Chrome di sistema, nessun download extra)
node scripts/capture-screenshots.mjs
```
Lo script fa login come superadmin, sopprime il tour di onboarding e cattura tutte le pagine
in `docs/screenshots/` con i nomi corretti.

### Manuale
1. Avvia l'app in modalità demo: `npm run dev` → http://localhost:5173 ed esegui il login.
2. Per ogni route apri la pagina e cattura uno screenshot a piena finestra (≈1366×854).
3. Salva il file in questa cartella con **esattamente** il nome indicato sotto (formato `.png`).

| File | Route | Pagina |
|---|---|---|
| `login.png` | `/login` | Login |
| `dashboard.png` | `/` | Dashboard |
| `today.png` | `/today` | Il mio giorno |
| `contacts.png` | `/contacts` | Contatti |
| `contact-drawer.png` | `/contacts` (scheda aperta) | Dettaglio contatto |
| `companies.png` | `/companies` | Clienti |
| `pipeline.png` | `/pipeline` | Pipeline |
| `deal-drawer.png` | `/pipeline` (deal aperto) | Dettaglio deal + Sales Path |
| `forecast.png` | `/forecast` | Forecast & Quota |
| `tickets.png` | `/tickets` | Ticket |
| `inbox.png` | `/inbox` | Inbox Chat |
| `tasks.png` | `/tasks` | Coda attività |
| `task-queue-bar.png` | qualsiasi (coda avviata) | Barra esecuzione coda |
| `contracts.png` | `/contracts` | Contratti & firma |
| `quotes.png` | `/quotes` | Preventivi |
| `invoices.png` | `/invoices` | Fatture |
| `documents.png` | `/documents` | Documenti |
| `deadlines.png` | `/deadlines` | Scadenzario |
| `marketing.png` | `/marketing` | Marketing |
| `broadcast.png` | `/broadcast` | Broadcast omnicanale |
| `social.png` | `/social` | Social Studio |
| `sequences.png` | `/sequences` | Qi-Flow (sequenze) |
| `lead-scoring.png` | `/lead-scoring` | Qi-Score (lead scoring) |
| `reminders.png` | `/reminders` | Promemoria |
| `automations.png` | `/automations` | Automazioni (Journey) |
| `analytics.png` | `/analytics` | Analytics |
| `ai-hub.png` | `/ai` | AI Strategy Assistant |
| `team.png` | `/team` | Team & organizzazione |
| `integrations.png` | `/integrations` | Integrazioni & canali |
| `audit.png` | `/audit` | Audit Log |
| `settings.png` | `/settings` | Impostazioni |
| `booking.png` | `/book/:id` | Prenotazione pubblica |
| `form-public.png` | `/form-demo/:id` | Form pubblico |
| `privacy.png` | `/privacy` | Informativa privacy |
| `consent-manage.png` | scheda contatto → Gestisci consensi | Gestione consensi (operatore) |
| `consent-public.png` | `/consent/:token` | Modulo consenso firmabile |

> Finché un file non è presente, il riferimento nel manuale mostrerà un'immagine mancante:
> è normale e non blocca nulla.

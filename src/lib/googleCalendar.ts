// ============================================================
// SOVRANO — Integrazione Google Calendar (livello 1: senza backend).
//
// Genera un URL "template" di Google Calendar che apre un evento
// PRECOMPILATO: l'utente clicca "Salva" e lo aggiunge al proprio
// calendario. Nessuna API, nessun OAuth — funziona subito.
//
// Livello 2 (futuro, con Google Calendar API + OAuth via Supabase):
// sync bidirezionale reale + link Google Meet generato in automatico
// (campo conferenceData.createRequest). Vedi memoria progetto.
// ============================================================

export interface CalendarEvent {
  title: string;
  start: Date;
  end?: Date;             // default: start + 30 min
  details?: string;
  location?: string;
  withMeet?: boolean;     // aggiunge nota per richiedere Meet (vero link solo via API)
}

/** Formatta una data in UTC nel formato richiesto: YYYYMMDDTHHMMSSZ */
function gcalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Costruisce l'URL template di Google Calendar con evento precompilato. */
export function buildGoogleCalendarUrl(ev: CalendarEvent): string {
  const start = ev.start;
  const end = ev.end ?? new Date(start.getTime() + 30 * 60_000);

  let details = ev.details ?? '';
  if (ev.withMeet) {
    details += (details ? '\n\n' : '') +
      'Richiesta videochiamata Google Meet — al salvataggio aggiungi "Google Meet" dall\'evento.';
  }
  details += (details ? '\n\n' : '') + 'Creato da Qi-CRM';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${gcalDate(start)}/${gcalDate(end)}`,
    details,
  });
  if (ev.location) params.set('location', ev.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Apre Google Calendar in una nuova scheda con l'evento precompilato. */
export function openGoogleCalendar(ev: CalendarEvent): void {
  window.open(buildGoogleCalendarUrl(ev), '_blank', 'noopener,noreferrer');
}

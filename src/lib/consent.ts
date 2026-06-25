// ============================================================
// PRIVACY & CONSENSO (GDPR) — modello, informativa e gate.
//
// Collega ciò che l'utente AUTORIZZA (consenso) a ciò che il CRM
// PUÒ FARE (marketing/profilazione). Le funzioni di invio devono
// passare da `canSendMarketing()` / `canProfile()`.
// ============================================================

import type {
  Contact, ContactConsent, ConsentChannel, ConsentEvent, ConsentSourceKind,
} from '../types/crm';

/** Versione dell'informativa accettata. Cambiala quando aggiorni il testo: i consensi
 *  con versione diversa vanno ri-raccolti. */
export const POLICY_VERSION = '2026-06-v1';

/** Consenso "vuoto": nessuna autorizzazione (default sicuro). */
export function emptyConsent(): ContactConsent {
  return {
    marketing: false, profiling: false, third_party: false,
    channels: [], legal_basis: 'consent', policy_version: null,
    given_at: null, withdrawn_at: null, source: null, log: [],
  };
}

/** Accesso sicuro al consenso di un contatto (i contatti vecchi possono non averlo). */
export function getConsent(contact: Pick<Contact, 'consent'>): ContactConsent {
  return contact.consent ?? emptyConsent();
}

// ----- GATE: cosa possiamo fare -----

/** Possiamo inviare marketing su questo canale? (consenso attivo + canale autorizzato) */
export function canSendMarketing(contact: Pick<Contact, 'consent'>, channel: ConsentChannel): boolean {
  const c = getConsent(contact);
  return c.marketing && !c.withdrawn_at && c.channels.includes(channel);
}

/** Possiamo profilare (lead/trust scoring, segmentazione comportamentale)? */
export function canProfile(contact: Pick<Contact, 'consent'>): boolean {
  const c = getConsent(contact);
  return c.profiling && !c.withdrawn_at;
}

/** Stato sintetico per i badge UI. */
export function consentStatus(contact: Pick<Contact, 'consent'>): 'granted' | 'partial' | 'withdrawn' | 'none' {
  const c = getConsent(contact);
  if (c.withdrawn_at) return 'withdrawn';
  if (c.marketing && c.profiling) return 'granted';
  if (c.marketing || c.profiling) return 'partial';
  return 'none';
}

// ----- Costruzione/aggiornamento consenso -----

export interface ConsentInput {
  marketing: boolean;
  profiling: boolean;
  third_party?: boolean;
  channels: ConsentChannel[];
  source: ConsentSourceKind;
  source_ref?: string | null;
}

/** Crea un ContactConsent (con primo evento di log) a partire dalla raccolta. */
export function buildConsent(input: ConsentInput): ContactConsent {
  const now = new Date().toISOString();
  const event: ConsentEvent = {
    at: now, action: 'granted',
    marketing: input.marketing, profiling: input.profiling, third_party: !!input.third_party,
    channels: input.channels, source: input.source, source_ref: input.source_ref ?? null,
    policy_version: POLICY_VERSION,
  };
  return {
    marketing: input.marketing, profiling: input.profiling, third_party: !!input.third_party,
    channels: input.channels, legal_basis: 'consent', policy_version: POLICY_VERSION,
    given_at: now, withdrawn_at: null, source: input.source, log: [event],
  };
}

/** Aggiorna il consenso (preference center / gestione manuale) appendendo al registro. */
export function updateConsent(prev: ContactConsent, input: ConsentInput): ContactConsent {
  const now = new Date().toISOString();
  const noneGranted = !input.marketing && !input.profiling && !input.third_party;
  const event: ConsentEvent = {
    at: now, action: noneGranted ? 'withdrawn' : 'updated',
    marketing: input.marketing, profiling: input.profiling, third_party: !!input.third_party,
    channels: input.channels, source: input.source, source_ref: input.source_ref ?? null,
    policy_version: POLICY_VERSION,
  };
  return {
    ...prev,
    marketing: input.marketing, profiling: input.profiling, third_party: !!input.third_party,
    channels: input.channels, policy_version: POLICY_VERSION,
    given_at: prev.given_at ?? (noneGranted ? null : now),
    withdrawn_at: noneGranted ? now : null,
    source: input.source,
    log: [...prev.log, event],
  };
}

export const CHANNEL_LABEL: Record<ConsentChannel, string> = {
  email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp', phone: 'Telefono',
};

// ----- Testi legali -----

/** Informativa privacy sintetica (art. 13 GDPR). Personalizzala con i dati reali del titolare. */
export const PRIVACY_NOTICE = `INFORMATIVA SUL TRATTAMENTO DEI DATI PERSONALI (art. 13 Reg. UE 2016/679 - GDPR)

1. Titolare del trattamento: [Ragione Sociale], [indirizzo], email: privacy@[dominio].
2. Dati trattati: dati anagrafici e di contatto (nome, email, telefono), dati di interazione
   (aperture/click email, visite, compilazioni form) e dati forniti volontariamente.
3. Finalità e basi giuridiche:
   a) gestione della relazione e riscontro alle richieste (esecuzione di misure precontrattuali);
   b) invio di comunicazioni commerciali e newsletter (consenso, revocabile in ogni momento);
   c) profilazione e segmentazione per comunicazioni pertinenti (consenso specifico);
   d) eventuale comunicazione a terzi/partner (consenso specifico).
4. Canali: le comunicazioni di cui al punto 3b avvengono solo sui canali per cui presti consenso.
5. Conservazione: per il tempo necessario alle finalità e secondo gli obblighi di legge; i dati
   trattati su base consenso fino a revoca.
6. Diritti dell'interessato (artt. 15-22): accesso, rettifica, cancellazione, limitazione,
   portabilità, opposizione e revoca del consenso, scrivendo a privacy@[dominio].
7. Reclamo: hai diritto di proporre reclamo al Garante per la protezione dei dati personali.`;

/** Footer obbligatorio da includere in ogni email marketing (gestione preferenze / disiscrizione). */
export function unsubscribeFooter(company: string): string {
  return `Ricevi questa email perché hai prestato il consenso alle comunicazioni di ${company}. ` +
    `Puoi gestire le tue preferenze o disiscriverti in qualsiasi momento.`;
}

/** Etichette di consenso mostrate nei form (checkbox da spuntare). */
export const CONSENT_LABELS = {
  marketing: 'Acconsento a ricevere comunicazioni commerciali e newsletter (art. 3b dell\'informativa).',
  profiling: 'Acconsento alla profilazione per ricevere comunicazioni pertinenti (art. 3c).',
  third_party: 'Acconsento alla comunicazione dei miei dati a terzi/partner selezionati (art. 3d).',
  required: 'Ho letto l\'informativa privacy e acconsento al trattamento dei miei dati per dare seguito alla richiesta.',
};

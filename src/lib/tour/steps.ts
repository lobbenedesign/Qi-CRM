// ============================================================
// Qi-CRM — Definizione passi del tour onboarding.
// Tutorial completo: copre ogni area del software con descrizioni.
// Ogni passo punta a un elemento via attributo `data-tour`.
// Se il target non esiste (es. voce riservata al superadmin non
// visibile per quel ruolo) il fumetto viene centrato automaticamente.
// ============================================================

export interface TourStep {
  target: string;          // valore di data-tour
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  emoji?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: 'logo',
    title: 'Benvenuto in Qi-CRM 👑',
    body: 'Il CRM che tratta ogni dato come un\'entità viva con affidabilità misurabile. Questo tour ti mostra TUTTE le funzioni in circa 2 minuti. Usa ▶ per la demo automatica, o Avanti/Indietro.',
    placement: 'right',
    emoji: '👋',
  },
  {
    target: 'nav',
    title: 'La barra di navigazione',
    body: 'Tutte le aree del gestionale sono qui a sinistra, raggruppate: operatività, fatturazione e documenti, automazioni, AI e amministrazione. Vedi solo le voci consentite dal tuo ruolo.',
    placement: 'right',
  },
  {
    target: 'quickadd',
    title: 'Crea da qualsiasi punto',
    body: 'Il pulsante "Crea" apre al volo un nuovo contatto, deal, ticket, promemoria, contratto o fattura — senza cambiare pagina. È il modo più rapido per inserire dati.',
    placement: 'bottom',
    emoji: '⚡',
  },
  {
    target: 'cmdk',
    title: 'Command Bar (⌘K)',
    body: 'Premi ⌘K (Ctrl+K su Windows) ovunque per cercare contatti, aziende e deal o lanciare comandi da tastiera. Velocità senza mouse.',
    placement: 'bottom',
  },
  {
    target: 'nav-today',
    title: 'Il mio giorno',
    body: 'Il tuo cockpit personale: pipeline assegnata, deal aperti, ticket da gestire, promemoria di oggi, scadenze imminenti e documenti recenti — tutto in una schermata.',
    placement: 'right',
    emoji: '🌅',
  },
  {
    target: 'kpis',
    title: 'Dashboard in tempo reale',
    body: 'I KPI si calcolano dai tuoi dati reali: pipeline aperta, deal attivi, win rate. Clicca una card per andare all\'area collegata.',
    placement: 'bottom',
  },
  {
    target: 'nav-contacts',
    title: 'Contatti & Trust Score',
    body: 'Ogni contatto mostra un punteggio di affidabilità del dato (Trust Score) che decade nel tempo. Selezione multipla per azioni di massa, import/export CSV e "Cattura AI" da testo libero.',
    placement: 'right',
    emoji: '🛡️',
  },
  {
    target: 'nav-pipeline',
    title: 'Pipeline Quantistica',
    body: 'Kanban drag-and-drop dove le card cambiano colore in base al rischio calcolato: i deal fermi "urlano" visivamente. Filtra "i miei deal" e assegna ai commerciali.',
    placement: 'right',
    emoji: '🎯',
  },
  {
    target: 'nav-tickets',
    title: 'Ticket & smistamento',
    body: 'Richieste e task con priorità e categoria. Lo smistamento automatico li assegna al ruolo giusto (es. richiamo → telefonista) bilanciando il carico di lavoro.',
    placement: 'right',
    emoji: '🎫',
  },
  {
    target: 'nav-contracts2',
    title: 'Contratti con firma digitale',
    body: 'Genera contratti da template, inviali via email e raccogli una FIRMA CRITTOGRAFICA reale: hash SHA-256, chiavi RSA e codice OTP. Ogni firma è verificata e tracciata.',
    placement: 'right',
    emoji: '✍️',
  },
  {
    target: 'nav-invoices',
    title: 'Fatture',
    body: 'Crea fatture con righe, IVA e totali; inviale via email e stampale in PDF A4. Collegate al deal e al cliente, con stati (bozza, inviata, pagata, scaduta).',
    placement: 'right',
    emoji: '🧾',
  },
  {
    target: 'nav-documents',
    title: 'Documenti collegati al deal',
    body: 'Vista unificata di contratti, fatture e documenti ricevuti via email, agganciati automaticamente al deal del cliente. Ogni file ha verifica di integrità.',
    placement: 'right',
    emoji: '📎',
  },
  {
    target: 'nav-deadlines',
    title: 'Scadenzario',
    body: 'Tieni sotto controllo scadenze fiscali, pagamenti e rinnovi con categorie, importi e promemoria automatici via email/Telegram.',
    placement: 'right',
    emoji: '📅',
  },
  {
    target: 'nav-reminders',
    title: 'Promemoria multi-canale',
    body: 'Imposta promemoria con notifica in-app, email, Telegram e WhatsApp. Puoi anche aggiungerli a Google Calendar con un clic.',
    placement: 'right',
    emoji: '🔔',
  },
  {
    target: 'nav-automations',
    title: 'Automazioni',
    body: 'Crea regole "quando accade X → fai Y": solleciti automatici sui deal fermi, email di win-back per i clienti a rischio, benvenuto ai nuovi lead.',
    placement: 'right',
    emoji: '⚙️',
  },
  {
    target: 'nav-ai',
    title: 'AI Strategy Assistant',
    body: 'Chiedigli "Cosa dovrei fare oggi?" e risponde fondandosi sui tuoi dati reali: deal a rischio, churn, priorità. Il tuo co-pilota commerciale.',
    placement: 'right',
    emoji: '🤖',
  },
  {
    target: 'nav-team',
    title: 'Team & ruoli (Admin)',
    body: 'Il superadmin invita i dipendenti via email, assegna i ruoli (commerciale, amministrativo, configuratore, telefonista…) e definisce i permessi di ciascuno.',
    placement: 'right',
    emoji: '👥',
  },
  {
    target: 'nav-integrations',
    title: 'Integrazioni guidate (Admin)',
    body: 'Collega WhatsApp, Telegram, email, Google Calendar/Meet e il form del sito web. Ogni scheda ha una mini-guida passo-passo e un test di connessione.',
    placement: 'right',
    emoji: '🔌',
  },
  {
    target: 'nav-audit',
    title: 'Audit Log (Admin)',
    body: 'Lo storico completo, con timestamp al secondo, di ogni azione di ogni dipendente: chi ha fatto cosa e quando. Filtrabile per persona e tipo di azione.',
    placement: 'right',
    emoji: '📜',
  },
  {
    target: 'notifications',
    title: 'Notifiche intelligenti',
    body: 'La campanella raccoglie le micro-mosse AI in sospeso e i task in scadenza, sempre a portata di clic.',
    placement: 'bottom',
  },
  {
    target: 'theme',
    title: 'Tutto pronto! ✨',
    body: 'Personalizza tema chiaro/scuro qui. Puoi rivedere questo tour quando vuoi dal pulsante "?" in alto. Buon lavoro con Qi-CRM!',
    placement: 'bottom',
    emoji: '🎉',
  },
];

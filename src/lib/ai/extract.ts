// ============================================================
// SOVRANO — Zero-Entry Capture.
// Estrae campi strutturati da testo libero (email, appunti, firme).
// Offline: euristiche/regex con confidenza. Online (futuro): se
// VITE_OPENAI_API_KEY è presente, si può sostituire con una call LLM
// mantenendo la stessa shape di output.
// ============================================================
import type { TrustSource } from '../../types/crm';

export interface ExtractedField<T = string> {
  value: T;
  confidence: number;     // 0..1
  source: TrustSource;    // sempre 'ai_extracted' qui
}

export interface ExtractionResult {
  first_name?: ExtractedField;
  last_name?: ExtractedField;
  email?: ExtractedField;
  phone?: ExtractedField;
  job_title?: ExtractedField;
  company_name?: ExtractedField;
  summary: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+39\s?)?(?:\d[\s.-]?){8,12}\d/;
const TITLE_KEYWORDS = [
  'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'Founder', 'Co-Founder', 'Direttore',
  'Manager', 'Responsabile', 'Head of', 'VP', 'Presidente', 'Owner', 'Titolare',
  'Sales', 'Marketing', 'Procurement', 'Buyer', 'Account',
];

function ai<T>(value: T, confidence: number): ExtractedField<T> {
  return { value, confidence, source: 'ai_extracted' };
}

/** Estrae campi da testo libero. Mock locale (no network). */
export async function extractFromText(text: string): Promise<ExtractionResult> {
  // piccola latenza per simulare l'inferenza
  await new Promise((r) => setTimeout(r, 600));

  const result: ExtractionResult = { summary: '' };

  // Email
  const email = text.match(EMAIL_RE)?.[0];
  if (email) result.email = ai(email.toLowerCase(), 0.92);

  // Phone
  const phone = text.match(PHONE_RE)?.[0]?.trim();
  if (phone && phone.replace(/\D/g, '').length >= 8) result.phone = ai(phone, 0.8);

  // Nome: cerca "Mi chiamo X Y", "Sono X Y", o deduci da email
  let first: string | undefined, last: string | undefined;
  const nameMatch = text.match(/(?:mi chiamo|sono|i['’]m|my name is)\s+([A-ZÀ-Ý][a-zà-ÿ]+)\s+([A-ZÀ-Ý][a-zà-ÿ]+)/i);
  if (nameMatch) {
    first = cap(nameMatch[1]); last = cap(nameMatch[2]);
  } else if (email) {
    const local = email.split('@')[0];
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) { first = cap(parts[0]); last = cap(parts[1]); }
    else first = cap(parts[0]);
  }
  if (first) result.first_name = ai(first, nameMatch ? 0.88 : 0.55);
  if (last) result.last_name = ai(last, nameMatch ? 0.88 : 0.5);

  // Ruolo
  for (const kw of TITLE_KEYWORDS) {
    const re = new RegExp(`\\b${kw}\\b[^.,\\n]*`, 'i');
    const m = text.match(re);
    if (m) { result.job_title = ai(cap(m[0].trim()).slice(0, 50), 0.7); break; }
  }

  // Azienda: da dominio email o "presso/at X"
  const compMatch = text.match(/(?:presso|at|della|di)\s+([A-ZÀ-Ý][\w&.\s]{2,30})(?:\.|,|\n|$)/);
  if (compMatch) {
    result.company_name = ai(compMatch[1].trim(), 0.6);
  } else if (email) {
    const domain = email.split('@')[1]?.split('.')[0];
    if (domain && !['gmail', 'outlook', 'yahoo', 'hotmail', 'libero', 'icloud'].includes(domain)) {
      result.company_name = ai(cap(domain), 0.5);
    }
  }

  // Summary
  const found = Object.keys(result).filter((k) => k !== 'summary').length;
  result.summary = found
    ? `Estratti ${found} campi dal testo. Rivedi i valori a bassa fiducia prima di salvare.`
    : 'Nessun campo riconosciuto. Prova con un testo che contenga email, nome o telefono.';

  return result;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

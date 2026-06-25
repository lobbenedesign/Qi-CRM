import { repo } from '../repo';
import type { Deal, Contact } from '../../types/crm';

// Estendiamo le definizioni globali per evitare errori di compilazione TS
declare global {
  interface Window {
    ai?: {
      languageModel?: {
        capabilities(): Promise<{ available: 'readily' | 'after-download' | 'no' }>;
        create(options?: {
          systemPrompt?: string;
          temperature?: number;
          topK?: number;
        }): Promise<any>;
      };
    };
  }
}

export interface GeminiNanoCapabilities {
  available: boolean;
  status: 'readily' | 'after-download' | 'no' | 'unsupported';
}

/**
 * Controlla se le API di Gemini Nano sono abilitate in Chrome.
 */
export async function getGeminiNanoCapabilities(): Promise<GeminiNanoCapabilities> {
  if (typeof window === 'undefined' || !window.ai) {
    return { available: false, status: 'unsupported' };
  }
  
  // Supporta sia la vecchia API (.assistant) che la nuova (.languageModel)
  const modelApi = window.ai.languageModel || (window.ai as any).assistant;
  if (!modelApi) {
    return { available: false, status: 'unsupported' };
  }

  try {
    const caps = await modelApi.capabilities();
    return {
      available: caps.available === 'readily' || caps.available === 'after-download',
      status: caps.available,
    };
  } catch (e) {
    return { available: false, status: 'no' };
  }
}

/**
 * Costruisce il contesto testuale del database locale da dare in pasto a Gemini Nano.
 */
async function buildDatabaseContext(): Promise<string> {
  const [deals, contacts, insights] = await Promise.all([
    repo.listDeals() as Promise<Deal[]>,
    repo.listContacts() as Promise<Contact[]>,
    repo.listInsights(),
  ]);

  const openDeals = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
  const wonDeals = deals.filter((d) => d.stage === 'won');
  const lostDeals = deals.filter((d) => d.stage === 'lost');

  const formattedDeals = openDeals.map(d => 
    `- Deal: "${d.title}" | Valore: ${d.value} EUR | Fase: "${d.stage}" | Prossima azione: "${d.next_action ?? 'Non impostata'}" | Giorni di inattività: ${d.velocity_days}`
  ).join('\n');

  const formattedContacts = contacts.map(c => 
    `- Contatto: ${c.first_name} ${c.last_name} | Azienda: "${c.company?.name ?? 'Nessuna'}" | Churn Risk: ${c.churn_risk ? Math.round(c.churn_risk.score * 100) + '%' : 'N/D'}`
  ).join('\n');

  const formattedInsights = insights.filter(i => !i.is_executed).map(i =>
    `- Insight: ${i.reasoning} (Confidenza: ${Math.round(i.confidence * 100)}%)`
  ).join('\n');

  return `
Sei l'assistente AI locale (Gemini Nano) integrato nel Qi-CRM di Giuseppe.
Il tuo obiettivo è rispondere alle domande dell'utente analizzando i dati effettivi del CRM forniti qui sotto.

DATI CORRENTI DEL CRM:
---
DEAL APERTI:
${formattedDeals || 'Nessun deal aperto.'}

RIEPILOGO DEAL CONCLUSI:
- Vinti: ${wonDeals.length}
- Persi: ${lostDeals.length}

CONTATTI CHIAVE:
${formattedContacts || 'Nessun contatto.'}

INSIGHT STRATEGICI ATTIVI:
${formattedInsights || 'Nessun insight attivo.'}
---

Rispondi in modo cordiale, chiaro e sintetico. Se l'utente ti chiede dati specifici (es. valori o percentuali di rischio), usa i dati sopra indicati per calcolarli o elencarli. Evita allucinazioni. Rispondi in italiano.
`;
}

/**
 * Invia un prompt a Gemini Nano fornendo il contesto del database.
 */
export async function askGeminiNano(query: string): Promise<string> {
  const caps = await getGeminiNanoCapabilities();
  if (!caps.available) {
    throw new Error('Gemini Nano non è disponibile su questo dispositivo o browser.');
  }

  const systemPrompt = await buildDatabaseContext();
  const modelApi = window.ai!.languageModel || (window.ai as any).assistant;

  // Creiamo una sessione con il prompt di sistema integrato
  const session = await modelApi.create({
    systemPrompt: systemPrompt,
    temperature: 0.4,
  });

  try {
    const result = await session.prompt(query);
    return result;
  } finally {
    if (session && typeof session.destroy === 'function') {
      session.destroy();
    }
  }
}

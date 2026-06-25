// Cattura screenshot di tutte le pagine per il manuale (GUIDA.md §11).
// Uso: avvia il dev server (npm run dev) e poi: node scripts/capture-screenshots.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../docs/screenshots');
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const VW = { width: 1366, height: 854 };

const ROUTES = [
  ['dashboard', '/'],
  ['today', '/today'],
  ['contacts', '/contacts'],
  ['companies', '/companies'],
  ['pipeline', '/pipeline'],
  ['forecast', '/forecast'],
  ['tickets', '/tickets'],
  ['inbox', '/inbox'],
  ['tasks', '/tasks'],
  ['contracts', '/contracts'],
  ['quotes', '/quotes'],
  ['invoices', '/invoices'],
  ['documents', '/documents'],
  ['deadlines', '/deadlines'],
  ['marketing', '/marketing'],
  ['broadcast', '/broadcast'],
  ['social', '/social'],
  ['sequences', '/sequences'],
  ['lead-scoring', '/lead-scoring'],
  ['reminders', '/reminders'],
  ['automations', '/automations'],
  ['analytics', '/analytics'],
  ['ai-hub', '/ai'],
  ['team', '/team'],
  ['integrations', '/integrations'],
  ['audit', '/audit'],
  ['settings', '/settings'],
];

const PUBLIC = [
  ['booking', '/book/tm-comm'],
  ['form-public', '/form-demo/form-contattaci'],
  ['privacy', '/privacy'],
];

async function launchBrowser() {
  try { return await chromium.launch({ channel: 'chrome' }); }
  catch { return await chromium.launch(); } // fallback al chromium bundled
}

async function shot(page, name) {
  await page.waitForTimeout(900); // animazioni/grafici
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log('  ✓', `${name}.png`);
}

async function goto(page, url) {
  await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
}

const run = async () => {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: VW, deviceScaleFactor: 2, colorScheme: 'light' });
  // Sopprime il tour di onboarding (altrimenti oscura le schermate e intercetta i click)
  // e pre-seeda una richiesta di consenso per lo screenshot del modulo pubblico.
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('qi-crm-tour-v2', JSON.stringify({ state: { hasSeenTour: true }, version: 0 }));
      localStorage.setItem('qi-crm-consent-requests-v1', JSON.stringify({ state: { requests: [{
        id: 'cr-demo', token: 'demotoken123demotoken123', contact_id: 'ct-conti',
        contact_name: 'Marco Conti', contact_email: 'marco@fabricadigitale.it', policy_version: '2026-06-v1',
        status: 'sent', grants: null, signed_name: null, signed_at: null, signature_hash: null,
        countersigned_by: null, countersigned_at: null, channel: 'digital', created_at: new Date().toISOString(),
      }] }, version: 0 }));
    } catch (e) { /* */ }
  });
  const page = await ctx.newPage();
  let ok = 0, fail = 0;
  const tryShot = async (fn, name) => {
    try { await fn(); ok++; } catch (e) { fail++; console.log('  ✗', name, '—', e.message.split('\n')[0]); }
  };

  // 1) Login page (prima del login)
  await tryShot(async () => { await goto(page, '/login'); await shot(page, 'login'); }, 'login');

  // 2) Login
  await goto(page, '/login');
  await page.fill('form input:not([type=password])', 'superadmin').catch(() => {});
  await page.fill('form input[type=password]', 'superadmin2026!').catch(() => {});
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-tour="nav"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);

  // 3) Route protette
  for (const [name, url] of ROUTES) {
    await tryShot(async () => { await goto(page, url); await shot(page, name); }, name);
  }

  // 4) Drawer dettaglio contatto
  await tryShot(async () => {
    await goto(page, '/contacts');
    await page.waitForTimeout(700);
    await page.locator('tbody tr').first().locator('td').nth(1).click({ timeout: 6000 });
    await shot(page, 'contact-drawer');
  }, 'contact-drawer');

  // 5) Drawer dettaglio deal
  await tryShot(async () => {
    await goto(page, '/pipeline');
    await page.waitForTimeout(800);
    await page.locator('.deal-card').first().click({ timeout: 6000 });
    await shot(page, 'deal-drawer');
  }, 'deal-drawer');

  // 6) Barra esecuzione coda task
  await tryShot(async () => {
    await goto(page, '/tasks');
    await page.getByText('Avvia Coda di Lavoro', { exact: false }).first().click({ timeout: 5000 });
    await page.waitForTimeout(1200);
    await shot(page, 'task-queue-bar');
  }, 'task-queue-bar');

  // 7) Modal gestione consensi (lato operatore)
  await tryShot(async () => {
    await goto(page, '/contacts');
    await page.waitForTimeout(700);
    await page.locator('tbody tr').first().locator('td').nth(1).click({ timeout: 6000 });
    await page.getByText('Gestisci consensi', { exact: false }).first().click({ timeout: 6000 });
    await page.waitForTimeout(500);
    await shot(page, 'consent-manage');
  }, 'consent-manage');

  // 8) Pagine pubbliche (incl. modulo consenso firmabile)
  for (const [name, url] of [...PUBLIC, ['consent-public', '/consent/demotoken123demotoken123']]) {
    await tryShot(async () => { await goto(page, url); await shot(page, name); }, name);
  }

  await browser.close();
  console.log(`\nFatto. OK: ${ok}, falliti: ${fail}. Output: docs/screenshots/`);
};

run().catch((e) => { console.error(e); process.exit(1); });

// Responsive screenshot/detector harness for the responsive sweep
// (v1-050, five-width refresh for the 8/8 launch sweep).
// Usage: node .sweep-mobshot.mjs [route...]   (no routes → ALL_ROUTES)
//   SHOTS=0 → detector only (no screenshots; light, for full triage)
//   WIDTHS=390,768,1100,1440,1920 → viewport widths to test
// Screenshots into scratchpad/mobshots2/<slug>_<w>.png; per-route
// docOverflow/clipped line. Auto-recovers from Chromium crashes by
// relaunching + re-authenticating, and recycles the browser every 20
// routes to stay under the memory ceiling that was crashing long runs.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:8888';
const OUT = '/tmp/claude-1000/-home-sophia-Downloads/e7d6b4a7-4f19-4463-8f7b-53c306e6848f/scratchpad/mobshots2/';
fs.mkdirSync(OUT, { recursive: true });

const WIDTHS = (process.env.WIDTHS || '390,768,1100,1440,1920').split(',').map((n) => parseInt(n, 10));
const HEIGHT = { 390: 844, 768: 1024, 1024: 768, 1100: 800, 1280: 800, 1440: 900, 1920: 1080 };
const SHOTS = process.env.SHOTS !== '0';
const RECYCLE_EVERY = 20;

// Current route reality (v1-063). The old v1-050 list carried routes since
// deleted; the four H12 additions (/divination/astragaloi, /verdicts,
// /order/ladder, /daily-practice/resh) are new. Param routes need seed data
// and are exercised by the E2E suites instead.
const ALL_ROUTES = [
  // ── practice wing (priority 1-2) ──
  '/', '/journal', '/editor', '/daily-practice', '/daily-practice/resh',
  '/practice-logs', '/capture',
  '/calendar', '/entities', '/library',
  '/divination', '/divination/tarot', '/divination/runes', '/divination/iching',
  '/divination/geomancy', '/divination/astragaloi', '/divination/more',
  '/sigils', '/talismans', '/circles', '/tools', '/magic-squares', '/voces',
  '/gematria', '/gematria/search', '/transliterations', '/voces-library',
  '/synchronicities', '/order/ladder', '/verdicts', '/analytics',
  '/bind-rune', '/deck-designer', '/family-tree', '/oaths', '/offerings',
  '/initiations', '/lineage', '/studies', '/servitors', '/contracts',
  '/foundations', '/recipes', '/pilgrimage-routes', '/wellbeing', '/health',
  '/templates', '/aliases', '/identities', '/query',
  // ── platform wing (priority 3) ──
  '/publications', '/subscribers', '/media', '/audio', '/pilgrimage',
  '/icalfeed', '/feed', '/networks', '/networks/discover', '/networks/peers',
  '/followers', '/private-viewers', '/plugins', '/plugins/registry',
  '/plugins/status', '/bundles', '/sandbox', '/agents-home',
  '/agents-activity', '/agents-cost', '/agents-keys', '/agents-marketplace',
  '/group-rituals/new', '/hubs', '/newsletter-editor', '/subscription-tiers',
  '/pricing-distribution', '/comments-moderation', '/publication-editor',
  '/publication-settings', '/memorial-mode', '/connection',
  '/registry', '/registry/advisory', '/registry/review',
  '/registry/submissions', '/registry/submit',
  '/settings', '/settings/accessibility', '/settings/activitypub',
  '/settings/audit', '/settings/data-export', '/settings/delete-account',
  '/settings/keys', '/settings/password', '/settings/preferences',
  '/settings/sessions', '/settings/totp', '/settings/webauthn',
  '/signin',
];

const routes = process.argv.slice(2).length ? process.argv.slice(2) : ALL_ROUTES;

let browser, ctx, page;

async function authenticate() {
  const name = 'Sweep ' + Math.floor(performance.now()).toString(36) + routes.length;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/signin');
  await page.waitForLoadState('networkidle').catch(() => {});
  if (page.url().includes('/setup')) {
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('Your magickal name').fill(name);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Open the vault' }).click();
  } else {
    await page.getByRole('button', { name: 'Continue with magickal name' }).click();
    await page.getByLabel('Magickal name').fill(name);
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await page.getByRole('button', { name: 'Switch acting identity' }).waitFor({ state: 'visible', timeout: 20000 });
}

async function launch() {
  browser = await chromium.launch();
  ctx = await browser.newContext({ baseURL: BASE, deviceScaleFactor: 1 });
  page = await ctx.newPage();
  await authenticate();
}

async function recycle() {
  try { await browser.close(); } catch { /* already dead */ }
  await launch();
}

async function clippedReport() {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const bad = [];
    for (const el of document.querySelectorAll('*')) {
      if (el.ownerSVGElement) continue; // SVG-internal geometry is not a layout clip
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 2) {
        let clipped = false;
        let p = el.parentElement;
        while (p) {
          if (p.tagName && p.tagName.toLowerCase() === 'svg') break;
          const s = getComputedStyle(p);
          if (/(hidden|clip)/.test(s.overflowX)) { clipped = true; break; }
          if (/(auto|scroll)/.test(s.overflowX)) break;
          p = p.parentElement;
        }
        if (clipped) bad.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 28), right: Math.round(r.right), txt: (el.textContent || '').trim().slice(0, 24) });
      }
    }
    const seen = new Set();
    return bad.filter((b) => { const k = b.tag + b.cls + b.right; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
  });
}

await launch();

let done = 0;
for (const route of routes) {
  if (done > 0 && done % RECYCLE_EVERY === 0) await recycle();
  done++;
  const slug = route.replace(/[/:]/g, '_').replace(/^_/, '') || 'root';
  for (const w of WIDTHS) {
    let tries = 0;
    while (tries < 2) {
      tries++;
      try {
        await page.setViewportSize({ width: w, height: HEIGHT[w] || 800 });
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(SHOTS ? 550 : 350);
        if (SHOTS) { try { await page.screenshot({ path: `${OUT}${slug}_${w}.png` }); } catch { /* flake */ } }
        const clipped = await clippedReport();
        const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        const flag = (docOverflow || clipped.length) ? ' ⚠️' : '';
        console.log(`${route} @${w}  docOverflow=${docOverflow}  clipped=${clipped.length}${flag}` + (clipped.length ? '  ' + JSON.stringify(clipped) : ''));
        break;
      } catch (e) {
        if (/closed|crashed|Target/i.test(e.message)) {
          console.log(`${route} @${w}  (recovering: ${e.message.slice(0, 40)})`);
          await recycle();
          continue; // retry this width once on a fresh browser
        }
        console.log(`${route} @${w}  ERROR ${e.message.slice(0, 60)}`);
        break;
      }
    }
  }
}
await browser.close();
console.log('node exit 0');

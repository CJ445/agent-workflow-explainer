// Browser checks against `vite preview`: scroll-driven state, reverse scroll, anchor jumps,
// overflow, reduced motion, no network calls to Google services. Writes screenshots to SHOTS.
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:4173/';
const SHOTS = process.env.SHOTS ?? 'shots';
const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
import fs from 'node:fs';
fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++; };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });

async function open(vp, reduced = false) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const external = [];
  page.on('request', (r) => { const u = r.url(); if (/googleapis\.com\/(gmail|sheets)|generativelanguage|n8n\.cloud/.test(u)) external.push(u); });
  page.on('pageerror', (e) => check(false, `page error: ${e.message}`));
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await wait(800);
  return { page, external };
}
const scrollToStep = async (page, id) => {
  await page.evaluate((id) => {
    const el = document.getElementById(`step-${id}`);
    const line = innerWidth < 900 ? 0.88 : 0.78;
    scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * line + 40);
  }, id);
  await wait(900);
};
const state = (page) => page.evaluate(() => ({
  current: document.querySelector('.step.is-current')?.id,
  nodes: [...document.querySelectorAll('#story-wf .wf-node.on')].map((n) => n.dataset.node),
  msgs: document.querySelectorAll('#chat-log [data-msg]').length,
  panel: document.querySelector('#panel').dataset.panel,
  pill: document.querySelector('#panel .pill')?.textContent,
  chapter: document.querySelector('.chapters a.active')?.dataset.nav,
  overflow: document.documentElement.scrollWidth - innerWidth,
}));

for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
  const { page, external } = await open(vp);
  await page.screenshot({ path: `${SHOTS}/${name}-hero.png` });
  check((await state(page)).overflow <= 0, `${name}: no horizontal overflow at hero`);

  const order = ['s-n8n', 's-gemini', 'p1-trigger', 'p1-agent', 'p1-run', 'p2-attach', 'p2-recall', 'p3-attach', 'p3-exec', 'p4-attach', 'p4-draft', 'p4-revise', 'p4-approve', 'p4-sent'];
  for (const id of order) {
    await scrollToStep(page, id);
    const s = await state(page);
    check(s.current === `step-${id}`, `${name}: forward scroll activates ${id} (got ${s.current})`);
    check(s.overflow <= 0, `${name}: no horizontal overflow at ${id}`);
    await page.screenshot({ path: `${SHOTS}/${name}-${id}.png` });
  }
  let s = await state(page);
  check(s.nodes.length === 6 && s.pill === 'Sent', `${name}: phase 4 ends with 6 nodes and Sent (${s.nodes.length}, ${s.pill})`);

  // Reverse scroll back into phase 1: memory/sheets/gmail must disappear again.
  await scrollToStep(page, 'p2-recall');
  await scrollToStep(page, 'p1-forget');
  s = await state(page);
  check(s.current === 'step-p1-forget' && s.nodes.join() === 'chat,agent,gemini', `${name}: reverse scroll restores phase-1 scene (${s.nodes})`);
  check(s.msgs === 6, `${name}: reverse scroll restores phase-1 chat (${s.msgs} msgs)`);

  // Anchor jump via chapter nav.
  await page.click('.chapters a[data-nav="phase-3"]');
  await wait(1800);
  s = await state(page);
  check(s.chapter === 'phase-3', `${name}: nav jump highlights phase-3 (${s.chapter})`);
  await page.click('.chapters a[data-nav="final"]');
  await wait(2200);
  await page.evaluate(() => document.getElementById('final-wf').scrollIntoView({ block: 'center' }));
  await wait(2200);
  s = await state(page);
  check(s.chapter === 'final', `${name}: nav jump highlights final (${s.chapter})`);
  const finalNodes = await page.$$eval('#final-wf .wf-node', (n) => n.filter((x) => getComputedStyle(x).opacity > 0.9).length);
  check(finalNodes === 6, `${name}: final diagram shows all 6 nodes (${finalNodes})`);
  await page.screenshot({ path: `${SHOTS}/${name}-final.png` });
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await wait(600);
  await page.screenshot({ path: `${SHOTS}/${name}-closing.png` });
  check(external.length === 0, `${name}: no requests to Gmail/Sheets/Gemini/n8n APIs`);
  const text = await page.evaluate(() => document.body.innerText);
  check(!/AIza[0-9A-Za-z_-]{10,}/.test(text), `${name}: no API key pattern in rendered page`);
  await page.close();
}

// Reduced motion: chat content still appears, hero bubbles visible, no packet in flight.
{
  const { page } = await open({ width: 1440, height: 900 }, true);
  const heroVisible = await page.$eval('.hc-agent', (e) => getComputedStyle(e).opacity);
  check(Number(heroVisible) === 1, `reduced-motion: hero reply visible without animation`);
  await scrollToStep(page, 'p2-recall');
  const s = await state(page);
  const pkt = await page.$eval('#story-wf .packet', (e) => getComputedStyle(e).opacity);
  check(s.msgs === 5 && Number(pkt) === 0, `reduced-motion: memory recall rendered (${s.msgs} msgs), no packet animation`);
  await page.close();
}

// Layout shift during the full scroll.
{
  const { page } = await open({ width: 1440, height: 900 });
  await page.evaluate(() => { window.__cls = 0; new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; (window.__src ??= []).push([e.value.toFixed(3), scrollY, e.sources.map((s) => (s.node?.id || s.node?.className?.baseVal || s.node?.className || s.node?.nodeName) + ":" + Math.round(s.previousRect.y) + ">" + Math.round(s.currentRect.y)).join(" ")]); })).observe({ type: 'layout-shift', buffered: true }); });
  for (let y = 0; y < 30; y++) { await page.evaluate(() => scrollBy(0, innerHeight * 0.6)); await wait(120); }
  const cls = await page.evaluate(() => window.__cls);
  check(cls < 0.1, `desktop: cumulative layout shift ${cls.toFixed(4)} < 0.1`);
  if (cls >= 0.1) console.log(JSON.stringify(await page.evaluate(() => window.__src)));
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll browser checks passed');
process.exit(failures ? 1 : 0);

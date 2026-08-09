import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.argv[2];
const expectedText = process.argv[3] || '';
const expectedArt = process.argv[4] || '';
if (!url) throw new Error('usage: node tools/prove-live-worldz.mjs <url> [expectedText] [expectedArt]');

const outDir = process.env.WORLDZ_PROOF_DIR || 'worldz-proof';
mkdirSync(outDir, { recursive: true });

function chromePath() {
  for (const cmd of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [cmd], { encoding: 'utf8' }).trim(); } catch {}
  }
  throw new Error('Chrome/Chromium is required for production proof');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitJson(endpoint, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const r = await fetch(endpoint); if (r.ok) return await r.json(); } catch {}
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${endpoint}`);
}

class CDP {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 1; this.pending = new Map(); }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (!msg.id) return;
      const pending = this.pending.get(msg.id);
      if (!pending) return;
      this.pending.delete(msg.id);
      msg.error ? pending.reject(new Error(msg.error.message)) : pending.resolve(msg.result);
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

const chrome = spawn(chromePath(), [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
  '--remote-debugging-port=9333', '--user-data-dir=/tmp/worldz-production-proof', '--hide-scrollbars',
  '--user-agent=Mozilla/5.0 (WorldzProductionProof/1.0)', 'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

let cdp;
let failed = false;
const reports = [];
try {
  const targets = await waitJson('http://127.0.0.1:9333/json/list');
  const target = targets.find(t => t.type === 'page') || targets[0];
  if (!target?.webSocketDebuggerUrl) throw new Error('No Chrome page target');
  cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1100, mobile: false },
    { name: 'mobile', width: 390, height: 844, mobile: true }
  ]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile });
    const u = new URL(url);
    u.searchParams.set('production-proof', `${Date.now()}-${viewport.name}`);
    await cdp.send('Page.navigate', { url: u.href });
    await sleep(5000);

    const expression = `(() => {
      const body = document.body?.innerText || '';
      const title = document.title || '';
      const imgs = [...document.images].map(img => {
        const r = img.getBoundingClientRect();
        const s = getComputedStyle(img);
        const visible = s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0 && r.width > 1 && r.height > 1;
        return { src: img.currentSrc || img.src || '', visible, complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, width: Math.round(r.width), height: Math.round(r.height), filter: s.filter || 'none' };
      });
      const bgs = [...document.querySelectorAll('*')].filter(el => {
        const s = getComputedStyle(el); const r = el.getBoundingClientRect();
        return s.backgroundImage && s.backgroundImage !== 'none' && s.display !== 'none' && s.visibility !== 'hidden' && r.width > 1 && r.height > 1;
      }).map(el => ({ backgroundImage: getComputedStyle(el).backgroundImage.slice(0,240), filter: getComputedStyle(el).filter || 'none' }));
      return { title, body, html: document.documentElement.outerHTML.slice(0,200000), imgs, bgs, url: location.href };
    })()`;
    const evalResult = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
    const page = evalResult.result?.value || {};
    const visible = (page.imgs || []).filter(i => i.visible);
    const broken = visible.filter(i => !i.complete || !i.naturalWidth || !i.naturalHeight);
    const blurred = visible.filter(i => i.filter && i.filter !== 'none');
    const backgroundBlurred = (page.bgs || []).filter(i => i.filter && i.filter !== 'none');
    const lower = `${page.title}\n${page.body}`.toLowerCase();
    const reasons = [];
    for (const bad of ['loading the worldz experience', 'default page', 'parked domain', 'this site can\'t be reached']) {
      if (lower.includes(bad)) reasons.push(`placeholder/error content: ${bad}`);
    }
    if (expectedText && !`${page.title}\n${page.body}`.toLowerCase().includes(expectedText.toLowerCase())) reasons.push(`missing expected text: ${expectedText}`);
    if (expectedArt && !String(page.html || '').includes(expectedArt)) reasons.push(`missing expected art marker/path: ${expectedArt}`);
    if (broken.length) reasons.push(`${broken.length} visible image(s) broken`);
    if (blurred.length) reasons.push(`${blurred.length} visible image(s) have CSS filter`);
    if (backgroundBlurred.length) reasons.push(`${backgroundBlurred.length} background(s) have CSS filter`);
    if (visible.length === 0 && (page.bgs || []).length === 0) reasons.push('no visible image or background artwork rendered');

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(outDir, `${new URL(url).hostname}-${viewport.name}.png`), Buffer.from(shot.data, 'base64'));
    reports.push({ viewport: viewport.name, url: page.url, title: page.title, visibleImages: visible.length, backgrounds: (page.bgs || []).length, brokenImages: broken.length, filteredImages: blurred.length, reasons });
    if (reasons.length) failed = true;
  }
} finally {
  cdp?.close();
  chrome.kill('SIGTERM');
}

writeFileSync(join(outDir, 'report.json'), JSON.stringify({ url, expectedText, expectedArt, failed, reports }, null, 2));
for (const r of reports) console.log(`${r.reasons.length ? 'FAIL' : 'PASS'} ${r.viewport} ${url} images=${r.visibleImages} backgrounds=${r.backgrounds} reasons=${r.reasons.join('; ') || '-'}`);
if (failed) process.exit(1);
console.log('WORLDZ REAL-BROWSER PROOF PASSED.');

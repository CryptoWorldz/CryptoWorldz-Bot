import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const URLS = [
  'https://oneworldz.com/',
  'https://oneworldz.com/reagan-kauja/',
  'https://cryptoworldz.xyz/',
  'https://solworldz.xyz/',
  'https://ethworldz.xyz/',
  'https://baseworldz.xyz/',
  'https://bnbworldz.xyz/',
  'https://xrpworldz.xyz/',
  'https://suiworldz.xyz/',
  'https://hyperworldz.xyz/',
  'https://robinworldz.xyz/',
  'https://bitcoinworldz.xyz/',
  'https://hodlerworldz.xyz/',
  'https://purplediamondcrew.com/'
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1200, deviceScaleFactor: 1 },
  { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 1 }
];

const outDir = 'browser-audit';
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

function findChrome() {
  const candidates = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
  for (const cmd of candidates) {
    try {
      return execFileSync('which', [cmd], { encoding: 'utf8' }).trim();
    } catch {}
  }
  throw new Error('No Chrome/Chromium executable found on runner');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForJson(url, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
        return;
      }
      const list = this.handlers.get(msg.method) || [];
      for (const fn of list) fn(msg.params || {});
    });
  }
  on(method, fn) {
    const list = this.handlers.get(method) || [];
    list.push(fn);
    this.handlers.set(method, list);
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

function safeName(url) {
  return url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

const pageExpression = `
(async () => {
  const rect = el => {
    const r = el.getBoundingClientRect();
    return { width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) };
  };
  const visible = el => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0 && r.width > 1 && r.height > 1;
  };
  const imageRows = Array.from(document.images).map((img, index) => {
    const r = rect(img);
    const src = img.currentSrc || img.src || '';
    const undersized = visible(img) && img.naturalWidth > 0 && r.width > 0 && (img.naturalWidth + 1 < r.width * 0.9 || img.naturalHeight + 1 < r.height * 0.9);
    return {
      index,
      alt: img.alt || '',
      src: src.startsWith('data:') ? src.slice(0, 80) + '…' : src,
      sourceType: src.startsWith('data:') ? 'data-uri' : 'url',
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      renderedWidth: r.width,
      renderedHeight: r.height,
      visible: visible(img),
      broken: !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0,
      undersized
    };
  });

  const bgItems = [];
  const seen = new Set();
  for (const el of Array.from(document.querySelectorAll('*'))) {
    if (!visible(el)) continue;
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none') continue;
    const urls = [...bg.matchAll(/url\\(["']?(.*?)["']?\\)/g)].map(m => m[1]).filter(Boolean);
    for (const raw of urls) {
      const src = raw.startsWith('data:') ? raw : new URL(raw, location.href).href;
      const key = src + '|' + el.tagName + '|' + el.className;
      if (seen.has(key)) continue;
      seen.add(key);
      const r = rect(el);
      const loaded = await new Promise(resolve => {
        const i = new Image();
        const done = ok => resolve({ ok, naturalWidth: i.naturalWidth || 0, naturalHeight: i.naturalHeight || 0 });
        i.onload = () => done(true);
        i.onerror = () => done(false);
        i.src = src;
        setTimeout(() => done(false), 7000);
      });
      const source = src.startsWith('data:') ? src.slice(0, 80) + '…' : src;
      const undersized = loaded.ok && loaded.naturalWidth > 0 && r.width > 0 && (loaded.naturalWidth + 1 < r.width * 0.9 || loaded.naturalHeight + 1 < r.height * 0.9);
      bgItems.push({
        tag: el.tagName,
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className : '',
        src: source,
        sourceType: src.startsWith('data:') ? 'data-uri' : 'url',
        naturalWidth: loaded.naturalWidth,
        naturalHeight: loaded.naturalHeight,
        renderedWidth: r.width,
        renderedHeight: r.height,
        broken: !loaded.ok,
        undersized
      });
      if (bgItems.length >= 80) break;
    }
    if (bgItems.length >= 80) break;
  }

  return {
    title: document.title,
    url: location.href,
    readyState: document.readyState,
    bodyPreview: (document.body?.innerText || '').slice(0, 500),
    images: imageRows,
    backgrounds: bgItems
  };
})()`;

const chromePath = findChrome();
console.log(`Using browser: ${chromePath}`);
const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--remote-debugging-port=9222',
  '--user-data-dir=/tmp/worldz-browser-audit',
  '--hide-scrollbars',
  '--ignore-certificate-errors',
  'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

let stderr = '';
chrome.stderr.on('data', d => { stderr += d.toString(); });

const results = [];
let cdp;
try {
  const targets = await waitForJson('http://127.0.0.1:9222/json/list');
  const target = targets.find(t => t.type === 'page') || targets[0];
  if (!target?.webSocketDebuggerUrl) throw new Error('No browser page target found');
  cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  let activeFailures = [];
  let activeResponses = [];
  cdp.on('Network.loadingFailed', p => activeFailures.push({ requestId: p.requestId, errorText: p.errorText, canceled: p.canceled, blockedReason: p.blockedReason || '' }));
  cdp.on('Network.responseReceived', p => {
    const r = p.response || {};
    activeResponses.push({ url: r.url, status: r.status, mimeType: r.mimeType, type: p.type, fromDiskCache: r.fromDiskCache || false, fromServiceWorker: r.fromServiceWorker || false });
  });

  for (const url of URLS) {
    for (const vp of VIEWPORTS) {
      activeFailures = [];
      activeResponses = [];
      const item = { url, viewport: vp.name, width: vp.width, height: vp.height };
      const stem = `${safeName(url)}-${vp.name}`;
      console.log(`AUDIT ${url} ${vp.name}`);
      try {
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: vp.deviceScaleFactor,
          mobile: vp.name === 'mobile'
        });
        await cdp.send('Page.navigate', { url });
        const started = Date.now();
        while (Date.now() - started < 18000) {
          const state = await cdp.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
          if (state.result?.value === 'complete') break;
          await sleep(250);
        }
        await sleep(2500);
        const evaluated = await cdp.send('Runtime.evaluate', {
          expression: pageExpression,
          awaitPromise: true,
          returnByValue: true,
          timeout: 20000
        });
        item.page = evaluated.result?.value || null;
        item.networkFailures = activeFailures;
        item.responses = activeResponses.filter(r => r.type === 'Document' || r.type === 'Image');
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        writeFileSync(join(outDir, `${stem}.png`), Buffer.from(shot.data, 'base64'));

        const brokenImgs = (item.page?.images || []).filter(i => i.visible && i.broken);
        const undersizedImgs = (item.page?.images || []).filter(i => i.visible && i.undersized);
        const brokenBg = (item.page?.backgrounds || []).filter(i => i.broken);
        const undersizedBg = (item.page?.backgrounds || []).filter(i => i.undersized);
        const badHttpImages = item.responses.filter(r => r.type === 'Image' && Number(r.status) >= 400);
        item.summary = {
          visibleImages: (item.page?.images || []).filter(i => i.visible).length,
          backgroundImages: (item.page?.backgrounds || []).length,
          brokenImages: brokenImgs.length,
          undersizedImages: undersizedImgs.length,
          brokenBackgrounds: brokenBg.length,
          undersizedBackgrounds: undersizedBg.length,
          badHttpImages: badHttpImages.length,
          networkFailures: activeFailures.length,
          pass: brokenImgs.length === 0 && undersizedImgs.length === 0 && brokenBg.length === 0 && undersizedBg.length === 0 && badHttpImages.length === 0
        };
      } catch (error) {
        item.error = String(error?.stack || error);
        item.summary = { pass: false };
      }
      results.push(item);
      writeFileSync(join(outDir, `${stem}.json`), JSON.stringify(item, null, 2));
    }
  }
} finally {
  try { cdp?.close(); } catch {}
  chrome.kill('SIGKILL');
}

const totals = {
  audited: results.length,
  passed: results.filter(r => r.summary?.pass).length,
  failed: results.filter(r => !r.summary?.pass).length,
  generatedAt: new Date().toISOString()
};
writeFileSync(join(outDir, 'report.json'), JSON.stringify({ totals, results }, null, 2));
writeFileSync(join(outDir, 'chrome-stderr.txt'), stderr);
console.log(JSON.stringify(totals, null, 2));

if (totals.failed > 0) process.exitCode = 1;

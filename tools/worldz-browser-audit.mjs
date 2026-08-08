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
  'https://cryptoworldz.xyz/?world=bitcoinworldz&mode=coming-soon',
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

async function waitForDocumentReady(cdp, timeoutMs = 18000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await cdp.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
    if (state.result?.value === 'complete') return;
    await sleep(250);
  }
}

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
      if (raw.startsWith('#')) continue;
      const src = raw.startsWith('data:') ? raw : new URL(raw, location.href).href;
      const key = src + '|' + el.tagName + '|' + el.className;
      if (seen.has(key)) continue;
      seen.add(key);
      const r = rect(el);
      const loaded = src.startsWith('data:')
        ? { ok: true, naturalWidth: 0, naturalHeight: 0 }
        : await new Promise(resolve => {
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
    bodyPreview: (document.body?.innerText || '').slice(0, 2000),
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
  '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 CryptoWorldzAudit/1.0',
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
  let activeRequests = new Map();
  cdp.on('Network.requestWillBeSent', p => {
    activeRequests.set(p.requestId, { url: p.request?.url || '', type: p.type || '' });
  });
  cdp.on('Network.loadingFailed', p => {
    const request = activeRequests.get(p.requestId) || {};
    activeFailures.push({
      requestId: p.requestId,
      url: request.url || '',
      type: p.type || request.type || '',
      errorText: p.errorText,
      canceled: p.canceled,
      blockedReason: p.blockedReason || ''
    });
  });
  cdp.on('Network.responseReceived', p => {
    const r = p.response || {};
    activeResponses.push({ url: r.url, status: r.status, mimeType: r.mimeType, type: p.type, fromDiskCache: r.fromDiskCache || false, fromServiceWorker: r.fromServiceWorker || false });
  });

  for (const url of URLS) {
    for (const vp of VIEWPORTS) {
      activeFailures = [];
      activeResponses = [];
      activeRequests = new Map();
      const item = { url, viewport: vp.name, width: vp.width, height: vp.height };
      const stem = `${safeName(url)}-${vp.name}`;
      const auditUrl = new URL(url);
      auditUrl.searchParams.set('worldz-audit', `${Date.now()}-${vp.name}`);
      console.log(`AUDIT ${url} ${vp.name}`);
      try {
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: vp.deviceScaleFactor,
          mobile: vp.name === 'mobile'
        });
        await cdp.send('Page.navigate', { url: auditUrl.href });
        await waitForDocumentReady(cdp);
        await sleep(2500);

        const challenge = await cdp.send('Runtime.evaluate', {
          expression: `(document.body?.innerText || '').toLowerCase().includes('checking your browser before accessing')`,
          returnByValue: true
        });
        if (challenge.result?.value) {
          await sleep(6500);
          await cdp.send('Page.reload', { ignoreCache: true });
          await waitForDocumentReady(cdp);
          await sleep(2000);
        }

        await cdp.send('Runtime.evaluate', {
          expression: `(async () => {
            const step = Math.max(320, Math.floor(innerHeight * 0.8));
            const max = Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0);
            for (let y = 0; y < max; y += step) {
              scrollTo(0, y);
              await new Promise(resolve => setTimeout(resolve, 90));
            }
            scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 700));
            return true;
          })()`,
          awaitPromise: true,
          returnByValue: true,
          timeout: 20000
        });
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
        const documentResponses = item.responses.filter(r => r.type === 'Document');
        const mainDocument = documentResponses.at(-1);
        const documentFailures = activeFailures.filter(f => f.type === 'Document');
        const bodyText = String(item.page?.bodyPreview || '').trim();
        const normalizedBody = bodyText.toLowerCase();
        const normalizedTitle = String(item.page?.title || '').trim().toLowerCase();
        const renderedUrl = String(item.page?.url || '');
        const blockedPatterns = [
          'checking your browser before accessing',
          'loading the worldz experience',
          'this site can\'t be reached',
          'err_name_not_resolved',
          'default page'
        ];
        const blockedPattern = blockedPatterns.find(pattern => normalizedBody.includes(pattern));
        const failureReasons = [];
        if (!mainDocument) failureReasons.push('No main document response was recorded');
        if (mainDocument && Number(mainDocument.status) >= 400) failureReasons.push(`Main document returned HTTP ${mainDocument.status}`);
        if (documentFailures.length) failureReasons.push(`Main document network failure: ${documentFailures[0].errorText || 'unknown error'}`);
        if (!renderedUrl || renderedUrl.startsWith('chrome-error://')) failureReasons.push('Browser rendered an internal error page');
        if (!bodyText) failureReasons.push('Rendered page body is empty');
        if (blockedPattern) failureReasons.push(`Blocked or placeholder content detected: ${blockedPattern}`);
        if (!normalizedTitle || normalizedTitle === 'default page') failureReasons.push('Page title is missing or a hosting placeholder');
        if (brokenImgs.length) failureReasons.push(`${brokenImgs.length} visible image(s) are broken`);
        if (brokenBg.length) failureReasons.push(`${brokenBg.length} background image(s) are broken`);
        if (badHttpImages.length) failureReasons.push(`${badHttpImages.length} image request(s) returned HTTP errors`);
        item.summary = {
          mainDocumentStatus: mainDocument?.status ?? null,
          visibleImages: (item.page?.images || []).filter(i => i.visible).length,
          backgroundImages: (item.page?.backgrounds || []).length,
          brokenImages: brokenImgs.length,
          undersizedImages: undersizedImgs.length,
          brokenBackgrounds: brokenBg.length,
          undersizedBackgrounds: undersizedBg.length,
          badHttpImages: badHttpImages.length,
          networkFailures: activeFailures.length,
          documentFailures: documentFailures.length,
          failureReasons,
          pass: failureReasons.length === 0
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

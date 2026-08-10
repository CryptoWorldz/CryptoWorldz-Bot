import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const url = process.argv[2];
const expectedText = process.argv[3] || '';
const expectedArt = process.argv[4] || '';
if (!url) throw new Error('usage: node tools/prove-live-worldz-v2.mjs <url> [expectedText] [expectedArt]');

const outDir = process.env.WORLDZ_PROOF_DIR || 'worldz-proof';
mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

function chromePath() {
  for (const cmd of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [cmd], { encoding: 'utf8' }).trim(); } catch {}
  }
  throw new Error('Chrome/Chromium is required for production proof');
}

async function waitDevtoolsPort(dir, timeout = 15000) {
  const file = join(dir, 'DevToolsActivePort');
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try {
      if (existsSync(file)) {
        const [port] = readFileSync(file, 'utf8').trim().split(/\r?\n/);
        if (/^\d+$/.test(port)) return Number(port);
      }
    } catch {}
    await sleep(150);
  }
  throw new Error('Timed out waiting for Chrome DevToolsActivePort');
}

async function waitJson(endpoint, timeout = 12000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { const r = await fetch(endpoint); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${endpoint}`);
}

class CDP {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 1; this.pending = new Map(); }
  async open() {
    await Promise.race([
      new Promise((resolve, reject) => {
        this.ws.addEventListener('open', resolve, { once: true });
        this.ws.addEventListener('error', reject, { once: true });
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('CDP websocket open timeout')), 12000))
    ]);
    this.ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (!msg.id) return;
      const pending = this.pending.get(msg.id);
      if (!pending) return;
      this.pending.delete(msg.id);
      clearTimeout(pending.timer);
      msg.error ? pending.reject(new Error(msg.error.message)) : pending.resolve(msg.result);
    });
  }
  send(method, params = {}, timeout = 15000) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out after ${timeout}ms`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    for (const pending of this.pending.values()) clearTimeout(pending.timer);
    this.pending.clear();
    try { this.ws.close(); } catch {}
  }
}

async function launch(viewport) {
  const u = new URL(url);
  u.searchParams.set('production-proof', `${Date.now()}-${viewport.name}`);
  const dir = `/tmp/worldz-production-proof-${process.pid}-${viewport.name}-${Date.now()}`;
  rmSync(dir, { recursive: true, force: true });
  const chrome = spawn(chromePath(), [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--hide-scrollbars',
    `--window-size=${viewport.width},${viewport.height}`,
    u.href
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  chrome.stderr.on('data', d => { stderr += d.toString(); });
  const port = await waitDevtoolsPort(dir);
  const end = Date.now() + 12000;
  let target;
  while (Date.now() < end) {
    const targets = await waitJson(`http://127.0.0.1:${port}/json/list`, 3000);
    target = targets.find(t => t.type === 'page' && t.url !== 'about:blank') || targets.find(t => t.type === 'page') || targets[0];
    if (target?.webSocketDebuggerUrl) break;
    await sleep(200);
  }
  if (!target?.webSocketDebuggerUrl) throw new Error(`No Chrome page target. ${stderr.slice(-1000)}`);
  return { chrome, dir, target };
}

async function evaluate(cdp, expression, awaitPromise = false, timeout = 15000) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }, timeout);
  return result.result?.value;
}

const inspectExpression = `(() => {
  const body = document.body?.innerText || '';
  const title = document.title || '';
  const visible = el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0 && r.width > 1 && r.height > 1;
  };
  const imgs = [...document.images].map(img => {
    const r = img.getBoundingClientRect();
    const s = getComputedStyle(img);
    return {
      src: img.currentSrc || img.src || '',
      visible: visible(img),
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      width: Math.round(r.width),
      height: Math.round(r.height),
      filter: s.filter || 'none'
    };
  });
  const bgs = [...document.querySelectorAll('*')].filter(el => {
    const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.backgroundImage && s.backgroundImage !== 'none' && s.display !== 'none' && s.visibility !== 'hidden' && r.width > 1 && r.height > 1;
  }).map(el => ({ backgroundImage: getComputedStyle(el).backgroundImage.slice(0,240), filter: getComputedStyle(el).filter || 'none' }));
  return {
    ready: document.readyState,
    title,
    body,
    html: document.documentElement.outerHTML.slice(0,200000),
    imgs,
    bgs,
    url: location.href
  };
})()`;

function normalizedPageText(page) {
  return `${page?.title || ''}\n${page?.body || ''}`.toLowerCase();
}

function isChallengePage(page) {
  const text = normalizedPageText(page);
  return text.includes('checking your browser before accessing')
    || text.includes('please wait for up to 5 seconds')
    || (text.includes('just a moment') && text.includes('checking your browser'));
}

function isLoadingFallback(page) {
  const text = normalizedPageText(page);
  return text.includes('loading the worldz experience') || text.includes('loading oneworldz');
}

async function waitForRealPageAndImages(cdp, maxMs = 38000) {
  const end = Date.now() + maxMs;
  let page = {};
  let challengeSeen = false;
  let loadingSeen = false;
  while (Date.now() < end) {
    try { page = await evaluate(cdp, inspectExpression, false, 5000) || {}; } catch {}
    if (isChallengePage(page)) {
      challengeSeen = true;
      await sleep(700);
      continue;
    }
    if (isLoadingFallback(page)) {
      loadingSeen = true;
      await sleep(700);
      continue;
    }
    const visibleImages = (page.imgs || []).filter(i => i.visible);
    const imagesSettled = visibleImages.length === 0 || visibleImages.every(i => i.complete && i.naturalWidth > 0 && i.naturalHeight > 0);
    if (page.ready === 'complete' && String(page.body || '').trim() && imagesSettled) {
      return { page, challengeSeen, loadingSeen };
    }
    await sleep(500);
  }
  return { page, challengeSeen, loadingSeen };
}

async function proveViewport(viewport) {
  let browser;
  let cdp;
  let page = {};
  let reloaded = false;
  let challengeSeen = false;
  let loadingSeen = false;
  try {
    browser = await launch(viewport);
    cdp = new CDP(browser.target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.mobile
    });

    let waited = await waitForRealPageAndImages(cdp, 38000);
    page = waited.page;
    challengeSeen = waited.challengeSeen;
    loadingSeen = waited.loadingSeen;

    let visible = (page.imgs || []).filter(i => i.visible);
    let broken = visible.filter(i => !i.complete || !i.naturalWidth || !i.naturalHeight);
    if (!isChallengePage(page) && !isLoadingFallback(page) && broken.length) {
      reloaded = true;
      await cdp.send('Page.reload', { ignoreCache: true }, 15000);
      waited = await waitForRealPageAndImages(cdp, 26000);
      page = waited.page;
      challengeSeen = challengeSeen || waited.challengeSeen;
      loadingSeen = loadingSeen || waited.loadingSeen;
      visible = (page.imgs || []).filter(i => i.visible);
      broken = visible.filter(i => !i.complete || !i.naturalWidth || !i.naturalHeight);
    }

    const blurred = visible.filter(i => i.filter && i.filter !== 'none');
    const backgroundBlurred = (page.bgs || []).filter(i => i.filter && i.filter !== 'none');
    const lower = normalizedPageText(page);
    const reasons = [];
    if (isChallengePage(page)) reasons.push('browser verification challenge did not clear');
    if (isLoadingFallback(page)) reasons.push('loading fallback did not clear');
    for (const bad of ['default page', 'parked domain', 'this site can\'t be reached', 'err_name_not_resolved']) {
      if (lower.includes(bad)) reasons.push(`placeholder/error content: ${bad}`);
    }
    if (!String(page.body || '').trim()) reasons.push('empty page body');
    if (expectedText && !`${page.title || ''}\n${page.body || ''}`.toLowerCase().includes(expectedText.toLowerCase())) reasons.push(`missing expected text: ${expectedText}`);
    if (expectedArt && !String(page.html || '').includes(expectedArt)) reasons.push(`missing expected art marker/path: ${expectedArt}`);
    if (broken.length) reasons.push(`${broken.length} visible image(s) broken after isolated wait/reload`);
    if (blurred.length) reasons.push(`${blurred.length} visible image(s) have CSS filter`);
    if (backgroundBlurred.length) reasons.push(`${backgroundBlurred.length} background(s) have CSS filter`);
    if (visible.length === 0 && (page.bgs || []).length === 0) reasons.push('no visible image or background artwork rendered');

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, 20000);
    writeFileSync(join(outDir, `${new URL(url).hostname}-${viewport.name}.png`), Buffer.from(shot.data, 'base64'));
    return {
      viewport: viewport.name,
      url: page.url,
      title: page.title,
      visibleImages: visible.length,
      backgrounds: (page.bgs || []).length,
      brokenImages: broken.length,
      filteredImages: blurred.length,
      reloaded,
      challengeSeen,
      challengePresent: isChallengePage(page),
      loadingSeen,
      loadingPresent: isLoadingFallback(page),
      reasons
    };
  } finally {
    cdp?.close();
    try { browser?.chrome?.kill('SIGTERM'); } catch {}
    await sleep(300);
    if (browser?.dir) {
      try { rmSync(browser.dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); } catch {}
    }
  }
}

const reports = [];
let fatalError = '';
for (const viewport of [
  { name: 'desktop', width: 1440, height: 1100, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true }
]) {
  try {
    const report = await proveViewport(viewport);
    reports.push(report);
    console.log(`${report.reasons.length ? 'FAIL' : 'PASS'} ${viewport.name} ${url} images=${report.visibleImages} backgrounds=${report.backgrounds} challengeSeen=${report.challengeSeen} reloaded=${report.reloaded} reasons=${report.reasons.join('; ') || '-'}`);
  } catch (error) {
    fatalError += `${viewport.name}: ${error?.stack || error}\n`;
    reports.push({ viewport: viewport.name, url, title: '', visibleImages: 0, backgrounds: 0, brokenImages: 0, filteredImages: 0, reloaded: false, challengeSeen: false, challengePresent: false, loadingSeen: false, loadingPresent: false, reasons: [`browser proof infrastructure failure: ${error?.message || error}`] });
  }
}

const failed = reports.length !== 2 || reports.some(r => r.reasons.length) || Boolean(fatalError);
writeFileSync(join(outDir, 'report.json'), JSON.stringify({ gate: 'production-v2-isolated-challenge-aware', url, expectedText, expectedArt, failed, fatalError, reports }, null, 2));
if (failed) process.exit(1);
console.log('WORLDZ REAL-BROWSER PROOF V2 PASSED.');

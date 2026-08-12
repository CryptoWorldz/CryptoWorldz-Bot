import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const baseUrl = process.env.SOLWORLDZ_PROOF_URL || 'https://solworldz.xyz/';
const outputDir = process.env.SOLWORLDZ_BROWSER_PROOF_DIR || path.resolve('dist', 'solworldz-browser-proof');
fs.mkdirSync(outputDir, { recursive: true });

function findChrome() {
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      const resolved = execFileSync('which', [name], { encoding: 'utf8' }).trim();
      if (resolved) return resolved;
    } catch {}
  }
  throw new Error('Chrome/Chromium is unavailable on this runner');
}

const chrome = findChrome();
const profiles = [];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForTabs(port) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const tabs = await response.json();
        const tab = tabs.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
        if (tab) return tab;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw lastError || new Error(`Chrome debugging port ${port} did not become ready`);
}

async function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    }
  };
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  return { socket, send };
}

async function checkViewport(name, width, height, port) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `solworldz-${name}-`));
  profiles.push(profile);
  const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}browserproof=${Date.now()}-${name}`;
  const child = spawn(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    url
  ], { stdio: 'ignore' });

  try {
    const tab = await waitForTabs(port);
    const { socket, send } = await connect(tab.webSocketDebuggerUrl);
    await send('Runtime.enable');
    await send('Page.enable');
    await delay(2500);

    const expression = `(() => {
      const rect = selector => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {left:r.left,right:r.right,width:r.width,height:r.height};
      };
      const image = selector => {
        const el = document.querySelector(selector);
        return el ? {complete:el.complete,naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,src:el.currentSrc || el.src} : null;
      };
      const text = document.body.innerText;
      return {
        innerWidth,
        innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        title: document.title,
        header: rect('.top'),
        hero: rect('.hero'),
        network: rect('.network'),
        heroImage: image('.hero img'),
        atlasImage: image('.atlas'),
        networkLinks: document.querySelectorAll('.network a[href]').length,
        pendingWorlds: document.querySelectorAll('.network .pending-world').length,
        hasSolWorldz: text.includes('SolWorldz'),
        hasImpactBased: text.includes('ImpactBased'),
        hasCommandCentre: text.includes('Command Centre'),
        hasComingSoon: text.includes('COMING SOON'),
        hasRetiredDomain: document.documentElement.innerHTML.toLowerCase().includes('solworld.fun')
      };
    })()`;
    const evaluation = await send('Runtime.evaluate', { expression, returnByValue: true });
    const metrics = evaluation.result.value;
    fs.writeFileSync(path.join(outputDir, `${name}-metrics.json`), JSON.stringify(metrics, null, 2) + '\n');

    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, `${name}.png`), Buffer.from(shot.data, 'base64'));

    const failures = [];
    if (metrics.scrollWidth > metrics.innerWidth + 2) failures.push(`horizontal overflow ${metrics.scrollWidth}px > ${metrics.innerWidth}px`);
    if (!metrics.header || metrics.header.width > metrics.innerWidth + 2) failures.push('header exceeds viewport');
    if (!metrics.hero || metrics.hero.width > metrics.innerWidth + 2) failures.push('hero exceeds viewport');
    if (!metrics.network || metrics.network.width > metrics.innerWidth + 2) failures.push('Worldz network exceeds viewport');
    if (!metrics.heroImage?.complete || metrics.heroImage.naturalWidth < 500) failures.push('hero image is missing or low-resolution');
    if (!metrics.atlasImage?.complete || metrics.atlasImage.naturalWidth < 500) failures.push('Worldz directory image is missing or low-resolution');
    if (metrics.networkLinks < 10) failures.push(`only ${metrics.networkLinks} live Worldz links rendered`);
    if (metrics.pendingWorlds !== 3) failures.push(`expected 3 pending Worldz tiles, found ${metrics.pendingWorlds}`);
    if (!metrics.hasSolWorldz || !metrics.hasImpactBased || !metrics.hasCommandCentre || !metrics.hasComingSoon) failures.push('required SolWorldz content is missing');
    if (metrics.hasRetiredDomain) failures.push('retired SolWorld.fun reference is present in rendered DOM');

    console.log(`${name.toUpperCase()} ${width}x${height}:`, JSON.stringify(metrics));
    socket.close();
    if (failures.length) throw new Error(`${name} browser proof failed: ${failures.join('; ')}`);
  } finally {
    child.kill('SIGTERM');
    await delay(250);
  }
}

try {
  await checkViewport('desktop', 1440, 900, 9222);
  await checkViewport('mobile', 390, 844, 9223);
  console.log('SolWorldz browser proof passed for desktop and mobile.');
} finally {
  for (const profile of profiles) fs.rmSync(profile, { recursive: true, force: true });
}

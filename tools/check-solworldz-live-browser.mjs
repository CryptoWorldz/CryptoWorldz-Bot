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
    } catch (error) { lastError = error; }
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
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
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
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-allow-origins=*',
    `--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,`--window-size=${width},${height}`,url
  ], { stdio: 'ignore' });

  try {
    const tab = await waitForTabs(port);
    const { socket, send } = await connect(tab.webSocketDebuggerUrl);
    await send('Runtime.enable');
    await send('Page.enable');
    await delay(1800);

    const expression = `(() => {
      const rect = selector => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {left:r.left,right:r.right,width:r.width,height:r.height};
      };
      const info = el => ({complete:el.complete,naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,src:el.currentSrc || el.src});
      const allImages = [...document.querySelectorAll('img')].map(info);
      const pipelineImages = [...document.querySelectorAll('#pipeline .card img')].map(info);
      const impactImages = [...document.querySelectorAll('#impact img')].map(info);
      const networkImages = [...document.querySelectorAll('#network .world-card img')].map(info);
      const hero = document.querySelector('.hero-art');
      const text = document.body.innerText;
      return {
        innerWidth, innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        title: document.title,
        header: rect('.top'), hero: rect('.hero'), network: rect('.network'),
        heroImage: hero ? info(hero) : null,
        allImages, pipelineImages, impactImages, networkImages,
        networkLinks: document.querySelectorAll('#network a.world-card[href]').length,
        pendingWorlds: document.querySelectorAll('#network .world-card.pending').length,
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
    for (const [label, box] of [['header',metrics.header],['hero',metrics.hero],['Worldz network',metrics.network]]) {
      if (!box || box.width > metrics.innerWidth + 2 || box.left < -2 || box.right > metrics.innerWidth + 2) failures.push(`${label} exceeds viewport`);
    }
    if (!metrics.heroImage?.complete || metrics.heroImage.naturalWidth < 1500 || metrics.heroImage.naturalHeight < 500) failures.push('approved SolWorldz hero is missing or below 1500x500');
    if (metrics.pipelineImages.length !== 7) failures.push(`expected 7 pipeline images, found ${metrics.pipelineImages.length}`);
    if (metrics.impactImages.length !== 2) failures.push(`expected 2 impact images, found ${metrics.impactImages.length}`);
    if (metrics.networkImages.length !== 13) failures.push(`expected 13 Worldz network images, found ${metrics.networkImages.length}`);
    if (metrics.allImages.some(img => !img.complete || img.naturalWidth < 1 || img.naturalHeight < 1)) failures.push('one or more approved images failed to decode');
    if (metrics.pipelineImages.some(img => img.naturalWidth < 1200 || img.naturalHeight < 500)) failures.push('one or more pipeline images are below approved resolution');
    if (metrics.impactImages.some(img => img.naturalWidth < 1200 || img.naturalHeight < 800)) failures.push('one or more impact images are below approved resolution');
    if (metrics.networkImages.some(img => img.naturalWidth < 1200 || img.naturalHeight < 450)) failures.push('one or more Worldz images are below approved resolution');
    if (metrics.networkLinks < 11) failures.push(`only ${metrics.networkLinks} live Worldz links rendered`);
    if (metrics.pendingWorlds !== 3) failures.push(`expected 3 pending Worldz tiles, found ${metrics.pendingWorlds}`);
    if (!metrics.hasSolWorldz || !metrics.hasImpactBased || !metrics.hasCommandCentre || !metrics.hasComingSoon) failures.push('required SolWorldz content is missing');
    if (metrics.hasRetiredDomain) failures.push('retired SolWorld.fun reference is present in rendered DOM');

    console.log(`${name.toUpperCase()} ${width}x${height}: ${metrics.allImages.length} approved images decoded, ${metrics.networkLinks} live Worldz links, ${metrics.pendingWorlds} pending Worldz.`);
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
  console.log('SolWorldz approved-master browser proof passed for desktop and mobile.');
} finally {
  for (const profile of profiles) fs.rmSync(profile, { recursive: true, force: true });
}

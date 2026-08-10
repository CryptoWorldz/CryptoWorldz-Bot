import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { extractExternalCssImageUrls } from './worldz-css-url-parser.mjs';

const TARGET_URL = process.env.TARGET_URL;
const TARGET_NAME = process.env.TARGET_NAME || 'worldz';
if (!TARGET_URL) throw new Error('TARGET_URL is required');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1200 },
  { name: 'mobile', width: 390, height: 844 }
];
const outDir = 'browser-audit';
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const safe = s => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
const withTimeout = (promise, ms, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
]);

function chromePath() {
  for (const cmd of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [cmd], { encoding: 'utf8' }).trim(); } catch {}
  }
  throw new Error('No Chrome/Chromium found');
}

async function waitDevtoolsPort(userDataDir, ms = 15000) {
  const file = join(userDataDir, 'DevToolsActivePort');
  const end = Date.now() + ms;
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

async function waitJson(url, ms = 12000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CDP {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 1; this.pending = new Map(); this.handlers = new Map(); }
  async open() {
    await withTimeout(new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    }), 12000, 'CDP websocket open');
    this.ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.id) {
        const p = this.pending.get(m.id); if (!p) return; this.pending.delete(m.id);
        clearTimeout(p.timer);
        return m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
      }
      for (const fn of this.handlers.get(m.method) || []) fn(m.params || {});
    });
  }
  on(name, fn) { const a = this.handlers.get(name) || []; a.push(fn); this.handlers.set(name, a); }
  send(method, params = {}, timeoutMs = 20000) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this.ws.send(JSON.stringify({ id, method, params })); }
      catch (e) { clearTimeout(timer); this.pending.delete(id); reject(e); }
    });
  }
  close() {
    for (const p of this.pending.values()) clearTimeout(p.timer);
    this.pending.clear();
    try { this.ws.close(); } catch {}
  }
}

async function waitReady(cdp, ms = 12000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const r = await cdp.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, 5000);
    if (r.result?.value === 'complete') return true;
    await sleep(200);
  }
  return false;
}

async function getText(cdp) {
  const r = await cdp.send('Runtime.evaluate', { expression: `({title:document.title||'',body:(document.body?.innerText||'').slice(0,1600)})`, returnByValue: true }, 5000);
  return r.result?.value || { title:'', body:'' };
}

const challengeText = text => {
  const s = `${text.title}\n${text.body}`.toLowerCase();
  return s.includes('checking your browser before accessing') || s.includes('please wait for up to 5 seconds');
};
const loadingFallbackText = text => {
  const s = `${text.title}\n${text.body}`.toLowerCase();
  return s.includes('loading oneworldz') || s.includes('loading the worldz experience');
};

async function clearAndNavigate(cdp, url, responses, failures) {
  responses.length = 0; failures.length = 0;
  await cdp.send('Page.navigate', { url }, 20000);
  await waitReady(cdp, 12000);
  await sleep(1800);
  let text = await getText(cdp);
  for (let challengeAttempt = 1; challengeAttempt <= 2 && challengeText(text); challengeAttempt++) {
    console.log(`CHALLENGE ${TARGET_NAME}: verification wait ${challengeAttempt}/2`);
    await sleep(6500);
    await cdp.send('Page.reload', { ignoreCache: true }, 20000);
    await waitReady(cdp, 12000);
    await sleep(2200);
    text = await getText(cdp);
  }
  if (loadingFallbackText(text)) {
    const end = Date.now() + 12000;
    while (Date.now() < end && loadingFallbackText(text)) {
      await sleep(500);
      text = await getText(cdp);
    }
  }
  return text;
}

const cssUrlParserSource = extractExternalCssImageUrls.toString();
const pageExpr = `
(async () => {
  const extractExternalCssImageUrls = ${cssUrlParserSource};
  const visible = el => { const s=getComputedStyle(el), r=el.getBoundingClientRect(); return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&r.width>1&&r.height>1; };
  const images = Array.from(document.images).map(img => {
    const r=img.getBoundingClientRect();
    return {src:img.currentSrc||img.src||'',alt:img.alt||'',visible:visible(img),complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,renderedWidth:Math.round(r.width),renderedHeight:Math.round(r.height),broken:visible(img)&&(!img.complete||img.naturalWidth===0||img.naturalHeight===0)};
  });
  const bgUrls = [...new Set(Array.from(document.querySelectorAll('*')).filter(visible).flatMap(el => extractExternalCssImageUrls(getComputedStyle(el).backgroundImage||'', location.href)))];
  const backgrounds = await Promise.all(bgUrls.slice(0,40).map(src => new Promise(resolve => {
    const i=new Image(); let done=false;
    const finish=ok=>{ if(done)return; done=true; resolve({src,broken:!ok,naturalWidth:i.naturalWidth||0,naturalHeight:i.naturalHeight||0}); };
    i.onload=()=>finish(true); i.onerror=()=>finish(false); i.src=src; setTimeout(()=>finish(false),3000);
  })));
  const links = Array.from(document.querySelectorAll('a[href]')).filter(visible).slice(0,120).map(a => ({text:(a.innerText||a.getAttribute('aria-label')||'').trim().slice(0,120),href:a.href}));
  return {title:document.title,url:location.href,body:(document.body?.innerText||'').slice(0,3000),images,backgrounds,links};
})()`;

function launchChrome(attempt, label) {
  const userDataDir = `/tmp/worldz-browser-${process.pid}-${safe(label)}-${attempt}-${Date.now()}`;
  rmSync(userDataDir, { recursive: true, force: true });
  const proc = spawn(chromePath(), [
    '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,'--hide-scrollbars','about:blank'
  ], { stdio: ['ignore','ignore','pipe'] });
  let stderr=''; proc.stderr.on('data',d=>{stderr+=d.toString();});
  return { proc, userDataDir, stderr: () => stderr };
}

async function openBrowser(label) {
  const errors = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const launched = launchChrome(attempt, label);
    try {
      const port = await waitDevtoolsPort(launched.userDataDir, 15000);
      const targets = await waitJson(`http://127.0.0.1:${port}/json/list`, 12000);
      const target = targets.find(t=>t.type==='page') || targets[0];
      if (!target?.webSocketDebuggerUrl) throw new Error('Chrome returned no page debugging target');
      return { ...launched, port, target };
    } catch (e) {
      errors.push(`attempt ${attempt}: ${e?.message||e}\n${launched.stderr().slice(-1200)}`);
      try { launched.proc.kill('SIGTERM'); } catch {}
      await sleep(500);
    }
  }
  throw new Error(`Chrome startup failed twice: ${errors.join('\n---\n')}`);
}

const results=[];
const infraErrors=[];
const stderrParts=[];
for (const vp of VIEWPORTS) {
  const item={target:TARGET_NAME,url:TARGET_URL,viewport:vp.name,ok:false,reasons:[]};
  let browser;
  let cdp;
  const responses=[];
  const failures=[];
  try {
    browser = await openBrowser(vp.name);
    cdp=new CDP(browser.target.webSocketDebuggerUrl); await cdp.open();
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable');
    cdp.on('Network.responseReceived',p=>{const r=p.response||{};responses.push({url:r.url,status:r.status,type:p.type||'',mimeType:r.mimeType||''});});
    cdp.on('Network.loadingFailed',p=>failures.push({type:p.type||'',errorText:p.errorText||'',blockedReason:p.blockedReason||''}));

    await cdp.send('Emulation.setDeviceMetricsOverride',{width:vp.width,height:vp.height,deviceScaleFactor:1,mobile:vp.name==='mobile'});
    const u=new URL(TARGET_URL); u.searchParams.set('worldz-audit',`${Date.now()}-${vp.name}`);
    await clearAndNavigate(cdp, u.href, responses, failures);
    const evald=await cdp.send('Runtime.evaluate',{expression:pageExpr,awaitPromise:true,returnByValue:true},20000);
    item.page=evald.result?.value||{};
    const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},20000);
    writeFileSync(join(outDir,`${safe(TARGET_NAME)}-${vp.name}.png`),Buffer.from(shot.data,'base64'));
    const docs=responses.filter(r=>r.type==='Document'); const doc=docs.at(-1);
    const body=String(item.page.body||'').trim().toLowerCase();
    const title=String(item.page.title||'').trim().toLowerCase();
    const stillChallenge = body.includes('checking your browser before accessing') || body.includes('please wait for up to 5 seconds') || title.includes('checking your browser before accessing');
    if(stillChallenge)item.reasons.push('Browser verification challenge did not clear');
    if(!doc)item.reasons.push('No document response');
    else if(Number(doc.status)>=400 && !stillChallenge)item.reasons.push(`Document HTTP ${doc.status}`);
    for (const bad of ['loading oneworldz','loading the worldz experience','default page','this site can\'t be reached','err_name_not_resolved']) if(body.includes(bad)) item.reasons.push(`Placeholder/error text: ${bad}`);
    if(!body)item.reasons.push('Empty body');
    if(!title||title==='default page')item.reasons.push('Missing/placeholder title');
    const visibleImgs=(item.page.images||[]).filter(x=>x.visible);
    const brokenImgs=visibleImgs.filter(x=>x.broken); if(brokenImgs.length)item.reasons.push(`${brokenImgs.length} visible image(s) broken`);
    const brokenBg=(item.page.backgrounds||[]).filter(x=>x.broken); if(brokenBg.length)item.reasons.push(`${brokenBg.length} background image(s) broken`);
    const goodBg=(item.page.backgrounds||[]).filter(x=>!x.broken);
    if(visibleImgs.length===0 && goodBg.length===0)item.reasons.push('No real rendered image proof');
    const badImageHttp=responses.filter(r=>r.type==='Image'&&Number(r.status)>=400); if(badImageHttp.length)item.reasons.push(`${badImageHttp.length} image request(s) HTTP error`);
    const docFail=failures.find(f=>f.type==='Document'); if(docFail&&!stillChallenge)item.reasons.push(`Document network failure: ${docFail.errorText}`);
    item.summary={documentStatus:doc?.status??null,visibleImages:visibleImgs.length,backgroundImages:(item.page.backgrounds||[]).length,visibleLinks:(item.page.links||[]).length};
    item.ok=item.reasons.length===0;
  } catch (e) {
    const reason=`Browser audit infrastructure failure: ${e?.message||String(e)}`;
    item.reasons.push(reason);
    infraErrors.push(`${vp.name}: ${e?.stack||e?.message||String(e)}`);
  } finally {
    try { if (browser?.stderr) stderrParts.push(`${vp.name}: ${browser.stderr().slice(-2000)}`); } catch {}
    try { cdp?.close(); } catch {}
    try { browser?.proc?.kill('SIGTERM'); } catch {}
    await sleep(300);
  }
  results.push(item);
  console.log(`${item.ok?'PASS':'FAIL'} ${TARGET_NAME} ${vp.name}${item.reasons.length?` :: ${item.reasons.join('; ')}`:''}`);
}

const report={target:TARGET_NAME,url:TARGET_URL,results,passed:results.length===2&&results.every(r=>r.ok),fatalError:infraErrors.join('\n---\n'),chromeStderr:stderrParts.join('\n---\n').slice(-4000)};
writeFileSync(join(outDir,'report.json'),JSON.stringify(report,null,2));
if(!report.passed) process.exitCode=1;

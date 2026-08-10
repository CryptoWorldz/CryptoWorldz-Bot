import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

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
function chromePath() {
  for (const cmd of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [cmd], { encoding: 'utf8' }).trim(); } catch {}
  }
  throw new Error('No Chrome/Chromium found');
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
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.id) {
        const p = this.pending.get(m.id); if (!p) return; this.pending.delete(m.id);
        return m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
      }
      for (const fn of this.handlers.get(m.method) || []) fn(m.params || {});
    });
  }
  on(name, fn) { const a = this.handlers.get(name) || []; a.push(fn); this.handlers.set(name, a); }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  close() { try { this.ws.close(); } catch {} }
}
async function waitReady(cdp, ms = 12000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const r = await cdp.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
    if (r.result?.value === 'complete') return true;
    await sleep(200);
  }
  return false;
}

const pageExpr = `
(async () => {
  const visible = el => { const s=getComputedStyle(el), r=el.getBoundingClientRect(); return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&r.width>1&&r.height>1; };
  const images = Array.from(document.images).map(img => {
    const r=img.getBoundingClientRect();
    return {src:img.currentSrc||img.src||'',alt:img.alt||'',visible:visible(img),complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,renderedWidth:Math.round(r.width),renderedHeight:Math.round(r.height),broken:visible(img)&&(!img.complete||img.naturalWidth===0||img.naturalHeight===0)};
  });
  const bgUrls = [...new Set(Array.from(document.querySelectorAll('*')).filter(visible).flatMap(el => {
    const bg=getComputedStyle(el).backgroundImage||'';
    return [...bg.matchAll(/url\\(["']?(.*?)["']?\\)/g)].map(m=>m[1]).filter(Boolean).map(u=>new URL(u,location.href).href);
  }))];
  const backgrounds = await Promise.all(bgUrls.slice(0,40).map(src => new Promise(resolve => {
    const i=new Image(); let done=false;
    const finish=ok=>{ if(done)return; done=true; resolve({src,broken:!ok,naturalWidth:i.naturalWidth||0,naturalHeight:i.naturalHeight||0}); };
    i.onload=()=>finish(true); i.onerror=()=>finish(false); i.src=src; setTimeout(()=>finish(false),3000);
  })));
  return {title:document.title,url:location.href,body:(document.body?.innerText||'').slice(0,2500),images,backgrounds};
})()`;

const chrome = spawn(chromePath(), [
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--remote-debugging-port=9222',
  `--user-data-dir=/tmp/worldz-browser-${process.pid}`,'--hide-scrollbars',
  '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/150 Safari/537.36 WorldzProof/2.0','about:blank'
], { stdio: ['ignore','ignore','pipe'] });
let chromeErr=''; chrome.stderr.on('data',d=>{chromeErr+=d.toString();});

const results=[];
let cdp;
try {
  const targets=await waitJson('http://127.0.0.1:9222/json/list');
  const target=targets.find(t=>t.type==='page')||targets[0];
  cdp=new CDP(target.webSocketDebuggerUrl); await cdp.open();
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable');
  let responses=[], failures=[];
  cdp.on('Network.responseReceived',p=>{const r=p.response||{};responses.push({url:r.url,status:r.status,type:p.type||'',mimeType:r.mimeType||''});});
  cdp.on('Network.loadingFailed',p=>failures.push({type:p.type||'',errorText:p.errorText||'',blockedReason:p.blockedReason||''}));

  for (const vp of VIEWPORTS) {
    responses=[]; failures=[];
    const item={target:TARGET_NAME,url:TARGET_URL,viewport:vp.name,ok:false,reasons:[]};
    try {
      await cdp.send('Emulation.setDeviceMetricsOverride',{width:vp.width,height:vp.height,deviceScaleFactor:1,mobile:vp.name==='mobile'});
      const u=new URL(TARGET_URL); u.searchParams.set('worldz-audit',`${Date.now()}-${vp.name}`);
      await cdp.send('Page.navigate',{url:u.href});
      const ready=await waitReady(cdp,12000); if(!ready)item.reasons.push('document.readyState timeout');
      await sleep(1800);
      const evald=await cdp.send('Runtime.evaluate',{expression:pageExpr,awaitPromise:true,returnByValue:true,timeout:12000});
      item.page=evald.result?.value||{};
      const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      writeFileSync(join(outDir,`${safe(TARGET_NAME)}-${vp.name}.png`),Buffer.from(shot.data,'base64'));
      const docs=responses.filter(r=>r.type==='Document'); const doc=docs.at(-1);
      if(!doc)item.reasons.push('No document response');
      else if(Number(doc.status)>=400)item.reasons.push(`Document HTTP ${doc.status}`);
      const body=String(item.page.body||'').trim().toLowerCase();
      const title=String(item.page.title||'').trim().toLowerCase();
      for (const bad of ['loading the worldz experience','default page','this site can\'t be reached','err_name_not_resolved']) if(body.includes(bad)) item.reasons.push(`Placeholder/error text: ${bad}`);
      if(!body)item.reasons.push('Empty body');
      if(!title||title==='default page')item.reasons.push('Missing/placeholder title');
      const brokenImgs=(item.page.images||[]).filter(x=>x.broken); if(brokenImgs.length)item.reasons.push(`${brokenImgs.length} visible image(s) broken`);
      const brokenBg=(item.page.backgrounds||[]).filter(x=>x.broken); if(brokenBg.length)item.reasons.push(`${brokenBg.length} background image(s) broken`);
      const badImageHttp=responses.filter(r=>r.type==='Image'&&Number(r.status)>=400); if(badImageHttp.length)item.reasons.push(`${badImageHttp.length} image request(s) HTTP error`);
      const docFail=failures.find(f=>f.type==='Document'); if(docFail)item.reasons.push(`Document network failure: ${docFail.errorText}`);
      item.summary={documentStatus:doc?.status??null,visibleImages:(item.page.images||[]).filter(x=>x.visible).length,backgroundImages:(item.page.backgrounds||[]).length};
      item.ok=item.reasons.length===0;
    } catch (e) { item.reasons.push(e?.message||String(e)); }
    results.push(item);
    console.log(`${item.ok?'PASS':'FAIL'} ${TARGET_NAME} ${vp.name}${item.reasons.length?` :: ${item.reasons.join('; ')}`:''}`);
  }
} finally {
  try { cdp?.close(); } catch {}
  try { chrome.kill('SIGTERM'); } catch {}
}

const report={target:TARGET_NAME,url:TARGET_URL,results,passed:results.length===2&&results.every(r=>r.ok),chromeStderr:chromeErr.slice(-4000)};
writeFileSync(join(outDir,'report.json'),JSON.stringify(report,null,2));
if(!report.passed) process.exitCode=1;

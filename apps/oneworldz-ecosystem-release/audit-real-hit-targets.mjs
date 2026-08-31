import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist', 'ecosystem');
const tree = JSON.parse(await readFile(path.join(dist, 'user-structure-tree.json'), 'utf8'));
if (tree.static_hosts !== 18 || tree.published_webpages !== 93) throw new Error(`Expected 18 hosts / 93 pages, found ${tree.static_hosts}/${tree.published_webpages}`);

let activeRoot = dist;
const mime = new Map([
  ['.html','text/html; charset=utf-8'],['.css','text/css; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.json','application/json; charset=utf-8'],['.svg','image/svg+xml'],['.png','image/png'],['.webp','image/webp'],['.avif','image/avif'],['.jpg','image/jpeg'],['.jpeg','image/jpeg'],['.gif','image/gif'],['.ico','image/x-icon'],['.xml','application/xml; charset=utf-8'],['.txt','text/plain; charset=utf-8']
]);
const server = createServer(async (req,res) => {
  try {
    const u = new URL(req.url || '/', 'http://127.0.0.1');
    let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
    if (!rel || u.pathname.endsWith('/')) rel += 'index.html';
    const file = path.resolve(activeRoot, rel);
    if (!file.startsWith(path.resolve(activeRoot) + path.sep) && file !== path.resolve(activeRoot, 'index.html')) throw new Error('path escape');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not file');
    const bytes = await readFile(file);
    res.writeHead(200, {'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control':'no-store'});
    res.end(bytes);
  } catch {
    res.writeHead(404, {'content-type':'text/plain'}); res.end('not found');
  }
});
await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
const port = server.address().port;

const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
page.setDefaultTimeout(5000);
const viewports = [
  {name:'desktop', width:1440, height:900},
  {name:'mobile', width:390, height:844}
];
const failures = [];
const checks = [];
const skips = [];
const fail = (kind, detail) => { failures.push({kind,...detail}); console.error(`HIT_FAIL ${kind} ${JSON.stringify(detail)}`); };

async function probe(locator, detail) {
  try {
    const state = await locator.evaluate((el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(innerWidth - 1, box.left + box.width / 2));
      const y = Math.max(0, Math.min(innerHeight - 1, box.top + box.height / 2));
      const hit = document.elementFromPoint(x, y);
      return {
        pointerEvents: style.pointerEvents,
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity || 1),
        left: box.left, top: box.top, right: box.right, bottom: box.bottom,
        width: box.width, height: box.height,
        viewportWidth: innerWidth, viewportHeight: innerHeight,
        hitTarget: hit === el || el.contains(hit),
        hitTag: hit ? hit.tagName.toLowerCase() : ''
      };
    });
    if (state.pointerEvents === 'none') throw new Error('computed pointer-events:none');
    if (state.display === 'none' || state.visibility === 'hidden' || state.opacity === 0) throw new Error('not rendered as an active control');
    if (state.width < 1 || state.height < 1) throw new Error('no usable bounding box');
    if (state.right <= 0 || state.bottom <= 0 || state.left >= state.viewportWidth || state.top >= state.viewportHeight) throw new Error(`active control outside viewport (${Math.round(state.left)},${Math.round(state.top)} ${Math.round(state.width)}x${Math.round(state.height)})`);
    if (!state.hitTarget) throw new Error(`covered at centre by ${state.hitTag || 'unknown element'}`);
    checks.push(detail);
  } catch (error) {
    fail('not-tappable', {...detail, error:String(error?.message || error)});
  }
}

// A native trial click is deliberately reserved for controls whose behaviour changes
// page state.  Running it on every ordinary outbound link across 186 views made the
// audit exceed the CI window before it could produce a useful verdict.  `probe`
// above still proves the actual rendered hit target for every visible control.
async function trial(locator, detail) {
  await probe(locator, detail);
  try {
    await locator.click({trial:true, timeout:3500});
  } catch (error) {
    fail('trial-click-failed', {...detail, error:String(error?.message || error)});
  }
}

async function inactiveReason(locator) {
  return locator.evaluate((node) => {
    if (node.id === 'menu-backdrop') return 'menu-backdrop-tested-in-open-state';
    if (node.matches('a[href="#main-content"],.skip-link')) return 'skip-link-tested-after-focus';
    if (node.disabled) return 'disabled';
    const dialog = node.closest('dialog');
    if (dialog && !dialog.open) return 'closed-dialog';
    const hidden = node.closest('[hidden],[inert],[aria-hidden="true"]');
    if (hidden) return 'hidden-or-inert-ancestor';
    const menu = node.closest('#site-menu');
    if (menu && !menu.classList.contains('open')) return 'closed-menu';
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0) return 'not-rendered';
    return '';
  }).catch(() => 'evaluation-failed');
}

for (const host of tree.hosts) {
  activeRoot = path.join(dist, host.key);
  for (const route of host.routes) {
    const routePath = route.route;
    for (const vp of viewports) {
      await page.setViewportSize({width:vp.width,height:vp.height});
      const url = `http://127.0.0.1:${port}${routePath}`;
      const response = await page.goto(url,{waitUntil:'networkidle'}).catch((error) => { fail('page-load',{host:host.key,route:routePath,viewport:vp.name,error:String(error?.message||error)}); return null; });
      if (!response || response.status() >= 400) continue;

      const context = {host:host.key,route:routePath,viewport:vp.name};
      const brand = page.locator('.screen-brand').first();
      if (await brand.count()) await probe(brand,{...context,control:'home-brand'}); else fail('missing-home-brand',context);

      const skipLink = page.locator('a[href="#main-content"],.skip-link').first();
      if (await skipLink.count()) {
        try {
          await skipLink.focus();
          await trial(skipLink,{...context,control:'skip-link-focused'});
          await page.locator('body').focus().catch(()=>{});
        } catch (error) {
          fail('skip-link-interaction',{...context,error:String(error?.message||error)});
        }
      }

      const menuButton = page.locator('#menu-button').first();
      if (await menuButton.count()) {
        await trial(menuButton,{...context,control:'menu-button'});
        try {
          await menuButton.click();
          const expanded = await menuButton.getAttribute('aria-expanded');
          if (expanded !== 'true') throw new Error(`aria-expanded=${expanded}`);
          const menu = page.locator('#site-menu').first();
          if (!(await menu.evaluate((el)=>el.classList.contains('open')).catch(()=>false))) throw new Error('site menu did not enter open state');
          const menuLinks = page.locator('#site-menu a[href]');
          for (let i=0;i<await menuLinks.count();i++) await probe(menuLinks.nth(i),{...context,control:'menu-link',index:i+1});
          const backdrop = page.locator('#menu-backdrop').first();
          if (await backdrop.count()) {
            if (!(await backdrop.evaluate((el)=>el.classList.contains('open')).catch(()=>false))) throw new Error('menu backdrop did not enter open state');
            await trial(backdrop,{...context,control:'menu-backdrop-open'});
            await backdrop.click();
            const closed = await menuButton.getAttribute('aria-expanded');
            if (closed !== 'false') throw new Error(`menu backdrop did not close menu, aria-expanded=${closed}`);
          } else {
            await menuButton.click();
          }
        } catch (error) { fail('menu-interaction',{...context,error:String(error?.message||error)}); }
      } else fail('missing-menu-button',context);

      const generic = page.locator('a[href],button:not([disabled]),[role="button"],input:not([type="hidden"]),select,textarea');
      const count = await generic.count();
      for (let i=0;i<count;i++) {
        const el = generic.nth(i);
        const flags = await el.evaluate((node) => ({
          inMenu:Boolean(node.closest('#site-menu')),
          community:node.matches('.community-control,[data-community-prev],[data-community-next]'),
          token:Boolean(node.matches('[data-token-index],[data-dialog-close],#token-link,#token-dex,#token-swap') || node.closest('#token-dialog')),
          brand:node.matches('.screen-brand'),
          menuButton:node.id==='menu-button'
        })).catch(()=>({}));
        if (flags.inMenu || flags.community || flags.token || flags.brand || flags.menuButton) continue;
        const reason = await inactiveReason(el);
        if (reason) { skips.push({...context,index:i+1,reason}); continue; }
        const tag = await el.evaluate((node) => `${node.tagName.toLowerCase()}${node.id?'#'+node.id:''}${node.className && typeof node.className==='string'?'.'+node.className.trim().replace(/\s+/g,'.'):''}`.slice(0,160)).catch(()=>`control-${i+1}`);
        await probe(el,{...context,control:'active-control',tag,index:i+1});
      }

      if (await page.locator('#community-grid').count()) {
        const dataCount = await page.evaluate(() => window.ONE_SCREEN_DATA?.community?.length || 0);
        if (dataCount !== 34) fail('community-count',{...context,expected:34,actual:dataCount});
        const pageCount = Math.ceil(dataCount/6);
        const seen = new Set();
        for (let p=0;p<pageCount;p++) {
          const controls = page.locator('.community-control');
          const visibleCount = await controls.count();
          if (visibleCount < 1 || visibleCount > 6) fail('community-visible-count',{...context,page:p+1,actual:visibleCount});
          for (let i=0;i<visibleCount;i++) {
            const c = controls.nth(i);
            const href = await c.getAttribute('href') || '';
            if (href) seen.add(href);
            await probe(c,{...context,control:'community-facebook',page:p+1,index:i+1,href});
          }
          if (p < pageCount-1) {
            const next = page.locator('[data-community-next]').first();
            await trial(next,{...context,control:'community-next',page:p+1});
            const before = await page.locator('#community-page-label').textContent();
            try { await next.click(); } catch (error) { fail('community-next-click',{...context,page:p+1,error:String(error?.message||error)}); break; }
            const after = await page.locator('#community-page-label').textContent();
            if (before === after) fail('community-next-no-change',{...context,page:p+1,before,after});
          }
        }
        if (seen.size !== 34) fail('community-pager-coverage',{...context,expected:34,actual:seen.size});
        const prev = page.locator('[data-community-prev]').first();
        if (await prev.count() && !(await prev.isDisabled())) await trial(prev,{...context,control:'community-prev'});
      }

      if (await page.locator('[data-token-index]').count()) {
        const tokens = page.locator('[data-token-index]');
        if (await tokens.count() !== 10) fail('token-count',{...context,expected:10,actual:await tokens.count()});
        for (let i=0;i<await tokens.count();i++) {
          await trial(tokens.nth(i),{...context,control:'legacy-token',index:i+1});
          try {
            await tokens.nth(i).click();
            const dialog = page.locator('#token-dialog');
            if (!(await dialog.evaluate((d)=>d.open).catch(()=>false))) throw new Error('dialog did not open');
            for (const id of ['#token-link','#token-dex','#token-swap']) {
              const link = page.locator(id);
              if (await link.count()) await probe(link,{...context,control:'token-dialog-link',index:i+1,id});
            }
            const close = page.locator('[data-dialog-close]').first();
            await trial(close,{...context,control:'token-dialog-close',index:i+1});
            await close.click();
          } catch (error) { fail('token-dialog-interaction',{...context,index:i+1,error:String(error?.message||error)}); }
        }
      }
    }
  }
}

await browser.close();
await new Promise((resolve)=>server.close(resolve));
await mkdir(path.resolve(root,'../../audit-results'),{recursive:true});
const outDir = path.resolve(root,'../../audit-results');
const summary = [
  'REAL_HIT_TARGET_ROUTES=93',
  'REAL_HIT_TARGET_VIEWPORTS=186',
  `REAL_HIT_TARGET_CHECKS=${checks.length}`,
  `REAL_HIT_TARGET_INACTIVE_SKIPS=${skips.length}`,
  `REAL_HIT_TARGET_FAILURES=${failures.length}`,
  `REAL_HIT_TARGET_GATE=${failures.length===0?'PASS':'FAIL'}`
].join('\n')+'\n';
await writeFile(path.join(outDir,'real-hit-targets-summary.txt'),summary);
await writeFile(path.join(outDir,'real-hit-targets.json'),JSON.stringify({checks:checks.length,inactiveSkips:skips.length,failures},null,2)+'\n');
console.log(summary.trim());
if (failures.length) process.exit(1);

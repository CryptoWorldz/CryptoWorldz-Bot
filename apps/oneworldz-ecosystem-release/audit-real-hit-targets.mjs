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
const fail = (kind, detail) => { failures.push({kind,...detail}); console.error(`HIT_FAIL ${kind} ${JSON.stringify(detail)}`); };

async function trial(locator, detail) {
  try {
    const pe = await locator.evaluate((el) => getComputedStyle(el).pointerEvents);
    if (pe === 'none') throw new Error('computed pointer-events:none');
    const box = await locator.boundingBox();
    if (!box || box.width < 1 || box.height < 1) throw new Error('no usable bounding box');
    await locator.click({trial:true, timeout:3500});
    checks.push(detail);
  } catch (error) {
    fail('not-tappable', {...detail, error:String(error?.message || error)});
  }
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
      if (await brand.count()) await trial(brand,{...context,control:'home-brand'}); else fail('missing-home-brand',context);

      const menuButton = page.locator('#menu-button').first();
      if (await menuButton.count()) {
        await trial(menuButton,{...context,control:'menu-button'});
        try {
          await menuButton.click();
          const expanded = await menuButton.getAttribute('aria-expanded');
          if (expanded !== 'true') throw new Error(`aria-expanded=${expanded}`);
          const menuLinks = page.locator('#site-menu a[href]');
          for (let i=0;i<await menuLinks.count();i++) await trial(menuLinks.nth(i),{...context,control:'menu-link',index:i+1});
          await page.locator('#menu-backdrop').click({trial:true}).catch(()=>{});
          await page.locator('#menu-backdrop').click().catch(()=>{});
        } catch (error) { fail('menu-interaction',{...context,error:String(error?.message||error)}); }
      } else fail('missing-menu-button',context);

      const generic = page.locator('a[href],button:not([disabled]),[role="button"],input:not([type="hidden"]),select,textarea').filter({visible:true});
      const count = await generic.count();
      for (let i=0;i<count;i++) {
        const el = generic.nth(i);
        const inMenu = await el.evaluate((node) => Boolean(node.closest('#site-menu'))).catch(()=>false);
        const community = await el.evaluate((node) => node.matches('.community-control,[data-community-prev],[data-community-next]')).catch(()=>false);
        if (inMenu || community) continue;
        const tag = await el.evaluate((node) => `${node.tagName.toLowerCase()}${node.id?'#'+node.id:''}${node.className && typeof node.className==='string'?'.'+node.className.trim().replace(/\s+/g,'.'):''}`.slice(0,160)).catch(()=>`control-${i+1}`);
        await trial(el,{...context,control:'visible-control',tag,index:i+1});
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
            await trial(c,{...context,control:'community-facebook',page:p+1,index:i+1,href});
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
              if (await link.count()) await trial(link,{...context,control:'token-dialog-link',index:i+1,id});
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
  `REAL_HIT_TARGET_FAILURES=${failures.length}`,
  `REAL_HIT_TARGET_GATE=${failures.length===0?'PASS':'FAIL'}`
].join('\n')+'\n';
await writeFile(path.join(outDir,'real-hit-targets-summary.txt'),summary);
await writeFile(path.join(outDir,'real-hit-targets.json'),JSON.stringify({checks:checks.length,failures},null,2)+'\n');
console.log(summary.trim());
if (failures.length) process.exit(1);

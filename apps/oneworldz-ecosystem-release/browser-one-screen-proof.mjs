import { createServer } from "node:http";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const name = args.get("--name") || "site";
const rootArg = args.get("--root");
const liveUrl = args.get("--url");
const outDir = path.resolve(args.get("--out") || `visual-proof/${name}`);
const requiredText = args.get("--required-text") || "";
if (!rootArg && !liveUrl) throw new Error("Provide --root or --url");
await mkdir(outDir, { recursive: true });

const mime = new Map([[".html","text/html; charset=utf-8"],[".css","text/css; charset=utf-8"],[".js","text/javascript; charset=utf-8"],[".json","application/json; charset=utf-8"],[".xml","application/xml; charset=utf-8"],[".png","image/png"],[".jpg","image/jpeg"],[".jpeg","image/jpeg"],[".webp","image/webp"],[".avif","image/avif"]]);

async function discoverCandidateRoutes(root) {
  const routes = [];
  async function walk(dir, rel = "") {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const childRel = path.join(rel, entry.name);
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(child, childRel);
      else if (entry.name === "index.html") {
        const parent = path.dirname(childRel).split(path.sep).join("/");
        routes.push(parent === "." ? "/" : `/${parent.replace(/^\/+|\/+$/g, "")}/`);
      }
    }
  }
  await walk(root);
  return [...new Set(routes)].sort();
}

async function discoverLiveRoutes(baseUrl) {
  const url = new URL("/sitemap.xml", baseUrl);
  url.searchParams.set("one_screen_proof", `${Date.now()}-${name}`);
  const res = await fetch(url, { headers: { "cache-control": "no-cache, no-store" } });
  if (!res.ok) throw new Error(`${name}: sitemap HTTP ${res.status}`);
  const xml = await res.text();
  const routes = [];
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) routes.push(new URL(m[1]).pathname);
  return [...new Set(routes.map((r) => r.endsWith("/") ? r : `${r}/`))].sort();
}

let server = null;
let baseUrl = liveUrl;
let routes = [];
if (rootArg) {
  const root = path.resolve(rootArg);
  routes = await discoverCandidateRoutes(root);
  server = createServer(async (req, res) => {
    try {
      const raw = decodeURIComponent((req.url || "/").split("?")[0]);
      const rel = raw === "/" ? "index.html" : raw.replace(/^\/+/, "");
      const candidate = path.resolve(root, rel);
      if (candidate !== root && !candidate.startsWith(root + path.sep)) { res.writeHead(403); res.end("Forbidden"); return; }
      let file = candidate;
      const info = await stat(file).catch(() => null);
      if (info?.isDirectory()) file = path.join(file, "index.html");
      const bytes = await readFile(file);
      res.writeHead(200, { "content-type": mime.get(path.extname(file).toLowerCase()) || "application/octet-stream", "cache-control": "no-store" });
      res.end(bytes);
    } catch { res.writeHead(404); res.end("Not found"); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/`;
} else {
  routes = await discoverLiveRoutes(baseUrl);
}
if (!routes.includes("/")) throw new Error(`${name}: home route missing`);
if (!routes.includes("/acknowledgements/")) throw new Error(`${name}: acknowledgements route missing`);

const browser = await chromium.launch({ headless: true });
const viewports = [{ key:"desktop", width:1440, height:1000 },{ key:"mobile", width:390, height:844 }];
const report = { name, mode: rootArg ? "candidate" : "live", url: baseUrl, expectedRoutes: routes, totalHtmlPagesAudited:{desktop:0,mobile:0}, failures:[], pass:true, routeAudit:{} };

for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ignoreHTTPSErrors: false });
  const page = await context.newPage();
  report.routeAudit[vp.key] = {};
  for (const route of routes) {
    const target = new URL(route, baseUrl);
    if (!rootArg) target.searchParams.set("one_screen_proof", `${Date.now()}-${name}-${vp.key}`);
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
    page.on("pageerror", (e) => pageErrors.push(String(e?.message || e)));
    let navigationError = "";
    try { await page.goto(target.href, { waitUntil:"networkidle", timeout:45000 }); }
    catch (e) { navigationError = String(e?.message || e); try { await page.goto(target.href, { waitUntil:"domcontentloaded", timeout:20000 }); } catch {} }
    await page.waitForTimeout(250);
    const dom = await page.evaluate(({ requiredText, isHome }) => {
      const body = document.body;
      const root = document.documentElement;
      const screen = document.querySelector("main.screen");
      const panel = document.querySelector(".screen-panel");
      const art = document.querySelector(".screen-art img");
      const brand = document.querySelector(".screen-brand[href='/']");
      const menu = document.querySelector("#menu-button");
      const panelRect = panel?.getBoundingClientRect();
      const screenRect = screen?.getBoundingClientRect();
      const bodyText = (body?.innerText || "").replace(/\s+/g," ").trim();
      const visibleImages = [...document.images].filter((img) => {
        const s = getComputedStyle(img), r = img.getBoundingClientRect();
        return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
      });
      const brokenVisible = visibleImages.filter((img) => img.complete && (img.naturalWidth <= 0 || img.naturalHeight <= 0)).length;
      const internalLinks = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((href) => href && href.startsWith("/") && !href.startsWith("//"));
      return {
        oneScreen: body?.dataset.oneScreen === "true",
        title: document.title,
        h1Count: document.querySelectorAll("h1").length,
        textLength: bodyText.length,
        requiredTextPresent: !isHome || !requiredText || bodyText.toLowerCase().includes(requiredText.toLowerCase()),
        titleIdentityPresent: !isHome || !requiredText || document.title.toLowerCase().includes(requiredText.toLowerCase()),
        docWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        docHeight: root.scrollHeight,
        clientHeight: root.clientHeight,
        screenHeight: screenRect ? Math.round(screenRect.height) : 0,
        panelTop: panelRect?.top ?? -1,
        panelBottom: panelRect?.bottom ?? -1,
        panelHeight: panelRect?.height ?? 0,
        brandHome: !!brand,
        menuPresent: !!menu,
        artPresent: !!art,
        artLoaded: !!art && art.complete && art.naturalWidth > 0 && art.naturalHeight > 0,
        brokenVisible,
        gptLauncher: !!document.querySelector(".oneworldz-gpt-launcher"),
        internalLinks
      };
    }, { requiredText, isHome: route === "/" });
    const failures = [];
    if (navigationError) failures.push(`navigation: ${navigationError}`);
    if (!dom.oneScreen) failures.push("data-one-screen missing");
    if (dom.h1Count !== 1) failures.push(`h1 count ${dom.h1Count}`);
    if (dom.textLength < 70) failures.push(`text too short ${dom.textLength}`);
    if (!dom.requiredTextPresent) failures.push("root identity text missing");
    if (!dom.titleIdentityPresent) failures.push("root title identity missing");
    if (dom.docWidth > dom.clientWidth + 2) failures.push(`horizontal overflow ${dom.docWidth}/${dom.clientWidth}`);
    if (dom.docHeight > dom.clientHeight + 2) failures.push(`vertical overflow ${dom.docHeight}/${dom.clientHeight}`);
    if (Math.abs(dom.screenHeight - dom.clientHeight) > 2) failures.push(`screen height ${dom.screenHeight}/${dom.clientHeight}`);
    if (dom.panelTop < -1 || dom.panelBottom > dom.clientHeight + 2) failures.push(`panel outside viewport ${dom.panelTop}-${dom.panelBottom}`);
    if (!dom.brandHome) failures.push("top-left home brand missing");
    if (!dom.menuPresent) failures.push("menu button missing");
    if (!dom.artPresent || !dom.artLoaded) failures.push("main artwork missing/broken");
    if (dom.brokenVisible) failures.push(`broken visible images ${dom.brokenVisible}`);
    if ((route === "/gpt/" || route === "/gtp/") && !dom.gptLauncher) failures.push("GPT launcher missing");

    if (!failures.length) {
      const button = page.locator("#menu-button");
      await button.click();
      if (!(await page.locator("#site-menu").evaluate((el) => el.classList.contains("open")))) failures.push("menu did not open");
      await page.locator("#menu-backdrop").click({ force:true });
      if (await page.locator("#site-menu").evaluate((el) => el.classList.contains("open"))) failures.push("menu did not close");
    }

    const routeSet = new Set(routes);
    for (const href of dom.internalLinks) {
      if (href === "/" || href.startsWith("/#") || href.startsWith("/assets/")) continue;
      const clean = new URL(href, "https://example.test").pathname;
      const normalized = clean.endsWith("/") ? clean : `${clean}/`;
      if (!routeSet.has(normalized)) failures.push(`internal route missing ${href}`);
    }

    report.routeAudit[vp.key][route] = { ...dom, consoleErrors, pageErrors, failures };
    report.totalHtmlPagesAudited[vp.key] += 1;
    if (failures.length || pageErrors.length || consoleErrors.length) {
      report.pass = false;
      report.failures.push(...failures.map((f) => `${vp.key}:${route}:${f}`), ...pageErrors.map((e) => `${vp.key}:${route}:pageerror:${e}`), ...consoleErrors.map((e) => `${vp.key}:${route}:console:${e}`));
    }
    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
    if (route === "/") await page.screenshot({ path:path.join(outDir, `${vp.key}.png`), fullPage:false });
  }
  await context.close();
}
await browser.close();
if (server) await new Promise((resolve) => server.close(resolve));
await writeFile(path.join(outDir,"visual-report.json"), `${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({name,mode:report.mode,pass:report.pass,totalHtmlPagesAudited:report.totalHtmlPagesAudited,failures:report.failures},null,2));
if (!report.pass) process.exitCode = 1;

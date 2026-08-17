import { createServer } from "node:http";
import { readFile, stat, mkdir, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);

const name = args.get("--name") || "site";
const rootArg = args.get("--root");
const liveUrl = args.get("--url");
const outDir = path.resolve(args.get("--out") || `visual-proof/${name}`);
const expectedTitle = args.get("--expected-title") || "";
const requiredText = args.get("--required-text") || "";
const requiredImage = args.get("--required-image") || "";
const requiredImageTokens = requiredImage.split("|").map((value) => value.trim()).filter(Boolean);
const footerLine1 = "Created with the Vision";
const footerLine2 = "When Someone say's You can't Change the World 🌐 just Say “Why can't I?”";
const exactFooterText = `${footerLine1} ${footerLine2}`;
if (!rootArg && !liveUrl) throw new Error("Provide --root for candidate proof or --url for live proof");

await mkdir(outDir, { recursive: true });

const mime = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".svg", "image/svg+xml"],
  [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
  [".webp", "image/webp"], [".avif", "image/avif"], [".gif", "image/gif"], [".ico", "image/x-icon"],
  [".woff", "font/woff"], [".woff2", "font/woff2"]
]);

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

async function discoverSitemapRoutes(baseUrl) {
  try {
    const base = new URL(baseUrl);
    const sitemap = new URL("/sitemap.xml", base);
    sitemap.searchParams.set("visual_proof", String(Date.now()));
    const response = await fetch(sitemap, { headers: { "cache-control": "no-cache, no-store" } });
    if (!response.ok) return [];
    const xml = await response.text();
    const paths = [];
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      try {
        const published = new URL(match[1].trim());
        paths.push(published.pathname.endsWith("/") || path.posix.extname(published.pathname) ? published.pathname : `${published.pathname}/`);
      } catch {}
    }
    return [...new Set(paths.length ? paths : ["/"])].sort();
  } catch {
    return [];
  }
}

let server;
let targetUrl = liveUrl;
let candidateRoutes = [];
if (rootArg) {
  const root = path.resolve(rootArg);
  candidateRoutes = await discoverCandidateRoutes(root);
  if (!candidateRoutes.includes("/")) throw new Error(`${name}: candidate root index.html missing`);
  server = createServer(async (req, res) => {
    try {
      const raw = decodeURIComponent((req.url || "/").split("?")[0]);
      const rel = raw === "/" ? "index.html" : raw.replace(/^\/+/, "");
      const candidate = path.resolve(root, rel);
      if (candidate !== root && !candidate.startsWith(root + path.sep)) {
        res.writeHead(403); res.end("Forbidden"); return;
      }
      let file = candidate;
      const s = await stat(file).catch(() => null);
      if (s?.isDirectory()) file = path.join(file, "index.html");
      const data = await readFile(file);
      res.writeHead(200, {
        "content-type": mime.get(path.extname(file).toLowerCase()) || "application/octet-stream",
        "cache-control": "no-store"
      });
      res.end(data);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  targetUrl = `http://127.0.0.1:${address.port}/`;
}

const sitemapRoutes = await discoverSitemapRoutes(targetUrl);
const expectedRoutes = rootArg ? candidateRoutes : (sitemapRoutes.length ? sitemapRoutes : ["/"]);

const browser = await chromium.launch({ headless: true });
const viewports = [
  { key: "desktop", width: 1440, height: 1000, isMobile: false },
  { key: "mobile", width: 390, height: 844, isMobile: true }
];

const report = {
  name,
  mode: rootArg ? "candidate" : "live",
  url: targetUrl,
  expectedTitle,
  requiredText,
  requiredImage,
  requiredImageTokens,
  candidateRoutes,
  sitemapRoutes,
  expectedRoutes,
  generatedAt: new Date().toISOString(),
  viewports: {},
  routeAudit: {},
  pass: true,
  failures: []
};

async function settleResponsiveMedia(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    for (const img of document.images) img.loading = "eager";
    const max = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0);
    const step = Math.max(320, Math.floor(window.innerHeight * 0.75));
    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await sleep(45);
    }
    window.scrollTo(0, max);
    await Promise.all([...document.images].map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        setTimeout(done, 5000);
      });
    }));
    await Promise.all([...document.images].map(async (img) => {
      if (!img.complete || img.naturalWidth <= 0) return;
      try {
        await Promise.race([img.decode(), sleep(3000)]);
      } catch {}
    }));
    window.scrollTo(0, 0);
    await sleep(180);
  });
  await page.waitForTimeout(250);
}

async function collectDom(page, { identityChecks = false } = {}) {
  return page.evaluate(({ requiredImageTokens, requiredText, identityChecks }) => {
    const images = [...document.images].map((img) => ({
      src: img.getAttribute("src") || "",
      currentSrc: img.currentSrc || "",
      alt: img.getAttribute("alt") || "",
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      rect: { width: Math.round(img.getBoundingClientRect().width), height: Math.round(img.getBoundingClientRect().height) }
    }));
    const brokenImages = images.filter((img) => img.complete && (img.naturalWidth <= 0 || img.naturalHeight <= 0));
    const pendingImages = images.filter((img) => !img.complete);
    const requiredImagePresent = !identityChecks || requiredImageTokens.length === 0 || images.some((img) => {
      if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) return false;
      return requiredImageTokens.some((token) => img.src.includes(token) || img.currentSrc.includes(token));
    });
    const bodyText = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
    const requiredTextPresent = !identityChecks || !requiredText || bodyText.toLowerCase().includes(requiredText.toLowerCase());
    const interactive = [...document.querySelectorAll("a[href],button")].map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120),
      href: el.tagName === "A" ? el.getAttribute("href") : null,
      visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
    }));
    const h1Count = document.querySelectorAll("h1").length;
    const footers = [...document.querySelectorAll("footer.site-footer")];
    const footer = footers[0] || null;
    const footerText = footer ? (footer.textContent || "").replace(/\s+/g, " ").trim() : "";
    const footerLinks = footer ? footer.querySelectorAll("a[href]").length : 0;
    const retiredFooterCredit = /(Created|Designed) by JayJayTeamDev/i.test(footerText);
    return {
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() || "",
      h1Count,
      textLength: bodyText.length,
      requiredTextPresent,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      images,
      brokenImages,
      pendingImages,
      requiredImagePresent,
      interactiveCount: interactive.filter((x) => x.visible).length,
      emptyVisibleLinks: interactive.filter((x) => x.tag === "a" && x.visible && (!x.href || x.href === "#" || /^javascript:/i.test(x.href))),
      hrefs: [...document.querySelectorAll("a[href]")].map((a) => a.href),
      footerCount: footers.length,
      footerText,
      footerLinks,
      retiredFooterCredit
    };
  }, { requiredImageTokens, requiredText, identityChecks });
}

async function testMenu(page) {
  const menu = { present: false, tested: false, opened: null, closed: null };
  const menuButton = page.locator('button[aria-controls="site-menu"]').first();
  if (await menuButton.count()) {
    menu.present = true;
    if (await menuButton.isVisible().catch(() => false)) {
      menu.tested = true;
      await menuButton.click();
      menu.opened = (await menuButton.getAttribute("aria-expanded")) === "true";
      const backdrop = page.locator(".menu-backdrop").first();
      if (await backdrop.count() && await backdrop.isVisible().catch(() => false)) await backdrop.click();
      else await menuButton.click();
      menu.closed = (await menuButton.getAttribute("aria-expanded")) === "false";
    }
  }
  return menu;
}

function slugForPath(pathname) {
  if (!pathname || pathname === "/") return "home";
  return pathname.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-") || "home";
}

function pageFailures({ navigationError, dom, menu, consoleErrors, pageErrors, failedRequests, rootIdentity = false }) {
  const failures = [];
  if (navigationError) failures.push(`navigation: ${navigationError}`);
  if (!dom.title) failures.push("document title missing");
  if (dom.h1Count !== 1) failures.push(`expected exactly one h1, got ${dom.h1Count}`);
  if (dom.textLength < 100) failures.push(`page text unexpectedly short: ${dom.textLength}`);
  if (rootIdentity && expectedTitle && dom.title !== expectedTitle) failures.push(`title mismatch: expected '${expectedTitle}', got '${dom.title}'`);
  if (rootIdentity && !dom.requiredTextPresent) failures.push(`required identity text missing: ${requiredText}`);
  if (dom.brokenImages.length) failures.push(`broken images: ${dom.brokenImages.length}`);
  if (dom.pendingImages.length) failures.push(`images did not settle: ${dom.pendingImages.length}`);
  if (dom.horizontalOverflow > 4) failures.push(`horizontal overflow: ${dom.horizontalOverflow}px`);
  if (rootIdentity && !dom.requiredImagePresent) failures.push(`required image missing: ${requiredImage}`);
  if (dom.emptyVisibleLinks.length) failures.push(`empty/placeholder visible links: ${dom.emptyVisibleLinks.length}`);
  if (failedRequests.length) failures.push(`same-origin failed requests: ${failedRequests.length}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.length}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.length}`);
  if (menu.tested && (!menu.opened || !menu.closed)) failures.push("menu open/close behaviour failed");
  if (dom.footerCount !== 1) failures.push(`expected exactly one permanent footer, got ${dom.footerCount}`);
  if (dom.footerText !== exactFooterText) failures.push("permanent footer text drift");
  if (dom.footerLinks !== 0) failures.push(`permanent footer must contain no extra links, got ${dom.footerLinks}`);
  if (dom.retiredFooterCredit) failures.push("retired Created/Designed by JayJayTeamDev footer credit returned");
  return failures;
}

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: false
  });
  const page = await context.newPage();

  const auditOne = async (url, { rootIdentity = false, screenshotPath = null } = {}) => {
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    const onConsole = (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); };
    const onPageError = (err) => pageErrors.push(String(err?.message || err));
    const onRequestFailed = (request) => {
      try {
        const pageOrigin = new URL(url).origin;
        if (new URL(request.url()).origin === pageOrigin) failedRequests.push({ url: request.url(), error: request.failure()?.errorText || "request failed" });
      } catch {}
    };
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    page.on("requestfailed", onRequestFailed);

    let navigationError = null;
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    } catch (error) {
      navigationError = String(error?.message || error);
      try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }); } catch {}
    }
    await page.waitForTimeout(300);
    await settleResponsiveMedia(page);
    const dom = await collectDom(page, { identityChecks: rootIdentity });
    const menu = await testMenu(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(180);
    if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true });
    const failures = pageFailures({ navigationError, dom, menu, consoleErrors, pageErrors, failedRequests, rootIdentity });

    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
    return { dom, menu, consoleErrors, pageErrors, failedRequests, navigationError, failures };
  };

  const rootScreenshot = path.join(outDir, `${vp.key}.png`);
  const rootResult = await auditOne(targetUrl, { rootIdentity: true, screenshotPath: rootScreenshot });
  report.viewports[vp.key] = { ...rootResult.dom, menu: rootResult.menu, consoleErrors: rootResult.consoleErrors, pageErrors: rootResult.pageErrors, failedRequests: rootResult.failedRequests, navigationError: rootResult.navigationError, screenshot: rootScreenshot, failures: rootResult.failures };
  if (rootResult.failures.length) {
    report.pass = false;
    report.failures.push(...rootResult.failures.map((failure) => `${vp.key}: ${failure}`));
  }

  const base = new URL(targetUrl);
  const queue = [];
  const seen = new Set([new URL(base.pathname || "/", base.origin).href]);
  const enqueue = (href) => {
    try {
      const u = new URL(href, base);
      if (!/^https?:$/.test(u.protocol)) return;
      if (u.origin !== base.origin) return;
      u.hash = "";
      u.search = "";
      const clean = u.href;
      if (seen.has(clean)) return;
      const ext = path.posix.extname(u.pathname);
      if (ext && ext !== ".html") return;
      seen.add(clean);
      queue.push(clean);
    } catch {}
  };

  for (const route of expectedRoutes) if (route !== "/") enqueue(new URL(route, base).href);
  for (const href of rootResult.dom.hrefs) enqueue(href);

  const routeResults = {};
  while (queue.length && Object.keys(routeResults).length < 100) {
    const routeUrl = queue.shift();
    const route = new URL(routeUrl);
    const slug = slugForPath(route.pathname);
    const routeDir = path.join(outDir, "routes", slug);
    await mkdir(routeDir, { recursive: true });
    const screenshot = path.join(routeDir, `${vp.key}.png`);
    const result = await auditOne(routeUrl, { rootIdentity: false, screenshotPath: screenshot });
    routeResults[route.pathname] = {
      title: result.dom.title,
      h1: result.dom.h1,
      h1Count: result.dom.h1Count,
      textLength: result.dom.textLength,
      horizontalOverflow: result.dom.horizontalOverflow,
      imageCount: result.dom.images.length,
      brokenImages: result.dom.brokenImages.length,
      pendingImages: result.dom.pendingImages.length,
      interactiveCount: result.dom.interactiveCount,
      footerCount: result.dom.footerCount,
      footerText: result.dom.footerText,
      footerLinks: result.dom.footerLinks,
      menu: result.menu,
      screenshot,
      failures: result.failures
    };
    for (const href of result.dom.hrefs) enqueue(href);
    if (result.failures.length) {
      report.pass = false;
      report.failures.push(...result.failures.map((failure) => `${vp.key}:${route.pathname}: ${failure}`));
    }
  }
  report.routeAudit[vp.key] = routeResults;
  await context.close();
}

await browser.close();
if (server) await new Promise((resolve) => server.close(resolve));
report.localRoutesAudited = {
  desktop: Object.keys(report.routeAudit.desktop || {}).length,
  mobile: Object.keys(report.routeAudit.mobile || {}).length
};
report.totalHtmlPagesAudited = {
  desktop: 1 + report.localRoutesAudited.desktop,
  mobile: 1 + report.localRoutesAudited.mobile
};
const expectedCount = expectedRoutes.length;
if (report.totalHtmlPagesAudited.desktop < expectedCount) {
  report.pass = false;
  report.failures.push(`desktop: expected at least ${expectedCount} HTML pages audited, got ${report.totalHtmlPagesAudited.desktop}`);
}
if (report.totalHtmlPagesAudited.mobile < expectedCount) {
  report.pass = false;
  report.failures.push(`mobile: expected at least ${expectedCount} HTML pages audited, got ${report.totalHtmlPagesAudited.mobile}`);
}
await writeFile(path.join(outDir, "visual-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ name, mode: report.mode, pass: report.pass, totalHtmlPagesAudited: report.totalHtmlPagesAudited, failures: report.failures }, null, 2));
if (!report.pass) process.exitCode = 1;

import { createServer } from "node:http";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
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
const requiredImage = args.get("--required-image") || "";
if (!rootArg && !liveUrl) throw new Error("Provide --root for candidate proof or --url for live proof");

await mkdir(outDir, { recursive: true });

const mime = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".svg", "image/svg+xml"],
  [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
  [".webp", "image/webp"], [".gif", "image/gif"], [".ico", "image/x-icon"],
  [".woff", "font/woff"], [".woff2", "font/woff2"]
]);

let server;
let targetUrl = liveUrl;
if (rootArg) {
  const root = path.resolve(rootArg);
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
      res.writeHead(200, { "content-type": mime.get(path.extname(file).toLowerCase()) || "application/octet-stream", "cache-control": "no-store" });
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
  requiredImage,
  generatedAt: new Date().toISOString(),
  viewports: {},
  pass: true,
  failures: []
};

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: false
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
  page.on("requestfailed", (request) => {
    try {
      const pageOrigin = new URL(targetUrl).origin;
      if (new URL(request.url()).origin === pageOrigin) failedRequests.push({ url: request.url(), error: request.failure()?.errorText || "request failed" });
    } catch {}
  });

  let navigationError = null;
  try {
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 45000 });
  } catch (error) {
    navigationError = String(error?.message || error);
    try { await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 }); } catch {}
  }
  await page.waitForTimeout(500);

  const dom = await page.evaluate(({ requiredImage }) => {
    const images = [...document.images].map((img) => ({
      src: img.getAttribute("src") || "",
      currentSrc: img.currentSrc || "",
      alt: img.getAttribute("alt") || "",
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      rect: { width: Math.round(img.getBoundingClientRect().width), height: Math.round(img.getBoundingClientRect().height) }
    }));
    const brokenImages = images.filter((img) => !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0);
    const requiredImagePresent = !requiredImage || images.some((img) => img.src.includes(requiredImage) || img.currentSrc.includes(requiredImage));
    const interactive = [...document.querySelectorAll("a[href],button")].map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120),
      href: el.tagName === "A" ? el.getAttribute("href") : null,
      visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
    }));
    return {
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() || "",
      textLength: (document.body?.innerText || "").trim().length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      images,
      brokenImages,
      requiredImagePresent,
      interactiveCount: interactive.filter((x) => x.visible).length,
      emptyVisibleLinks: interactive.filter((x) => x.tag === "a" && x.visible && (!x.href || x.href === "#" || /^javascript:/i.test(x.href)))
    };
  }, { requiredImage });

  let menu = { present: false, tested: false, opened: null, closed: null };
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

  const screenshot = path.join(outDir, `${vp.key}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (navigationError) failures.push(`navigation: ${navigationError}`);
  if (expectedTitle && dom.title !== expectedTitle) failures.push(`title mismatch: expected '${expectedTitle}', got '${dom.title}'`);
  if (dom.textLength < 100) failures.push(`page text unexpectedly short: ${dom.textLength}`);
  if (dom.brokenImages.length) failures.push(`broken images: ${dom.brokenImages.length}`);
  if (dom.horizontalOverflow > 4) failures.push(`horizontal overflow: ${dom.horizontalOverflow}px`);
  if (!dom.requiredImagePresent) failures.push(`required image missing: ${requiredImage}`);
  if (failedRequests.length) failures.push(`same-origin failed requests: ${failedRequests.length}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.length}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.length}`);
  if (menu.tested && (!menu.opened || !menu.closed)) failures.push("menu open/close behaviour failed");

  report.viewports[vp.key] = { ...dom, menu, consoleErrors, pageErrors, failedRequests, navigationError, screenshot, failures };
  if (failures.length) {
    report.pass = false;
    report.failures.push(...failures.map((failure) => `${vp.key}: ${failure}`));
  }
  await context.close();
}

await browser.close();
if (server) await new Promise((resolve) => server.close(resolve));
await writeFile(path.join(outDir, "visual-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ name, mode: report.mode, pass: report.pass, failures: report.failures }, null, 2));
if (!report.pass) process.exitCode = 1;

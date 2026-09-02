import { createServer } from "node:http";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const ecosystemRoot = path.resolve(args.get("--root") || "apps/oneworldz-ecosystem-release/dist/ecosystem");
const outDir = path.resolve(args.get("--out") || "audit-results");
await mkdir(outDir, { recursive: true });

const mime = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".svg", "image/svg+xml"],
  [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
  [".webp", "image/webp"], [".avif", "image/avif"], [".gif", "image/gif"], [".ico", "image/x-icon"]
]);

async function discoverRoutes(root) {
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

function startServer(root) {
  const server = createServer(async (req, res) => {
    try {
      const raw = decodeURIComponent((req.url || "/").split("?")[0]);
      const rel = raw === "/" ? "index.html" : raw.replace(/^\/+/, "");
      const candidate = path.resolve(root, rel);
      if (candidate !== root && !candidate.startsWith(root + path.sep)) {
        res.writeHead(403); res.end("Forbidden"); return;
      }
      let file = candidate;
      const info = await stat(file).catch(() => null);
      if (info?.isDirectory()) file = path.join(file, "index.html");
      const data = await readFile(file);
      res.writeHead(200, { "content-type": mime.get(path.extname(file).toLowerCase()) || "application/octet-stream", "cache-control": "no-store" });
      res.end(data);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function classify(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return "unknown";
  if (ratio < 0.72) return "portrait";
  if (ratio < 0.88) return "portrait-wide";
  if (ratio <= 1.12) return "square";
  if (ratio <= 1.85) return "landscape";
  if (ratio <= 2.65) return "wide-landscape";
  return "banner";
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const browser = await chromium.launch({ headless: true });
const targetEntries = (await readdir(ecosystemRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const viewports = [
  { key: "desktop", width: 1440, height: 1000 },
  { key: "mobile", width: 390, height: 844 }
];
const rows = [];
const broken = [];
const pageSet = new Set();
const targetSummary = {};

for (const target of targetEntries) {
  const targetRoot = path.join(ecosystemRoot, target);
  const rootIndex = await stat(path.join(targetRoot, "index.html")).catch(() => null);
  if (!rootIndex?.isFile()) continue;
  const routes = await discoverRoutes(targetRoot);
  targetSummary[target] = { pages: routes.length, imageInstances: 0, mismatches: 0, broken: 0 };
  const server = await startServer(targetRoot);
  const port = server.address().port;
  try {
    for (const route of routes) {
      pageSet.add(`${target}${route}`);
      for (const viewport of viewports) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
        const page = await context.newPage();
        const response = await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "networkidle", timeout: 30000 });
        if (!response?.ok()) throw new Error(`${target}${route}: candidate navigation did not return 2xx`);
        await page.evaluate(async () => {
          const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          for (const img of document.images) img.loading = "eager";
          const max = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0);
          const step = Math.max(300, Math.floor(window.innerHeight * 0.75));
          for (let y = 0; y <= max; y += step) { window.scrollTo(0, y); await sleep(20); }
          await Promise.all([...document.images].map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true }); img.addEventListener("error", resolve, { once: true }); setTimeout(resolve, 4000);
          })));
          window.scrollTo(0, 0);
        });
        const records = await page.evaluate(() => [...document.images].map((img, index) => {
          const rect = img.getBoundingClientRect();
          const style = getComputedStyle(img);
          const anchor = img.closest("a[href]");
          const classes = [img.className, img.id, img.closest("picture")?.className, img.parentElement?.className].filter(Boolean).join(" ");
          return {
            index,
            src: img.getAttribute("src") || "",
            currentSrc: img.currentSrc || "",
            alt: img.getAttribute("alt") || "",
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            renderedWidth: Math.round(rect.width),
            renderedHeight: Math.round(rect.height),
            objectFit: style.objectFit || "fill",
            classes: String(classes).replace(/\s+/g, " ").trim().slice(0, 240),
            href: anchor?.href || "",
            visible: !!(rect.width && rect.height && style.visibility !== "hidden" && style.display !== "none")
          };
        }));
        for (const record of records) {
          if (!record.visible) continue;
          if (record.naturalWidth <= 0 || record.naturalHeight <= 0) {
            broken.push({ target, route, viewport: viewport.key, ...record });
            targetSummary[target].broken += 1;
            continue;
          }
          const assetRatio = record.naturalWidth / record.naturalHeight;
          const slotRatio = record.renderedWidth / Math.max(1, record.renderedHeight);
          const assetShape = classify(assetRatio);
          const slotShape = classify(slotRatio);
          const sizeSmall = record.renderedWidth < 118 || record.renderedHeight < 72;
          const roleIgnore = /(logo|icon|avatar|badge|emblem|qr|stamp|seal|favicon)/i.test(`${record.classes} ${record.alt} ${record.src}`);
          const ratioDelta = Math.abs(Math.log(slotRatio / assetRatio));
          const mismatch = !sizeSmall && !roleIgnore && ratioDelta > 0.235;
          const action = mismatch ? "REPLACE_OR_RECREATE_TO_SLOT_SHAPE" : "KEEP";
          rows.push({
            target, route, viewport: viewport.key, imageIndex: record.index,
            src: record.src, currentSrc: record.currentSrc, alt: record.alt, href: record.href,
            naturalWidth: record.naturalWidth, naturalHeight: record.naturalHeight,
            assetRatio: Number(assetRatio.toFixed(3)), assetShape,
            renderedWidth: record.renderedWidth, renderedHeight: record.renderedHeight,
            slotRatio: Number(slotRatio.toFixed(3)), slotShape,
            objectFit: record.objectFit, classes: record.classes,
            ignoredSmallOrBrand: Boolean(sizeSmall || roleIgnore), mismatch, action
          });
          targetSummary[target].imageInstances += 1;
          if (mismatch) targetSummary[target].mismatches += 1;
        }
        await context.close();
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

await browser.close();
const mismatches = rows.filter((row) => row.mismatch);
const report = {
  generatedAt: new Date().toISOString(),
  ecosystemRoot,
  finalBuiltPageCount: pageSet.size,
  targetCount: Object.keys(targetSummary).length,
  renderedImageInstances: rows.length,
  mismatchInstances: mismatches.length,
  brokenImageInstances: broken.length,
  rule: "Square artwork belongs in square slots; landscape artwork belongs in landscape slots; portrait artwork belongs in portrait slots. Brand icons/logos and very small decorative images are excluded from aspect mismatch enforcement.",
  targetSummary,
  mismatches,
  broken,
  allImages: rows
};
await writeFile(path.join(outDir, "visual-fit-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

const headers = ["target","route","viewport","src","currentSrc","alt","href","naturalWidth","naturalHeight","assetShape","assetRatio","renderedWidth","renderedHeight","slotShape","slotRatio","objectFit","mismatch","action"];
const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(","))].join("\n") + "\n";
await writeFile(path.join(outDir, "visual-fit-report.csv"), csv, "utf8");
const summaryLines = [
  `FINAL_BUILT_PAGES=${report.finalBuiltPageCount}`,
  `TARGETS=${report.targetCount}`,
  `IMAGE_INSTANCES=${report.renderedImageInstances}`,
  `ASPECT_MISMATCHES=${report.mismatchInstances}`,
  `BROKEN_IMAGES=${report.brokenImageInstances}`,
  ...Object.entries(targetSummary).map(([key, value]) => `${key}: pages=${value.pages} images=${value.imageInstances} mismatches=${value.mismatches} broken=${value.broken}`)
];
await writeFile(path.join(outDir, "visual-fit-summary.txt"), `${summaryLines.join("\n")}\n`, "utf8");
console.log(summaryLines.join("\n"));
for (const row of mismatches) console.log(`MISMATCH\t${row.target}\t${row.route}\t${row.viewport}\t${row.assetShape}->${row.slotShape}\t${row.currentSrc || row.src}\t${row.href || "-"}`);

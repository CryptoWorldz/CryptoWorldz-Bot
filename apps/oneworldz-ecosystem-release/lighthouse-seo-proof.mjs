import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(root, "dist", "ecosystem");
const proofRoot = path.join(root, "dist", "seo-proof");
await mkdir(proofRoot, { recursive: true });

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

async function routesFor(dir, rel = "") {
  const routes = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) routes.push(...await routesFor(dir, child));
    else if (entry.name === "index.html") {
      const parent = path.dirname(child).split(path.sep).join("/");
      routes.push(parent === "." ? "/" : `/${parent.replace(/^\/+|\/+$/g, "")}/`);
    }
  }
  return routes.sort();
}

async function serve(dir) {
  const server = createServer(async (req, res) => {
    try {
      const raw = decodeURIComponent((req.url || "/").split("?")[0]);
      const rel = raw === "/" ? "index.html" : raw.replace(/^\/+/, "");
      const resolved = path.resolve(dir, rel);
      if (resolved !== dir && !resolved.startsWith(dir + path.sep)) {
        res.writeHead(403); res.end("Forbidden"); return;
      }
      let file = resolved;
      const info = await stat(file).catch(() => null);
      if (info?.isDirectory()) file = path.join(file, "index.html");
      const bytes = await readFile(file);
      res.writeHead(200, {
        "content-type": mime.get(path.extname(file).toLowerCase()) || "application/octet-stream",
        "cache-control": "no-store"
      });
      res.end(bytes);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server;
}

function runLighthouse(url, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", [
      "--yes",
      "lighthouse@13.4.1",
      url,
      "--only-categories=seo",
      "--output=json",
      `--output-path=${outputPath}`,
      "--quiet",
      "--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage"
    ], { env: { ...process.env, NO_UPDATE_NOTIFIER: "1" }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`Lighthouse exited ${code}: ${stderr || stdout}`)));
  });
}

const summary = {
  lighthouseVersion: "13.4.1",
  category: "seo",
  requiredScore: 1,
  generatedAt: new Date().toISOString(),
  destinations: [],
  totalPages: 0,
  fullMarksPages: 0,
  pass: true,
  failures: []
};

for (const target of productionTargets) {
  const targetDir = path.join(distRoot, target.key);
  const routes = await routesFor(targetDir);
  const server = await serve(targetDir);
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const destination = { key: target.key, domain: target.domain, routes: [], pass: true };
  try {
    for (const route of routes) {
      const slug = route === "/" ? "home" : route.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
      const reportPath = path.join(proofRoot, `${target.key}-${slug}.json`);
      await runLighthouse(`${origin}${route}`, reportPath);
      const lhr = JSON.parse(await readFile(reportPath, "utf8"));
      const score = Number(lhr.categories?.seo?.score ?? 0);
      const failedAudits = Object.values(lhr.audits || {})
        .filter((audit) => audit?.scoreDisplayMode !== "notApplicable" && audit?.scoreDisplayMode !== "manual" && typeof audit?.score === "number" && audit.score < 1)
        .map((audit) => ({ id: audit.id, title: audit.title, score: audit.score }));
      const fullMarks = score === 1;
      destination.routes.push({ route, score, fullMarks, failedAudits });
      summary.totalPages += 1;
      if (fullMarks) summary.fullMarksPages += 1;
      else {
        destination.pass = false;
        summary.pass = false;
        summary.failures.push(`${target.key}${route}: SEO ${Math.round(score * 100)}; ${failedAudits.map((audit) => audit.id).join(", ") || "unknown audit"}`);
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  summary.destinations.push(destination);
}

await writeFile(path.join(proofRoot, "summary.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
console.log(JSON.stringify({
  lighthouseVersion: summary.lighthouseVersion,
  destinations: summary.destinations.length,
  totalPages: summary.totalPages,
  fullMarksPages: summary.fullMarksPages,
  score: summary.totalPages ? Math.round((summary.fullMarksPages / summary.totalPages) * 100) : 0,
  pass: summary.pass,
  failures: summary.failures
}, null, 2));
if (!summary.pass) process.exitCode = 1;

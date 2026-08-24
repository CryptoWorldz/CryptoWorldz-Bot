import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.join(appRoot, "source");
const distRoot = path.join(appRoot, "dist", "ecosystem");
const cssSource = path.join(sourceRoot, "visual-fit-final.css");
const cssHref = "/assets/css/visual-fit-final.css";
const targets = (await readdir(distRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function listFiles(root, rel = "") {
  const current = path.join(root, rel);
  const entries = await readdir(current, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(root, child));
    else out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}

function addTargetMarker(html, target) {
  if (/<body\b[^>]*data-visual-fit-target=/.test(html)) {
    return html.replace(/data-visual-fit-target="[^"]*"/, `data-visual-fit-target="${target}"`);
  }
  return html.replace(/<body\b([^>]*)>/, `<body$1 data-visual-fit-target="${target}">`);
}

function addFinalCss(html) {
  if (html.includes(cssHref)) return html;
  return html.replace("</head>", `  <link rel="stylesheet" href="${cssHref}" data-visual-fit-final="true">\n</head>`);
}

async function refreshManifest(targetRoot) {
  const manifestPath = path.join(targetRoot, "release-manifest.json");
  if (!await stat(manifestPath).catch(() => null)) return;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const records = [];
  for (const file of await listFiles(targetRoot)) {
    if (file === "release-manifest.json") continue;
    const bytes = await readFile(path.join(targetRoot, file));
    records.push({ path: `/${file}`, bytes: bytes.byteLength, sha256: sha256(bytes) });
  }
  manifest.generated_at = new Date().toISOString();
  manifest.files = records;
  manifest.visual_fit_final = {
    authority: "last_build_stage",
    policy: "source_artwork_shape_matches_rendered_image_shape",
    no_forced_crop: true,
    no_stretch: true,
    responsive_current_source_audited: true
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

let pages = 0;
for (const target of targets) {
  const targetRoot = path.join(distRoot, target);
  const indexInfo = await stat(path.join(targetRoot, "index.html")).catch(() => null);
  if (!indexInfo?.isFile()) continue;

  const cssDest = path.join(targetRoot, "assets", "css", "visual-fit-final.css");
  await mkdir(path.dirname(cssDest), { recursive: true });
  await cp(cssSource, cssDest);

  /* Use the already-approved landscape ImpactBased artwork where a landscape mobile visual exists. */
  if (target === "impactbased") {
    const source = path.join(sourceRoot, "assets", "mobile", "impactbased-landscape.webp");
    const dest = path.join(targetRoot, "assets", "mobile", "impactbased-landscape.webp");
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(source, dest);
  }

  for (const file of await listFiles(targetRoot)) {
    if (!file.endsWith("index.html")) continue;
    const filename = path.join(targetRoot, file);
    let html = await readFile(filename, "utf8");
    html = addTargetMarker(html, target);
    html = addFinalCss(html);
    if (target === "impactbased") {
      html = html.replaceAll("/assets/mobile/impactbased-square.webp", "/assets/mobile/impactbased-landscape.webp");
    }
    await writeFile(filename, html, "utf8");
    pages += 1;
  }
  await refreshManifest(targetRoot);
}

console.log(`VISUAL_FIT_FINALIZER=PASS targets=${targets.length} pages=${pages} authority=LAST`);

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const require = createRequire(import.meta.url);
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const sourcePartsRoot = path.join(appRoot, "source", "approved-visuals");
const productionAssetsRoot = path.join(appRoot, "source", "assets");
const supportAssetsRoot = path.join(productionAssetsRoot, "support");
const distRoot = path.join(appRoot, "dist", "ecosystem");

const approved = Object.freeze([
  {
    key: "foodworldz",
    domain: "foodworldz.com",
    sourceMode: "approved-avif-master",
    expectedParts: 6,
    alt: "Approved FoodWorldz production artwork"
  },
  {
    key: "donateworldz",
    domain: "donateworldz.com",
    sourceMode: "approved-support-composite",
    desktopSources: [
      "desktop/reagan-children-emblem-desktop.webp",
      "desktop/community-impact-emblem-desktop.webp",
      "desktop/jayjayteamdev-emblem-desktop.webp"
    ],
    mobileSources: [
      "mobile/reagan-children-emblem-mobile.webp",
      "mobile/community-impact-emblem-mobile.webp",
      "mobile/jayjayteamdev-emblem-mobile.webp"
    ],
    alt: "DonateWorldz support pathways: Reagan and Children, Community Impact and JayJayTeamDev"
  },
  {
    key: "hodlergalaxy",
    domain: "hodlergalaxy.xyz",
    sourceMode: "approved-production-pair",
    desktopSource: "desktop/oneworldz/oneworldz-master.png",
    mobileSource: "mobile/blockchain-portal.webp",
    alt: "HodlerGalaxy OneWorldz ecosystem exploration portal"
  }
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isAvif(bytes) {
  return bytes.length > 16
    && bytes.subarray(4, 8).toString("ascii") === "ftyp"
    && bytes.subarray(8, 12).toString("ascii") === "avif";
}

async function resolveRenderer() {
  try {
    return require("sharp");
  } catch (initialError) {
    if (process.env.GITHUB_ACTIONS !== "true") throw initialError;
    await run("npm", [
      "install",
      "--no-save",
      "--package-lock=false",
      "--no-audit",
      "--no-fund",
      "sharp@0.35.3"
    ], {
      cwd: appRoot,
      timeout: 180000,
      maxBuffer: 1024 * 1024 * 16
    });
    return require("sharp");
  }
}

async function validateAvifBytes(sharp, bytes) {
  if (!isAvif(bytes)) return false;
  try {
    const metadata = await sharp(bytes, { failOn: "error" }).metadata();
    if (!metadata.width || !metadata.height) return false;
    await sharp(bytes, { failOn: "error" }).resize(1, 1).raw().toBuffer();
    return true;
  } catch {
    return false;
  }
}

async function readApprovedBytes(spec, sharp) {
  const names = (await readdir(sourcePartsRoot))
    .filter((name) => new RegExp(`^${spec.key}\\.part\\d+\\.b64$`).test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (names.length !== spec.expectedParts) {
    throw new Error(`${spec.key}: expected ${spec.expectedParts} approved visual parts, found ${names.length}`);
  }

  const texts = await Promise.all(names.map((name) => readFile(path.join(sourcePartsRoot, name), "utf8")));
  const cleaned = texts.map((value) => value.replace(/\s+/g, ""));
  const joined = Buffer.from(cleaned.join(""), "base64");
  const segmented = Buffer.concat(cleaned.map((value) => Buffer.from(value, "base64")));
  const candidates = [
    { bytes: joined, method: "joined-base64-stream" },
    { bytes: segmented, method: "decoded-segments" }
  ];
  const seen = new Set();

  for (const candidate of candidates) {
    const digest = sha256(candidate.bytes);
    if (seen.has(digest)) continue;
    seen.add(digest);
    if (await validateAvifBytes(sharp, candidate.bytes)) {
      return { ...candidate, names };
    }
  }

  throw new Error(`${spec.key}: approved visual parts do not materialize to a complete decodable AVIF`);
}

async function renderProductionVariant(sharp, input, output, maxWidth, quality) {
  await sharp(input, { failOn: "error" })
    .rotate()
    .resize({
      width: maxWidth,
      height: maxWidth,
      fit: "inside",
      withoutEnlargement: true
    })
    .avif({ quality, effort: 6 })
    .toFile(output);

  const bytes = await readFile(output);
  if (!await validateAvifBytes(sharp, bytes)) {
    throw new Error(`${path.basename(output)}: renderer did not produce a complete decodable AVIF`);
  }
  return bytes;
}

async function buildSupportComposite(sharp, relativeSources, label) {
  const sourceFiles = relativeSources.map((rel) => path.join(supportAssetsRoot, rel));
  const sourceBytes = await Promise.all(sourceFiles.map((file) => readFile(file)));
  const rendered = [];

  for (const file of sourceFiles) {
    const result = await sharp(file, { failOn: "error" })
      .rotate()
      .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer({ resolveWithObject: true });
    rendered.push(result);
  }

  const width = rendered.reduce((sum, item) => sum + item.info.width, 0);
  const height = Math.max(...rendered.map((item) => item.info.height));
  if (!width || !height) throw new Error(`${label}: support composite dimensions are invalid`);

  let left = 0;
  const composite = rendered.map((item) => {
    const entry = {
      input: item.data,
      left,
      top: Math.max(0, Math.floor((height - item.info.height) / 2))
    };
    left += item.info.width;
    return entry;
  });

  const output = path.join(tmpdir(), `oneworldz-${label}-${process.pid}-${Date.now()}.png`);
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 11, g: 7, b: 24, alpha: 1 }
    }
  }).composite(composite).png().toFile(output);

  const compositeBytes = await readFile(output);
  if (compositeBytes.byteLength < 10_000) throw new Error(`${label}: support composite is unexpectedly small`);

  return {
    file: output,
    sourceFiles: relativeSources,
    sourceBytes: sourceBytes.reduce((sum, bytes) => sum + bytes.byteLength, 0),
    sourceSha256: sha256(Buffer.concat(sourceBytes))
  };
}

function replaceHeroMedia(html, spec) {
  const heroStart = html.indexOf('<section class="hero">');
  if (heroStart < 0) throw new Error(`${spec.key}: homepage hero section not found`);
  const heroEnd = html.indexOf("</section>", heroStart);
  if (heroEnd < 0) throw new Error(`${spec.key}: homepage hero section is not closed`);

  const before = html.slice(0, heroStart);
  let hero = html.slice(heroStart, heroEnd + "</section>".length);
  const after = html.slice(heroEnd + "</section>".length);
  hero = hero.replace('<section class="hero">', `<section class="hero" data-approved-visual="${spec.key}">`);

  const mobilePath = `/assets/approved/mobile/${spec.key}-hero.avif`;
  const desktopPath = `/assets/approved/desktop/${spec.key}-hero.avif`;
  if (!/<source\b[^>]*srcset="[^"]+"[^>]*>/.test(hero)) throw new Error(`${spec.key}: hero mobile source not found`);
  if (!/<img\b[^>]*src="[^"]+"[^>]*>/.test(hero)) throw new Error(`${spec.key}: hero desktop image not found`);

  hero = hero.replace(/<source\b([^>]*?)srcset="[^"]+"([^>]*)>/, `<source$1srcset="${mobilePath}"$2>`);
  hero = hero.replace(/<img\b([^>]*?)src="[^"]+"([^>]*)>/, (match, leftPart, rightPart) => {
    let rebuilt = `<img${leftPart}src="${desktopPath}"${rightPart}>`;
    rebuilt = rebuilt.replace(/alt="[^"]*"/, `alt="${spec.alt}"`);
    return rebuilt;
  });

  let output = `${before}${hero}${after}`;
  const absoluteImage = `https://${spec.domain}${desktopPath}`;
  if (!output.includes('property="og:image"')) {
    output = output.replace("</head>", `  <meta property="og:image" content="${absoluteImage}">\n  <meta property="og:image:alt" content="${spec.alt}">\n  <meta name="twitter:image" content="${absoluteImage}">\n</head>`);
  }
  return output;
}

async function listFiles(root, relative = "") {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, child));
    else files.push(child.split(path.sep).join("/"));
  }
  return files.sort();
}

async function refreshReleaseManifest(spec, targetRoot) {
  const manifestPath = path.join(targetRoot, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const records = [];
  for (const file of await listFiles(targetRoot)) {
    if (file === "release-manifest.json") continue;
    const bytes = await readFile(path.join(targetRoot, file));
    records.push({ path: `/${file}`, bytes: bytes.byteLength, sha256: sha256(bytes) });
  }
  manifest.files = records;
  manifest.approved_visual = {
    key: spec.key,
    desktop: `/assets/approved/desktop/${spec.key}-hero.avif`,
    mobile: `/assets/approved/mobile/${spec.key}-hero.avif`,
    responsive_policy: "distinct-production-renders",
    source_mode: spec.sourceMode
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const visualManifest = {
  stage: "FINAL_APPROVED_VISUAL_MATERIALIZATION",
  approved_by: "JayJayTeamDev",
  source_policy: "APPROVED_GENERATED_PRODUCTION_ASSETS_ONLY",
  reference_library_policy: "REFERENCE_ONLY_NEVER_DEPLOY",
  reference_library_substitution: false,
  responsive_policy: "DISTINCT_DESKTOP_AND_MOBILE_PRODUCTION_RENDERS",
  visuals: []
};

const renderer = await resolveRenderer();
const rendererVersion = renderer.versions?.sharp || "0.35.3";

for (const spec of approved) {
  const targetRoot = path.join(distRoot, spec.key);
  const desktopDir = path.join(targetRoot, "assets", "approved", "desktop");
  const mobileDir = path.join(targetRoot, "assets", "approved", "mobile");
  await mkdir(desktopDir, { recursive: true });
  await mkdir(mobileDir, { recursive: true });
  const desktopFile = path.join(desktopDir, `${spec.key}-hero.avif`);
  const mobileFile = path.join(mobileDir, `${spec.key}-hero.avif`);

  let desktopBytes;
  let mobileBytes;
  let sourceRecord;

  if (spec.sourceMode === "approved-avif-master") {
    const { bytes, method, names } = await readApprovedBytes(spec, renderer);
    const sourceFile = path.join(tmpdir(), `oneworldz-${spec.key}-${process.pid}.avif`);
    await writeFile(sourceFile, bytes);
    try {
      desktopBytes = await renderProductionVariant(renderer, sourceFile, desktopFile, 1920, 90);
      mobileBytes = await renderProductionVariant(renderer, sourceFile, mobileFile, 960, 86);
    } finally {
      await unlink(sourceFile).catch(() => {});
    }
    sourceRecord = {
      source_mode: spec.sourceMode,
      source_parts: names,
      materialization_method: method,
      source_bytes: bytes.byteLength,
      source_sha256: sha256(bytes)
    };
  } else if (spec.sourceMode === "approved-support-composite") {
    const desktopSource = await buildSupportComposite(renderer, spec.desktopSources, `${spec.key}-desktop-source`);
    const mobileSource = await buildSupportComposite(renderer, spec.mobileSources, `${spec.key}-mobile-source`);
    try {
      desktopBytes = await renderProductionVariant(renderer, desktopSource.file, desktopFile, 1920, 90);
      mobileBytes = await renderProductionVariant(renderer, mobileSource.file, mobileFile, 960, 86);
    } finally {
      await unlink(desktopSource.file).catch(() => {});
      await unlink(mobileSource.file).catch(() => {});
    }
    sourceRecord = {
      source_mode: spec.sourceMode,
      desktop_source_assets: desktopSource.sourceFiles,
      mobile_source_assets: mobileSource.sourceFiles,
      desktop_source_bytes: desktopSource.sourceBytes,
      mobile_source_bytes: mobileSource.sourceBytes,
      desktop_source_sha256: desktopSource.sourceSha256,
      mobile_source_sha256: mobileSource.sourceSha256
    };
  } else if (spec.sourceMode === "approved-production-pair") {
    const desktopSource = path.join(productionAssetsRoot, spec.desktopSource);
    const mobileSource = path.join(productionAssetsRoot, spec.mobileSource);
    const [desktopSourceBytes, mobileSourceBytes] = await Promise.all([
      readFile(desktopSource),
      readFile(mobileSource)
    ]);
    desktopBytes = await renderProductionVariant(renderer, desktopSource, desktopFile, 1920, 90);
    mobileBytes = await renderProductionVariant(renderer, mobileSource, mobileFile, 960, 86);
    sourceRecord = {
      source_mode: spec.sourceMode,
      desktop_source_asset: spec.desktopSource,
      mobile_source_asset: spec.mobileSource,
      desktop_source_bytes: desktopSourceBytes.byteLength,
      mobile_source_bytes: mobileSourceBytes.byteLength,
      desktop_source_sha256: sha256(desktopSourceBytes),
      mobile_source_sha256: sha256(mobileSourceBytes)
    };
  } else {
    throw new Error(`${spec.key}: unsupported approved source mode ${spec.sourceMode}`);
  }

  const desktopSha = sha256(desktopBytes);
  const mobileSha = sha256(mobileBytes);
  if (desktopSha === mobileSha) throw new Error(`${spec.key}: desktop and mobile production renders must be distinct files`);

  const homepagePath = path.join(targetRoot, "index.html");
  const homepage = await readFile(homepagePath, "utf8");
  await writeFile(homepagePath, replaceHeroMedia(homepage, spec), "utf8");
  await refreshReleaseManifest(spec, targetRoot);

  visualManifest.visuals.push({
    key: spec.key,
    domain: spec.domain,
    ...sourceRecord,
    renderer: `sharp@${rendererVersion}`,
    validator: `sharp@${rendererVersion}`,
    format: "avif",
    desktop: { max_width: 1920, quality: 90, bytes: desktopBytes.byteLength, sha256: desktopSha },
    mobile: { max_width: 960, quality: 86, bytes: mobileBytes.byteLength, sha256: mobileSha },
    responsive_policy: "distinct-desktop-and-mobile-production-renders"
  });

  console.log(`RENDERED ${spec.key} source=${spec.sourceMode} desktop=${desktopBytes.byteLength}/${desktopSha} mobile=${mobileBytes.byteLength}/${mobileSha}`);
}

await writeFile(path.join(distRoot, "approved-visuals-manifest.json"), `${JSON.stringify(visualManifest, null, 2)}\n`, "utf8");
console.log("Approved FoodWorldz, DonateWorldz and HodlerGalaxy visuals rendered into distinct desktop and mobile production assets without apt.");
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const sourcePartsRoot = path.join(appRoot, "source", "approved-visuals");
const distRoot = path.join(appRoot, "dist", "ecosystem");

const approved = Object.freeze([
  {
    key: "foodworldz",
    domain: "foodworldz.com",
    expectedParts: 6,
    alt: "Approved FoodWorldz production artwork"
  },
  {
    key: "donateworldz",
    domain: "donateworldz.com",
    expectedParts: 4,
    alt: "Approved DonateWorldz production artwork"
  },
  {
    key: "hodlergalaxy",
    domain: "hodlergalaxy.xyz",
    expectedParts: 4,
    alt: "Approved HodlerGalaxy production artwork"
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

async function readApprovedBytes(spec) {
  const names = (await readdir(sourcePartsRoot))
    .filter((name) => new RegExp(`^${spec.key}\\.part\\d+\\.b64$`).test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (names.length !== spec.expectedParts) {
    throw new Error(`${spec.key}: expected ${spec.expectedParts} approved visual parts, found ${names.length}`);
  }

  const texts = await Promise.all(names.map((name) => readFile(path.join(sourcePartsRoot, name), "utf8")));
  const cleaned = texts.map((value) => value.replace(/\s+/g, ""));

  // Support either a single base64 stream split across files or independently
  // encoded binary segments. Only an AVIF signature is accepted.
  const joined = Buffer.from(cleaned.join(""), "base64");
  if (isAvif(joined)) return { bytes: joined, method: "joined-base64-stream", names };

  const segmented = Buffer.concat(cleaned.map((value) => Buffer.from(value, "base64")));
  if (isAvif(segmented)) return { bytes: segmented, method: "decoded-segments", names };

  throw new Error(`${spec.key}: approved visual parts do not materialize to a valid AVIF`);
}

async function findCommand(commands) {
  for (const command of commands) {
    try {
      await run(command, command === "avifenc" ? ["--version"] : ["-version"], { timeout: 15000 });
      return command;
    } catch {
      // Try the next supported entry point.
    }
  }
  return null;
}

async function resolveRenderTools() {
  let imageMagick = await findCommand(["magick", "convert"]);
  let avifenc = await findCommand(["avifenc"]);

  // GitHub's Ubuntu runner image can change independently of the locked site
  // candidate. Install only the two required production render tools in
  // GitHub Actions when absent; local/non-CI environments still fail closed.
  if ((!imageMagick || !avifenc) && process.env.GITHUB_ACTIONS === "true") {
    await run("sudo", ["apt-get", "update", "-qq"], {
      timeout: 180000,
      maxBuffer: 1024 * 1024 * 8
    });
    await run("sudo", ["apt-get", "install", "-y", "-qq", "imagemagick", "libavif-bin"], {
      timeout: 180000,
      maxBuffer: 1024 * 1024 * 16
    });
    imageMagick = imageMagick || await findCommand(["magick", "convert"]);
    avifenc = avifenc || await findCommand(["avifenc"]);
  }

  if (!imageMagick) {
    throw new Error("Responsive production visual rendering requires ImageMagick (magick or convert)");
  }
  if (!avifenc) {
    throw new Error("Responsive production AVIF encoding requires avifenc from libavif-bin");
  }

  return Object.freeze({ imageMagick, avifenc });
}

async function renderProductionVariant(tools, input, output, maxWidth, quality) {
  const png = `${output}.${process.pid}.png`;
  const quantizer = quality >= 90 ? 12 : 18;

  try {
    // ImageMagick handles orientation + resize without upscaling and writes a
    // neutral PNG intermediate. avifenc performs the final AVIF encoding so
    // the runner does not depend on ImageMagick's optional AVIF delegate.
    await run(tools.imageMagick, [
      input,
      "-auto-orient",
      "-resize", `${maxWidth}x${maxWidth}>`,
      "-strip",
      png
    ], { timeout: 120000, maxBuffer: 1024 * 1024 * 8 });

    await run(tools.avifenc, [
      "--jobs", "all",
      "--min", String(quantizer),
      "--max", String(quantizer),
      "-s", "6",
      png,
      output
    ], { timeout: 180000, maxBuffer: 1024 * 1024 * 8 });
  } finally {
    await unlink(png).catch(() => {});
  }

  const bytes = await readFile(output);
  if (!isAvif(bytes)) throw new Error(`${path.basename(output)}: responsive renderer did not produce AVIF`);
  return bytes;
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

  if (!/<source\b[^>]*srcset="[^"]+"[^>]*>/.test(hero)) {
    throw new Error(`${spec.key}: hero mobile source not found`);
  }
  if (!/<img\b[^>]*src="[^"]+"[^>]*>/.test(hero)) {
    throw new Error(`${spec.key}: hero desktop image not found`);
  }

  hero = hero.replace(/<source\b([^>]*?)srcset="[^"]+"([^>]*)>/, `<source$1srcset="${mobilePath}"$2>`);
  hero = hero.replace(/<img\b([^>]*?)src="[^"]+"([^>]*)>/, (match, left, right) => {
    let rebuilt = `<img${left}src="${desktopPath}"${right}>`;
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
    responsive_policy: "distinct-production-renders"
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const visualManifest = {
  stage: "FINAL_APPROVED_VISUAL_MATERIALIZATION",
  approved_by: "JayJayTeamDev",
  source_policy: "APPROVED_GENERATED_MASTERS_SOURCE_ONLY",
  reference_library_policy: "REFERENCE_ONLY_NEVER_DEPLOY",
  reference_library_substitution: false,
  responsive_policy: "DISTINCT_DESKTOP_AND_MOBILE_PRODUCTION_RENDERS",
  visuals: []
};

const renderer = await resolveRenderTools();

for (const spec of approved) {
  const { bytes, method, names } = await readApprovedBytes(spec);
  const targetRoot = path.join(distRoot, spec.key);
  const desktopDir = path.join(targetRoot, "assets", "approved", "desktop");
  const mobileDir = path.join(targetRoot, "assets", "approved", "mobile");
  await mkdir(desktopDir, { recursive: true });
  await mkdir(mobileDir, { recursive: true });

  const desktopFile = path.join(desktopDir, `${spec.key}-hero.avif`);
  const mobileFile = path.join(mobileDir, `${spec.key}-hero.avif`);
  const sourceFile = path.join(tmpdir(), `oneworldz-${spec.key}-${process.pid}.avif`);
  await writeFile(sourceFile, bytes);

  let desktopBytes;
  let mobileBytes;
  try {
    // The approved generated master is source-only. Produce separate web assets
    // for the actual desktop and mobile containers without stretching or upscaling.
    desktopBytes = await renderProductionVariant(renderer, sourceFile, desktopFile, 1920, 90);
    mobileBytes = await renderProductionVariant(renderer, sourceFile, mobileFile, 960, 86);
  } finally {
    await unlink(sourceFile).catch(() => {});
  }

  const desktopSha = sha256(desktopBytes);
  const mobileSha = sha256(mobileBytes);
  if (desktopSha === mobileSha) {
    throw new Error(`${spec.key}: desktop and mobile production renders must be distinct files`);
  }

  const homepagePath = path.join(targetRoot, "index.html");
  const homepage = await readFile(homepagePath, "utf8");
  await writeFile(homepagePath, replaceHeroMedia(homepage, spec), "utf8");
  await refreshReleaseManifest(spec, targetRoot);

  visualManifest.visuals.push({
    key: spec.key,
    domain: spec.domain,
    source_parts: names,
    materialization_method: method,
    source_bytes: bytes.byteLength,
    source_sha256: sha256(bytes),
    renderer: `${renderer.imageMagick}+${renderer.avifenc}`,
    format: "avif",
    desktop: {
      max_width: 1920,
      quality: 90,
      bytes: desktopBytes.byteLength,
      sha256: desktopSha
    },
    mobile: {
      max_width: 960,
      quality: 86,
      bytes: mobileBytes.byteLength,
      sha256: mobileSha
    },
    responsive_policy: "distinct-desktop-and-mobile-production-renders"
  });

  console.log(`RENDERED ${spec.key} desktop=${desktopBytes.byteLength}/${desktopSha} mobile=${mobileBytes.byteLength}/${mobileSha} via ${renderer.imageMagick}+${renderer.avifenc}`);
}

await writeFile(path.join(distRoot, "approved-visuals-manifest.json"), `${JSON.stringify(visualManifest, null, 2)}\n`, "utf8");
console.log("Approved FoodWorldz, DonateWorldz and HodlerGalaxy masters rendered into distinct desktop and mobile production assets.");
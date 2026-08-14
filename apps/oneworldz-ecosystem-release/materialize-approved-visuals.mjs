import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    mobile: `/assets/approved/mobile/${spec.key}-hero.avif`
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const visualManifest = {
  stage: "FINAL_APPROVED_VISUAL_MATERIALIZATION",
  approved_by: "JayJayTeamDev",
  source_policy: "APPROVED_GENERATED_ARTWORK_ONLY",
  reference_library_substitution: false,
  visuals: []
};

for (const spec of approved) {
  const { bytes, method, names } = await readApprovedBytes(spec);
  const targetRoot = path.join(distRoot, spec.key);
  const desktopDir = path.join(targetRoot, "assets", "approved", "desktop");
  const mobileDir = path.join(targetRoot, "assets", "approved", "mobile");
  await mkdir(desktopDir, { recursive: true });
  await mkdir(mobileDir, { recursive: true });

  const desktopFile = path.join(desktopDir, `${spec.key}-hero.avif`);
  const mobileFile = path.join(mobileDir, `${spec.key}-hero.avif`);

  // Preserve the exact approved master on both responsive paths. No unapproved
  // crop, redraw, recompression or library substitution is introduced here.
  await writeFile(desktopFile, bytes);
  await writeFile(mobileFile, bytes);

  const homepagePath = path.join(targetRoot, "index.html");
  const homepage = await readFile(homepagePath, "utf8");
  await writeFile(homepagePath, replaceHeroMedia(homepage, spec), "utf8");
  await refreshReleaseManifest(spec, targetRoot);

  visualManifest.visuals.push({
    key: spec.key,
    domain: spec.domain,
    source_parts: names,
    materialization_method: method,
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
    format: "avif",
    responsive_policy: "exact-approved-master-on-desktop-and-mobile-paths"
  });

  console.log(`MATERIALIZED ${spec.key} ${bytes.byteLength} bytes ${sha256(bytes)} via ${method}`);
}

await writeFile(path.join(distRoot, "approved-visuals-manifest.json"), `${JSON.stringify(visualManifest, null, 2)}\n`, "utf8");
console.log("Approved FoodWorldz, DonateWorldz and HodlerGalaxy visuals materialized into the verified release packages.");

import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deploymentTargets } from "./site-data.mjs";
import {
  chainHome,
  commandCentrePage,
  cryptoHome,
  divisionPage,
  divisions,
  impactBasedPage,
  lawPage,
  learnPage,
  miniAppPage,
  pdcPage,
  supportPage,
  worldz
} from "./template.mjs";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.join(appRoot, "source");
const distRoot = path.join(appRoot, "dist", "ecosystem");
const generatedAt = new Date().toISOString();

async function writeRoute(targetRoot, route, html) {
  const routeRoot = path.join(targetRoot, route);
  await mkdir(routeRoot, { recursive: true });
  await writeFile(path.join(routeRoot, "index.html"), html, "utf8");
}

async function copyShellAssets(targetRoot) {
  const assetsRoot = path.join(targetRoot, "assets");
  await mkdir(path.join(assetsRoot, "css"), { recursive: true });
  await mkdir(path.join(assetsRoot, "js"), { recursive: true });
  await cp(path.join(sourceRoot, "site.css"), path.join(assetsRoot, "css", "site.css"));
  await cp(path.join(sourceRoot, "site.js"), path.join(assetsRoot, "js", "site.js"));
}

async function copyReferencedMedia(targetRoot) {
  const files = await listFiles(targetRoot);
  const media = new Set();
  for (const file of files.filter((candidate) => candidate.endsWith(".html"))) {
    const html = await readFile(path.join(targetRoot, file), "utf8");
    for (const match of html.matchAll(/(?:src|srcset)="(\/assets\/(?:desktop|mobile|support)\/[^"?#]+)"/g)) {
      media.add(match[1].slice("/assets/".length));
    }
  }
  for (const relative of [...media].sort()) {
    if (relative.includes("..")) throw new Error(`Unsafe media path: ${relative}`);
    const source = path.join(sourceRoot, "assets", relative);
    const destination = path.join(targetRoot, "assets", relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination);
  }
}

async function listFiles(root, relative = "") {
  const current = path.join(root, relative);
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".rsync")) continue;
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, child));
    else files.push(child.split(path.sep).join("/"));
  }
  return files.sort();
}

async function createPackageManifest(target, targetRoot) {
  const files = await listFiles(targetRoot);
  const records = [];
  for (const file of files) {
    const bytes = await readFile(path.join(targetRoot, file));
    records.push({
      path: `/${file}`,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex")
    });
  }
  const manifest = {
    release: "oneworldz-ecosystem-locked-v1",
    generated_at: generatedAt,
    target: target.key,
    live_url: `https://${target.domain}/`,
    github_environment: target.environment,
    deploy_guard: target.guard,
    ftp_account_scope: "DOMAIN_ONLY",
    ftp_root: "/",
    homepage: "/index.html",
    assets_root: "/assets/",
    protected_services_modified: [],
    files: records
  };
  await writeFile(path.join(targetRoot, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function buildTarget(target) {
  const targetRoot = path.join(distRoot, target.key);
  await mkdir(targetRoot, { recursive: true });
  await copyShellAssets(targetRoot);

  if (target.key === "cryptoworldz") {
    await writeRoute(targetRoot, "", cryptoHome());
    await writeRoute(targetRoot, "command-centre", commandCentrePage());
    await writeRoute(targetRoot, "miniapp", miniAppPage());
    await writeRoute(targetRoot, "support/reagan-children", supportPage("reagan"));
    await writeRoute(targetRoot, "support/community-impact", supportPage("community"));
    await writeRoute(targetRoot, "support/jayjayteamdev", supportPage("jayjay"));
    for (const division of divisions) await writeRoute(targetRoot, `divisions/${division.key}`, divisionPage(division));
  } else if (target.key === "purplediamondcrew") {
    await writeRoute(targetRoot, "", pdcPage());
  } else if (target.key === "impactbased") {
    await writeRoute(targetRoot, "", impactBasedPage());
  } else if (target.key === "law-oneworldz") {
    await writeRoute(targetRoot, "", lawPage());
  } else if (target.key === "learn-oneworldz") {
    await writeRoute(targetRoot, "", learnPage());
  } else {
    const world = worldz.find((candidate) => candidate.key === target.key);
    if (!world) throw new Error(`No Worldz configuration for ${target.key}`);
    await writeRoute(targetRoot, "", chainHome(world));
  }

  await copyReferencedMedia(targetRoot);
  await createPackageManifest(target, targetRoot);
}

await rm(path.join(appRoot, "dist"), { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });
for (const target of deploymentTargets) await buildTarget(target);

const fleetManifest = {
  release: "oneworldz-ecosystem-locked-v1",
  generated_at: generatedAt,
  protected_unchanged: ["https://oneworldz.com", linksSafe("https://cryptobotz.cryptoworldz.xyz")],
  targets: deploymentTargets.map((target) => ({
    ...target,
    package: `./${target.key}/`,
    live_url: `https://${target.domain}/`
  }))
};
await writeFile(path.join(distRoot, "fleet-manifest.json"), `${JSON.stringify(fleetManifest, null, 2)}\n`, "utf8");

function linksSafe(value) {
  return value;
}

console.log(`Built ${deploymentTargets.length} domain packages at ${distRoot}`);

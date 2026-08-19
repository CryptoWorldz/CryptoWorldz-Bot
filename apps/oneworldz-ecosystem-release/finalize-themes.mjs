import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { experienceContract } from "./experience-contract.mjs";
import { productionTargets } from "./production-targets.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist", "ecosystem");
const OLD_JAY_SUPPORT = "https://donateworldz.com/jayjayteamdev/";
const CURRENT_JAY_SUPPORT = "https://donateworldz.com/support-jayjayteamdev/";

async function listHtml(dir, rel = "") {
  const out = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await listHtml(dir, child));
    else if (entry.name.endsWith(".html")) out.push(child);
  }
  return out;
}
function themeCss(theme) {
  return `:root{--experience-bg:${theme.bg};--experience-primary:${theme.primary};--experience-accent:${theme.accent};--experience-accent-2:${theme.accent2}}body.experience-theme{background:radial-gradient(circle at 82% -8%,color-mix(in srgb,var(--experience-accent) 25%,transparent),transparent 35%),radial-gradient(circle at 0 36%,color-mix(in srgb,var(--experience-accent-2) 14%,transparent),transparent 32%),var(--experience-bg);color:var(--experience-primary)}body.experience-theme .site-header{background:color-mix(in srgb,var(--experience-bg) 90%,transparent);border-color:color-mix(in srgb,var(--experience-accent) 30%,transparent)}body.experience-theme .eyebrow,body.experience-theme a:not(.button){color:var(--experience-accent)}body.experience-theme .button.primary{background:linear-gradient(90deg,var(--experience-accent),var(--experience-accent-2));color:${theme.bg};border-color:color-mix(in srgb,var(--experience-accent) 75%,white)}body.experience-theme .button.secondary{border-color:color-mix(in srgb,var(--experience-accent) 55%,transparent)}body.experience-theme .section-dark,body.experience-theme .info-grid article{background:color-mix(in srgb,var(--experience-bg) 80%,black 20%);border-color:color-mix(in srgb,var(--experience-accent) 22%,transparent)}body.experience-theme .brand-profile{box-shadow:0 0 26px color-mix(in srgb,var(--experience-accent) 35%,transparent)}body.experience-theme .hero{position:relative;isolation:isolate}body.experience-theme .hero::after{content:"${theme.motif.replaceAll('"','')}";position:absolute;right:5%;bottom:4%;z-index:-1;color:color-mix(in srgb,var(--experience-accent) 11%,transparent);font-size:clamp(28px,7vw,74px);font-weight:900;letter-spacing:.08em;text-transform:uppercase;pointer-events:none}`;
}
function addBodyClass(html, key) {
  if (html.includes("experience-theme")) return html;
  return html.replace(/<body([^>]*)>/, (match, attrs) => {
    if (/class="/.test(attrs)) return `<body${attrs.replace(/class="([^"]*)"/, `class="$1 experience-theme theme-${key}"`)}>`;
    return `<body class="experience-theme theme-${key}"${attrs}>`;
  });
}
function addCss(html) {
  if (html.includes('/assets/css/experience-theme.css')) return html;
  return html.replace("</head>", '<link rel="stylesheet" href="/assets/css/experience-theme.css"></head>');
}
function normalizePublicRoutes(html) {
  return html
    .replaceAll(OLD_JAY_SUPPORT, CURRENT_JAY_SUPPORT)
    .replaceAll('href="/jayjayteamdev/"', 'href="/support-jayjayteamdev/"')
    .replaceAll("href='/jayjayteamdev/'", "href='/support-jayjayteamdev/'");
}

for (const target of productionTargets) {
  const theme = experienceContract.themes[target.key];
  const targetRoot = path.join(dist, target.key);
  if (theme) {
    const cssDir = path.join(targetRoot, "assets", "css");
    await mkdir(cssDir, { recursive: true });
    await writeFile(path.join(cssDir, "experience-theme.css"), themeCss(theme), "utf8");
  }
  for (const relative of await listHtml(targetRoot)) {
    const file = path.join(targetRoot, relative);
    let html = normalizePublicRoutes(await readFile(file, "utf8"));
    if (theme) html = addCss(addBodyClass(html, target.key));
    if (/gofund\.me|gofundme/i.test(html)) throw new Error(`Legacy GoFundMe production route remains in ${target.key}/${relative}`);
    if (html.includes(OLD_JAY_SUPPORT) || /href=["']\/jayjayteamdev\/["']/.test(html)) throw new Error(`Superseded DonateWorldz JayJay support route remains in ${target.key}/${relative}`);
    await writeFile(file, html, "utf8");
  }
}

console.log(`Final public-route cleanup PASS; distinct themes applied to ${Object.keys(experienceContract.themes).length} identity groups and superseded DonateWorldz support route removed.`);

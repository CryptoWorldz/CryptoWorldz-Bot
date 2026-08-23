import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";
import { jayJayLaunchContract } from "./jayjay-launch-contract.mjs";
import { links } from "./site-data.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist", "ecosystem");
const escape = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const read = (relative) => readFile(path.join(dist, relative), "utf8");
const write = (relative, content) => writeFile(path.join(dist, relative), content, "utf8");

const reaganLinks = Object.freeze([
  { platform: "Facebook", title: "Action Spread Smiles", url: "https://www.facebook.com/Reagankauja/", description: "Official Action Spread Smiles orphanage and humanitarian page." },
  { platform: "Facebook", title: "Reagan Kauja", url: "https://www.facebook.com/reagankauja2/", description: "Reagan Kauja's official Facebook profile." },
  { platform: "TikTok", title: "@actionspreadsmilesorg", url: "https://www.tiktok.com/@actionspreadsmilesorg", description: "Action Spread Smiles videos and updates." },
  { platform: "YouTube", title: "@action_spread_smiles", url: "https://www.youtube.com/@action_spread_smiles", description: "Action Spread Smiles video channel." },
  { platform: "DonateWorldz", title: "Reagan & Children", url: links.reaganChildren, description: "Dedicated Reagan and children donation page." },
  { platform: "Stripe", title: "Donate securely", url: links.reaganStripe, description: "Dedicated Reagan and Children Stripe destination." }
]);

const jayjayLinks = Object.freeze([
  ...productionTargets.map((target) => ({ platform: "Website", title: target.requiredIdentityText, url: `https://${target.domain}/`, description: `Official ${target.requiredIdentityText} ecosystem destination.` })),
  { platform: "X", title: jayJayLaunchContract.socials.oneWorldzX.label, url: jayJayLaunchContract.socials.oneWorldzX.url, description: "Official OneWorldz X account." },
  { platform: "Telegram", title: jayJayLaunchContract.socials.oneWorldzTelegram.label, url: jayJayLaunchContract.socials.oneWorldzTelegram.url, description: "Official OneWorldz Telegram community." },
  { platform: "X", title: jayJayLaunchContract.socials.cryptoWorldzX.label, url: jayJayLaunchContract.socials.cryptoWorldzX.url, description: "Official CryptoWorldz X account." },
  { platform: "Telegram", title: jayJayLaunchContract.socials.zedBot.label, url: jayJayLaunchContract.socials.zedBot.url, description: "Official ZED Command Centre bot." },
  { platform: "Telegram", title: jayJayLaunchContract.socials.raaiiiddTeam.label, url: jayJayLaunchContract.socials.raaiiiddTeam.url, description: "Official CryptoWorldz Raaiiidd Team." },
  { platform: "Mini App", title: "Command Centre Ultimate™", url: jayJayLaunchContract.cryptoWorldz.protectedWalletEntry, description: "Protected OneWorldz ecosystem Command Centre." },
  { platform: "Based.bid", title: "ImpactBased", url: links.basedBid, description: "Official ImpactBased launch-board destination." },
  { platform: "PayPal", title: "Support JayJayTeamDev", url: links.jayjayPaypal, description: "Approved JayJayTeamDev PayPal support pathway." },
  { platform: "Stripe", title: "Support JayJayTeamDev", url: links.jayjayStripe, description: "Dedicated JayJayTeamDev Stripe destination." }
]);

function previews(id, eyebrow, heading, intro, rows) {
  const cards = rows.map((row) => `<a class="official-link-preview" href="${escape(row.url)}" target="_blank" rel="noopener noreferrer"><span>${escape(row.platform)}</span><strong>${escape(row.title)}</strong><p>${escape(row.description)}</p><small>${escape(row.url)}</small><b>Open official link →</b></a>`).join("");
  return `<section class="section section-dark official-links" id="${id}"><style>.official-link-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}.official-link-preview{display:flex;flex-direction:column;gap:8px;padding:18px;border:1px solid rgba(255,255,255,.25);border-radius:18px;background:rgba(5,15,34,.58);color:inherit;text-decoration:none;overflow-wrap:anywhere}.official-link-preview>span,.official-link-preview>small{opacity:.78}.official-link-preview>strong{font-size:1.2rem}.official-link-preview>p{margin:0}.official-link-preview>b{margin-top:auto}</style><div class="section-heading"><p class="eyebrow">${escape(eyebrow)}</p><h2>${escape(heading)}</h2><p>${escape(intro)}</p></div><div class="official-link-grid">${cards}</div></section>`;
}

function insertBeforeSafety(html, section) {
  if (html.includes(`id="${section.match(/id="([^"]+)/)?.[1]}"`)) return html;
  const marker = '<section class="section" id="safety">';
  if (!html.includes(marker)) throw new Error("Support page safety marker missing");
  return html.replace(marker, `${section}${marker}`);
}

const reaganPage = "donateworldz/reagan-children/index.html";
let reagan = await read(reaganPage);
reagan = insertBeforeSafety(reagan, previews("official-reagan-links", "OFFICIAL REAGAN & ACTION SPREAD SMILES LINKS", "Every official Reagan link in one place.", "Open the full previews below for Reagan, Action Spread Smiles, videos and the dedicated donation destination.", reaganLinks));
await write(reaganPage, reagan);

const jayjayPage = "donateworldz/support-jayjayteamdev/index.html";
let jayjay = await read(jayjayPage);
const jayjaySection = previews("official-jayjay-links", "JAYJAYTEAMDEV ECOSYSTEM LINKS", "Every official ecosystem destination.", "Websites, social channels, Command Centre and dedicated voluntary-support destinations created for the ecosystem.", jayjayLinks);
if (!jayjay.includes('id="official-jayjay-links"')) jayjay = jayjay.replace("</main>", `${jayjaySection}</main>`);
await write(jayjayPage, jayjay);

const excluded = [
  "https://www.facebook.com/share/165Ken5f2Bt/",
  "https://www.facebook.com/share/18BmqfH7MS/",
  "https://www.facebook.com/Reagankauja/",
  "https://www.facebook.com/reagankauja2/"
];
for (const relative of ["donateworldz/community-impact/index.html", "oneworldz/community-support/index.html"]) {
  let html = await read(relative);
  for (const url of excluded) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp(`<a[^>]*href="${escaped}"[\\s\\S]*?<\\/a>`, "gi"), "");
    html = html.replace(new RegExp(`<article[^>]*>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/article>`, "gi"), "");
  }
  if (/Mpagi Davis|Davis Family|Action Spread Smiles|Reagan Kauja/i.test(html)) throw new Error(`${relative}: dedicated person or organisation leaked into Community Charity`);
  for (const url of excluded) if (html.includes(url)) throw new Error(`${relative}: excluded dedicated link remains`);
  await write(relative, html);
}

console.log(`Dedicated support links PASS: Reagan=${reaganLinks.length}, JayJayTeamDev=${jayjayLinks.length}, Community Charity exclusions=PASS`);

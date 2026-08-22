import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist", "ecosystem");
const repo = path.resolve(root, "../..");
const exists = (file) => stat(file).then(() => true).catch(() => false);
const read = (file) => readFile(file, "utf8");

const requiredPages = [
  ["oneworldz/public-stewardship/index.html", "Public Stewardship & Peace Dividend"],
  ["oneworldz/humanity-news/index.html", "Humanity Newsroom"],
  ["donateworldz/reagan-children/index.html", "reagan-direct-impact-truth"],
  ["donateworldz/community-impact/index.html", "facebook-preview-contract"],
  ["donateworldz/jayjayteamdev/index.html", "jayjay-mission-truth"]
];
for (const [relative, marker] of requiredPages) {
  const file = path.join(dist, relative);
  if (!await exists(file)) throw new Error(`Canonical required page missing: ${relative}`);
  if (!(await read(file)).includes(marker)) throw new Error(`Canonical marker missing from ${relative}: ${marker}`);
}

const stripe = Object.freeze({
  reagan: "https://donate.stripe.com/14A6oHcG61Ox87Y0Xb0kE01",
  community: "https://donate.stripe.com/9B67sLgWm78R73U35j0kE02",
  davis: "https://donate.stripe.com/dRm8wPdKa0Kt2NE7lz0kE03",
  jayjay: "https://buy.stripe.com/6oUeVd9tU0Ktewm0Xb0kE00"
});
if (new Set(Object.values(stripe)).size !== 4) throw new Error("Canonical Stripe streams are not unique");
for (const [relative, url] of [
  ["donateworldz/reagan-children/index.html", stripe.reagan],
  ["donateworldz/community-impact/index.html", stripe.community],
  ["donateworldz/davis-family/index.html", stripe.davis],
  ["donateworldz/jayjayteamdev/index.html", stripe.jayjay]
]) if (!(await read(path.join(dist, relative))).includes(url)) throw new Error(`Stripe link drift: ${relative}`);

const jayjay = await read(path.join(dist, "donateworldz", "jayjayteamdev", "index.html"));
for (const phrase of ["50% JayJayTeamDev personal support", "50% OneWorldz operations", "not represented as a direct donation"]) {
  if (!jayjay.includes(phrase)) throw new Error(`JayJayTeamDev support truth missing: ${phrase}`);
}

const community = await read(path.join(dist, "donateworldz", "community-impact", "index.html"));
const facebookCount = (community.match(/https:\/\/(?:www\.)?facebook\.com\//gi) || []).length;
if (facebookCount !== 35) throw new Error(`Community Impact must contain exactly 35 Facebook destinations, found ${facebookCount}`);
if (!community.includes('id="community-support-grid"')) throw new Error("Community Impact live Facebook preview grid missing");
if (!community.includes('/assets/js/community-support.js')) throw new Error("Community Impact Facebook preview runtime missing");
if (!community.includes("Real preview or no preview. Never an invented person.")) throw new Error("Facebook preview truth contract missing");

const stewardship = await read(path.join(dist, "oneworldz", "public-stewardship", "index.html"));
for (const phrase of ["does not claim authority over any government", "lawful democratic and institutional processes", "advocacy, not an existing governmental mandate"]) {
  if (!stewardship.includes(phrase)) throw new Error(`Public stewardship democratic boundary missing: ${phrase}`);
}
const newsroom = await read(path.join(dist, "oneworldz", "humanity-news", "index.html"));
for (const phrase of ["Do not rewrite the facts", "Corrections stay visible", "News, evidence, analysis and advocacy must be labelled separately"]) {
  if (!newsroom.includes(phrase)) throw new Error(`Humanity Newsroom editorial boundary missing: ${phrase}`);
}

const cryptoworldz = await read(path.join(dist, "cryptoworldz", "index.html"));
for (const key of ["crypto-zed","command-centre-five","zed-auto","oneworldz-master"]) {
  if (!cryptoworldz.includes(`data-exact-visual=\"${key}\"`)) throw new Error(`CryptoWorldz exact standalone preview missing: ${key}`);
}

const deploy = await read(path.join(repo, ".github", "full-current-static-deploy.sh"));
if (!deploy.includes("purge-contents impactbased law learn nextbigcoin")) throw new Error("OneWorldz sibling-safe cleanout missing");
if (!deploy.includes("LIVE_INDEX_SHA_MISMATCH")) throw new Error("Live byte proof missing from static deploy");
const transport = await read(path.join(repo, ".github", "lftp-compat.py"));
for (const phrase of ["purge refused outside Hostinger static public_html", "purge refused for protected ZED destination", "purge-contents"]) {
  if (!transport.includes(phrase)) throw new Error(`Static cleanup guard missing: ${phrase}`);
}

const workflow = await read(path.join(repo, ".github", "workflows", "production-release.yml"));
if (!workflow.includes("workflow_dispatch:")) throw new Error("Canonical release is not manual-only");
if (/\n\s*push\s*:/.test(workflow)) throw new Error("Canonical production release unexpectedly has push trigger");
if (!workflow.includes("deploy_websites") || !workflow.includes("deploy_zed")) throw new Error("Canonical release selections missing");
if (!workflow.includes("ONEWORLDZ_CANONICAL_ONE_RUN=PASS")) throw new Error("Canonical final public-proof verdict missing");

console.log(JSON.stringify({
  event: "canonical_mission_validation",
  result: "PASS",
  public_stewardship: true,
  humanity_newsroom: true,
  stripe_streams: 4,
  facebook_destinations: 35,
  facebook_preview_policy: "VERIFIED_OR_EXACT_LINK_NO_INVENTION",
  static_cleanup: "ALLOWLISTED_WITH_SIBLING_AND_ZED_GUARDS",
  release: "ONE_MANUAL_WORKFLOW_WEBSITES_AND_ZED_ISOLATED"
}, null, 2));

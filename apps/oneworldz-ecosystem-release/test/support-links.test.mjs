import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFile(path.join(root, "dist", "ecosystem", relative), "utf8");

test("Reagan donation page contains every official link with a full preview", async () => {
  const html = await read("donateworldz/reagan-children/index.html");
  for (const url of ["https://www.facebook.com/Reagankauja/", "https://www.facebook.com/reagankauja2/", "https://www.tiktok.com/@actionspreadsmilesorg", "https://www.youtube.com/@action_spread_smiles", "https://donate.stripe.com/14A6oHcG61Ox87Y0Xb0kE01"]) assert.ok(html.includes(url), `missing ${url}`);
  assert.ok((html.match(/class="official-link-preview"/g) || []).length >= 6);
});

test("Support JayJayTeamDev contains the complete ecosystem link system", async () => {
  const html = await read("donateworldz/support-jayjayteamdev/index.html");
  for (const url of ["https://oneworldz.com/", "https://cryptoworldz.xyz/", "https://donateworldz.com/", "https://x.com/OneWorldzX", "https://x.com/CryptoWorldzX", "https://t.me/OneWorldzTG", "https://t.me/CryptoWorldzBot", "https://www.paypal.me/Jayjay3480"]) assert.ok(html.includes(url), `missing ${url}`);
  assert.ok((html.match(/class="official-link-preview"/g) || []).length >= 27);
});

test("Community Charity excludes Reagan, Action Spread Smiles and Davis Family", async () => {
  for (const relative of ["donateworldz/community-impact/index.html", "oneworldz/community-support/index.html"]) {
    const html = await read(relative);
    for (const forbidden of ["165Ken5f2Bt", "18BmqfH7MS", "Reagankauja", "reagankauja2", "Mpagi Davis", "Davis Family", "Action Spread Smiles", "Reagan Kauja"]) assert.equal(html.includes(forbidden), false, `${relative}: contains ${forbidden}`);
  }
});

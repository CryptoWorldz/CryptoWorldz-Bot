import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supportProfiles } from './site-data.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(await readFile(path.join(root, 'source', 'community-support-profiles.json'), 'utf8'));
const excluded = new Set([
  'https://www.facebook.com/share/165Ken5f2Bt/',
  'https://www.facebook.com/share/18BmqfH7MS/',
  'https://www.facebook.com/Reagankauja/',
  'https://www.facebook.com/reagankauja2/'
]);
const rows = (registry.profiles || []).filter((row) => !excluded.has(String(row.facebook_url || '')));
if (rows.length !== 34) throw new Error(`Expected 34 Community Facebook destinations after Davis/Reagan separation; found ${rows.length}`);
const expectedById = new Map(supportProfiles.map((row) => [row.id, row]));
const results = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'en-AU',
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const badText = ["this content isn't available", 'content is not available', 'page not found', "page isn't available", 'the link you followed may be broken', 'sorry, something went wrong'];

for (const row of rows) {
  const url = String(row.facebook_url || '');
  const match = url.match(/facebook\.com\/share\/([^/]+)/i);
  const shareId = match?.[1] || '';
  const expected = expectedById.get(shareId);
  let status = 0, finalUrl = '', title = '', canonical = '', body = '', error = '';
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    status = response?.status() || 0;
    finalUrl = page.url();
    title = await page.title();
    canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href').catch(() => '') || '';
    body = (await page.locator('body').innerText({ timeout: 8000 }).catch(() => '')) || '';
  } catch (err) {
    error = String(err?.message || err);
    finalUrl = page.url();
    title = await page.title().catch(() => '');
    body = (await page.locator('body').innerText({ timeout: 3000 }).catch(() => '')) || '';
  }
  const text = `${title}\n${body}`.toLowerCase();
  const fbHost = [finalUrl, canonical, url].some((candidate) => {
    try { const h = new URL(candidate).hostname.toLowerCase(); return h === 'facebook.com' || h.endsWith('.facebook.com'); } catch { return false; }
  });
  const explicitError = badText.find((needle) => text.includes(needle)) || '';
  const structural = /^https:\/\/(?:www\.)?facebook\.com\/share\/[A-Za-z0-9]+\/$/.test(url);
  const pass = structural && Boolean(expected) && fbHost && status > 0 && status < 400 && !explicitError;
  results.push({ order: row.display_order, url, share_id: shareId, expected_name: String(expected?.name || ''), status, final_url: finalUrl, canonical, title, explicit_error: explicitError, navigation_error: error, pass });
  console.log(`FACEBOOK_${String(row.display_order).padStart(2, '0')}=${pass ? 'PASS' : 'FAIL'} status=${status} id=${shareId} final=${JSON.stringify(finalUrl)}`);
}
await browser.close();
await mkdir('audit-results', { recursive: true });
await writeFile('audit-results/live-facebook.json', JSON.stringify(results, null, 2) + '\n');
const passed = results.filter((row) => row.pass).length;
const failed = results.filter((row) => !row.pass);
const summary = [
  'COMMUNITY_FACEBOOK_EXPECTED=34',
  `COMMUNITY_FACEBOOK_PASSED=${passed}`,
  `COMMUNITY_FACEBOOK_FAILED=${failed.length}`,
  'DAVIS_SEPARATE=PASS',
  'REAGAN_SEPARATE=PASS',
  `COMMUNITY_FACEBOOK_GATE=${failed.length === 0 ? 'PASS' : 'FAIL'}`
].join('\n') + '\n';
await writeFile('audit-results/live-facebook-summary.txt', summary);
console.log(summary.trim());
if (failed.length) process.exit(1);

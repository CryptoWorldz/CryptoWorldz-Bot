import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionTargets } from './production-targets.mjs';
import { links, pdcTokens } from './site-data.mjs';
import { jayJayLaunchContract } from './jayjay-launch-contract.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const tree = JSON.parse(await readFile(path.join(root, 'dist', 'ecosystem', 'user-structure-tree.json'), 'utf8'));
const facebookProof = JSON.parse(await readFile('audit-results/live-facebook.json', 'utf8'));
const failures = [];
const evidence = { pages: [], external: [], pdc: [], required: {}, gpt: {} };
const fail = (kind, detail) => { failures.push({ kind, ...detail }); console.error(`FAIL ${kind} ${JSON.stringify(detail)}`); };
const targetByKey = new Map(productionTargets.map((t) => [t.key, t]));
const routeSets = new Map(tree.hosts.map((h) => [h.key, new Set(h.routes.map((r) => r.route))]));
if (tree.static_hosts !== 18 || tree.published_webpages !== 93) fail('architecture', { static_hosts: tree.static_hosts, published_webpages: tree.published_webpages });
if (facebookProof.length !== 34 || facebookProof.some((x) => !x.pass)) fail('community-facebook', { expected: 34, actual: facebookProof.length, failed: facebookProof.filter((x) => !x.pass).length });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'en-AU' });
const page = await context.newPage();
page.setDefaultTimeout(12000);
const seenExternal = new Map();
const allAnchors = [];
const floatingButtons = [];
let homeLinks = 0, menuLinks = 0, menuButtons = 0;

for (const host of tree.hosts) {
  const target = targetByKey.get(host.key);
  if (!target) { fail('unknown-host', { key: host.key }); continue; }
  const routeSet = routeSets.get(host.key);
  for (const route of host.routes) {
    const live = new URL(route.route, `https://${target.domain}`).href;
    let response;
    try { response = await page.goto(live, { waitUntil: 'domcontentloaded', timeout: 25000 }); }
    catch (error) { fail('page-navigation', { live, error: String(error?.message || error) }); continue; }
    const status = response?.status() || 0;
    if (status >= 400 || status === 0) fail('page-status', { live, status });
    const brandHref = await page.locator('.screen-brand').first().getAttribute('href').catch(() => null);
    homeLinks += 1;
    if (brandHref !== '/') fail('home-link', { live, href: brandHref });
    const menuButton = page.locator('#menu-button');
    if (await menuButton.count() !== 1) fail('menu-button-missing', { live });
    else {
      menuButtons += 1;
      await menuButton.click();
      const expanded = await menuButton.getAttribute('aria-expanded');
      const open = await page.locator('#site-menu').evaluate((el) => el.classList.contains('open')).catch(() => false);
      if (expanded !== 'true' || !open) fail('menu-open', { live, expanded, open });
    }
    const menu = await page.locator('#site-menu a').evaluateAll((els) => els.map((a) => ({ text: (a.textContent || '').trim(), href: a.getAttribute('href') || '' })));
    menuLinks += menu.length;
    if (menu.length !== host.routes.length) fail('menu-count', { live, expected: host.routes.length, actual: menu.length });
    for (const m of menu) {
      let u;
      try { u = new URL(m.href, live); } catch { fail('menu-invalid-url', { live, ...m }); continue; }
      if (u.origin !== new URL(live).origin || !routeSet.has(u.pathname)) fail('menu-destination', { live, text: m.text, href: m.href, resolved: u.href });
    }
    await page.locator('#menu-backdrop').click({ force: true }).catch(() => {});

    const anchors = await page.locator('a[href]').evaluateAll((els) => els.map((a) => ({ text: (a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href') || '', cls: a.className || '' })));
    for (const a of anchors) {
      if (!a.href || a.href === '#open-gpt' || a.href.startsWith('#')) continue;
      let u;
      try { u = new URL(a.href, live); } catch { fail('anchor-invalid-url', { live, ...a }); continue; }
      allAnchors.push({ source: live, text: a.text, href: u.href, cls: a.cls });
      if (String(a.cls).includes('glass-button')) floatingButtons.push({ source: live, text: a.text, href: u.href });
      const sameOrigin = u.origin === new URL(live).origin;
      if (sameOrigin) {
        if (!routeSet.has(u.pathname)) fail('internal-anchor-route', { source: live, text: a.text, href: u.href });
      } else if (/^https?:$/.test(u.protocol)) {
        if (!seenExternal.has(u.href)) seenExternal.set(u.href, { sources: [] });
        seenExternal.get(u.href).sources.push({ source: live, text: a.text });
      }
    }
    evidence.pages.push({ key: host.key, route: route.route, live, status, menu_links: menu.length, anchors: anchors.length });
  }
}

if (homeLinks !== 93) fail('home-link-count', { expected: 93, actual: homeLinks });
if (menuButtons !== 93) fail('menu-button-count', { expected: 93, actual: menuButtons });
if (evidence.pages.length !== 93) fail('page-count', { expected: 93, actual: evidence.pages.length });

// Required official outlets must actually be present somewhere in the final 93-page fleet.
const requiredUrls = {
  basedBid: links.basedBid,
  actionSpreadSmilesFacebook: 'https://www.facebook.com/Reagankauja/',
  reaganFacebook: 'https://www.facebook.com/reagankauja2/',
  actionSpreadSmilesTikTok: 'https://www.tiktok.com/@actionspreadsmilesorg',
  actionSpreadSmilesYouTube: 'https://www.youtube.com/@action_spread_smiles',
  reaganStripe: links.reaganStripe,
  communityStripe: links.communityStripe,
  davisStripe: 'https://donate.stripe.com/dRm8wPdKa0Kt2NE7lz0kE03',
  jayjayStripe: links.jayjayStripe,
  jayjayPaypal: links.jayjayPaypal,
  oneWorldzX: jayJayLaunchContract.socials.oneWorldzX.url,
  oneWorldzTelegram: jayJayLaunchContract.socials.oneWorldzTelegram.url,
  cryptoWorldzX: jayJayLaunchContract.socials.cryptoWorldzX.url,
  zedBot: jayJayLaunchContract.socials.zedBot.url,
  raaiiiddTeam: jayJayLaunchContract.socials.raaiiiddTeam.url,
  protectedMiniApp: jayJayLaunchContract.cryptoWorldz.protectedWalletEntry
};
const normalize = (value) => { const u = new URL(value); u.hash = ''; return u.href.replace(/\/$/, ''); };
const anchorNorm = new Set(allAnchors.map((x) => normalize(x.href)));
for (const [name, url] of Object.entries(requiredUrls)) {
  const present = anchorNorm.has(normalize(url));
  evidence.required[name] = { url, present };
  if (!present) fail('required-link-missing', { name, url });
  if (!seenExternal.has(url)) seenExternal.set(url, { sources: [{ source: 'required-contract', text: name }] });
}

// Community controls: verify all 34 are present in runtime data and pager reaches every entry.
for (const url of ['https://oneworldz.com/community-support/', 'https://donateworldz.com/community-impact/']) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  const community = await page.evaluate(() => window.ONE_SCREEN_DATA?.community || []);
  if (community.length !== 34) fail('community-runtime-count', { url, expected: 34, actual: community.length });
  const runtimeUrls = community.map((x) => x.url);
  for (const proof of facebookProof) if (!runtimeUrls.includes(proof.url)) fail('community-runtime-missing', { url, facebook: proof.url });
  const pages = Math.ceil(community.length / 6);
  const visible = new Set();
  for (let i = 0; i < pages; i += 1) {
    const hrefs = await page.locator('.community-control').evaluateAll((els) => els.map((a) => a.href));
    hrefs.forEach((href) => visible.add(href));
    if (i < pages - 1) await page.locator('[data-community-next]').click();
  }
  if (visible.size !== 34) fail('community-pager', { url, expected: 34, visible: visible.size });
}

// Purple Diamond Crew: every legacy token must open the exact on-chain record, and DEX routes must exist per token.
await page.goto('https://purplediamondcrew.com/legacy-tokens/', { waitUntil: 'domcontentloaded', timeout: 25000 });
const tokenButtons = page.locator('[data-token-index]');
const tokenCount = await tokenButtons.count();
if (tokenCount !== 10) fail('pdc-token-count', { expected: 10, actual: tokenCount });
const liveHtml = await page.content();
for (let i = 0; i < pdcTokens.length; i += 1) {
  const token = pdcTokens[i];
  await tokenButtons.nth(i).click();
  const name = (await page.locator('#token-name').textContent())?.trim() || '';
  const address = (await page.locator('#token-address').textContent())?.trim() || '';
  const solscan = await page.locator('#token-link').getAttribute('href') || '';
  const dialogOpen = await page.locator('#token-dialog').evaluate((d) => d.open).catch(() => false);
  if (!dialogOpen || name !== token.name || address !== token.address || normalize(solscan) !== normalize(token.url)) fail('pdc-token-dialog', { index: i, expected: token, actual: { name, address, solscan, dialogOpen } });
  await page.locator('[data-dialog-close]').click();
  const dexExpected = `https://dexscreener.com/solana/${token.address}`;
  const dexPresent = liveHtml.includes(dexExpected);
  evidence.pdc.push({ index: i + 1, name: token.name, address: token.address, solscan, dexExpected, dexPresent });
  if (!dexPresent) fail('pdc-dex-link-missing', { index: i + 1, name: token.name, address: token.address, expected: dexExpected });
  if (!seenExternal.has(token.url)) seenExternal.set(token.url, { sources: [{ source: 'PDC legacy dialog', text: token.name }] });
  if (dexPresent && !seenExternal.has(dexExpected)) seenExternal.set(dexExpected, { sources: [{ source: 'PDC legacy market', text: token.name }] });
}

// Independent live OneWorldz GPT request.
try {
  const gpt = await context.request.post('https://cryptobotz.cryptoworldz.xyz/api/oneworldz-gpt/chat', {
    data: { message: 'Reply with READY.', history: [], page: 'live-every-click-audit' }, timeout: 45000
  });
  const status = gpt.status();
  let body = {};
  try { body = await gpt.json(); } catch {}
  const pass = status === 200 && body.ok === true && body.service === 'OneWorldz GPT' && String(body.text || '').trim().length > 0;
  evidence.gpt = { status, ok: body.ok, service: body.service, powered_by: body.powered_by, text_present: Boolean(String(body.text || '').trim()), pass };
  if (!pass) fail('oneworldz-gpt', evidence.gpt);
} catch (error) { fail('oneworldz-gpt', { error: String(error?.message || error) }); }

// Probe every unique external destination that the live pages expose, except the 34 Community Facebook links already proved above.
const communitySet = new Set(facebookProof.map((x) => normalize(x.url)));
const probe = await context.newPage();
probe.setDefaultTimeout(15000);
const explicitBad = ["this content isn't available", 'page not found', "page isn't available", 'the link you followed may be broken', '404 not found', 'does not exist'];
for (const [url, meta] of seenExternal) {
  if (communitySet.has(normalize(url))) continue;
  let status = 0, finalUrl = '', title = '', body = '', error = '';
  try {
    const response = await probe.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    status = response?.status() || 0;
    finalUrl = probe.url();
    title = await probe.title();
    body = (await probe.locator('body').innerText({ timeout: 5000 }).catch(() => '')) || '';
  } catch (err) {
    error = String(err?.message || err);
    finalUrl = probe.url();
    title = await probe.title().catch(() => '');
    body = (await probe.locator('body').innerText({ timeout: 3000 }).catch(() => '')) || '';
  }
  const text = `${title}\n${body}`.toLowerCase();
  const bad = explicitBad.find((x) => text.includes(x)) || '';
  const pass = status > 0 && status < 400 && !bad;
  evidence.external.push({ url, status, finalUrl, title, explicit_bad: bad, navigation_error: error, sources: meta.sources, pass });
  if (!pass) fail('external-destination', { url, status, finalUrl, title, explicit_bad: bad, navigation_error: error, sources: meta.sources.slice(0, 4) });
}
await browser.close();

await mkdir('audit-results', { recursive: true });
await writeFile('audit-results/live-every-click.json', JSON.stringify({ evidence, failures, counts: { homeLinks, menuButtons, menuLinks, floatingButtons: floatingButtons.length, anchors: allAnchors.length, uniqueExternal: seenExternal.size } }, null, 2) + '\n');
const summary = [
  'LIVE_PAGES_EXPECTED=93',
  `LIVE_PAGES_AUDITED=${evidence.pages.length}`,
  `HOME_LINKS_AUDITED=${homeLinks}`,
  `MENU_BUTTONS_AUDITED=${menuButtons}`,
  `MENU_LINKS_AUDITED=${menuLinks}`,
  `FLOATING_BUTTONS_AUDITED=${floatingButtons.length}`,
  `ANCHORS_AUDITED=${allAnchors.length}`,
  `UNIQUE_EXTERNAL_DESTINATIONS=${seenExternal.size}`,
  `COMMUNITY_FACEBOOK_PASSED=${facebookProof.filter((x) => x.pass).length}`,
  `PDC_LEGACY_TOKENS_AUDITED=${evidence.pdc.length}`,
  `PDC_DEX_LINKS_PRESENT=${evidence.pdc.filter((x) => x.dexPresent).length}`,
  `ONEWORLDZ_GPT_LIVE=${evidence.gpt.pass ? 'PASS' : 'FAIL'}`,
  `INTERACTION_FAILURES=${failures.length}`,
  `EVERY_CLICK_GATE=${failures.length === 0 ? 'PASS' : 'FAIL'}`
].join('\n') + '\n';
await writeFile('audit-results/live-every-click-summary.txt', summary);
console.log(summary.trim());
if (failures.length) process.exit(1);

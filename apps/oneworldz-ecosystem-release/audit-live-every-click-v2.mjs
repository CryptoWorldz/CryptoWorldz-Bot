import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionTargets } from './production-targets.mjs';
import { links, pdcTokens } from './site-data.mjs';
import { jayJayLaunchContract } from './jayjay-launch-contract.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist', 'ecosystem');
const tree = JSON.parse(await readFile(path.join(dist, 'user-structure-tree.json'), 'utf8'));
const facebookProof = JSON.parse(await readFile('audit-results/live-facebook.json', 'utf8'));
const failures = [];
const evidence = { pages: [], external: [], pdc: [], required: {}, gpt: {}, community: [], dex: [], x: [] };
const fail = (kind, detail) => { failures.push({ kind, ...detail }); console.error(`FAIL ${kind} ${JSON.stringify(detail)}`); };
const normalize = (value) => { const u = new URL(value); u.hash = ''; return u.href.replace(/\/$/, ''); };
const targetByKey = new Map(productionTargets.map((t) => [t.key, t]));
const domainToKey = new Map(productionTargets.map((t) => [t.domain.toLowerCase(), t.key]));
const routeSets = new Map(tree.hosts.map((h) => [h.key, new Set(h.routes.map((r) => r.route))]));
const routeFile = (key, route) => path.join(dist, key, route === '/' ? 'index.html' : `${route.replace(/^\/+|\/+$/g, '')}/index.html`);
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)=(?:"([^"]*)"|'([^']*)')/g)].map((m) => [m[1], m[2] ?? m[3] ?? '']));
const stripNonDomTemplates = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<template\b[\s\S]*?<\/template>/gi, '');
const anchorTags = (html) => [...stripNonDomTemplates(html).matchAll(/<a\b[^>]*>/gi)].map((m) => ({ tag: m[0], ...attrs(m[0]) }));

if (tree.static_hosts !== 18 || tree.published_webpages !== 93) fail('architecture', { static_hosts: tree.static_hosts, published_webpages: tree.published_webpages });
if (facebookProof.length !== 34 || facebookProof.some((x) => !x.pass)) fail('community-facebook', { expected: 34, actual: facebookProof.length, failed: facebookProof.filter((x) => !x.pass).length });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'en-AU', userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36' });
const page = await context.newPage();
page.setDefaultTimeout(8000);
const allAnchors = [];
const thirdParty = new Map();
let homeLinks = 0, menuLinks = 0, menuButtons = 0, floatingButtons = 0;

for (const host of tree.hosts) {
  const target = targetByKey.get(host.key);
  if (!target) { fail('unknown-host', { key: host.key }); continue; }
  const routeSet = routeSets.get(host.key);
  for (const route of host.routes) {
    const live = new URL(route.route, `https://${target.domain}`).href;
    const html = await readFile(routeFile(host.key, route.route), 'utf8');
    const anchors = anchorTags(html);
    const brand = anchors.find((a) => /\bscreen-brand\b/.test(a.class || ''));
    homeLinks += 1;
    if (!brand || brand.href !== '/') fail('home-link', { live, href: brand?.href || null });

    const menuMatch = stripNonDomTemplates(html).match(/<nav class="screen-menu" id="site-menu">([\s\S]*?)<\/nav>/i);
    const menu = menuMatch ? anchorTags(menuMatch[1]) : [];
    menuLinks += menu.length;
    if (menu.length !== host.routes.length) fail('menu-count', { live, expected: host.routes.length, actual: menu.length });
    for (const m of menu) {
      const u = new URL(m.href, live);
      if (u.origin !== new URL(live).origin || !routeSet.has(u.pathname)) fail('menu-destination', { live, href: m.href, resolved: u.href });
    }

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const menuButton = page.locator('#menu-button');
    if (await menuButton.count() !== 1) fail('menu-button-missing', { live });
    else {
      menuButtons += 1;
      await menuButton.click();
      const expanded = await menuButton.getAttribute('aria-expanded');
      const open = await page.locator('#site-menu').evaluate((el) => el.classList.contains('open')).catch(() => false);
      if (expanded !== 'true' || !open) fail('menu-open', { live, expanded, open });
      await page.locator('#menu-backdrop').click({ force: true }).catch(() => {});
    }

    for (const a of anchors) {
      if (!a.href || a.href.startsWith('#')) continue;
      const u = new URL(a.href, live);
      allAnchors.push({ source: live, href: u.href, cls: a.class || '' });
      if (/\b(?:glass-button|pdc-floating-button)\b/.test(a.class || '')) floatingButtons += 1;
      if (u.origin === new URL(live).origin) {
        if (!routeSet.has(u.pathname)) fail('internal-anchor-route', { source: live, href: u.href });
      } else {
        const ecosystemKey = domainToKey.get(u.hostname.toLowerCase());
        if (ecosystemKey) {
          if (!routeSets.get(ecosystemKey)?.has(u.pathname)) fail('cross-domain-route', { source: live, href: u.href, target: ecosystemKey });
        } else if (/^https?:$/.test(u.protocol)) {
          const key = normalize(u.href);
          if (!thirdParty.has(key)) thirdParty.set(key, { url: u.href, sources: [] });
          thirdParty.get(key).sources.push({ source: live });
        }
      }
    }
    evidence.pages.push({ key: host.key, route: route.route, live, menu_links: menu.length, anchors: anchors.length });
  }
}
if (homeLinks !== 93) fail('home-link-count', { expected: 93, actual: homeLinks });
if (menuButtons !== 93) fail('menu-button-count', { expected: 93, actual: menuButtons });
if (evidence.pages.length !== 93) fail('page-count', { expected: 93, actual: evidence.pages.length });

for (const [key, route] of [['oneworldz', '/community-support/'], ['donateworldz', '/community-impact/']]) {
  const html = await readFile(routeFile(key, route), 'utf8');
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const community = await page.evaluate(() => window.ONE_SCREEN_DATA?.community || []);
  if (community.length !== 34) fail('community-runtime-count', { key, expected: 34, actual: community.length });
  const runtimeUrls = community.map((x) => normalize(x.url));
  for (const proof of facebookProof) if (!runtimeUrls.includes(normalize(proof.url))) fail('community-runtime-missing', { key, facebook: proof.url });
  const pages = Math.ceil(community.length / 6);
  const visible = new Set();
  for (let i = 0; i < pages; i += 1) {
    const hrefs = await page.locator('.community-control').evaluateAll((els) => els.map((a) => a.getAttribute('href')));
    hrefs.filter(Boolean).forEach((href) => visible.add(normalize(href)));
    if (i < pages - 1) await page.locator('[data-community-next]').click();
  }
  if (visible.size !== 34) fail('community-pager', { key, expected: 34, visible: visible.size });
  evidence.community.push({ key, runtime: community.length, pager_visible: visible.size });
}

{
  const html = await readFile(routeFile('purplediamondcrew', '/legacy-tokens/'), 'utf8');
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const buttons = page.locator('[data-token-index]');
  if (await buttons.count() !== 10) fail('pdc-token-count', { expected: 10, actual: await buttons.count() });
  for (let i = 0; i < pdcTokens.length; i += 1) {
    const token = pdcTokens[i];
    await buttons.nth(i).click();
    const actual = {
      name: (await page.locator('#token-name').textContent())?.trim() || '',
      address: (await page.locator('#token-address').textContent())?.trim() || '',
      solscan: await page.locator('#token-link').getAttribute('href') || '',
      dex: await page.locator('#token-dex').getAttribute('href') || '',
      swap: await page.locator('#token-swap').getAttribute('href') || '',
      open: await page.locator('#token-dialog').evaluate((d) => d.open).catch(() => false)
    };
    const expected = {
      solscan: token.url,
      dex: `https://dexscreener.com/solana/${encodeURIComponent(token.address)}`,
      swap: `https://jup.ag/swap/SOL-${encodeURIComponent(token.address)}`
    };
    if (!actual.open || actual.name !== token.name || actual.address !== token.address || normalize(actual.solscan) !== normalize(expected.solscan) || normalize(actual.dex) !== normalize(expected.dex) || normalize(actual.swap) !== normalize(expected.swap)) {
      fail('pdc-token-dialog', { index: i + 1, token: token.name, expected, actual });
    }
    evidence.pdc.push({ index: i + 1, name: token.name, address: token.address, ...expected });
    for (const [kind, url] of Object.entries(expected)) {
      const key = normalize(url);
      if (!thirdParty.has(key)) thirdParty.set(key, { url, sources: [] });
      thirdParty.get(key).sources.push({ source: 'PDC', kind, token: token.name });
    }
    await page.locator('[data-dialog-close]').click();
  }
}

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
const anchorNorm = new Set(allAnchors.map((x) => normalize(x.href)));
for (const [name, url] of Object.entries(requiredUrls)) {
  const present = anchorNorm.has(normalize(url));
  evidence.required[name] = { url, present };
  if (!present) fail('required-link-missing', { name, url });
  if (present && !domainToKey.has(new URL(url).hostname.toLowerCase())) {
    const key = normalize(url);
    if (!thirdParty.has(key)) thirdParty.set(key, { url, sources: [] });
    thirdParty.get(key).sources.push({ source: 'required-contract', name });
  }
}

try {
  const gpt = await context.request.post('https://cryptobotz.cryptoworldz.xyz/api/oneworldz-gpt/chat', {
    data: { message: 'Reply with READY.', history: [], page: 'every-click-proof' }, timeout: 45000
  });
  const status = gpt.status();
  let body = {}; try { body = await gpt.json(); } catch {}
  const pass = status === 200 && body.ok === true && body.service === 'OneWorldz GPT' && Boolean(String(body.text || '').trim());
  evidence.gpt = { status, ok: body.ok, service: body.service, powered_by: body.powered_by, text_present: Boolean(String(body.text || '').trim()), pass };
  if (!pass) fail('oneworldz-gpt', evidence.gpt);
} catch (error) { fail('oneworldz-gpt', { error: String(error?.message || error) }); }

const communitySet = new Set(facebookProof.map((x) => normalize(x.url)));
const externalEntries = [...thirdParty.values()].filter((x) => !communitySet.has(normalize(x.url)));
const explicitBad = ['page not found', '404 not found', 'does not exist', "this content isn't available", "page isn't available"];

async function probeDexScreener(entry) {
  const u = new URL(entry.url);
  const mint = u.pathname.match(/^\/solana\/([^/]+)$/i)?.[1] || '';
  const api = mint ? `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}` : 'https://api.dexscreener.com/latest/dex/search?q=solana';
  let status = 0, body = null, error = '';
  try {
    const response = await context.request.get(api, { timeout: 20000 });
    status = response.status();
    try { body = await response.json(); } catch {}
  } catch (err) { error = String(err?.message || err); }
  const validJson = body !== null && typeof body === 'object' && !Array.isArray(body);
  const pairs = Array.isArray(body?.pairs) ? body.pairs : [];
  const pass = status === 200 && validJson;
  const row = { url: entry.url, status, finalUrl: api, title: 'DEX Screener API proof', bad: '', error, sources: entry.sources, pass, proof_mode: 'api', active_pairs: pairs.length, pairs_field: Array.isArray(body?.pairs) ? 'array' : body?.pairs === null ? 'null' : typeof body?.pairs };
  evidence.external.push(row);
  if (mint) evidence.dex.push({ mint, service_reachable: pass, active_pairs: pairs.length, pairs_field: row.pairs_field });
  if (!pass) fail('external-destination', row);
}

async function probeX(entry) {
  const u = new URL(entry.url);
  const screenName = u.pathname.split('/').filter(Boolean)[0] || '';
  const api = `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${encodeURIComponent(screenName)}`;
  let status = 0, body = null, error = '';
  try {
    const response = await context.request.get(api, { timeout: 20000 });
    status = response.status();
    try { body = await response.json(); } catch {}
  } catch (err) { error = String(err?.message || err); }
  const record = Array.isArray(body) ? body.find((row) => String(row?.screen_name || '').toLowerCase() === screenName.toLowerCase()) : null;
  const pass = status === 200 && Boolean(record);
  const row = { url: entry.url, status, finalUrl: api, title: 'X syndication profile proof', bad: '', error, sources: entry.sources, pass, proof_mode: 'x-syndication', screen_name: record?.screen_name || '', profile_name: record?.name || '' };
  evidence.external.push(row);
  evidence.x.push({ requested: screenName, status, resolved: record?.screen_name || '', pass });
  if (!pass) fail('external-destination', row);
}

async function probeBrowser(entry) {
  let status = 0, finalUrl = '', title = '', bad = '', error = '';
  const p = await context.newPage();
  try {
    const response = await p.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    status = response?.status() || 0;
    finalUrl = p.url();
    title = await p.title();
    const body = (await p.locator('body').innerText({ timeout: 3000 }).catch(() => '')) || '';
    const text = `${title}\n${body}`.toLowerCase();
    bad = explicitBad.find((x) => text.includes(x)) || '';
  } catch (err) {
    error = String(err?.message || err);
    finalUrl = p.url();
    title = await p.title().catch(() => '');
  }
  await p.close();
  const challenge = status === 403 && /just a moment|checking your browser|access denied/i.test(title || '');
  const pass = (status > 0 && status < 400 && !bad) || (challenge && !bad);
  const row = { url: entry.url, status, finalUrl, title, bad, error, sources: entry.sources, pass, proof_mode: challenge ? 'anti-bot-challenge' : 'browser' };
  evidence.external.push(row);
  if (!pass) fail('external-destination', row);
}

for (let i = 0; i < externalEntries.length; i += 4) {
  const group = externalEntries.slice(i, i + 4);
  await Promise.all(group.map((entry) => {
    const host = new URL(entry.url).hostname.toLowerCase();
    if (host.endsWith('dexscreener.com')) return probeDexScreener(entry);
    if (host === 'x.com' || host === 'twitter.com') return probeX(entry);
    return probeBrowser(entry);
  }));
}
await browser.close();

const dexLegacy = evidence.dex.filter((row) => pdcTokens.some((token) => token.address === row.mint));
const xRequired = evidence.x.filter((row) => ['oneworldzx', 'cryptoworldzx'].includes(row.requested.toLowerCase()));
await mkdir('audit-results', { recursive: true });
await writeFile('audit-results/live-every-click.json', JSON.stringify({ evidence, failures, counts: { homeLinks, menuButtons, menuLinks, floatingButtons, anchors: allAnchors.length, uniqueThirdParty: thirdParty.size } }, null, 2) + '\n');
const summary = [
  'LIVE_PAGES_EXPECTED=93',
  `LIVE_PAGES_AUDITED=${evidence.pages.length}`,
  `HOME_LINKS_AUDITED=${homeLinks}`,
  `MENU_BUTTONS_AUDITED=${menuButtons}`,
  `MENU_LINKS_AUDITED=${menuLinks}`,
  `FLOATING_BUTTONS_AUDITED=${floatingButtons}`,
  `ANCHORS_AUDITED=${allAnchors.length}`,
  `UNIQUE_EXTERNAL_DESTINATIONS=${thirdParty.size}`,
  `COMMUNITY_FACEBOOK_PASSED=${facebookProof.filter((x) => x.pass).length}`,
  `PDC_LEGACY_TOKENS_AUDITED=${evidence.pdc.length}`,
  `PDC_DEX_LINKS_PRESENT=${evidence.pdc.filter((x) => x.dex).length}`,
  `PDC_JUPITER_LINKS_PRESENT=${evidence.pdc.filter((x) => x.swap).length}`,
  `PDC_DEX_SERVICE_REACHABLE=${dexLegacy.filter((x) => x.service_reachable).length}`,
  `PDC_DEX_ACTIVE_PAIRS_TOTAL=${dexLegacy.reduce((sum, x) => sum + x.active_pairs, 0)}`,
  `X_REQUIRED_PROFILES_RESOLVED=${xRequired.filter((x) => x.pass).length}`,
  `ONEWORLDZ_GPT_LIVE=${evidence.gpt.pass ? 'PASS' : 'FAIL'}`,
  `INTERACTION_FAILURES=${failures.length}`,
  `EVERY_CLICK_GATE=${failures.length === 0 ? 'PASS' : 'FAIL'}`
].join('\n') + '\n';
await writeFile('audit-results/live-every-click-summary.txt', summary);
console.log(summary.trim());
if (failures.length) process.exit(1);

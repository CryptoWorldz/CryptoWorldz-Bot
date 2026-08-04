const config = window.CRYPTOWORLDZ_CONFIG;
const app = document.querySelector('#app');
const nav = document.querySelector('#main-nav');
const brandTitle = document.querySelector('#brand-title');
const brandSubtitle = document.querySelector('#brand-subtitle');
const walletButton = document.querySelector('#wallet-button');

walletButton.hidden = true;
brandTitle.textContent = 'PURPLE DIAMOND CREW';
brandSubtitle.textContent = 'VERIFIED TOKEN DIRECTORY';
document.title = 'Purple Diamond Crew • Verified Token Directory';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function button(label, href, primary = false) {
  const url = safeUrl(href);
  return url
    ? `<a class="button ${primary ? 'button-primary' : 'button-secondary'}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
    : '';
}

function metadataFor(token) {
  return token?.metadata && typeof token.metadata === 'object' ? token.metadata : {};
}

function statusLabel(status) {
  if (status === 'live') return 'LIVE';
  if (status === 'paused') return 'PAUSED / HISTORICAL';
  if (status === 'archived') return 'ARCHIVED';
  return String(status || 'verified').replaceAll('_', ' ').toUpperCase();
}

function feeSplitLabel(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Not disclosed';
  const entries = Object.entries(value)
    .filter(([, amount]) => amount !== null && amount !== undefined && amount !== '')
    .map(([label, amount]) => `${String(label).replaceAll('_', ' ')}: ${amount}${typeof amount === 'number' ? '%' : ''}`);
  return entries.length ? entries.join(' • ') : 'Not disclosed';
}

async function readTable(table, query) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: config.supabasePublishableKey,
      Authorization: `Bearer ${config.supabasePublishableKey}`,
      Accept: 'application/json'
    }
  });
  if (!response.ok) throw new Error(`${table} could not be loaded (${response.status})`);
  return response.json();
}

async function loadDirectory() {
  const projects = await readTable(
    'impact_projects',
    'select=*&slug=eq.purple-diamond-crew&is_public=eq.true&limit=1'
  );
  const project = projects[0];
  if (!project) throw new Error('Purple Diamond Crew project record was not found.');

  const tokens = await readTable(
    'ecosystem_tokens',
    `select=*&project_id=eq.${encodeURIComponent(project.id)}&is_public=eq.true&launch_status=in.(live,paused,archived)&order=display_order.asc`
  );

  return {
    project,
    tokens: tokens.filter((token) => token.contract_address && token.verified_at)
  };
}

function logo(token) {
  const url = safeUrl(token.logo_url);
  return url
    ? `<span class="token-logo"><img src="${escapeHtml(url)}" alt="" loading="lazy" /></span>`
    : `<span class="token-logo">${escapeHtml(token.symbol.slice(0, 2))}</span>`;
}

function tokenCard(token, selected) {
  const metadata = metadataFor(token);
  const alias = metadata.directory_alias ? ` • ${metadata.directory_alias}` : '';
  return `<button class="token-card ${selected ? 'selected' : ''}" data-token-id="${escapeHtml(token.id)}" type="button">
    ${logo(token)}
    <span class="token-copy"><strong>$${escapeHtml(token.symbol)}</strong><small>${escapeHtml(token.name)}${escapeHtml(alias)}</small></span>
    <span class="status status-${escapeHtml(token.launch_status)}">${escapeHtml(statusLabel(token.launch_status))}</span>
    <span class="token-world">Solana • On-chain verified</span>
  </button>`;
}

function chartUrl(token) {
  const direct = safeUrl(token.dexscreener_url);
  if (direct) {
    const url = new URL(direct);
    url.searchParams.set('embed', '1');
    url.searchParams.set('theme', 'dark');
    url.searchParams.set('info', '0');
    url.searchParams.set('trades', '0');
    return url.href;
  }
  if (token.pair_address) {
    return `https://dexscreener.com/solana/${encodeURIComponent(token.pair_address)}?embed=1&theme=dark&info=0&trades=0`;
  }
  return '';
}

function uniqueButtons(items) {
  const seen = new Set();
  return items.map(([label, href, primary]) => {
    const url = safeUrl(href);
    if (!url || seen.has(url)) return '';
    seen.add(url);
    return button(label, url, primary);
  }).join('');
}

function tokenPanel(token) {
  const metadata = metadataFor(token);
  const chart = chartUrl(token);
  const fee = Number.isInteger(token.fee_total_bps) ? `${token.fee_total_bps / 100}%` : 'Not disclosed';
  const marketNote = metadata.current_market_note || 'No current DEX chart has been verified for this historical token.';
  const socialButtons = uniqueButtons([
    ['Project Website', metadata.website_url, true],
    ['X', metadata.x_url],
    ['Telegram', metadata.telegram_url],
    ['Launch Page', token.launch_url],
    ['Trade', token.trade_url],
    ['Explorer', token.explorer_url],
    ['DEX Screener', token.dexscreener_url]
  ]);

  return `<section class="chart-panel">
    <div class="chart-toolbar">
      <div>
        <p class="eyebrow">SOLANA • ${escapeHtml(statusLabel(token.launch_status))}</p>
        <h2>${escapeHtml(token.name)} <span>$${escapeHtml(token.symbol)}</span></h2>
      </div>
      <div class="button-row">${socialButtons}</div>
    </div>
    <div class="token-purpose">
      <p>${escapeHtml(token.description || 'Verified Purple Diamond Crew token record.')}</p>
      <p class="history-note">${escapeHtml(marketNote)}</p>
    </div>
    ${chart
      ? `<iframe class="dex-frame" src="${escapeHtml(chart)}" title="${escapeHtml(token.name)} DEX chart" loading="lazy" referrerpolicy="no-referrer"></iframe>`
      : `<div class="chart-placeholder historical-chart"><span class="pulse-orbit"></span><p class="eyebrow">VERIFIED HISTORICAL RECORD</p><h3>No current DEX chart verified</h3><p>The mint and project association are verified. The status is shown honestly and does not imply current liquidity or tradability.</p></div>`}
    <div class="detail-grid">
      <article><span>Contract Address</span><strong class="mono">${escapeHtml(token.contract_address)}</strong></article>
      <article><span>Status</span><strong>${escapeHtml(statusLabel(token.launch_status))}</strong></article>
      <article><span>Launch Provider</span><strong>${escapeHtml(token.launch_provider || 'Legacy Solana')}</strong></article>
      <article><span>Token Standard</span><strong>${escapeHtml(metadata.token_program || 'SPL Token')}</strong></article>
      <article><span>Decimals</span><strong>${escapeHtml(token.decimals ?? 'Not recorded')}</strong></article>
      <article><span>Transfer / Trading Fee</span><strong>${escapeHtml(fee)}</strong></article>
      <article><span>Fee Information</span><strong>${escapeHtml(feeSplitLabel(token.fee_split))}</strong></article>
      <article><span>Directory Alias</span><strong>${escapeHtml(metadata.directory_alias || token.symbol)}</strong></article>
      <article><span>Verification</span><strong>Mint and metadata checked</strong></article>
    </div>
  </section>`;
}

function render({ project, tokens }) {
  const projectMetadata = project.metadata && typeof project.metadata === 'object' ? project.metadata : {};
  nav.innerHTML = [
    ['CryptoWorldz', 'https://cryptoworldz.xyz'],
    ['ImpactBased', 'https://impactbased.oneworldz.com'],
    ['OneWorldz', 'https://oneworldz.com'],
    ['Zed', 'https://cryptobotz.cryptoworldz.xyz']
  ].map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join('');

  const state = { selectedId: tokens.find((token) => token.is_featured)?.id || tokens[0]?.id || null };

  function draw() {
    const selected = tokens.find((token) => token.id === state.selectedId) || tokens[0];
    app.innerHTML = `<section class="hero compact-hero">
      <p class="eyebrow">ONE WORLD • ONE CREW • VERIFIED ON-CHAIN HISTORY</p>
      <h1>The official Purple Diamond Crew token register.</h1>
      <p>Every listed mint has been checked on Solana and connected to the Purple Diamond Crew project. Status labels distinguish current, paused and archived records.</p>
      <div class="button-row hero-actions">${uniqueButtons([
        ['Official X', projectMetadata.x_url || 'https://x.com/PDCrew', true],
        ['Official Telegram', projectMetadata.telegram_url || 'https://t.me/PurpleDiamondCrew'],
        ['CryptoWorldz', 'https://cryptoworldz.xyz']
      ])}</div>
      <div class="trust-strip"><span>✓ ${tokens.length} verified mints</span><span>✓ Canonical project links</span><span>✓ Honest market-status labels</span></div>
    </section>
    <section class="directory-summary content-panel">
      <p class="eyebrow">PROJECT RECORD</p>
      <h2>${escapeHtml(project.name)}</h2>
      <p>${escapeHtml(project.short_description || project.mission || '')}</p>
    </section>
    <section class="market-layout">
      <aside class="token-list">
        <div class="section-heading"><p class="eyebrow">VERIFIED TOKENS</p><strong>${tokens.length}</strong></div>
        ${tokens.map((token) => tokenCard(token, token.id === selected?.id)).join('')}
      </aside>
      <div>${selected ? tokenPanel(selected) : '<section class="content-panel"><h2>No verified token records found.</h2></section>'}</div>
    </section>`;

    app.querySelectorAll('[data-token-id]').forEach((item) => {
      item.addEventListener('click', () => {
        state.selectedId = item.dataset.tokenId;
        draw();
      });
    });
  }

  draw();
}

function renderError(error) {
  console.error(error);
  app.innerHTML = `<section class="content-panel error-panel"><p class="eyebrow">DIRECTORY CONNECTION ISSUE</p><h1>The Purple Diamond Crew directory could not be loaded.</h1><p>${escapeHtml(error.message)}</p><button class="button button-primary" onclick="location.reload()">Try Again</button></section>`;
}

loadDirectory().then(render).catch(renderError);

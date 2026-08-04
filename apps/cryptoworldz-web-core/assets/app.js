const config = window.CRYPTOWORLDZ_CONFIG;
const app = document.querySelector('#app');
const nav = document.querySelector('#main-nav');
const brandTitle = document.querySelector('#brand-title');
const brandSubtitle = document.querySelector('#brand-subtitle');
const walletButton = document.querySelector('#wallet-button');
const walletDialog = document.querySelector('#wallet-dialog');

const hostname = location.hostname.replace(/^www\./, '').toLowerCase();
const params = new URLSearchParams(location.search);
const requestedWorld = params.get('world');
const requestedMode = params.get('mode');
const site = requestedWorld
  ? { slug: requestedWorld, mode: requestedMode || (requestedWorld === 'cryptoworldz' ? 'markets' : 'world') }
  : config.domains[hostname] || { slug: 'cryptoworldz', mode: 'markets' };

walletButton?.addEventListener('click', () => walletDialog?.showModal());

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

function linkButton(label, href, primary = false) {
  const url = safeUrl(href);
  return url
    ? `<a class="button ${primary ? 'button-primary' : 'button-secondary'}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
    : '';
}

function metadataFor(token) {
  return token?.metadata && typeof token.metadata === 'object' ? token.metadata : {};
}

function socialButtons(token) {
  const metadata = metadataFor(token);
  const links = [
    ['Website', metadata.website_url],
    ['X', metadata.x_url],
    ['Telegram', metadata.telegram_url],
    ['Facebook', metadata.facebook_url],
    ['YouTube', metadata.youtube_url],
    ['TikTok', metadata.tiktok_url],
    ['Explorer', token.explorer_url],
    ['GeckoTerminal', token.geckoterminal_url]
  ];

  return links.map(([label, href]) => linkButton(label, href)).join('');
}

function tokenLogo(token) {
  const logo = safeUrl(token.logo_url);
  return logo
    ? `<span class="token-logo"><img src="${escapeHtml(logo)}" alt="" loading="lazy" /></span>`
    : `<span class="token-logo">${escapeHtml(token.symbol.slice(0, 2))}</span>`;
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

async function loadRegistry() {
  const visible = 'is_public=eq.true&order=display_order.asc';
  const [worlds, projects, tokens] = await Promise.all([
    readTable('ecosystem_worlds', `select=*&${visible}`),
    readTable('impact_projects', `select=*&${visible}`),
    readTable('ecosystem_tokens', `select=*&is_public=eq.true&launch_status=in.(planned,preparing,approved,launching,live)&order=display_order.asc`)
  ]);
  return { worlds, projects, tokens };
}

function setBrand(title, subtitle) {
  brandTitle.textContent = title.toUpperCase();
  brandSubtitle.textContent = subtitle.toUpperCase();
  document.title = `${title} • One World, One Mission`;
}

function renderNav(missionOnly = false) {
  const links = missionOnly
    ? [
        ['Mission', '#mission'],
        ['Impact', 'https://impactbased.oneworldz.com'],
        ['Learn', 'https://learn.oneworldz.com'],
        ['CryptoWorldz', 'https://cryptoworldz.xyz']
      ]
    : [
        ['Markets', 'https://cryptoworldz.xyz'],
        ['Live Tokens', 'https://purplediamondcrew.com'],
        ['ImpactBased', 'https://impactbased.oneworldz.com'],
        ['OneWorldz', 'https://oneworldz.com'],
        ['Zed', 'https://cryptobotz.cryptoworldz.xyz']
      ];
  nav.innerHTML = links.map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join('');
}

function worldForToken(token, worlds) {
  return worlds.find((world) => world.id === token.world_id);
}

function statusLabel(status) {
  return String(status || 'planned').replaceAll('_', ' ').toUpperCase();
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
  if (token.pair_address && token.chain_id) {
    return `https://dexscreener.com/${encodeURIComponent(token.chain_id)}/${encodeURIComponent(token.pair_address)}?embed=1&theme=dark&info=0&trades=0`;
  }
  return '';
}

function tokenButton(token, world, selected) {
  return `<button class="token-card ${selected ? 'selected' : ''}" data-token-id="${escapeHtml(token.id)}" type="button">
    ${tokenLogo(token)}
    <span class="token-copy"><strong>$${escapeHtml(token.symbol)}</strong><small>${escapeHtml(token.name)}</small></span>
    <span class="status status-${escapeHtml(token.launch_status)}">${escapeHtml(statusLabel(token.launch_status))}</span>
    <span class="token-world">${escapeHtml(world?.name || token.chain_id)}</span>
  </button>`;
}

function placeholder(worldName, directory = false) {
  return `<section class="chart-panel">
    <div class="chart-placeholder">
      <span class="pulse-orbit"></span>
      <p class="eyebrow">${directory ? 'VERIFIED DIRECTORY READY' : 'LAUNCH SYSTEM READY'}</p>
      <h2>${escapeHtml(worldName)} registry prepared</h2>
      <p>${directory
        ? 'Verified live token records will appear here with official links, contract addresses and DEX charts.'
        : 'Official launch cards, verified contract addresses and live charts will appear automatically as each token is deployed.'}</p>
      <div class="launch-flow"><span>ImpactBased Approval</span><b>→</b><span>Launch</span><b>→</b><span>CA Verification</span><b>→</b><span>DEX Chart</span></div>
    </div>
  </section>`;
}

function tokenPanel(token, world) {
  const embed = chartUrl(token);
  const metadata = metadataFor(token);
  const contract = token.contract_address || 'Added and verified at launch';
  const creatorBuy = token.initial_creator_buy
    ? `${token.initial_creator_buy} ${token.initial_creator_buy_currency || ''}`.trim()
    : 'Not disclosed';
  const liquidity = token.real_liquidity_amount
    ? `${token.real_liquidity_amount} ${token.real_liquidity_currency || ''}`.trim()
    : 'Not disclosed';
  const fee = Number.isInteger(token.fee_total_bps) ? `${token.fee_total_bps / 100}%` : 'Not disclosed';
  const purpose = token.description || metadata.purpose || 'Official ecosystem token record.';

  return `<section class="chart-panel">
    <div class="chart-toolbar">
      <div><p class="eyebrow">${escapeHtml(world?.name || token.chain_id)} • ${escapeHtml(statusLabel(token.launch_status))}</p><h2>${escapeHtml(token.name)} <span>$${escapeHtml(token.symbol)}</span></h2></div>
      <div class="button-row">${linkButton('Launch Page', token.launch_url)}${linkButton('Trade', token.trade_url, true)}${linkButton('DEX Screener', token.dexscreener_url)}</div>
    </div>
    <div class="token-purpose">
      <p>${escapeHtml(purpose)}</p>
      <div class="button-row">${socialButtons(token)}</div>
    </div>
    ${embed
      ? `<iframe class="dex-frame" src="${escapeHtml(embed)}" title="${escapeHtml(token.name)} DEX chart" loading="lazy" referrerpolicy="no-referrer"></iframe>`
      : `<div class="chart-placeholder"><span class="pulse-orbit"></span><p class="eyebrow">CHART ACTIVATES AFTER VERIFIED LAUNCH</p><h3>Contract or pair data is pending</h3><p>The live chart activates when the official DEX Screener URL or pair address is recorded.</p></div>`}
    <div class="detail-grid">
      <article><span>Contract Address</span><strong class="mono">${escapeHtml(contract)}</strong></article>
      <article><span>Launch Provider</span><strong>${escapeHtml(token.launch_provider || 'Not disclosed')}</strong></article>
      <article><span>Launch Model</span><strong>${escapeHtml(token.launch_model ? token.launch_model.toUpperCase() : 'Not disclosed')}</strong></article>
      <article><span>Creator Initial Buy</span><strong>${escapeHtml(creatorBuy)}</strong></article>
      <article><span>Trading Fee</span><strong>${escapeHtml(fee)}</strong></article>
      <article><span>Fee Split</span><strong>${escapeHtml(feeSplitLabel(token.fee_split))}</strong></article>
      <article><span>Real Liquidity</span><strong>${escapeHtml(liquidity)}</strong></article>
      <article><span>Verification</span><strong>${token.verified_at ? 'Verified record' : 'Required before publishing'}</strong></article>
      <article><span>Chain</span><strong>${escapeHtml(token.chain_id)}</strong></article>
    </div>
  </section>`;
}

function tabs(worlds, active) {
  return `<div class="filter-row"><button class="filter-chip ${active === 'all' ? 'active' : ''}" data-world="all">All Worldz</button>${worlds
    .filter((world) => world.world_type === 'blockchain' && world.is_active)
    .map((world) => `<button class="filter-chip ${active === world.slug ? 'active' : ''}" data-world="${escapeHtml(world.slug)}">${escapeHtml(world.name)}</button>`)
    .join('')}</div>`;
}

function renderMarkets(registry, lockedWorld = 'all', options = {}) {
  const locked = lockedWorld !== 'all';
  const liveOnly = options.liveOnly === true;
  const directory = options.directory === true;
  const siteWorld = registry.worlds.find((world) => world.slug === lockedWorld);
  const title = directory ? 'Purple Diamond Crew' : (locked ? siteWorld?.name || 'CryptoWorldz' : 'CryptoWorldz');
  const subtitle = directory ? 'Verified Live Token Directory' : (locked ? 'Dedicated DEX Chart Portal' : 'Total Market Command Centre');
  setBrand(title, subtitle);
  renderNav();

  const eligibleTokens = liveOnly
    ? registry.tokens.filter((token) =>
        token.launch_status === 'live'
        && Boolean(token.contract_address)
        && Boolean(token.verified_at)
      )
    : registry.tokens;
  const state = { world: lockedWorld, token: null };

  function draw() {
    const filtered = eligibleTokens.filter((token) => state.world === 'all' || worldForToken(token, registry.worlds)?.slug === state.world);
    if (!filtered.some((token) => token.id === state.token)) state.token = filtered.find((token) => token.is_featured)?.id || filtered[0]?.id || null;
    const selected = filtered.find((token) => token.id === state.token);
    const worldName = directory
      ? 'Purple Diamond Crew'
      : (state.world === 'all' ? 'CryptoWorldz' : registry.worlds.find((world) => world.slug === state.world)?.name || 'This World');

    app.innerHTML = `<section class="hero compact-hero">
      <p class="eyebrow">${directory ? 'REAL PROJECTS • VERIFIED TOKENS • VISIBLE PURPOSE' : 'POWERED BY THE SHARED CRYPTOWORLDZ REGISTRY'}</p>
      <h1>${directory
        ? 'The official directory for previously launched ecosystem tokens.'
        : (state.world === 'all' ? 'Every World. Every Official Launch. One Market Centre.' : `${escapeHtml(worldName)} Dedicated DEX Charts.`)}</h1>
      <p>${directory
        ? 'Only verified live records are shown. Always confirm the contract address before interacting.'
        : (state.world === 'all' ? 'Track verified CryptoWorldz ecosystem launches across every supported blockchain.' : 'Switch between every verified token launched within this blockchain World.')}</p>
      <div class="button-row hero-actions">${directory
        ? linkButton('Open CryptoWorldz', 'https://cryptoworldz.xyz', true)
        : `${linkButton('View Live Token Directory', 'https://purplediamondcrew.com', true)}${linkButton('Open Zed Command Centre', 'https://cryptobotz.cryptoworldz.xyz')}`}</div>
      <div class="trust-strip"><span>✓ Verified CA publishing</span><span>✓ No private keys stored</span><span>✓ Live DEX charts</span></div>
    </section>
    ${(locked || directory) ? '' : tabs(registry.worlds, state.world)}
    <section class="market-layout">
      <aside class="token-list"><div class="section-heading"><p class="eyebrow">${directory ? 'VERIFIED LIVE TOKENS' : 'OFFICIAL TOKENS'}</p><strong>${filtered.length}</strong></div>${filtered.length
        ? filtered.map((token) => tokenButton(token, worldForToken(token, registry.worlds), token.id === state.token)).join('')
        : `<p class="empty-copy">${directory ? 'Live token links are ready to be added.' : 'No token contracts have been published yet.'}</p>`}</aside>
      <div>${selected ? tokenPanel(selected, worldForToken(selected, registry.worlds)) : placeholder(worldName, directory)}</div>
    </section>`;

    app.querySelectorAll('[data-token-id]').forEach((button) => button.addEventListener('click', () => { state.token = button.dataset.tokenId; draw(); }));
    app.querySelectorAll('[data-world]').forEach((button) => button.addEventListener('click', () => { state.world = button.dataset.world; state.token = null; draw(); }));
  }
  draw();
}

function renderImpact(registry) {
  setBrand('ImpactBased', 'Transparent Impact Launch Ecosystem');
  renderNav();
  const project = registry.projects.find((item) => item.slug === 'impactbased') || registry.projects[0];
  const board = project?.based_bid_board_url || config.basedBidBoardUrl;
  app.innerHTML = `<section class="hero impact-hero">
    <p class="eyebrow">HELPING THE PEOPLE WHO HELP PEOPLE</p>
    <h1>Impact launches built around transparent action.</h1>
    <p>${escapeHtml(project?.short_description || 'ImpactBased connects approved projects, programmable token fees and visible real-world outcomes.')}</p>
    <div class="button-row hero-actions">${linkButton('Open Current Board', board, true)}${linkButton('View Markets', 'https://cryptoworldz.xyz')}${linkButton('Live Token Directory', 'https://purplediamondcrew.com')}</div>
  </section>
  <section class="process-grid">
    <article><b>01</b><h3>Review</h3><p>Projects are checked for mission alignment, public information and a realistic impact plan.</p></article>
    <article><b>02</b><h3>Launch</h3><p>Approved projects select the most appropriate documented launch model.</p></article>
    <article><b>03</b><h3>Verify</h3><p>The contract address, creator purchase, fee split and liquidity information are published.</p></article>
    <article><b>04</b><h3>Report</h3><p>Impact updates connect on-chain activity with visible outcomes and supporting evidence.</p></article>
  </section>
  <section class="content-panel"><p class="eyebrow">MIGRATION STATUS</p><h2>Charity.Based → Impact.Based</h2><p>The current Board stays linked during migration. The public portal, market registry and Zed integrations are prepared around the new ImpactBased identity.</p><div class="status-roadmap"><span class="done">Registry foundation</span><span class="done">Website portals</span><span class="active">Board rename</span><span>First controlled launch</span></div></section>`;
}

function renderMission() {
  setBrand('OneWorldz', 'One World • One Mission');
  renderNav(true);
  walletButton.hidden = true;
  app.innerHTML = `<section id="mission" class="hero mission-hero"><p class="eyebrow">ONE WORLD • ONE MISSION • ONE FUTURE</p><h1>Helping the People Who Help People.</h1><p>OneWorldz is the mission headquarters connecting humanitarian action, learning, research, community leadership and the wider Worldz ecosystem.</p><div class="button-row hero-actions">${linkButton('Explore CryptoWorldz', 'https://cryptoworldz.xyz', true)}${linkButton('Live Token Directory', 'https://purplediamondcrew.com')}</div></section>
  <section id="impact" class="process-grid mission-grid"><article><b>💜</b><h3>Purple Diamond Crew</h3><p>Real people on the ground delivering practical support where it matters most.</p></article><article><b>⚖</b><h3>Robin Hood Law</h3><p>Research and pathways helping ordinary people better understand rights, debt and recovery.</p></article><article><b>🌍</b><h3>ImpactBased</h3><p>Transparent launches connecting community participation with measurable outcomes.</p></article><article id="research"><b>📚</b><h3>Research & Learning</h3><p>Accessible education and ideas for building stronger communities.</p></article></section>`;
}

function renderLaw() {
  setBrand('Robin Hood Law', 'Recover • Understand • Rebuild');
  renderNav(true);
  walletButton.hidden = true;
  app.innerHTML = `<section class="hero compact-hero"><p class="eyebrow">RECOVERYOURDEBT • PUBLIC INFORMATION PORTAL</p><h1>Clear pathways for people facing debt, disputes and financial pressure.</h1><p>Robin Hood Law is being prepared as an information and referral portal. It does not replace qualified legal or financial advice.</p></section>
  <section class="process-grid"><article><b>01</b><h3>Understand</h3><p>Plain-language explanations of common debt and recovery processes.</p></article><article><b>02</b><h3>Prepare</h3><p>Document checklists and questions to organise before seeking help.</p></article><article><b>03</b><h3>Connect</h3><p>Links to appropriate legal, financial counselling and support services.</p></article><article><b>04</b><h3>Recover</h3><p>Practical education designed to help people rebuild with dignity.</p></article></section>
  <section class="content-panel"><p class="eyebrow">LAUNCH STATUS</p><h2>Portal shell ready for verified resources.</h2><p>Service links and jurisdiction-specific information must be reviewed before public publication.</p></section>`;
}

function renderLearn() {
  setBrand('LearnWorldz', 'Simple Education for Every World');
  renderNav(true);
  walletButton.hidden = true;
  app.innerHTML = `<section class="hero compact-hero"><p class="eyebrow">LEARN SAFELY • VERIFY EVERYTHING • BUILD TOGETHER</p><h1>Crypto, technology and impact education without the confusion.</h1><p>LearnWorldz provides beginner-friendly pathways across wallets, blockchains, token launches, online safety and transparent impact reporting.</p></section>
  <section class="process-grid"><article><b>01</b><h3>Crypto Basics</h3><p>Wallets, networks, fees, contracts and safe verification habits.</p></article><article><b>02</b><h3>Launch Education</h3><p>How launch models, liquidity and programmable fees work.</p></article><article><b>03</b><h3>Security</h3><p>Scam awareness, private-key protection and safer online behaviour.</p></article><article><b>04</b><h3>Impact</h3><p>How to document outcomes and connect public claims with evidence.</p></article></section>
  <section class="content-panel"><p class="eyebrow">CONTENT STATUS</p><h2>Learning portal structure ready.</h2><p>Lessons can be published progressively without changing the shared site architecture.</p></section>`;
}

function renderPortfolio() {
  setBrand('HodlerWorldz', 'Read-only Multi-chain Portfolio');
  renderNav();
  app.innerHTML = `<section class="hero compact-hero"><p class="eyebrow">PERSONAL INVESTMENTS • PHASE 2</p><h1>One read-only view across the Worldz.</h1><p>Wallet ownership will be verified by signed message. Private keys and recovery phrases will never be requested.</p><button class="button button-primary" id="portfolio-wallet">Secure Login Information</button></section>
  <section class="content-panel"><h2>Planned portfolio controls</h2><div class="detail-grid"><article><span>Wallet Support</span><strong>Solana, EVM, XRPL, Sui and Bitcoin adapters</strong></article><article><span>Access</span><strong>Read-only balances and holdings</strong></article><article><span>Privacy</span><strong>Hide-balance control</strong></article><article><span>Trading</span><strong>Verified external DEX links first</strong></article></div></section>`;
  document.querySelector('#portfolio-wallet')?.addEventListener('click', () => walletDialog?.showModal());
}

function renderError(error) {
  console.error(error);
  app.innerHTML = `<section class="content-panel error-panel"><p class="eyebrow">REGISTRY CONNECTION ISSUE</p><h1>The website shell is running, but market data could not be loaded.</h1><p>${escapeHtml(error.message)}</p><button class="button button-primary" onclick="location.reload()">Try Again</button></section>`;
}

async function start() {
  if (site.mode === 'mission') return renderMission();
  if (site.mode === 'law') return renderLaw();
  if (site.mode === 'learn') return renderLearn();
  if (site.mode === 'portfolio') return renderPortfolio();

  try {
    const registry = await loadRegistry();
    if (site.mode === 'impact') return renderImpact(registry);
    if (site.mode === 'directory') return renderMarkets(registry, 'all', { liveOnly: true, directory: true });
    if (site.mode === 'world') return renderMarkets(registry, site.slug);
    return renderMarkets(registry);
  } catch (error) {
    renderError(error);
  }
}

start();
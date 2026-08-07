const config = window.CRYPTOWORLDZ_CONFIG || {};
const app = document.querySelector('#app');
const nav = document.querySelector('#main-nav');
const brandTitle = document.querySelector('#brand-title');
const brandSubtitle = document.querySelector('#brand-subtitle');
const walletButton = document.querySelector('#wallet-button');

const LINKS = {
  impact: config.basedBidBoardUrl || 'https://www.based.bid/b/Charity.Based',
  oneWorldz: 'https://oneworldz.com',
  cryptoWorldz: 'https://cryptoworldz.xyz',
  pdc: 'https://purplediamondcrew.com',
  zedHQ: 'https://t.me/CryptoWorldzHQ',
  zedBot: 'https://t.me/CryptoWorldzBot',
  solX: 'https://x.com/SolWorldX'
};

const PIPELINE = [
  {
    symbol: '$SMILES', name: 'Action Creates Smiles', status: 'FLAGSHIP IMPACT PIPELINE',
    copy: 'Purpose-led Uganda project supporting food, safe shelter, clean water, education, medical care and stronger communities.',
    image: './assets/images/website-core/action-creates-smiles/action-creates-smiles-reagan-kids.webp',
    x: null
  },
  {
    symbol: '$SolMars', name: 'MuskMan', status: 'IMPACTBASED PIPELINE',
    copy: 'SolWorldz community token concept prepared for a purpose-led launch path through ImpactBased.',
    x: 'https://x.com/muskmanmars'
  },
  {
    symbol: '$SolBud', name: 'Black Bud', status: 'IMPACTBASED PIPELINE',
    copy: 'Community project represented in the SolWorldz launch collection and awaiting final public launch details.',
    x: 'https://x.com/blackbudtoken'
  },
  {
    symbol: '$GIA', name: 'Global Impact Alliance', status: 'IMPACTBASED PIPELINE',
    copy: 'Global impact initiative focused on connecting community action, support and transparent project information.',
    x: 'https://x.com/gia_token'
  },
  {
    symbol: '$W', name: 'Uganda Unite', status: 'IMPACTBASED PIPELINE',
    copy: 'Uganda-focused Solana project. Website media uses the distinctive Solana-styled W identity selected for the current package.',
    x: 'https://x.com/ugandaunitex'
  },
  {
    symbol: '$NBC', name: 'Next Big Coin', status: 'EXISTING / REVIEW',
    copy: 'Existing SolWorld ecosystem project retained for verification and future presentation alongside the ImpactBased pipeline.',
    x: 'https://x.com/bigcoinnext'
  },
  {
    symbol: '$RHL', name: 'Robin Hood Law', status: 'POLICY / PIPELINE',
    copy: 'Policy-led project focused on fairness, justice and transparent community-first principles.',
    x: 'https://x.com/RobinHoodLawX'
  }
];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function outbound(url, label, className = 'sw-btn alt') {
  if (!url) return '';
  return `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function siteNav() {
  const items = [
    ['Home', 'https://solworldz.xyz'],
    ['Visit ImpactBased', LINKS.impact],
    ['Token Feature', '?page=tokens'],
    ['Help the People', '?page=help'],
    ['Visit OneWorldz', LINKS.oneWorldz],
    ['Visit CryptoWorldz', LINKS.cryptoWorldz],
    ['Visit PDC', LINKS.pdc],
    ['Zed HQ', LINKS.zedHQ]
  ];
  nav.innerHTML = items.map(([label, href]) => `<a href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`).join('');
}

async function getLiveTokens() {
  if (!config.supabaseUrl || !config.supabasePublishableKey) return [];
  const endpoint = `${config.supabaseUrl}/rest/v1/ecosystem_tokens?select=id,name,symbol,chain_id,contract_address,launch_status,logo_url,trade_url,dexscreener_url,launch_url,description&is_public=eq.true&launch_status=eq.live&order=display_order.asc`;
  try {
    const response = await fetch(endpoint, {headers: {apikey: config.supabasePublishableKey, Authorization: `Bearer ${config.supabasePublishableKey}`}});
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

function tokenCard(token) {
  const image = token.image
    ? `<img src="${token.image}" alt="${escapeHtml(token.name)} artwork" loading="lazy">`
    : `<span class="sw-token-symbol">${escapeHtml(token.symbol)}</span>`;
  const actions = [
    outbound(LINKS.impact, 'View ImpactBased', 'sw-btn gold'),
    token.x ? outbound(token.x, 'Visit X') : ''
  ].filter(Boolean).join('');
  return `<article class="sw-token-card">
    <div class="sw-token-art"><span class="sw-badge next">${escapeHtml(token.status)}</span>${image}</div>
    <div class="sw-token-body"><h3>${escapeHtml(token.name)} <span style="color:#c781ff">${escapeHtml(token.symbol)}</span></h3><p>${escapeHtml(token.copy)}</p><div class="sw-card-actions">${actions}</div></div>
  </article>`;
}

function liveTokenCard(token) {
  const links = [
    token.dexscreener_url ? outbound(token.dexscreener_url, 'DEX Screener') : '',
    token.trade_url ? outbound(token.trade_url, 'Trade / Market') : '',
    token.launch_url ? outbound(token.launch_url, 'Launch Page') : ''
  ].filter(Boolean).join('');
  return `<article class="sw-token-card">
    <div class="sw-token-art">${token.logo_url ? `<img src="${escapeHtml(token.logo_url)}" alt="${escapeHtml(token.name)} logo" loading="lazy">` : `<span class="sw-token-symbol">${escapeHtml(token.symbol)}</span>`}<span class="sw-badge live">LIVE • VERIFIED REGISTRY</span></div>
    <div class="sw-token-body"><h3>${escapeHtml(token.name)} <span style="color:#7dffb3">${escapeHtml(token.symbol)}</span></h3><p>${escapeHtml(token.description || `${token.chain_id || 'Solana'} ecosystem token`)}</p>${token.contract_address ? `<p class="sw-disclaimer"><strong>Contract:</strong> ${escapeHtml(token.contract_address)}</p>` : ''}<div class="sw-card-actions">${links}</div></div>
  </article>`;
}

function worldLinks() {
  const worlds = [
    ['OneWorldz', 'https://oneworldz.com'], ['CryptoWorldz', 'https://cryptoworldz.xyz'], ['Purple Diamond Crew', 'https://purplediamondcrew.com'],
    ['EthWorldz', 'https://ethworldz.xyz'], ['BaseWorldz', 'https://baseworldz.xyz'], ['BNBWorldz', 'https://bnbworldz.xyz'],
    ['XRPWorldz', 'https://xrpworldz.xyz'], ['SuiWorldz', 'https://suiworldz.xyz'], ['HyperWorldz', 'https://hyperworldz.xyz'],
    ['RobinWorldz', 'https://robinworldz.xyz'], ['BitcoinWorldz', 'https://bitcoinworldz.xyz'], ['HodlerWorldz', 'https://hodlerworldz.xyz']
  ];
  return worlds.map(([name, url]) => `<a class="sw-world-link" href="${url}" target="_blank" rel="noopener noreferrer">Visit ${name}</a>`).join('');
}

async function render() {
  document.body.classList.add('worldz-rich-page');
  document.title = 'SolWorldz • Solana Community, Impact & Launches';
  brandTitle.textContent = 'SOLWORLDZ';
  brandSubtitle.textContent = 'ONE WORLD • ONE MISSION • ONE SOLFAM';
  walletButton.textContent = 'Zed Command Centre';
  walletButton.onclick = () => window.open(LINKS.zedBot, '_blank', 'noopener,noreferrer');
  siteNav();
  const liveTokens = await getLiveTokens();

  app.innerHTML = `<div class="sw-shell">
    <section class="sw-hero">
      <picture><source media="(max-width:680px)" srcset="./assets/images/website-core/solworldz/solworldz-mobile-hero.webp"><img src="./assets/images/website-core/solworldz/solworldz-desktop-hero.webp" alt="SolWorldz Solana ecosystem" fetchpriority="high"></picture>
      <div class="sw-hero-copy"><span class="sw-kicker">Solana • Community • Impact • Innovation</span><h1>SolWorldz</h1><p>One Solana world connecting projects, people, impact and the next purpose-led launches through the ImpactBased board.</p><div class="sw-hero-actions">${outbound(LINKS.impact,'Visit ImpactBased','sw-btn gold')}<a class="sw-btn green" href="?page=help">Help the People</a>${outbound(LINKS.zedHQ,'Join CryptoWorldz HQ')} ${outbound(LINKS.zedBot,'Open @CryptoWorldzBot')}</div></div>
    </section>

    <section class="sw-section" id="launches"><div class="sw-heading"><div><span class="sw-kicker">ImpactBased launch pipeline</span><h2>Live When Verified. Next When Ready.</h2></div><p>Every project is shown with a clear status. A pipeline card is not a contract address or a claim that trading is live.</p></div><div class="sw-status-note">ImpactBased currently resolves to the established Based.bid board while the dedicated ImpactBased web page is prepared.</div><div class="sw-token-grid" style="margin-top:16px">${PIPELINE.map(tokenCard).join('')}</div></section>

    <section class="sw-section"><div class="sw-heading"><div><span class="sw-kicker">Verified public registry</span><h2>Live Tokens</h2></div><p>Only tokens actually published as <strong>live</strong> in the public registry appear here.</p></div>${liveTokens.length ? `<div class="sw-token-grid">${liveTokens.map(liveTokenCard).join('')}</div>` : `<div class="sw-empty"><strong>No public live-token records are currently published in the shared registry.</strong><br>Historical/paused records remain in the verified archive rather than being falsely shown as tradable.<div class="sw-actions" style="justify-content:center;margin-top:14px">${outbound(LINKS.pdc,'Visit Purple Diamond Crew Token Hub')}<a class="sw-btn" href="?page=tokens">Open Token Feature Page</a></div></div>`}</section>

    <section class="sw-section sw-impact"><div class="sw-impact-copy"><span class="sw-kicker">Powered by Based.bid</span><h2>Impact<strong>Based</strong></h2><p>Purpose-led projects, clear launch information and a direct path from idea to public board. New contracts will not be labelled live until their public data is verified.</p><div class="sw-actions">${outbound(LINKS.impact,'Open Current ImpactBased Board','sw-btn green')}<a class="sw-btn" href="?page=tokens">Explore Token Features</a></div></div><div class="sw-impact-art"><div><div class="sw-impact-logo">b</div><h3 style="font-family:Orbitron,sans-serif;font-size:1.6rem;margin:18px 0 4px">LAUNCH WITH PURPOSE</h3><p style="margin:0;color:#cbd7ce">Helping the People who Help People.</p></div></div></section>

    <section class="sw-section"><div class="sw-heading"><div><span class="sw-kicker">Helping the People who Help People</span><h2>Impact in the Real World</h2></div><p>SolWorldz connects blockchain communities with visible real-world missions and the people doing the work.</p></div><div class="sw-media-row"><img src="./assets/images/website-core/action-creates-smiles/action-creates-smiles-reagan-kids.webp" alt="Action Creates Smiles Uganda" loading="lazy"><img src="./assets/images/website-core/action-creates-smiles/kids-cartoon-kindness-changes-everything.webp" alt="Kindness changes everything" loading="lazy"><img src="./assets/images/website-core/action-creates-smiles/kids-cartoon-bunk-bed.webp" alt="Children and community support" loading="lazy"></div><div class="sw-actions" style="margin-top:16px"><a class="sw-btn green" href="?page=help">Visit Help the People</a>${outbound('https://www.gofundme.com/u/cryptouniverse','Visit GoFundMe Profile','sw-btn gold')}</div></section>

    <section class="sw-section"><div class="sw-heading"><div><span class="sw-kicker">One ecosystem • many Worldz</span><h2>Explore the Network</h2></div><p>Every Worldz site is connected back to the shared ecosystem so visitors can move between chains, impact projects and community tools.</p></div><div class="sw-world-grid">${worldLinks()}</div></section>

    <section class="sw-section sw-zed-panel"><div><span class="sw-kicker">Zed Command Centre</span><h2>Your CryptoWorldz Commander</h2><p>Raaiiidd missions, community tools, wallet features, leaderboards and Command Centre access should lead to the official CryptoWorldz HQ and @CryptoWorldzBot.</p></div><div class="sw-actions">${outbound(LINKS.zedHQ,'Visit CryptoWorldz HQ')} ${outbound(LINKS.zedBot,'Open @CryptoWorldzBot')}</div></section>

    <p class="sw-disclaimer">Project and launch information is informational. Planned/pipeline projects are not represented as live tokens. Always verify contract addresses and external destinations before interacting.</p>
  </div>`;
}

render();

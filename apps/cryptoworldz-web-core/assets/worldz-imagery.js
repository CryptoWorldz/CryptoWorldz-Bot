(() => {
  const host = location.hostname.replace(/^www\./, '').toLowerCase();
  const pathname = location.pathname.replace(/\/+$/, '').toLowerCase();
  const params = new URLSearchParams(location.search);

  const hostMap = {
    'cryptoworldz.xyz': 'cryptoworldz',
    'cryptobotz.cryptoworldz.xyz': 'cryptoworldz',
    'oneworldz.com': 'oneworldz',
    'purplediamondcrew.com': 'purplediamondcrew',
    'solworldz.xyz': 'solworldz',
    'ethworldz.xyz': 'ethworldz',
    'baseworldz.xyz': 'baseworldz',
    'bnbworldz.xyz': 'bnbworldz',
    'xrpworldz.xyz': 'xrpworldz',
    'suiworldz.xyz': 'suiworldz',
    'hyperworldz.xyz': 'hyperworldz',
    'robinworldz.xyz': 'robinworldz',
    'bitcoinworldz.xyz': 'bitcoinworldz',
    'bitworldz.xyz': 'bitcoinworldz',
    'hodlerworldz.xyz': 'hodlerworldz',
    'impactbased.oneworldz.com': 'impactbased',
    'impact.oneworldz.com': 'impactbased',
    'law.oneworldz.com': 'robinhoodlaw',
    'learn.oneworldz.com': 'learnworldz'
  };

  const previewPathMap = {
    '/purple-diamond-crew': 'purplediamondcrew',
    '/worldz/oneworldz': 'oneworldz',
    '/worldz/cryptoworldz': 'cryptoworldz',
    '/worldz/solworldz': 'solworldz',
    '/worldz/ethworldz': 'ethworldz',
    '/worldz/baseworldz': 'baseworldz',
    '/worldz/bnbworldz': 'bnbworldz',
    '/worldz/xrpworldz': 'xrpworldz',
    '/worldz/suiworldz': 'suiworldz',
    '/worldz/hyperworldz': 'hyperworldz',
    '/worldz/robinworldz': 'robinworldz',
    '/worldz/bitcoinworldz': 'bitcoinworldz',
    '/worldz/bitworldz': 'bitcoinworldz',
    '/worldz/hodlerworldz': 'hodlerworldz',
    '/worldz/impactbased': 'impactbased',
    '/worldz/impact': 'impactbased',
    '/worldz/law': 'robinhoodlaw',
    '/worldz/learn': 'learnworldz'
  };

  const requestedAliases = {
    pdc: 'purplediamondcrew',
    impact: 'impactbased',
    law: 'robinhoodlaw',
    learn: 'learnworldz',
    bitworldz: 'bitcoinworldz'
  };

  const visuals = {
    cryptoworldz: { title: 'CRYPTOWORLDZ', subtitle: 'ZED • GRACE • AUTO', icon: 'CW', accent: '#b96cff', accent2: '#46d9ff', caption: 'Command Centre systems connected through one secure ecosystem.' },
    oneworldz: { title: 'ONEWORLDZ', subtitle: 'ONE VISION', icon: '1W', accent: '#b96cff', accent2: '#f2ca59', caption: 'One global gateway for action, learning, dignity and connected Worldz.' },
    purplediamondcrew: { title: 'PURPLE DIAMOND CREW', subtitle: 'REAL ACTION • REAL IMPACT', icon: '◆', accent: '#c66cff', accent2: '#f2ca59', caption: 'Helping the People Who Help People.' },
    solworldz: { title: 'SOLWORLDZ', subtitle: 'SOLANA COMMUNITY', icon: '◎', accent: '#9945ff', accent2: '#14f195', caption: 'Solana education, projects, community and verified launch pathways.' },
    ethworldz: { title: 'ETHWORLDZ', subtitle: 'ETHEREUM COMMUNITY', icon: 'Ξ', accent: '#8c8cff', accent2: '#d7d7ff', caption: 'Ethereum learning, builders, safety and community collaboration.' },
    baseworldz: { title: 'BASEWORLDZ', subtitle: 'BASE COMMUNITY', icon: 'B', accent: '#276cff', accent2: '#8bb8ff', caption: 'Base ecosystem education, builders and verified community links.' },
    bnbworldz: { title: 'BNBWORLDZ', subtitle: 'BNB COMMUNITY', icon: 'BNB', accent: '#f3ba2f', accent2: '#ffe590', caption: 'BNB Chain learning, projects, safety and connected community action.' },
    xrpworldz: { title: 'XRPWORLDZ', subtitle: 'XRPL COMMUNITY', icon: 'X', accent: '#6fd8ff', accent2: '#ffffff', caption: 'XRPL education, builders, verified links and community pathways.' },
    suiworldz: { title: 'SUIWORLDZ', subtitle: 'SUI COMMUNITY', icon: 'SUI', accent: '#6fbcf0', accent2: '#ccecff', caption: 'Sui learning, projects, security and transparent community growth.' },
    hyperworldz: { title: 'HYPERWORLDZ', subtitle: 'HYPERLIQUID COMMUNITY', icon: 'H', accent: '#49e6c2', accent2: '#b5fff0', caption: 'Hyperliquid education, market awareness and verified community links.' },
    robinworldz: { title: 'ROBINWORLDZ', subtitle: 'RECOVER • REBUILD', icon: 'R', accent: '#6be39c', accent2: '#f2ca59', caption: 'Debt recovery information and practical pathways built around dignity.' },
    bitcoinworldz: { title: 'BITCOINWORLDZ', subtitle: 'BITCOIN COMMUNITY', icon: '₿', accent: '#f7931a', accent2: '#ffe3b4', caption: 'Bitcoin learning, safety, community and verified ecosystem pathways.' },
    hodlerworldz: { title: 'HODLERWORLDZ', subtitle: 'READ-ONLY PORTFOLIO', icon: 'H', accent: '#c26cff', accent2: '#48d9ff', caption: 'Secure portfolio visibility without requesting private keys.' },
    impactbased: { title: 'IMPACTBASED', subtitle: 'TRANSPARENT IMPACT', icon: '♥', accent: '#c96cff', accent2: '#f2ca59', caption: 'Impact launches connected to public evidence and visible outcomes.' },
    robinhoodlaw: { title: 'ROBIN HOOD LAW', subtitle: 'RIGHTS • RECOVERY • DIGNITY', icon: '⚖', accent: '#6be39c', accent2: '#f2ca59', caption: 'Plain-language pathways for people facing debt and financial pressure.' },
    learnworldz: { title: 'LEARNWORLDZ', subtitle: 'KNOWLEDGE PEOPLE CAN USE', icon: 'L', accent: '#5ad1ff', accent2: '#b96cff', caption: 'Practical education across crypto, safety, impact and technology.' }
  };

  function resolveVisual() {
    const rawRequested = String(params.get('world') || params.get('site') || '').toLowerCase();
    const requested = requestedAliases[rawRequested] || rawRequested;
    if (requested && visuals[requested]) return requested;
    if (previewPathMap[pathname]) return previewPathMap[pathname];
    if (params.get('mode') === 'impact') return 'impactbased';
    if (params.get('mode') === 'law') return 'robinhoodlaw';
    if (params.get('mode') === 'learn') return 'learnworldz';
    return hostMap[host] || 'cryptoworldz';
  }

  function artMarkup(data) {
    return `<figure class="worldz-official-art" aria-label="Official ${data.title} visual">
      <svg viewBox="0 0 900 540" role="img" aria-labelledby="worldz-art-title worldz-art-desc">
        <title id="worldz-art-title">Official ${data.title} visual</title>
        <desc id="worldz-art-desc">${data.caption}</desc>
        <defs>
          <radialGradient id="worldz-space" cx="50%" cy="42%" r="72%"><stop offset="0" stop-color="#35105d"/><stop offset=".48" stop-color="#120528"/><stop offset="1" stop-color="#030613"/></radialGradient>
          <linearGradient id="worldz-ring" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${data.accent2}"/><stop offset=".48" stop-color="${data.accent}"/><stop offset="1" stop-color="#6725a9"/></linearGradient>
          <filter id="worldz-glow"><feGaussianBlur stdDeviation="9" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <rect width="900" height="540" fill="url(#worldz-space)"/>
        <g opacity=".72" fill="#fff">${Array.from({ length: 38 }, (_, index) => {
          const x = (index * 137 + 43) % 880;
          const y = (index * 83 + 27) % 510;
          const r = index % 7 === 0 ? 2.3 : index % 3 === 0 ? 1.5 : .9;
          return `<circle cx="${x}" cy="${y}" r="${r}"/>`;
        }).join('')}</g>
        <circle cx="450" cy="248" r="168" fill="none" stroke="${data.accent}" stroke-opacity=".18" stroke-width="34"/>
        <circle cx="450" cy="248" r="139" fill="#080415" stroke="url(#worldz-ring)" stroke-width="7" filter="url(#worldz-glow)"/>
        <circle cx="450" cy="248" r="112" fill="none" stroke="${data.accent2}" stroke-opacity=".34" stroke-width="2" stroke-dasharray="10 14"/>
        <path d="M160 420 C280 350 620 350 740 420" fill="none" stroke="${data.accent}" stroke-opacity=".48" stroke-width="3"/>
        <path d="M220 438 C340 390 560 390 680 438" fill="none" stroke="${data.accent2}" stroke-opacity=".35" stroke-width="2"/>
        <text x="450" y="272" text-anchor="middle" fill="#fff" font-size="72" class="worldz-art-icon worldz-art-glow">${data.icon}</text>
        <text x="450" y="465" text-anchor="middle" fill="#fff" font-size="34" class="worldz-art-title">${data.title}</text>
        <text x="450" y="498" text-anchor="middle" fill="${data.accent2}" font-size="18" class="worldz-art-subtitle">${data.subtitle}</text>
        <text x="78" y="72" fill="${data.accent2}" font-size="15" class="worldz-art-small">ONE WORLD • ONE MISSION</text>
        <text x="822" y="72" text-anchor="end" fill="${data.accent}" font-size="15" class="worldz-art-small">CONNECTED WORLDZ</text>
      </svg>
      <figcaption>${data.caption}</figcaption>
    </figure>`;
  }

  function addCommandCentreSection() {
    if (resolveVisual() !== 'cryptoworldz' || document.querySelector('.worldz-system-section')) return;
    const hero = document.querySelector('#app .hero, #app .compact-hero');
    if (!hero) return;
    const section = document.createElement('section');
    section.className = 'worldz-system-section';
    section.innerHTML = `<header class="worldz-system-heading"><p class="eyebrow">CRYPTOWORLDZ COMMAND CENTRE</p><h2>Zed, Grace and Auto — one coordinated operating system.</h2><p>Community operations, approval-controlled communications and owner-protected investment controls remain separated by role and safety boundary.</p></header><div class="worldz-system-grid">
      <article class="worldz-system-card"><span class="worldz-system-badge">ZED</span><h3>Zed Command Centre</h3><p>Members, missions, Legend Points, governance, rewards, referrals, directories and executive controls.</p><a class="button button-primary" href="https://t.me/CryptoWorldzBot" target="_blank" rel="noopener noreferrer">Open Zed</a></article>
      <article class="worldz-system-card"><span class="worldz-system-badge">G</span><h3>Grace Social Engine</h3><p>Drafts, calendars, account connections and publishing with owner or authorised Admin approval.</p><a class="button button-secondary" href="https://t.me/CryptoWorldzBot" target="_blank" rel="noopener noreferrer">Open Grace Controls</a></article>
      <article class="worldz-system-card"><span class="worldz-system-badge">AUTO</span><h3>Diamond Buy™ Auto</h3><p>Buy-only owner investment control, capped schedules, audit logs and emergency stops. Signing remains private.</p><a class="button button-secondary" href="https://t.me/CryptoWorldzBot" target="_blank" rel="noopener noreferrer">Open Auto Controls</a></article>
    </div><p class="worldz-visual-safety">Never provide a seed phrase, private key, password or login code through Telegram or a public website.</p>`;
    hero.insertAdjacentElement('afterend', section);
  }

  function addFounderSpotlight() {
    if (resolveVisual() !== 'oneworldz' || document.querySelector('.worldz-founder-strip')) return;
    const hero = document.querySelector('#app .ow-hero, #app .hero');
    if (!hero) return;
    const strip = document.createElement('section');
    strip.className = 'worldz-founder-strip';
    strip.innerHTML = `<span class="worldz-founder-mini-dial" aria-label="Founder self-reported effort index 365 percent"></span><div><p class="eyebrow">FOUNDER SPOTLIGHT</p><h2>JayJayTeamDev — work ethic, production and mission.</h2><p>See the build record behind OneWorldz, CryptoWorldz, Zed, Grace, Auto and the connected humanitarian mission.</p></div><a class="button button-primary worldz-art-link" href="/?page=jayjayteamdev">Open Founder Page</a>`;
    hero.insertAdjacentElement('afterend', strip);
    const nav = document.querySelector('#main-nav');
    if (nav && !nav.querySelector('[data-jayjay-link]')) {
      const link = document.createElement('a');
      link.href = '/?page=jayjayteamdev';
      link.textContent = 'JayJayTeamDev';
      link.dataset.jayjayLink = 'true';
      link.className = 'worldz-official-nav-link';
      nav.appendChild(link);
    }
  }

  function addOfficialArt() {
    const key = resolveVisual();
    if (key === 'oneworldz' || document.querySelector('.worldz-official-art')) return;
    const hero = document.querySelector('#app .pdc-hero, #app .hero, #app .compact-hero, #app .mission-hero');
    if (!hero) return;
    const data = visuals[key] || visuals.cryptoworldz;
    hero.classList.add('worldz-hero-with-art');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = artMarkup(data);
    hero.appendChild(wrapper.firstElementChild);
  }

  let scheduled = false;
  function enhance() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      addOfficialArt();
      addCommandCentreSection();
      addFounderSpotlight();
    });
  }

  const observer = new MutationObserver(enhance);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  enhance();
})();

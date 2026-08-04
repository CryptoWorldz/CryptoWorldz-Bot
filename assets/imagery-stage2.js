'use strict';

(() => {
  const HOST_TO_SITE = {
    'oneworldz.com': 'oneworldz',
    'cryptoworldz.xyz': 'cryptoworldz',
    'solworldz.xyz': 'solworldz',
    'ethworldz.xyz': 'ethworldz',
    'xrpworldz.xyz': 'xrpworldz',
    'baseworldz.xyz': 'baseworldz',
    'bnbworldz.xyz': 'bnbworldz',
    'suiworldz.xyz': 'suiworldz',
    'hyperworldz.xyz': 'hyperworldz',
    'robinworldz.xyz': 'robinworldz',
    'bitworldz.xyz': 'bitworldz',
    'bitcoinworldz.xyz': 'bitworldz',
    'hodlerworldz.xyz': 'hodlerworldz',
    'hodlergalaxy.xyz': 'hodlerworldz',
    'staging.hodlergalaxy.xyz': 'hodlerworldz',
    'purplediamondcrew.com': 'purplediamondcrew'
  };

  const SCENES = {
    oneworldz: { label: 'ONEWORLDZ', code: '1W', motif: 'humanity', title: 'ONE WORLD • ONE MISSION' },
    cryptoworldz: { label: 'CRYPTOWORLDZ', code: 'CW', motif: 'network', title: 'CONNECTED ECOSYSTEM' },
    solworldz: { label: 'SOLWORLDZ', code: 'SOL', motif: 'speed', title: 'ONE SOLFAM' },
    ethworldz: { label: 'ETHWORLDZ', code: 'ETH', motif: 'diamond', title: 'OPEN BUILDERS' },
    xrpworldz: { label: 'XRPWORLDZ', code: 'XRP', motif: 'waves', title: 'FAST CONNECTIONS' },
    baseworldz: { label: 'BASEWORLDZ', code: 'BASE', motif: 'blocks', title: 'BUILD ONCHAIN' },
    bnbworldz: { label: 'BNBWORLDZ', code: 'BNB', motif: 'grid', title: 'GLOBAL COMMUNITY' },
    suiworldz: { label: 'SUIWORLDZ', code: 'SUI', motif: 'drop', title: 'MOVE FORWARD' },
    hyperworldz: { label: 'HYPERWORLDZ', code: 'HYPER', motif: 'pulse', title: 'HIGH PERFORMANCE' },
    robinworldz: { label: 'ROBINWORLDZ', code: 'R', motif: 'shield', title: 'RECOVER • REBUILD' },
    bitworldz: { label: 'BITWORLDZ', code: 'BTC', motif: 'coin', title: 'STRONG FOUNDATIONS' },
    hodlerworldz: { label: 'HODLERWORLDZ', code: 'HODL', motif: 'galaxy', title: 'PATIENCE • COMMUNITY' },
    purplediamondcrew: { label: 'PURPLE DIAMOND CREW', code: 'PDC', motif: 'crew', title: 'REAL PEOPLE • REAL ACTION' },
    impactbased: { label: 'IMPACTBASED', code: 'IMPACT', motif: 'impact', title: 'TRANSPARENT ACTION' },
    rhl: { label: 'ROBIN HOOD LAW', code: 'RHL', motif: 'scales', title: 'FAIRNESS • RECOVERY' },
    learnworldz: { label: 'LEARNWORLDZ', code: 'LEARN', motif: 'book', title: 'EDUCATION FOR EVERYONE' },
    zed: { label: 'ZED COMMAND CENTRE', code: 'ZED', motif: 'command', title: 'POWERED BY ZED' }
  };

  const CARD_NAME_TO_KEY = {
    'OneWorldz': 'oneworldz',
    'CryptoWorldz': 'cryptoworldz',
    'SolWorldz': 'solworldz',
    'EthWorldz': 'ethworldz',
    'XRPWorldz': 'xrpworldz',
    'BaseWorldz': 'baseworldz',
    'BNBWorldz': 'bnbworldz',
    'SuiWorldz': 'suiworldz',
    'HyperWorldz': 'hyperworldz',
    'RobinWorldz': 'robinworldz',
    'BitWorldz': 'bitworldz',
    'HodlerWorldz': 'hodlerworldz',
    'Purple Diamond Crew': 'purplediamondcrew',
    'ImpactBased': 'impactbased',
    'Robin Hood Law': 'rhl',
    'LearnWorldz': 'learnworldz',
    'Zed Command Centre': 'zed'
  };

  const siteParam = new URLSearchParams(location.search).get('site');
  const host = location.hostname.toLowerCase().replace(/^www\./, '');
  const siteKey = window.__WORLDZ_PREVIEW_SITE__ || siteParam || HOST_TO_SITE[host] || 'cryptoworldz';
  const scene = SCENES[siteKey] || SCENES.cryptoworldz;

  function escapeXml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  function motifMarkup(motif) {
    const common = {
      network: `<g opacity=".72"><path d="M111 165L214 111L321 148L438 102L498 212L424 325L291 369L154 309Z" fill="none" stroke="url(#line)" stroke-width="3"/><g fill="var(--accent-2)"><circle cx="111" cy="165" r="7"/><circle cx="214" cy="111" r="6"/><circle cx="321" cy="148" r="8"/><circle cx="438" cy="102" r="6"/><circle cx="498" cy="212" r="8"/><circle cx="424" cy="325" r="7"/><circle cx="291" cy="369" r="8"/><circle cx="154" cy="309" r="6"/></g></g>`,
      humanity: `<g opacity=".88"><circle cx="300" cy="219" r="37" fill="none" stroke="var(--accent-2)" stroke-width="5"/><path d="M213 363c12-74 53-111 87-111s75 37 87 111" fill="none" stroke="url(#line)" stroke-width="12" stroke-linecap="round"/><path d="M180 311c29 18 62 28 99 31M420 311c-29 18-62 28-99 31" fill="none" stroke="var(--accent)" stroke-width="7" stroke-linecap="round"/></g>`,
      speed: `<g fill="none" stroke-linecap="round"><path d="M111 215C192 116 337 83 490 151" stroke="var(--accent-2)" stroke-width="6"/><path d="M102 265C222 178 356 171 504 224" stroke="url(#line)" stroke-width="5"/><path d="M129 315C248 258 376 269 477 316" stroke="var(--accent)" stroke-width="4"/></g>`,
      diamond: `<path d="M300 91L400 255L300 410L200 255Z" fill="rgba(255,255,255,.035)" stroke="url(#line)" stroke-width="7"/><path d="M300 91L300 410M200 255H400M300 91L200 255L300 211L400 255Z" fill="none" stroke="var(--accent-2)" stroke-width="3" opacity=".8"/>`,
      waves: `<g fill="none" stroke-linecap="round"><path d="M109 198c64-60 128-60 192 0s128 60 192 0" stroke="var(--accent-2)" stroke-width="8"/><path d="M109 260c64-60 128-60 192 0s128 60 192 0" stroke="url(#line)" stroke-width="7"/><path d="M109 322c64-60 128-60 192 0s128 60 192 0" stroke="var(--accent)" stroke-width="6"/></g>`,
      blocks: `<g fill="none" stroke="url(#line)" stroke-width="5"><path d="M197 159h95v95h-95zM308 159h95v95h-95zM197 270h95v95h-95zM308 270h95v95h-95z"/></g><path d="M234 206h132M300 196v132" stroke="var(--accent-2)" stroke-width="6" stroke-linecap="round"/>`,
      grid: `<g fill="none" stroke="url(#line)" stroke-width="5"><path d="M300 104l85 49v98l-85 49-85-49v-98z"/><path d="M300 202l85 49v98l-85 49-85-49v-98z"/><path d="M215 251l85-49 85 49-85 49z"/></g>`,
      drop: `<path d="M300 93c-65 91-111 145-111 217 0 62 50 112 111 112s111-50 111-112c0-72-46-126-111-217z" fill="rgba(255,255,255,.04)" stroke="url(#line)" stroke-width="7"/><path d="M241 320c18 36 55 52 90 38" fill="none" stroke="var(--accent-2)" stroke-width="8" stroke-linecap="round"/>`,
      pulse: `<path d="M95 278h103l31-88 58 178 50-122 28 32h140" fill="none" stroke="url(#line)" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="300" cy="278" r="105" fill="none" stroke="var(--accent)" stroke-width="3" opacity=".55"/>`,
      shield: `<path d="M300 92l126 46v109c0 83-49 142-126 181-77-39-126-98-126-181V138z" fill="rgba(255,255,255,.035)" stroke="url(#line)" stroke-width="7"/><path d="M237 264l43 44 88-97" fill="none" stroke="var(--accent-2)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`,
      coin: `<circle cx="300" cy="258" r="131" fill="rgba(255,255,255,.035)" stroke="url(#line)" stroke-width="9"/><path d="M269 166v185M331 166v185M228 198h104c49 0 55 65 7 76H228h116c55 0 58 72 4 81H228" fill="none" stroke="var(--accent-2)" stroke-width="10" stroke-linecap="round"/>`,
      galaxy: `<g class="scene-ring"><ellipse cx="300" cy="274" rx="205" ry="71" fill="none" stroke="url(#line)" stroke-width="6" transform="rotate(-14 300 274)"/><circle cx="481" cy="230" r="12" fill="var(--accent-2)"/></g><g class="scene-ring reverse"><ellipse cx="300" cy="274" rx="151" ry="225" fill="none" stroke="var(--accent)" stroke-width="3" opacity=".65" transform="rotate(32 300 274)"/><circle cx="221" cy="89" r="9" fill="var(--accent-2)"/></g>`,
      crew: `<path d="M300 96l41 89 97 12-71 67 19 96-86-48-86 48 19-96-71-67 97-12z" fill="rgba(255,255,255,.04)" stroke="url(#line)" stroke-width="7"/><path d="M220 379c31-38 70-57 80-57s49 19 80 57" fill="none" stroke="var(--accent-2)" stroke-width="9" stroke-linecap="round"/>`,
      impact: `<circle cx="300" cy="258" r="139" fill="none" stroke="url(#line)" stroke-width="7"/><path d="M300 153v210M195 258h210" stroke="var(--accent-2)" stroke-width="6" stroke-linecap="round"/><path d="M300 120c-50 38-77 84-77 138s27 100 77 138c50-38 77-84 77-138s-27-100-77-138z" fill="none" stroke="var(--accent)" stroke-width="4"/>`,
      scales: `<path d="M300 126v241M222 166h156M300 149l-92 58M300 149l92 58" fill="none" stroke="url(#line)" stroke-width="8" stroke-linecap="round"/><path d="M164 207l-44 92h88zM436 207l-44 92h88z" fill="rgba(255,255,255,.04)" stroke="var(--accent-2)" stroke-width="5"/><path d="M225 367h150" stroke="var(--accent-2)" stroke-width="11" stroke-linecap="round"/>`,
      book: `<path d="M126 150c72-22 127-5 174 40v207c-47-45-102-62-174-40zM474 150c-72-22-127-5-174 40v207c47-45 102-62 174-40z" fill="rgba(255,255,255,.04)" stroke="url(#line)" stroke-width="7"/><path d="M300 190v207" stroke="var(--accent-2)" stroke-width="5"/>`,
      command: `<g fill="none" stroke="url(#line)" stroke-width="6"><rect x="201" y="128" width="198" height="239" rx="67"/><path d="M241 214h118M262 274h76M245 333h110"/></g><circle cx="260" cy="183" r="11" fill="var(--accent-2)"/><circle cx="340" cy="183" r="11" fill="var(--accent-2)"/>`
    };
    return common[motif] || common.network;
  }

  function heroSvg(def) {
    const safeLabel = escapeXml(def.label);
    const safeCode = escapeXml(def.code);
    const safeTitle = escapeXml(def.title);
    return `<div class="world-scene" aria-hidden="true">
      <span class="imagery-stage-badge">WORLDZ • STAGE 2</span>
      <svg class="scene-svg" viewBox="0 0 600 540" role="img">
        <defs>
          <linearGradient id="line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="var(--accent-2)"/>
            <stop offset=".48" stop-color="#ffffff"/>
            <stop offset="1" stop-color="var(--accent)"/>
          </linearGradient>
          <radialGradient id="planet" cx="34%" cy="27%" r="77%">
            <stop offset="0" stop-color="#ffffff"/>
            <stop offset=".07" stop-color="var(--accent-2)"/>
            <stop offset=".42" stop-color="var(--accent)"/>
            <stop offset="1" stop-color="#08020f"/>
          </radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <circle cx="300" cy="270" r="204" fill="rgba(255,255,255,.018)" stroke="rgba(255,255,255,.08)"/>
        <circle class="scene-pulse" cx="300" cy="270" r="166" fill="url(#planet)" opacity=".2" filter="url(#glow)"/>
        ${motifMarkup(def.motif)}
        <g class="scene-float">
          <circle cx="300" cy="270" r="92" fill="url(#planet)" stroke="rgba(255,255,255,.42)" stroke-width="2" filter="url(#glow)"/>
          <path d="M236 260c29-43 78-61 123-42M249 310c37 28 84 27 118 0" fill="none" stroke="rgba(255,255,255,.23)" stroke-width="7" stroke-linecap="round"/>
          <text x="300" y="276" text-anchor="middle" fill="#fff" font-family="Orbitron, sans-serif" font-size="${safeCode.length > 4 ? 25 : 36}" font-weight="800">${safeCode}</text>
          <text x="300" y="302" text-anchor="middle" fill="var(--accent-2)" font-family="Orbitron, sans-serif" font-size="10" font-weight="700" letter-spacing="3">${safeLabel}</text>
        </g>
        <text x="300" y="500" text-anchor="middle" fill="rgba(255,255,255,.75)" font-family="Orbitron, sans-serif" font-size="12" font-weight="700" letter-spacing="3">${safeTitle}</text>
      </svg>
    </div>`;
  }

  function miniSvg(def, id) {
    const safeCode = escapeXml(def.code);
    const gradientId = `mini-${id}`;
    return `<svg viewBox="0 0 420 116" aria-hidden="true">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="var(--accent-2)"/>
          <stop offset="1" stop-color="var(--accent)"/>
        </linearGradient>
      </defs>
      <circle cx="344" cy="57" r="79" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.12)"/>
      <circle cx="344" cy="57" r="45" fill="url(#${gradientId})" opacity=".38"/>
      <ellipse cx="344" cy="57" rx="72" ry="22" fill="none" stroke="var(--accent-2)" stroke-width="2" opacity=".6" transform="rotate(-13 344 57)"/>
      <path d="M0 96C78 54 141 84 211 37S341 15 420 48" fill="none" stroke="url(#${gradientId})" stroke-width="3" opacity=".55"/>
      <text x="344" y="64" text-anchor="middle" fill="#fff" font-family="Orbitron, sans-serif" font-size="${safeCode.length > 4 ? 15 : 21}" font-weight="800">${safeCode}</text>
    </svg>`;
  }

  function zedSvg() {
    return `<svg viewBox="0 0 300 380" role="img" aria-label="Zed Command Centre robot">
      <defs>
        <linearGradient id="zed-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e9e6ff"/><stop offset=".35" stop-color="#7042b5"/><stop offset=".72" stop-color="#1d1132"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient>
        <filter id="zed-glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="150" cy="185" r="134" fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.12)"/>
      <path d="M93 71h114l25 43-11 96-36 31H115l-36-31-11-96z" fill="url(#zed-metal)" stroke="rgba(255,255,255,.55)" stroke-width="3"/>
      <path d="M100 115h100l13 31-24 46h-78l-24-46z" fill="#07030d" stroke="var(--accent)" stroke-width="3"/>
      <path d="M115 146h28M157 146h28" stroke="var(--accent-2)" stroke-width="8" stroke-linecap="round" filter="url(#zed-glow)"/>
      <path d="M117 244h66l45 57-25 60H97l-25-60z" fill="url(#zed-metal)" stroke="rgba(255,255,255,.48)" stroke-width="3"/>
      <rect x="108" y="277" width="84" height="35" rx="6" fill="#050108" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="150" y="301" text-anchor="middle" fill="#fff" font-family="Orbitron, sans-serif" font-size="20" font-weight="800" letter-spacing="4">ZED</text>
      <path d="M72 295L30 335M228 295l42 40" stroke="url(#zed-metal)" stroke-width="20" stroke-linecap="round"/>
      <circle cx="30" cy="335" r="15" fill="var(--accent-2)" opacity=".8"/>
      <circle cx="270" cy="335" r="15" fill="var(--accent)" opacity=".8"/>
    </svg>`;
  }

  function enhanceHeader() {
    document.body.dataset.worldzScene = siteKey;
    const brand = document.querySelector('.brand');
    if (brand) brand.setAttribute('title', `${scene.label} — ${scene.title}`);
  }

  function enhanceHero() {
    const hero = document.querySelector('.hero-visual');
    if (!hero || hero.classList.contains('scene-ready')) return;
    hero.innerHTML = heroSvg(scene);
    hero.classList.add('scene-ready');
  }

  function enhanceWorldCards() {
    document.querySelectorAll('.world-card').forEach((card, index) => {
      if (card.querySelector('.world-card-art')) return;
      const title = card.querySelector('h3')?.textContent?.trim() || '';
      const key = CARD_NAME_TO_KEY[title] || 'cryptoworldz';
      const def = SCENES[key] || SCENES.cryptoworldz;
      const art = document.createElement('div');
      art.className = 'world-card-art';
      art.dataset.world = key;
      art.innerHTML = miniSvg(def, `${index}-${key}`);
      card.prepend(art);
    });
  }

  function enhanceZed() {
    const emblem = document.querySelector('.zed-emblem');
    if (!emblem || emblem.classList.contains('zed-upgraded')) return;
    emblem.innerHTML = zedSvg();
    emblem.classList.add('zed-upgraded');
    emblem.setAttribute('aria-label', 'Zed Command Centre');
  }

  function enhance() {
    enhanceHeader();
    enhanceHero();
    enhanceWorldCards();
    enhanceZed();
  }

  let queued = false;
  const queueEnhance = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      enhance();
    });
  };

  enhance();
  const observer = new MutationObserver(queueEnhance);
  observer.observe(document.body, { childList: true, subtree: true });
})();
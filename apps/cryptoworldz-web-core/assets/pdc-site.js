(() => {
  const hostname = location.hostname.replace(/^www\./, '').toLowerCase();
  const previewSite = new URLSearchParams(location.search).get('site');
  if (hostname !== 'purplediamondcrew.com' && previewSite !== 'purplediamondcrew') return;

  const config = window.CRYPTOWORLDZ_CONFIG;
  const app = document.querySelector('#app');
  const nav = document.querySelector('#main-nav');
  const brandTitle = document.querySelector('#brand-title');
  const brandSubtitle = document.querySelector('#brand-subtitle');
  const walletButton = document.querySelector('#wallet-button');
  const footer = document.querySelector('.site-footer');

  if (!config || !app) return;

  const links = Object.freeze({
    goFundMeProfile: 'https://www.gofundme.com/u/jayjayteamdev',
    ugandaCampaign: 'https://gofund.me/c2e4fa936',
    cryptoWorldz: 'https://cryptoworldz.xyz',
    oneWorldz: 'https://oneworldz.com',
    impactBased: 'https://oneworldz.com/worldz/impactbased',
    telegram: 'https://t.me/CryptoWorldzRaaiiiddTeam',
    x: 'https://x.com/CryptoWorldzX'
  });

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

  function externalButton(label, href, primary = false) {
    const url = safeUrl(href);
    return url
      ? `<a class="button ${primary ? 'button-primary' : 'button-secondary'}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
      : '';
  }

  function anchorButton(label, href, primary = false) {
    return `<a class="button ${primary ? 'button-primary' : 'button-secondary'}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  }

  function metadataFor(token) {
    return token?.metadata && typeof token.metadata === 'object' ? token.metadata : {};
  }

  function tokenLogo(token) {
    const logo = safeUrl(token.logo_url);
    return logo
      ? `<span class="legacy-token-logo"><img src="${escapeHtml(logo)}" alt="" loading="lazy"></span>`
      : `<span class="legacy-token-logo legacy-token-fallback">${escapeHtml(String(token.symbol || '?').slice(0, 2))}</span>`;
  }

  function feeSplitLabel(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Not disclosed';
    const items = Object.entries(value)
      .filter(([, amount]) => amount !== null && amount !== undefined && amount !== '')
      .map(([label, amount]) => `${String(label).replaceAll('_', ' ')}: ${amount}${typeof amount === 'number' ? '%' : ''}`);
    return items.length ? items.join(' • ') : 'Not disclosed';
  }

  function legacyStatus(token) {
    if (token.launch_status === 'live') return 'Revived / live';
    if (token.launch_status === 'paused') return 'Revival candidate';
    return 'Legacy record';
  }

  function explorerUrl(token) {
    return safeUrl(token.explorer_url)
      || (token.contract_address ? `https://solscan.io/token/${encodeURIComponent(token.contract_address)}` : '');
  }

  function primaryAction(token) {
    if (safeUrl(token.trade_url)) return ['Invest', token.trade_url];
    if (safeUrl(token.dexscreener_url)) return ['Invest', token.dexscreener_url];
    if (safeUrl(token.launch_url)) return ['Open Token Page', token.launch_url];
    return ['Inspect', explorerUrl(token)];
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

  async function loadLegacyTokens() {
    const projects = await readTable(
      'impact_projects',
      'select=id&slug=eq.purple-diamond-crew&is_public=eq.true&limit=1'
    );
    const projectId = projects[0]?.id;
    if (!projectId) throw new Error('Purple Diamond Crew project record is missing');

    return readTable(
      'ecosystem_tokens',
      `select=*&project_id=eq.${encodeURIComponent(projectId)}&is_public=eq.true&contract_address=not.is.null&verified_at=not.is.null&launch_status=in.(live,paused,archived)&order=display_order.asc,name.asc`
    );
  }

  const actionCards = [
    ['🍽', 'Food & community BBQs', 'Hot meals, food relief, drinks and practical kindness for people doing it tough.'],
    ['🧥', 'Clothing, blankets & tents', 'Warm clothing, blankets, tents, hygiene supplies and essential packs delivered with dignity.'],
    ['🏫', 'Schools & learning support', 'School construction, fees, uniforms, mattresses, learning supplies and safer places for children.'],
    ['💧', 'Clean water & bore projects', 'Bore drilling, clean-water access, soil regeneration and sustainable community infrastructure.'],
    ['🏥', 'Medical & hospital assistance', 'Helping trusted people on the ground respond to urgent medical and hospital needs.'],
    ['🌱', 'Gardens, farming & independence', 'Gardening support, farming tools and systems that help communities build long-term opportunity.']
  ];

  function legacyCard(token, selectedId) {
    return `<button class="legacy-token-card ${token.id === selectedId ? 'selected' : ''}" type="button" data-legacy-token="${escapeHtml(token.id)}">
      <span class="legacy-status legacy-${escapeHtml(token.launch_status)}">${escapeHtml(legacyStatus(token))}</span>
      ${tokenLogo(token)}
      <span class="legacy-card-copy">
        <strong>$${escapeHtml(token.symbol)}</strong>
        <small>${escapeHtml(token.name)}</small>
      </span>
      <span class="legacy-contract">${escapeHtml(token.contract_address)}</span>
    </button>`;
  }

  function legacyDetail(token) {
    const metadata = metadataFor(token);
    const purpose = token.description || metadata.purpose || 'A verified Purple Diamond Crew legacy token preserved for careful revival assessment.';
    const [actionLabel, actionUrl] = primaryAction(token);
    const fee = Number.isInteger(token.fee_total_bps) ? `${token.fee_total_bps / 100}%` : 'Not disclosed';

    return `<article class="legacy-detail">
      <div class="legacy-detail-heading">
        <div>
          <p class="eyebrow">IF ONLY SOME THINGS COULD BE NEW AGAIN...</p>
          <h3>${escapeHtml(token.name)} <span>$${escapeHtml(token.symbol)}</span></h3>
        </div>
        <span class="legacy-status legacy-${escapeHtml(token.launch_status)}">${escapeHtml(legacyStatus(token))}</span>
      </div>
      <p>${escapeHtml(purpose)}</p>
      <div class="detail-grid legacy-detail-grid">
        <article><span>Contract</span><strong class="mono">${escapeHtml(token.contract_address)}</strong></article>
        <article><span>Current state</span><strong>${escapeHtml(legacyStatus(token))}</strong></article>
        <article><span>Launch provider</span><strong>${escapeHtml(token.launch_provider || 'Historical record')}</strong></article>
        <article><span>Launch model</span><strong>${escapeHtml(token.launch_model ? token.launch_model.toUpperCase() : 'Not disclosed')}</strong></article>
        <article><span>Trading fee</span><strong>${escapeHtml(fee)}</strong></article>
        <article><span>Fee split</span><strong>${escapeHtml(feeSplitLabel(token.fee_split))}</strong></article>
        <article><span>Verification</span><strong>Verified mint record</strong></article>
        <article><span>Revival direction</span><strong>Slow treasury support and community rebuilding</strong></article>
      </div>
      <div class="button-row">
        ${externalButton(actionLabel, actionUrl, true)}
        ${externalButton('Explorer', explorerUrl(token))}
        ${externalButton('X', metadata.x_url)}
        ${externalButton('Telegram', metadata.telegram_url)}
      </div>
      <p class="legacy-disclosure">A preserved or revival-candidate record is not a guarantee of liquidity, price, recovery or investment return. Confirm the contract and current market before interacting.</p>
    </article>`;
  }

  function hopeChestMarkup(tokens, selectedId, legacyState) {
    const selected = tokens.find((token) => token.id === selectedId) || tokens[0] || null;
    const liveCount = tokens.filter((token) => token.launch_status === 'live').length;
    const revivalCount = tokens.filter((token) => token.launch_status === 'paused').length;
    const legacyCount = tokens.filter((token) => token.launch_status === 'archived').length;
    const statusCopy = legacyState === 'loading'
      ? 'The verified Hope Chest records are loading securely…'
      : legacyState === 'error'
        ? 'The main Purple Diamond Crew website is live. The optional Hope Chest records are temporarily unavailable and will retry on your next visit.'
        : tokens.length
          ? ''
          : 'The Hope Chest is waiting for its verified treasures.';

    return `<section id="hope-chest" class="pdc-page hope-chest-page">
      <div class="hope-chest-shade">
        <div class="hope-chest-intro">
          <p class="eyebrow">PAGE THREE • A SECRET FOR THOSE WHO CHOOSE TO SEARCH</p>
          <h2>The OneWorldz Hope Chest</h2>
          <h3>If only some things could be new again...</h3>
          <p>Purple Diamond Crew legacy contracts are preserved here transparently for careful review by the community and the diamond hands who stayed.</p>
          <p>Nothing here promises instant liquidity, price recovery or investment return. Every visitor must verify the contract and current market before interacting.</p>
          <div class="hope-chest-stats">
            <span><strong>${tokens.length || '—'}</strong><small>Verified treasures</small></span>
            <span><strong>${revivalCount || '—'}</strong><small>Revival candidates</small></span>
            <span><strong>${legacyCount || '—'}</strong><small>Legacy records</small></span>
            <span><strong>${liveCount || '—'}</strong><small>Revived / live</small></span>
          </div>
          ${statusCopy ? `<p class="support-safety">${escapeHtml(statusCopy)}</p>` : ''}
        </div>
        ${tokens.length ? `<div class="legacy-token-grid">${tokens.map((token) => legacyCard(token, selected?.id)).join('')}</div>` : ''}
        ${selected ? legacyDetail(selected) : ''}
      </div>
    </section>`;
  }

  function pageMarkup(tokens, selectedId, legacyState) {
    return `<div class="pdc-shell">
      <section id="home" class="hero pdc-hero">
        <p class="eyebrow">ONE WORLD • ONE CREW • HELPING THE PEOPLE WHO HELP PEOPLE</p>
        <h1>Purple Diamond Crew</h1>
        <h2>Real People. Real Action. Real Impact.</h2>
        <p>We support trusted people already working on the ground — feeding the hungry, sheltering the cold, helping children, strengthening communities and delivering practical assistance where it matters most.</p>
        <div class="button-row hero-actions">
          ${externalButton('Support the Mission', links.goFundMeProfile, true)}
          ${externalButton('Help Reagan Care for Children', links.ugandaCampaign)}
          ${anchorButton('Meet the Action Team', '#ground')}
          ${externalButton('Explore CryptoWorldz', links.cryptoWorldz)}
        </div>
        <div class="trust-strip"><span>✓ Dignity first</span><span>✓ Community-led action</span><span>✓ Transparent progress</span><span>✓ Stronger together</span></div>
      </section>

      <section id="ground" class="pdc-page">
        <div class="pdc-section-heading">
          <p class="eyebrow">PAGE ONE • ACTION TEAM ON THE GROUND</p>
          <h2>The Purple Diamond Crew Action Team</h2>
          <p>Real people delivering practical help — from immediate street support through to long-term community infrastructure.</p>
        </div>
        <div class="pdc-action-grid">
          ${actionCards.map(([icon, title, copy]) => `<article class="pdc-action-card"><span>${icon}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></article>`).join('')}
        </div>

        <article id="mission" class="content-panel pdc-direction">
          <p class="eyebrow">CURRENT FEATURED MISSION</p>
          <h3>Helping Reagan care for children in Uganda</h3>
          <p>Current needs include food, medication, school fees, uniforms, rent, hygiene supplies and mattresses. Support is directed through the public campaign link so every visitor can review the campaign details before contributing.</p>
          <div class="button-row">
            ${externalButton('View the GoFundMe', links.ugandaCampaign, true)}
            ${externalButton('JayJayTeamDev GoFundMe Profile', links.goFundMeProfile)}
          </div>
        </article>

        <article id="dream" class="content-panel pdc-direction">
          <p class="eyebrow">A DREAM BUILT ON KINDNESS</p>
          <h3>Technology should help create dignity, hope and real opportunity.</h3>
          <p>JayJayTeamDev’s dream is to build technology and communities that do more than create money — helping provide food, clean water, shelter, education, medical care, dignity and hope.</p>
          <p>One long-held dream is to see machines once created for conflict transformed into machines of kindness, even delivering teddy bears to children around the world at Christmas.</p>
          <div class="button-row">
            ${externalButton('Support JayJayTeamDev’s Mission', links.goFundMeProfile, true)}
            ${externalButton('Visit OneWorldz', links.oneWorldz)}
          </div>
        </article>
      </section>

      <section id="support" class="pdc-page">
        <div class="pdc-section-heading">
          <p class="eyebrow">PAGE TWO • SUPPORT, CONTRIBUTIONS & APPLICATIONS</p>
          <h2>Choose how you can help</h2>
          <p>You do not need to be rich, famous or technical to make a difference. Every honest action counts.</p>
        </div>
        <div class="pdc-support-grid">
          <article><b>🤝</b><h3>Join the community</h3><p>Connect with the CryptoWorldz Command Centre and help organise practical action, missions and community support.</p>${externalButton('Open Telegram', links.telegram, true)}</article>
          <article><b>💜</b><h3>Support verified campaigns</h3><p>Review the named public campaigns, their purpose and their updates before deciding whether to contribute.</p>${externalButton('GoFundMe Profile', links.goFundMeProfile, true)}</article>
          <article><b>💡</b><h3>Suggest a project</h3><p>Share an idea for homelessness support, food relief, farming, water access, education or community development.</p>${externalButton('Open ImpactBased', links.impactBased, true)}</article>
          <article><b>🌍</b><h3>Build the bigger mission</h3><p>Explore the connected OneWorldz and CryptoWorldz ecosystem as the movement expands.</p>${externalButton('OneWorldz', links.oneWorldz, true)}${externalButton('CryptoWorldz', links.cryptoWorldz)}</article>
        </div>
        <article class="content-panel pdc-direction">
          <p class="eyebrow">TRANSPARENCY FIRST</p>
          <h3>Check the destination. Understand the purpose. Never rely on promises.</h3>
          <p>Purple Diamond Crew does not guarantee financial returns. Use verified campaign links only, review project evidence before contributing and confirm all crypto contracts and market conditions independently.</p>
          <div class="button-row">
            ${externalButton('Follow CryptoWorldz on X', links.x)}
            ${externalButton('Explore CryptoWorldz', links.cryptoWorldz)}
          </div>
        </article>
      </section>

      ${hopeChestMarkup(tokens, selectedId, legacyState)}
    </div>`;
  }

  function setIdentity() {
    document.title = 'Purple Diamond Crew • Real People • Real Action • Real Impact';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = 'Purple Diamond Crew supports real people delivering food, shelter, education, clean water, medical help and community-led action.';
    if (brandTitle) brandTitle.textContent = 'PURPLE DIAMOND CREW';
    if (brandSubtitle) brandSubtitle.textContent = 'REAL PEOPLE • REAL ACTION • REAL IMPACT';
    if (walletButton) walletButton.hidden = true;
    if (footer) {
      footer.innerHTML = '<p>One World • One Mission • One Future</p><p class="footer-note">Helping the People Who Help People. Verify campaign links, contracts and external destinations before interacting.</p>';
    }
    if (nav) {
      nav.innerHTML = [
        ['Home', '#home'],
        ['Action', '#ground'],
        ['Mission', '#mission'],
        ['Support', '#support'],
        ['Hope Chest', '#hope-chest'],
        ['CryptoWorldz', links.cryptoWorldz]
      ].map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join('');
    }
  }

  let tokens = [];
  let selectedId = null;
  let rendering = false;
  let legacyState = 'loading';

  function render() {
    rendering = true;
    setIdentity();
    if (tokens.length && !tokens.some((token) => token.id === selectedId)) selectedId = tokens[0].id;
    app.innerHTML = pageMarkup(tokens, selectedId, legacyState);
    app.querySelectorAll('[data-legacy-token]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedId = button.dataset.legacyToken;
        render();
        document.querySelector('#hope-chest')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    queueMicrotask(() => { rendering = false; });
  }

  const observer = new MutationObserver(() => {
    if (!rendering && !app.querySelector('.pdc-shell')) render();
  });
  observer.observe(app, { childList: true });

  render();

  loadLegacyTokens()
    .then((rows) => {
      tokens = Array.isArray(rows) ? rows : [];
      legacyState = 'ready';
      render();
    })
    .catch((error) => {
      legacyState = 'error';
      console.error('Purple Diamond Crew integration failed', error);
      render();
    });
})();
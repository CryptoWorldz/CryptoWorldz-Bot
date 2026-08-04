(() => {
  const hostname = location.hostname.replace(/^www\./, '').toLowerCase();
  if (hostname !== 'purplediamondcrew.com') return;

  const config = window.CRYPTOWORLDZ_CONFIG;
  const app = document.querySelector('#app');
  const nav = document.querySelector('#main-nav');
  const brandTitle = document.querySelector('#brand-title');
  const brandSubtitle = document.querySelector('#brand-subtitle');
  const walletButton = document.querySelector('#wallet-button');

  if (!config || !app) return;

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
    ['🍽', 'BBQs & food support', 'Hot meals, food relief, drinks and practical kindness for people doing it tough.'],
    ['🎒', 'Backpacks & essential packs', 'Backpacks, hoodies, blankets, hygiene supplies and everyday essentials delivered with dignity.'],
    ['🏕', 'Homeless support & shelter', 'Street support, temporary shelter supplies and a helping hand toward safer, more stable pathways.'],
    ['💧', 'Water wells & regeneration', 'Bore drilling, clean-water access, soil regeneration and sustainable land recovery.'],
    ['🌱', 'Farming tools & opportunity', 'Practical implements, gardening support and farming systems that strengthen local independence.'],
    ['🏠', 'Homes, schools & OneWorldz', 'Larger projects grow into the OneWorld One Hope direction as laws pass and trusted teams unite.']
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

  function pageMarkup(tokens, selectedId) {
    const selected = tokens.find((token) => token.id === selectedId) || tokens[0] || null;
    const liveCount = tokens.filter((token) => token.launch_status === 'live').length;
    const revivalCount = tokens.filter((token) => token.launch_status === 'paused').length;
    const legacyCount = tokens.filter((token) => token.launch_status === 'archived').length;

    return `<div class="pdc-shell">
      <section class="hero pdc-hero">
        <p class="eyebrow">ONE WORLD • ONE CREW • HELPING THE PEOPLE WHO HELP PEOPLE</p>
        <h1>Action on the ground. Support with heart. A legacy worth reviving.</h1>
        <p>Purple Diamond Crew connects practical humanitarian action with people who are ready to contribute, volunteer and help build lasting change.</p>
        <div class="button-row hero-actions">
          ${anchorButton('Action Team', '#ground', true)}
          ${anchorButton('Support & Contribute', '#support')}
          ${anchorButton('Find the Hope Chest', '#hope-chest')}
        </div>
        <div class="trust-strip"><span>✓ Practical field support</span><span>✓ Community participation</span><span>✓ Verified legacy contracts</span></div>
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
        <article class="content-panel pdc-direction">
          <p class="eyebrow">THE BIGGER DIRECTION</p>
          <h3>Purple Diamond Crew remains the team on the ground. OneWorldz carries the larger future.</h3>
          <p>As the crew grows and suitable legal structures are established, major water, farming, housing and school projects can connect into the wider OneWorld One Hope mission and trusted partner teams.</p>
        </article>
      </section>

      <section id="support" class="pdc-page">
        <div class="pdc-section-heading">
          <p class="eyebrow">PAGE TWO • SUPPORT, CONTRIBUTIONS & APPLICATIONS</p>
          <h2>Choose how you can help</h2>
          <p>Volunteer, contribute supplies, suggest a project, form a partnership or follow the mission through its verified community channels.</p>
        </div>
        <div class="pdc-support-grid">
          <article><b>🤝</b><h3>Apply to help on the ground</h3><p>Register interest in field work, logistics, food runs, supply distribution or local coordination.</p>${externalButton('Open Telegram', 'https://t.me/PurpleDiamondCrew', true)}</article>
          <article><b>💜</b><h3>Contribute supplies or support</h3><p>Offer practical supplies or discuss a verified contribution pathway before sending funds or goods.</p>${externalButton('Contact the Crew', 'https://x.com/PDCrew', true)}</article>
          <article><b>💡</b><h3>Suggest a project</h3><p>Share an idea for homelessness support, food relief, farming, water access or community development.</p>${externalButton('Open ImpactBased', 'https://impactbased.oneworldz.com', true)}</article>
          <article><b>🌍</b><h3>Build the bigger mission</h3><p>Explore the connected OneWorldz and CryptoWorldz ecosystem as the movement expands.</p>${externalButton('OneWorldz', 'https://oneworldz.com', true)}${externalButton('CryptoWorldz', 'https://cryptoworldz.xyz')}</article>
        </div>
        <p class="support-safety">Donation links will only be published after the destination, purpose and receiving account are verified.</p>
      </section>

      <section id="hope-chest" class="pdc-page hope-chest-page">
        <div class="hope-chest-shade">
          <div class="hope-chest-intro">
            <p class="eyebrow">PAGE THREE • A SECRET FOR THOSE WHO CHOOSE TO SEARCH</p>
            <h2>The OneWorldz Hope Chest</h2>
            <h3>If only some things could be new again...</h3>
            <p>Ten treasured Purple Diamond Crew contracts are preserved here — not dismissed as forgotten tokens, but held as transparent revival candidates for the diamond hands who stayed.</p>
            <p>The long-term plan is careful and gradual: controlled dev-wallet buys, support for eligible RevShare distribution wallets and slow funding from future Worldz ecosystem fees. Nothing here promises instant liquidity or recovery.</p>
            <div class="hope-chest-stats">
              <span><strong>${tokens.length}</strong><small>Verified treasures</small></span>
              <span><strong>${revivalCount}</strong><small>Revival candidates</small></span>
              <span><strong>${legacyCount}</strong><small>Legacy records</small></span>
              <span><strong>${liveCount}</strong><small>Revived / live</small></span>
            </div>
          </div>
          <div class="legacy-token-grid">${tokens.map((token) => legacyCard(token, selected?.id)).join('')}</div>
          ${selected ? legacyDetail(selected) : '<p class="empty-copy">The Hope Chest is waiting for its verified treasures.</p>'}
        </div>
      </section>
    </div>`;
  }

  function setIdentity() {
    document.title = 'Purple Diamond Crew • Action • Support • Hope Chest';
    if (brandTitle) brandTitle.textContent = 'PURPLE DIAMOND CREW';
    if (brandSubtitle) brandSubtitle.textContent = 'ACTION • SUPPORT • HOPE CHEST';
    if (walletButton) walletButton.hidden = true;
    if (nav) {
      nav.innerHTML = [
        ['Action', '#ground'],
        ['Support', '#support'],
        ['Hope Chest', '#hope-chest'],
        ['CryptoWorldz', 'https://cryptoworldz.xyz'],
        ['OneWorldz', 'https://oneworldz.com']
      ].map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join('');
    }
  }

  let tokens = [];
  let selectedId = null;
  let rendering = false;

  function render() {
    if (!tokens.length) return;
    rendering = true;
    setIdentity();
    if (!tokens.some((token) => token.id === selectedId)) selectedId = tokens[0].id;
    app.innerHTML = pageMarkup(tokens, selectedId);
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
    if (!rendering && tokens.length && !app.querySelector('.pdc-shell')) render();
  });
  observer.observe(app, { childList: true });

  loadLegacyTokens()
    .then((rows) => {
      tokens = rows;
      render();
      setTimeout(render, 500);
      setTimeout(render, 1500);
    })
    .catch((error) => {
      console.error('Purple Diamond Crew integration failed', error);
    });
})();
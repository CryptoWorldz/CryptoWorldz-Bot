(() => {
  const app = document.querySelector('#app');
  const nav = document.querySelector('#main-nav');
  const brandTitle = document.querySelector('#brand-title');
  const brandSubtitle = document.querySelector('#brand-subtitle');
  const walletButton = document.querySelector('#wallet-button');
  if (!app) return;

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
      return url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  }

  const destinations = [
    {
      name: 'CryptoWorldz',
      icon: '🌐',
      status: 'LIVE',
      copy: 'The blockchain, token, market and Worldz ecosystem branch.',
      href: 'https://cryptoworldz.xyz',
      action: 'Open CryptoWorldz'
    },
    {
      name: 'ImpactBased',
      icon: '💜',
      status: 'DEVELOPMENT',
      copy: 'Transparent impact launch preparation connected to the current Based.bid board.',
      href: 'https://impactbased.oneworldz.com',
      action: 'Open ImpactBased'
    },
    {
      name: 'Purple Diamond Crew',
      icon: '💎',
      status: 'READY TO DEPLOY',
      copy: 'Leaders on the ground delivering practical humanitarian support.',
      href: 'https://purplediamondcrew.com',
      action: 'Open Purple Diamond Crew'
    },
    {
      name: 'Zed Command Centre',
      icon: '🤖',
      status: 'LIVE',
      copy: 'Registration, missions, points, governance, rewards and community operations.',
      href: 'https://cryptobotz.cryptoworldz.xyz/miniapp/',
      action: 'Open Zed'
    },
    {
      name: 'Auto',
      icon: '⚙️',
      status: 'SAFE LOCKED MODE',
      copy: 'Owner-only Diamond Buy planning and simulation. Live purchasing remains disabled.',
      href: '',
      action: 'Owner controls remain locked'
    },
    {
      name: 'RobinWorldz & RecoverYourDebt',
      icon: '⚖️',
      status: 'YET TO BE DEPLOYED',
      copy: 'A future information and referral pathway for debt recovery and public-interest law.',
      href: '',
      action: 'Deployment pending'
    },
    {
      name: 'LearnWorldz',
      icon: '📚',
      status: 'READY TO DEPLOY',
      copy: 'Simple education covering crypto, safety, technology and transparent impact.',
      href: 'https://learn.oneworldz.com',
      action: 'Open LearnWorldz'
    },
    {
      name: 'Humanitarian Action',
      icon: '🌍',
      status: 'MISSION ACTIVE',
      copy: 'Food, shelter, water, medical support, education and dignity through verified teams.',
      href: 'https://oneworldz.com/#mission',
      action: 'Read the Mission'
    }
  ];

  function destinationCard(item) {
    const href = safeUrl(item.href);
    const action = href
      ? `<a class="button button-secondary" href="${escapeHtml(href)}">${escapeHtml(item.action)}</a>`
      : `<span class="button button-muted" aria-disabled="true">${escapeHtml(item.action)}</span>`;
    return `<article class="content-panel worldz-destination">
      <div class="section-heading"><span class="destination-icon">${item.icon}</span><span class="status">${escapeHtml(item.status)}</span></div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.copy)}</p>
      ${action}
    </article>`;
  }

  document.title = 'OneWorldz • One World • One Mission';
  if (brandTitle) brandTitle.textContent = 'ONEWORLDZ';
  if (brandSubtitle) brandSubtitle.textContent = 'ONE WORLD • ONE MISSION';
  if (walletButton) walletButton.hidden = true;
  if (nav) {
    nav.innerHTML = [
      ['Mission', '#mission'],
      ['Connected Worldz', '#connected'],
      ['Readiness', '#readiness']
    ].map(([label, href]) => `<a href="${href}">${label}</a>`).join('');
  }

  app.innerHTML = `<section id="mission" class="hero mission-hero">
    <p class="eyebrow">ONE WORLD • ONE MISSION • ONE FUTURE</p>
    <h1>Helping the People Who Help People.</h1>
    <p>OneWorldz is the public mission headquarters connecting humanitarian action, learning, public-interest pathways and the wider Worldz ecosystem.</p>
  </section>

  <section id="connected" class="pdc-page">
    <div class="pdc-section-heading">
      <p class="eyebrow">CONNECTED WORLDZ</p>
      <h2>One clear destination for each part of the mission.</h2>
      <p>Every subject appears once on this page with its verified development stage.</p>
    </div>
    <div class="process-grid mission-grid">${destinations.map(destinationCard).join('')}</div>
  </section>

  <section id="readiness" class="content-panel">
    <p class="eyebrow">DEPLOYMENT READINESS</p>
    <h2>Live services remain separate from projects still being prepared.</h2>
    <div class="detail-grid">
      <article><span>Live now</span><strong>OneWorldz, CryptoWorldz, Zed and Next Big Coin</strong></article>
      <article><span>Prepared replacement</span><strong>Purple Diamond Crew three-page experience</strong></article>
      <article><span>Development</span><strong>ImpactBased and Auto SAFE LOCKED integration</strong></article>
      <article><span>Yet to deploy</span><strong>RobinWorldz and remaining blockchain World sites</strong></article>
    </div>
    <p class="footer-note">No page is described as launched until its public domain and live health checks have been verified.</p>
  </section>`;
})();

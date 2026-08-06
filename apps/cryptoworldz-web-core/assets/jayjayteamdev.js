(() => {
  const app = document.querySelector('#app');
  const nav = document.querySelector('#main-nav');
  const brandTitle = document.querySelector('#brand-title');
  const brandSubtitle = document.querySelector('#brand-subtitle');
  const walletButton = document.querySelector('#wallet-button');
  if (!app) return;

  document.title = 'JayJayTeamDev • Founder Work Record • OneWorldz';
  document.body.classList.add('jj-page-active');
  if (brandTitle) brandTitle.textContent = 'JAYJAYTEAMDEV';
  if (brandSubtitle) brandSubtitle.textContent = 'ONEWORLDZ FOUNDER • BUILDER • ORGANISER';
  if (walletButton) walletButton.hidden = true;
  if (nav) {
    nav.innerHTML = [
      ['OneWorldz', 'https://oneworldz.com'],
      ['CryptoWorldz', 'https://cryptoworldz.xyz'],
      ['Command Centre', 'https://t.me/CryptoWorldzBot'],
      ['Mission', 'https://oneworldz.com/#impact']
    ].map(([label, href]) => `<a href="${href}">${label}</a>`).join('');
  }

  const builds = [
    ['01', 'OneWorldz Ecosystem', 'A connected parent gateway for humanitarian action, education, technology and the wider family of Worldz.'],
    ['02', 'CryptoWorldz Command Centre', 'The public crypto hub connecting community controls, launch information, directories and verified project pathways.'],
    ['03', 'Zed', 'Telegram registration, profiles, missions, Legend Points, governance, rewards, referrals, websites and executive controls.'],
    ['04', 'Grace', 'Approval-controlled social drafts, scheduling, account connections, publishing records and emergency pause controls.'],
    ['05', 'Diamond Buy™ Auto', 'A separated owner investment control plane with buy-only rules, limits, audit logs and protected signing boundaries.'],
    ['06', 'Impact Mission', 'Practical support for people, children, families, food relief, shelter, education, water and medical needs.']
  ];

  app.innerHTML = `<div class="jj-page">
    <section class="jj-hero">
      <div class="jj-hero-copy">
        <p class="eyebrow">JAYJAYTEAMDEV • ONEWORLDZ FOUNDER</p>
        <h1>Build the system.<span>Serve the mission.</span></h1>
        <p>A public founder page about persistence, production and the effort required to turn OneWorldz, CryptoWorldz, Zed, Grace, Auto and humanitarian projects into one connected operating ecosystem.</p>
        <div class="button-row">
          <a class="button button-primary" href="https://t.me/CryptoWorldzRaaiiiddTeam" target="_blank" rel="noopener noreferrer">Join CryptoWorldz HQ</a>
          <a class="button button-secondary" href="https://github.com/CryptoWorldz/CryptoWorldz-Bot" target="_blank" rel="noopener noreferrer">View Public Build Record</a>
          <a class="button button-secondary" href="https://www.gofundme.com/u/cryptouniverse" target="_blank" rel="noopener noreferrer">View Impact Work</a>
        </div>
      </div>
      <div class="jj-dial-wrap">
        <div class="jj-dial" role="img" aria-label="Founder self-reported effort index of 365 percent">
          <span class="jj-dial-value">365%</span>
          <span class="jj-dial-label">Founder Effort Index</span>
        </div>
        <p class="jj-dial-note">A founder-selected motivational index representing sustained personal effort beyond a standard 100% benchmark. It is not an audited productivity statistic.</p>
      </div>
    </section>

    <section class="jj-section">
      <header class="jj-section-heading"><p class="eyebrow">WORK ETHIC</p><h2>Keep moving until the system works.</h2><p>The working method is direct: identify the blockage, build the missing layer, test it, record it and connect it to the larger mission.</p></header>
      <div class="jj-grid">
        <article class="jj-card"><b>01</b><h3>Persistence</h3><p>Return to failed deployments, broken links and unfinished integrations until the cause is understood and documented.</p></article>
        <article class="jj-card"><b>02</b><h3>Production</h3><p>Move across websites, Telegram systems, databases, social controls, public content and community operations in one coordinated build.</p></article>
        <article class="jj-card"><b>03</b><h3>Purpose</h3><p>Keep the technical work tied to a public mission: helping the people who help people and creating practical paths to action.</p></article>
      </div>
    </section>

    <section class="jj-section">
      <header class="jj-section-heading"><p class="eyebrow">WORK PRODUCTION</p><h2>A connected build record.</h2><p>These systems are designed to operate together rather than remain isolated ideas.</p></header>
      <div class="jj-build-grid">${builds.map(([number, title, copy]) => `<article class="jj-build-item"><span>${number}</span><div><h3>${title}</h3><p>${copy}</p></div></article>`).join('')}</div>
    </section>

    <section class="jj-section jj-comparison">
      <div>
        <p class="eyebrow">CAPACITY COMPARISON</p>
        <h2>Founder-scale output without government-scale staffing.</h2>
        <p>This page does not claim an audited comparison with any named government official, department or public employee. The <strong>365% figure is JayJayTeamDev’s own motivational estimate</strong> of personal effort against a conventional 100% workload benchmark.</p>
        <p>The objective evidence is the public build record: repositories, deployments, database migrations, websites, community systems and humanitarian campaigns.</p>
      </div>
      <div class="jj-evidence" aria-label="Public evidence categories"><span class="jj-pill">Public commits</span><span class="jj-pill">Database migrations</span><span class="jj-pill">Live domains</span><span class="jj-pill">Telegram controls</span><span class="jj-pill">Community operations</span><span class="jj-pill">Impact campaigns</span></div>
    </section>

    <section class="jj-section">
      <header class="jj-section-heading"><p class="eyebrow">EFFICIENCY PRINCIPLE</p><h2>One change should strengthen the whole ecosystem.</h2></header>
      <div class="jj-grid">
        <article class="jj-card"><b>↗</b><h3>Shared Architecture</h3><p>Reuse a secure common web core and central registry so every World can improve from one reviewed release.</p></article>
        <article class="jj-card"><b>✓</b><h3>Visible Verification</h3><p>Use build identifiers, migration history, public status pages and live checks instead of relying on unsupported completion claims.</p></article>
        <article class="jj-card"><b>◆</b><h3>Protected Control</h3><p>Keep social publishing approval-controlled and keep investment signing private, separated and capped.</p></article>
      </div>
      <p class="jj-disclosure"><strong>Accuracy note:</strong> productivity varies by role, resources and responsibility. The founder effort dial is expressive branding, not a scientific ranking of JayJayTeamDev against public-sector workers.</p>
    </section>

    <section class="jj-section jj-cta">
      <p class="eyebrow">ONEWORLDZ 🌏 ONE VISION</p>
      <h2>One World • One Mission • One Fam.</h2>
      <p>Technology becomes meaningful when it helps real people take real action.</p>
      <div class="button-row"><a class="button button-primary" href="https://oneworldz.com">Return to OneWorldz</a><a class="button button-secondary" href="https://cryptoworldz.xyz">Open CryptoWorldz</a></div>
    </section>
  </div>`;
})();

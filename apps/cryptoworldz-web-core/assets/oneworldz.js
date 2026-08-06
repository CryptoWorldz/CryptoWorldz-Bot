(() => {
  const app = document.querySelector('#app');
  const nav = document.querySelector('#main-nav');
  const brandTitle = document.querySelector('#brand-title');
  const brandSubtitle = document.querySelector('#brand-subtitle');
  const walletButton = document.querySelector('#wallet-button');
  if (!app) return;

  const TELEGRAM_HQ = 'https://t.me/CryptoWorldzHQ';
  const SUPABASE_URL = 'https://hknymhhyqldtzmplzuzh.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbnltaGh5cWxkdHptcGx6dXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMDcyODksImV4cCI6MjEwMDg4MzI4OX0.cIZ1DY1MyFQMu6GAxfJLB785pGUxzp8DmGDBjV5bLQw';

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

  const supportLinks = [
    'https://www.facebook.com/share/1BmTRrfQo7/',
    'https://www.facebook.com/share/193tUYStL4/',
    'https://www.facebook.com/share/1DQhDp4CzW/',
    'https://www.facebook.com/share/19D9XrUuzQ/',
    'https://www.facebook.com/share/1Bc5S5yUJG/',
    'https://www.facebook.com/share/1DVSBSLEyo/',
    'https://www.facebook.com/share/1BeyrEWLGz/',
    'https://www.facebook.com/share/1Byi1xiu4M/',
    'https://www.facebook.com/share/1bzNo5Ea8v/',
    'https://www.facebook.com/share/1HRf5ttw8b/',
    'https://www.facebook.com/share/1EkFHZi9mm/',
    'https://www.facebook.com/share/16CajPwJduJ/',
    'https://www.facebook.com/share/1TomftXutg/',
    'https://www.facebook.com/share/1BWdL1EQTh/',
    'https://www.facebook.com/share/1byaGg2oU2/',
    'https://www.facebook.com/share/1BbFH6PfXV/',
    'https://www.facebook.com/share/1Bdhxhnx94/',
    'https://www.facebook.com/share/1JpX6zaY7d/',
    'https://www.facebook.com/share/1AbktByVp7/',
    'https://www.facebook.com/share/1HaHoN5TiK/',
    'https://www.facebook.com/share/17nsTeFoJq/',
    'https://www.facebook.com/share/1DM65ximC9/',
    'https://www.facebook.com/share/14ohVcr8yz8/',
    'https://www.facebook.com/share/1J5W3wd7Ef/',
    'https://www.facebook.com/share/1JMSjqkg6f/',
    'https://www.facebook.com/share/1BBSN1B5Sx/',
    'https://www.facebook.com/share/1M9i684JGg/',
    'https://www.facebook.com/share/18oGmZLysQ/',
    'https://www.facebook.com/share/19UGYkcwPw/',
    'https://www.facebook.com/share/1Ham4mf3LY/',
    'https://www.facebook.com/share/1DimMFXSM7/',
    'https://www.facebook.com/share/1EpHr25wKE/',
    'https://www.facebook.com/share/186v7cwFZ7/',
    'https://www.facebook.com/share/1R3Y6CKi1Q/'
  ];

  const fallbackProfiles = supportLinks.map((facebook_url, index) => ({
    display_name: `Support Profile ${String(index + 1).padStart(2, '0')}`,
    facebook_url,
    category: 'people_and_children'
  }));

  const worldz = [
    ['CryptoWorldz', '🌐', 'HQ LIVE', 'The blockchain ecosystem headquarters.', 'https://cryptoworldz.xyz'],
    ['SolWorldz', '◎', 'GROWING', 'The Solana Worldz community and project home.', 'https://solworldz.xyz'],
    ['BitWorldz', '₿', 'COMING ONLINE', 'Bitcoin community portal — support currently runs through HQ.', TELEGRAM_HQ],
    ['EthWorldz', 'Ξ', 'COMING ONLINE', 'Ethereum Worldz portal — join HQ while the full site is built.', TELEGRAM_HQ],
    ['XRPWorldz', '✕', 'COMING ONLINE', 'XRP community portal — join the mission through HQ.', TELEGRAM_HQ],
    ['BaseWorldz', '🔵', 'COMING ONLINE', 'Base ecosystem portal — support via CryptoWorldz HQ.', TELEGRAM_HQ],
    ['BNBWorldz', '🟡', 'COMING ONLINE', 'BNB community portal — support via CryptoWorldz HQ.', TELEGRAM_HQ],
    ['SuiWorldz', '💧', 'COMING ONLINE', 'Sui community portal — support via CryptoWorldz HQ.', TELEGRAM_HQ],
    ['HyperWorldz', '⚡', 'COMING ONLINE', 'Hyperliquid community portal — support via HQ.', TELEGRAM_HQ]
  ];

  const quickActions = [
    ['Follow', 'Follow struggling profiles so their stories reach more people.'],
    ['Like', 'A simple like helps important posts travel further.'],
    ['Comment', 'Leave a kind, genuine comment to lift visibility and morale.'],
    ['Share', 'Share a profile, fundraiser or urgent request with your network.'],
    ['Support', 'Visit verified fundraiser links and help when you safely can.'],
    ['Join HQ', 'Join coordinated community missions in CryptoWorldz Telegram HQ.']
  ];

  const donationCards = [
    {
      title: 'JayJayTeamDev GoFundMe Profile',
      copy: 'Visit the public donation profile and view current support campaigns.',
      href: 'https://www.gofundme.com/u/cryptouniverse',
      action: 'Open Donation Profile'
    },
    {
      title: 'Support the Davis Family',
      copy: 'Help a mate and his family by reading, sharing or supporting their GoFundMe.',
      href: 'https://www.gofundme.com/f/the-davis-family-w4qys',
      action: 'Open GoFundMe'
    },
    {
      title: 'Help Reagan Feed the Children',
      copy: 'Support food, medicine, schooling and daily care for children in Uganda.',
      href: 'https://gofund.me/65129e58a',
      action: 'Support Reagan'
    }
  ];

  function actionCard([title, copy], index) {
    return `<article class="ow-action-card">
      <span class="ow-check">✓</span>
      <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></div>
      ${index === 5
        ? `<a class="button button-primary" href="${TELEGRAM_HQ}" target="_blank" rel="noopener noreferrer">Join Now</a>`
        : `<a class="button button-secondary" href="#support-profiles">Take Action</a>`}
    </article>`;
  }

  function worldCard([name, icon, status, copy, href]) {
    const url = safeUrl(href);
    return `<article class="ow-world-card">
      <div class="ow-world-icon">${icon}</div>
      <span class="ow-status">${escapeHtml(status)}</span>
      <h3>${escapeHtml(name)}</h3>
      <p>${escapeHtml(copy)}</p>
      <a class="button button-secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${url === TELEGRAM_HQ ? 'Join HQ' : 'Open World'}</a>
    </article>`;
  }

  function donationCard(item) {
    return `<article class="ow-cause-card">
      <span class="ow-cause-icon">💜</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.copy)}</p>
      <a class="button button-primary" href="${escapeHtml(safeUrl(item.href))}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.action)}</a>
    </article>`;
  }

  function profileCard(profile, index) {
    const href = safeUrl(profile.facebook_url);
    if (!href) return '';
    const label = profile.display_name || `Support Profile ${String(index + 1).padStart(2, '0')}`;
    return `<article class="ow-profile-card">
      <div class="ow-profile-avatar" aria-hidden="true">${index % 3 === 0 ? '👧🏾' : index % 3 === 1 ? '👨🏾' : '👨‍👩‍👧'}</div>
      <div class="ow-profile-copy">
        <span>CHILDREN & PEOPLE</span>
        <h3>${escapeHtml(label)}</h3>
        <p>Have a look. Follow, like, comment and share where your support can help.</p>
      </div>
      <a class="button button-secondary" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(label)} on Facebook">View Facebook</a>
    </article>`;
  }

  async function loadSupportProfiles() {
    const grid = document.querySelector('#support-profile-grid');
    const count = document.querySelector('#support-profile-count');
    const status = document.querySelector('#support-profile-status');
    if (!grid) return;

    let profiles = fallbackProfiles;
    try {
      const endpoint = `${SUPABASE_URL}/rest/v1/oneworldz_support_profiles?select=display_name,facebook_url,category&status=eq.active&order=display_order.asc`;
      const response = await fetch(endpoint, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (!response.ok) throw new Error(`Profile request failed: ${response.status}`);
      const data = await response.json();
      if (Array.isArray(data) && data.length) profiles = data;
      if (status) status.textContent = 'Live support directory connected.';
    } catch (error) {
      console.warn(error);
      if (status) status.textContent = 'Showing the complete verified link list.';
    }

    grid.innerHTML = profiles.map(profileCard).join('');
    if (count) count.textContent = `${profiles.length} profiles ready to visit`;
  }

  document.title = 'OneWorldz • Turn Support Into Action';
  if (brandTitle) brandTitle.textContent = 'ONEWORLDZ';
  if (brandSubtitle) brandSubtitle.textContent = 'ONEWORLDZ 🌏 ONE VISION';
  if (walletButton) walletButton.hidden = true;
  if (nav) {
    nav.innerHTML = [
      ['Take Action', '#take-action'],
      ['Support People', '#support-profiles'],
      ['Donate', '#donation-hub'],
      ['Worldz', '#worldz'],
      ['Impact', '#impact']
    ].map(([label, href]) => `<a href="${href}">${label}</a>`).join('');
  }

  app.innerHTML = `
    <section class="ow-hero" id="home">
      <div class="ow-hero-copy">
        <p class="eyebrow">ONEWORLDZ 🌏 ONE VISION</p>
        <h1>Turn Support Into Action.</h1>
        <p>Follow. Like. Comment. Share. Help struggling profiles, children, families and the people already working on the ground.</p>
        <div class="button-row ow-hero-actions">
          <a class="button button-primary" href="${TELEGRAM_HQ}" target="_blank" rel="noopener noreferrer">Join CryptoWorldz HQ</a>
          <a class="button button-secondary" href="#support-profiles">See Who We Can Support</a>
          <a class="button button-secondary" href="#donation-hub">Possible Donation</a>
        </div>
        <div class="ow-trust-strip">
          <span>✓ Community First</span><span>✓ Real People</span><span>✓ Real Action</span><span>✓ No Cost to Share</span>
        </div>
      </div>
      <figure class="ow-hero-art">
        <img src="./assets/images/oneworldz-hero.webp" alt="CryptoWorldz We Need You — join the CryptoWorldz HQ" width="520" height="293" fetchpriority="high" />
      </figure>
    </section>

    <section class="ow-rally" aria-label="OneWorldz call to action">
      <strong>FOLLOW ✅ LIKE ✅ COMMENT ✅ SHARE ✅</strong>
      <span>Small actions can create real reach.</span>
    </section>

    <section class="ow-section" id="take-action">
      <header class="ow-section-heading">
        <p class="eyebrow">WHAT CAN BE DONE RIGHT NOW</p>
        <h2>Help without waiting for tomorrow.</h2>
        <p>Every genuine action can help a struggling profile reach the next person who cares.</p>
      </header>
      <div class="ow-action-grid">${quickActions.map(actionCard).join('')}</div>
    </section>

    <section class="ow-section ow-support-section" id="support-profiles">
      <header class="ow-section-heading">
        <p class="eyebrow">THE CHILDREN • THE PEOPLE</p>
        <h2>Have a Look at Who We Can Support.</h2>
        <p>Open a profile, learn their story and support through a follow, like, kind comment or share.</p>
        <div class="ow-live-line"><strong id="support-profile-count">34 profiles ready to visit</strong><span id="support-profile-status">Loading live support directory…</span></div>
      </header>
      <div id="support-profile-grid" class="ow-profile-grid" aria-live="polite">
        ${fallbackProfiles.map(profileCard).join('')}
      </div>
    </section>

    <section class="ow-section" id="donation-hub">
      <header class="ow-section-heading">
        <p class="eyebrow">POSSIBLE DONATION SUPPORT</p>
        <h2>Read the story. Verify the fundraiser. Help safely.</h2>
      </header>
      <div class="ow-cause-grid">${donationCards.map(donationCard).join('')}</div>
    </section>

    <section class="ow-split-section" id="action-creates-smiles">
      <div class="ow-story-panel ow-story-purple">
        <p class="eyebrow">ACTION CREATES SMILES</p>
        <h2>Helping today. Building tomorrow. Changing forever.</h2>
        <p>Support practical care through food, safe shelter, clean water, education, medical help and stronger communities.</p>
        <div class="ow-impact-icons"><span>🍲 Food</span><span>🏠 Shelter</span><span>💧 Water</span><span>📚 Education</span><span>➕ Medical</span></div>
        <div class="button-row"><a class="button button-primary" href="#donation-hub">Support a Cause</a><a class="button button-secondary" href="#support-profiles">Share Support</a></div>
      </div>
      <div class="ow-story-panel ow-story-gold" id="action-spreads-smiles">
        <p class="eyebrow">KNOW REAGAN • ACTION SPREADS SMILES</p>
        <h2>A separate orphanage mission in Uganda.</h2>
        <p>Follow Reagan’s work, watch the children’s story and help spread awareness for food, medicine, school needs and a safe home.</p>
        <div class="button-row">
          <a class="button button-primary" href="https://gofund.me/65129e58a" target="_blank" rel="noopener noreferrer">Reagan GoFundMe</a>
          <a class="button button-secondary" href="https://www.youtube.com/@action_spread_smiles" target="_blank" rel="noopener noreferrer">YouTube</a>
          <a class="button button-secondary" href="https://www.tiktok.com/@actionspreadsmilesorg" target="_blank" rel="noopener noreferrer">TikTok</a>
        </div>
      </div>
    </section>

    <section class="ow-section ow-mate-section" id="support-my-mate">
      <div>
        <p class="eyebrow">SUPPORT MY MATE</p>
        <h2>The Davis Family.</h2>
        <p>Visit the family’s Facebook profile, read the fundraiser and share their story to help it reach more people.</p>
      </div>
      <div class="button-row">
        <a class="button button-secondary" href="https://www.facebook.com/profile.php?id=61572127563435" target="_blank" rel="noopener noreferrer">Visit Facebook</a>
        <a class="button button-primary" href="https://www.gofundme.com/f/the-davis-family-w4qys" target="_blank" rel="noopener noreferrer">Support GoFundMe</a>
      </div>
    </section>

    <section class="ow-section" id="purple-diamond-crew">
      <header class="ow-section-heading">
        <p class="eyebrow">PURPLE DIAMOND CREW</p>
        <h2>Real people on the ground.</h2>
        <p>Food and BBQs for the homeless, clothes, blankets, tents, schools, mattresses, gardens, water bores and medical support.</p>
      </header>
      <div class="ow-pdc-grid">
        ${[['🍲','Feed People'],['🧥','Clothes & Warmth'],['🏫','Build Schools'],['💧','Fresh Water'],['🩺','Medical Help'],['🤝','Stronger Communities']].map(([icon, text]) => `<article><span>${icon}</span><strong>${text}</strong></article>`).join('')}
      </div>
      <div class="button-row ow-centered-buttons"><a class="button button-primary" href="https://purplediamondcrew.com" target="_blank" rel="noopener noreferrer">Open Purple Diamond Crew</a><a class="button button-secondary" href="${TELEGRAM_HQ}" target="_blank" rel="noopener noreferrer">Join HQ</a></div>
    </section>

    <section class="ow-section" id="worldz">
      <header class="ow-section-heading">
        <p class="eyebrow">ONE ECOSYSTEM • INFINITE WORLDZ</p>
        <h2>Every World has a doorway.</h2>
        <p>Live and coming-soon Worldz all point supporters toward the active CryptoWorldz HQ while their full sites grow.</p>
      </header>
      <div class="ow-world-grid">${worldz.map(worldCard).join('')}</div>
    </section>

    <section class="ow-impact-gallery" id="impact">
      <img src="./assets/images/oneworldz-impact-mosaic.webp" alt="OneWorldz community impact artwork showing children, kindness, food support, education and Action Creates Smiles" width="420" height="420" loading="lazy" />
      <div>
        <p class="eyebrow">ONE WORLD • ONE MISSION • ONE FAM</p>
        <h2>Kindness changes everything.</h2>
        <p>These images represent the heart of OneWorldz: children, dignity, education, food, hope and practical support for people in need.</p>
        <a class="button button-primary" href="${TELEGRAM_HQ}" target="_blank" rel="noopener noreferrer">Speak With Executive Leaders</a>
      </div>
    </section>
  `;

  loadSupportProfiles();
})();

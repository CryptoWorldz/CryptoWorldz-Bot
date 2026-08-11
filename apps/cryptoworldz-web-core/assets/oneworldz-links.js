(() => {
  const PROFILE = 'https://www.gofundme.com/u/jayjayteamdev';
  const REAGAN_FUNDRAISER = 'https://gofund.me/c2e4fa936';
  const COMMUNITY_FUNDRAISER = 'https://gofund.me/933219353';
  const COMMUNITY_PAGE = '/gofundme/';
  const SUPPORT_35 = 'https://www.facebook.com/share/18BmqfH7MS/';

  const exactRepairs = new Map([
    ['https://www.gofundme.com/u/cryptouniverse', PROFILE],
    ['https://gofund.me/65129e58', REAGAN_FUNDRAISER],
    ['https://gofund.me/65129e58a', REAGAN_FUNDRAISER]
  ]);

  function repairGoFundMeLinks(root = document) {
    root.querySelectorAll?.('a[href]').forEach((anchor) => {
      const raw = anchor.getAttribute('href') || '';
      if (exactRepairs.has(raw)) {
        anchor.href = exactRepairs.get(raw);
        return;
      }
      const text = `${anchor.textContent || ''} ${anchor.getAttribute('aria-label') || ''}`.toLowerCase();
      if (/gofundme|donat|support reagan|support the children/.test(text)) {
        try {
          const u = new URL(anchor.href, location.href);
          if (u.hostname.endsWith('gofundme.com') && (u.pathname === '/' || u.pathname === '')) anchor.href = REAGAN_FUNDRAISER;
        } catch {}
      }
    });
  }

  function addCommunityFund() {
    const grid = document.querySelector('#donation-hub .ow-cause-grid');
    if (!grid || grid.querySelector('[data-community-survival-fund]')) return;
    const card = document.createElement('article');
    card.className = 'ow-cause-card';
    card.dataset.communitySurvivalFund = 'true';
    card.innerHTML = `<span class="ow-cause-icon">🌍</span><h3>OneWorldz Community Survival Fund</h3><p><strong>FOOD FIRST • SURVIVAL FIRST • CHILDREN FIRST.</strong> Help verified Uganda community projects with food, urgent needs and longer-term food security. Jason Wright / JayJayTeamDev personal allocation: 0%.</p><div class="button-row"><a class="button button-primary" href="${COMMUNITY_FUNDRAISER}" target="_blank" rel="noopener noreferrer">Donate / Share</a><a class="button button-secondary" href="${COMMUNITY_PAGE}">Full Fund Page</a><a class="button button-secondary" href="${PROFILE}" target="_blank" rel="noopener noreferrer">JayJayTeamDev GoFundMe</a></div>`;
    grid.prepend(card);
    if (!document.querySelector('#donation-hub [data-donation-transparency]')) {
      const note = document.createElement('p');
      note.dataset.donationTransparency = 'true';
      note.className = 'footer-note';
      note.textContent = 'Facebook pages help surface verified needs and stories; they are not automatic recipients of fundraiser money. Distribution follows verified humanitarian need.';
      grid.after(note);
    }
  }

  function ensureSupport35() {
    const grid = document.querySelector('#support-profile-grid');
    if (!grid || grid.querySelector(`a[href="${SUPPORT_35}"]`)) return;
    const card = document.createElement('article');
    card.className = 'ow-profile-card';
    card.innerHTML = `<div class="ow-profile-avatar" aria-hidden="true">👨‍👩‍👧</div><div class="ow-profile-copy"><span>CHILDREN & PEOPLE</span><h3>Support Profile 35</h3><p>Have a look. Follow, like, comment and share where your support can help.</p></div><a class="button button-secondary" href="${SUPPORT_35}" target="_blank" rel="noopener noreferrer">View Facebook</a>`;
    grid.append(card);
    const count = document.querySelector('#support-profile-count');
    if (count) count.textContent = `${grid.querySelectorAll('.ow-profile-card').length} profiles ready to visit`;
  }

  function applyAll() {
    repairGoFundMeLinks();
    addCommunityFund();
    ensureSupport35();
  }

  applyAll();
  const observer = new MutationObserver(applyAll);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', applyAll, { once: true });
})();

(() => {
  const PROFILE = 'https://www.gofundme.com/u/jayjayteamdev';
  const FUNDRAISER = 'https://gofund.me/65129e58';

  const exactRepairs = new Map([
    ['https://www.gofundme.com/u/cryptouniverse', PROFILE],
    ['https://gofund.me/65129e58a', FUNDRAISER]
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
          if (u.hostname.endsWith('gofundme.com') && (u.pathname === '/' || u.pathname === '')) {
            anchor.href = FUNDRAISER;
          }
        } catch {}
      }
    });
  }

  repairGoFundMeLinks();
  const observer = new MutationObserver(() => repairGoFundMeLinks());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', () => repairGoFundMeLinks(), { once: true });
})();

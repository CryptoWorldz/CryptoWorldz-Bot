(() => {
  const hostname = location.hostname.replace(/^www\./, '').toLowerCase();
  const params = new URLSearchParams(location.search);
  const requestedMode = document.body.dataset.worldzMode || params.get('mode');
  const requestedSite = document.body.dataset.worldzSite || params.get('site');
  const requestedPage = params.get('page');
  const jayJayPage = requestedPage === 'jayjayteamdev' || location.pathname.replace(/\/+$/, '').endsWith('/jayjayteamdev');
  const sharedPage = ['help', 'donate', 'tokens'].includes(requestedPage);
  const pdcPreview = hostname === 'cryptoworldz.github.io' || requestedSite === 'pdc';
  const comingSoonHosts = new Set([
    'ethworldz.xyz',
    'baseworldz.xyz',
    'bnbworldz.xyz',
    'xrpworldz.xyz',
    'suiworldz.xyz',
    'hyperworldz.xyz',
    'robinworldz.xyz',
    'bitcoinworldz.xyz',
    'bitworldz.xyz',
    'hodlerworldz.xyz'
  ]);

  const walletButton = document.querySelector('#wallet-button');
  if (hostname === 'solworldz.xyz' && walletButton) {
    walletButton.textContent = 'Zed Command Centre';
    walletButton.onclick = () => window.open('https://t.me/CryptoWorldzBot', '_blank', 'noopener,noreferrer');
  } else if (hostname === 'cryptoworldz.xyz' && walletButton) {
    walletButton.textContent = 'Wallet Login • Phase 2';
  }

  const script = document.createElement('script');
  script.type = 'module';
  const selectedScript = jayJayPage
    ? './assets/jayjayteamdev.js'
    : sharedPage
      ? './assets/site-pages.js'
      : hostname === 'solworldz.xyz'
        ? './assets/solworldz.js'
        : hostname === 'purplediamondcrew.com'
          ? './assets/pdc-site.js'
          : pdcPreview
            ? './assets/pdc-fallback.js'
            : hostname === 'impactbased.oneworldz.com' || requestedMode === 'impact'
              ? './assets/impactbased.js'
              : hostname === 'oneworldz.com'
                ? './assets/oneworldz-next.js'
                : hostname === 'oneworldz.com' || requestedMode === 'mission'
                  ? './assets/oneworldz.js'
                  : comingSoonHosts.has(hostname)
                    ? './assets/coming-soon-next.js'
                    : comingSoonHosts.has(hostname) || requestedMode === 'coming-soon'
                      ? './assets/coming-soon.js'
                      : requestedMode === 'directory'
                        ? './assets/pdc-directory.js'
                        : './assets/app.js';
  script.src = `${selectedScript}?v=20260808-mobile3`;
  document.body.appendChild(script);
})();

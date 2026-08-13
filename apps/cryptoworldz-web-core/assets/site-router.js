(() => {
  const hostname = location.hostname.replace(/^www\./, '').toLowerCase();
  const params = new URLSearchParams(location.search);
  const requestedMode = document.body.dataset.worldzMode || params.get('mode');
  const requestedSite = document.body.dataset.worldzSite || params.get('site');
  const requestedPage = (params.get('page') || '').toLowerCase();
  const cleanPath = location.pathname.replace(/\/+$/, '').toLowerCase();
  const jayJayPage = requestedPage === 'jayjayteamdev' || cleanPath.endsWith('/jayjayteamdev');
  const impactBasedPage = cleanPath === '/worldz/impactbased' || cleanPath.endsWith('/worldz/impactbased');
  const sharedPage = ['help', 'donate', 'tokens'].includes(requestedPage);
  const ecosystemPage = ['command-centre','commandcentre','trade','trade-station','recap','recapthisbot','partnership','partnerships','learn','learnworldz'].includes(requestedPage);
  const pdcExactPreview = requestedSite === 'purplediamondcrew';
  const pdcPreview = hostname === 'cryptoworldz.github.io' || requestedSite === 'pdc';
  const blockchainWorldHosts = new Set([
    'ethworldz.xyz',
    'baseworldz.xyz',
    'bnbworldz.xyz',
    'xrpworldz.xyz',
    'suiworldz.xyz',
    'hyperworldz.xyz',
    'robinworldz.xyz',
    'bitcoinworldz.xyz'
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
      : ecosystemPage
        ? './assets/ecosystem-pages.js'
        : hostname === 'solworldz.xyz'
          ? './assets/solworldz.js'
          : hostname === 'purplediamondcrew.com' || pdcExactPreview
            ? './assets/pdc-site.js'
            : pdcPreview
              ? './assets/pdc-fallback.js'
              : impactBasedPage || requestedMode === 'impact'
                ? './assets/impactbased.js'
                : hostname === 'oneworldz.com' || requestedMode === 'mission'
                  ? './assets/oneworldz-next.js'
                  : blockchainWorldHosts.has(hostname) || requestedMode === 'world'
                    ? './assets/blockchain-world.js'
                    : requestedMode === 'coming-soon'
                      ? './assets/coming-soon.js'
                      : requestedMode === 'directory'
                        ? './assets/pdc-directory.js'
                        : './assets/app.js';
  script.src = `${selectedScript}?v=20260813-shared-proof-v1`;
  document.body.appendChild(script);
})();

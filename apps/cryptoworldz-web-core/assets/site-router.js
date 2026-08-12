(() => {
  const hostname = location.hostname.replace(/^www\./, '').toLowerCase();
  const params = new URLSearchParams(location.search);
  const requestedMode = document.body.dataset.worldzMode || params.get('mode');
  const requestedSite = document.body.dataset.worldzSite || params.get('site');
  const requestedPage = (params.get('page') || '').toLowerCase();
  const jayJayPage = requestedPage === 'jayjayteamdev' || location.pathname.replace(/\/+$/, '').endsWith('/jayjayteamdev');
  const sharedPage = ['help', 'donate', 'tokens'].includes(requestedPage);
  const ecosystemPage = ['command-centre','commandcentre','trade','trade-station','recap','recapthisbot','partnership','partnerships','learn','learnworldz'].includes(requestedPage);
  const pdcPreview = hostname === 'cryptoworldz.github.io' || requestedSite === 'pdc';
  const blockchainWorldHosts = new Set([
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
      : ecosystemPage
        ? './assets/ecosystem-pages.js'
        : hostname === 'solworldz.xyz'
          ? './assets/solworldz.js'
          : hostname === 'purplediamondcrew.com'
            ? './assets/pdc-site.js'
            : pdcPreview
              ? './assets/pdc-fallback.js'
              : hostname === 'impactbased.oneworldz.com' || requestedMode === 'impact'
                ? './assets/impactbased.js'
                : hostname === 'oneworldz.com' || requestedMode === 'mission'
                  ? './assets/oneworldz-next.js'
                  : blockchainWorldHosts.has(hostname)
                    ? './assets/blockchain-world.js'
                    : requestedMode === 'coming-soon'
                      ? './assets/coming-soon.js'
                      : requestedMode === 'directory'
                        ? './assets/pdc-directory.js'
                        : './assets/app.js';
  script.src = `${selectedScript}?v=20260812-domain-routing-v1`;
  document.body.appendChild(script);

  if (selectedScript === './assets/oneworldz-next.js') {
    const supportScript = document.createElement('script');
    supportScript.src = './assets/oneworldz-support-campaign.js?v=20260812-support-v1';
    document.body.appendChild(supportScript);
  }
})();

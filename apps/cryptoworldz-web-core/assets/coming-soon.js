(() => {
  const app = document.querySelector('#app');
  const nav = document.querySelector('#main-nav');
  const brandTitle = document.querySelector('#brand-title');
  const brandSubtitle = document.querySelector('#brand-subtitle');
  const walletButton = document.querySelector('#wallet-button');
  if (!app) return;

  const hostname = location.hostname.replace(/^www\./, '').toLowerCase();
  const catalogue = {
    'ethworldz.xyz': ['EthWorldz', 'Ξ'],
    'baseworldz.xyz': ['BaseWorldz', '🔵'],
    'bnbworldz.xyz': ['BNBWorldz', '🟡'],
    'xrpworldz.xyz': ['XRPWorldz', '✕'],
    'suiworldz.xyz': ['SuiWorldz', '💧'],
    'hyperworldz.xyz': ['HyperWorldz', '⚡'],
    'robinworldz.xyz': ['RobinWorldz', '⚖️'],
    'bitcoinworldz.xyz': ['BitWorldz', '₿'],
    'bitworldz.xyz': ['BitWorldz', '₿'],
    'hodlerworldz.xyz': ['HodlerWorldz', '💎']
  };
  const [name, icon] = catalogue[hostname] || ['Blockchain Worldz', '🌐'];
  const telegram = 'https://t.me/CryptoWorldzHQ';

  document.title = `${name} • Coming Soon`;
  if (brandTitle) brandTitle.textContent = name.toUpperCase();
  if (brandSubtitle) brandSubtitle.textContent = 'A CRYPTOWORLDZ ECOSYSTEM PORTAL';
  if (walletButton) walletButton.hidden = true;
  if (nav) nav.innerHTML = `<a href="https://oneworldz.com">OneWorldz</a><a href="https://cryptoworldz.xyz">CryptoWorldz</a><a href="${telegram}" target="_blank" rel="noopener noreferrer">Telegram HQ</a>`;

  app.innerHTML = `<section class="ow-hero ow-coming-soon">
    <div class="ow-hero-copy">
      <p class="eyebrow">${icon} ${name.toUpperCase()}</p>
      <h1>Coming Soon.</h1>
      <p>This World is being prepared. Join CryptoWorldz HQ now to speak with Executive Leaders, support the mission and follow every launch update.</p>
      <div class="button-row ow-hero-actions">
        <a class="button button-primary" href="${telegram}" target="_blank" rel="noopener noreferrer">Join CryptoWorldz HQ</a>
        <a class="button button-secondary" href="https://oneworldz.com">Visit OneWorldz</a>
      </div>
      <div class="ow-trust-strip"><span>✓ Community First</span><span>✓ Built on Blockchain</span><span>✓ One Ecosystem</span><span>✓ Infinite Worldz</span></div>
    </div>
    <figure class="ow-hero-art"><img src="./assets/images/oneworldz-hero.webp" alt="CryptoWorldz We Need You — join CryptoWorldz HQ" width="520" height="293" /></figure>
  </section>`;
})();

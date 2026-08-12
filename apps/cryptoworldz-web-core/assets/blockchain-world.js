const app = document.querySelector('#app');
const host = location.hostname.replace(/^www\./, '').toLowerCase();

const WORLDS = {
  'ethworldz.xyz': {
    title: 'EthWorldz',
    label: 'ETHEREUM WORLD',
    chain: 'Ethereum',
    image: './assets/worldz-master/blockchains/ethworldz.png'
  },
  'baseworldz.xyz': {
    title: 'BaseWorldz',
    label: 'BASE WORLD',
    chain: 'Base',
    image: './assets/worldz-master/blockchains/baseworldz.png'
  },
  'bnbworldz.xyz': {
    title: 'BNBWorldz',
    label: 'BNB WORLD',
    chain: 'BNB Chain',
    image: './assets/worldz-master/blockchains/bnbworldz.png'
  },
  'xrpworldz.xyz': {
    title: 'XRPWorldz',
    label: 'XRPL WORLD',
    chain: 'XRP Ledger',
    image: './assets/worldz-master/blockchains/xrpworldz.png'
  },
  'suiworldz.xyz': {
    title: 'SuiWorldz',
    label: 'SUI WORLD',
    chain: 'Sui',
    image: './assets/worldz-master/blockchains/suiworldz.png'
  },
  'hyperworldz.xyz': {
    title: 'HyperWorldz',
    label: 'HYPERLIQUID WORLD',
    chain: 'Hyperliquid',
    image: './assets/worldz-master/blockchains/hyperworldz.png'
  },
  'robinworldz.xyz': {
    title: 'RobinWorldz',
    label: 'ROBIN WORLD',
    chain: 'Recover Your Debt',
    image: './assets/worldz-master/blockchains/robinworldz.png'
  },
  'bitcoinworldz.xyz': {
    title: 'BitcoinWorldz',
    label: 'BITCOIN WORLD',
    chain: 'Bitcoin',
    image: './assets/worldz-master/blockchains/bitworldz.png'
  },
  'bitworldz.xyz': {
    title: 'BitWorldz',
    label: 'BITCOIN WORLD',
    chain: 'Bitcoin',
    image: './assets/worldz-master/blockchains/bitworldz.png'
  },
  'hodlerworldz.xyz': {
    title: 'HodlerWorldz',
    label: 'HODLER WORLD',
    chain: 'Read-only Portfolio',
    image: './assets/worldz-master/cryptoworldz/we-need-you.png'
  }
};

const site = WORLDS[host];

function installStyles() {
  if (document.querySelector('#blockchain-world-styles')) return;
  const style = document.createElement('style');
  style.id = 'blockchain-world-styles';
  style.textContent = `
    .bw-page{min-height:calc(100vh - 110px);background:#05010c;color:#fff;padding:clamp(16px,3vw,42px)}
    .bw-shell{width:min(1180px,100%);margin:0 auto;display:grid;grid-template-columns:minmax(0,1.12fr) minmax(320px,.88fr);gap:clamp(18px,3vw,38px);align-items:center}
    .bw-art-card,.bw-copy{border:1px solid rgba(184,104,255,.38);border-radius:22px;background:rgba(9,4,20,.82);box-shadow:0 22px 70px rgba(0,0,0,.4);overflow:hidden}
    .bw-art{display:block;width:100%;aspect-ratio:5/4;object-fit:cover;object-position:center;filter:none!important;transform:none!important;image-rendering:auto}
    .bw-copy{padding:clamp(20px,4vw,44px)}
    .bw-kicker{font-family:Orbitron,sans-serif;letter-spacing:.14em;color:#6ee7ff;font-size:.78rem}
    .bw-copy h1{margin:.35rem 0 .45rem;font-family:Orbitron,sans-serif;font-size:clamp(2.1rem,5vw,4.8rem);line-height:.98}
    .bw-copy p{font-size:clamp(1rem,1.7vw,1.18rem);line-height:1.6;color:#ddd4eb}
    .bw-status{display:inline-flex;margin:10px 0 18px;padding:8px 12px;border-radius:999px;border:1px solid rgba(108,231,255,.34);background:rgba(32,109,137,.16);font-weight:800}
    .bw-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
    .bw-btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:11px 16px;border-radius:13px;border:1px solid rgba(190,119,255,.52);background:linear-gradient(135deg,rgba(91,25,160,.88),rgba(172,58,235,.86));color:#fff;text-decoration:none;font-weight:800}
    .bw-btn.alt{background:rgba(255,255,255,.06)}
    .bw-trust{margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1);font-size:.92rem;color:#b9afc8}
    @media(max-width:860px){.bw-shell{grid-template-columns:1fr}.bw-art{aspect-ratio:1/1}.bw-copy{padding:20px}.bw-btn{flex:1 1 46%}}
  `;
  document.head.appendChild(style);
}

function render() {
  if (!site || !app) return;
  installStyles();
  document.body.classList.add('blockchain-world-page','worldz-rich-page');
  document.title = `${site.title} • OneWorldz`;

  const brandTitle = document.querySelector('#brand-title');
  const brandSubtitle = document.querySelector('#brand-subtitle');
  if (brandTitle) brandTitle.textContent = site.title.toUpperCase();
  if (brandSubtitle) brandSubtitle.textContent = 'ONE WORLD • ONE MISSION';

  app.outerHTML = `<main class="bw-page" data-world="${site.title}">
    <section class="bw-shell">
      <figure class="bw-art-card"><img class="bw-art" src="${site.image}" alt="${site.title} approved chain artwork" decoding="async" fetchpriority="high"></figure>
      <article class="bw-copy">
        <span class="bw-kicker">${site.label}</span>
        <h1>${site.title}</h1>
        <div class="bw-status">${site.chain} • CryptoWorldz Network</div>
        <p>Dedicated ${site.title} gateway for the OneWorldz ecosystem — chain-specific projects, verified token information, education, community links and Command Centre access.</p>
        <p>Launch and market data activate as verified ecosystem records are published. No private keys or seed phrases are requested here.</p>
        <div class="bw-actions">
          <a class="bw-btn" href="https://cryptoworldz.xyz">Open CryptoWorldz</a>
          <a class="bw-btn" href="https://t.me/CryptoWorldzBot" target="_blank" rel="noopener noreferrer">Open Zed Command Centre</a>
          <a class="bw-btn alt" href="https://oneworldz.com">OneWorldz</a>
          <a class="bw-btn alt" href="https://purplediamondcrew.com">Live Token Directory</a>
        </div>
        <div class="bw-trust">Verify official contract addresses and external links before interacting.</div>
      </article>
    </section>
  </main>`;
}

render();

const app=document.querySelector('#app');
const host=location.hostname.replace(/^www\./,'').toLowerCase();
const sites={
 'ethworldz.xyz':{title:'EthWorldz',label:'ETHEREUM COMMUNITY'},
 'baseworldz.xyz':{title:'BaseWorldz',label:'BASE COMMUNITY'},
 'bnbworldz.xyz':{title:'BNBWorldz',label:'BNB COMMUNITY'},
 'xrpworldz.xyz':{title:'XRPWorldz',label:'XRPL COMMUNITY'},
 'suiworldz.xyz':{title:'SuiWorldz',label:'SUI COMMUNITY'},
 'hyperworldz.xyz':{title:'HyperWorldz',label:'HYPERLIQUID COMMUNITY'},
 'robinworldz.xyz':{title:'RobinWorldz',label:'ROBIN HOOD CHAIN • RECOVER YOUR DEBT'},
 'bitcoinworldz.xyz':{title:'BitcoinWorldz',label:'BITCOIN COMMUNITY'},
 'bitworldz.xyz':{title:'BitWorldz',label:'BITCOIN COMMUNITY'},
 'hodlerworldz.xyz':{title:'HodlerWorldz',label:'READ-ONLY PORTFOLIO'}
};
const site=sites[host]||{title:'CryptoWorldz',label:'CONNECTED WORLDZ'};
const HQ='https://t.me/CryptoWorldzHQ';
const BOT='https://t.me/CryptoWorldzBot';
const HERO='./assets/worldz-master/cryptoworldz/we-need-you.png';

function installStyles(){
  if(document.querySelector('#idle-worldz-approved-art')) return;
  const style=document.createElement('style');
  style.id='idle-worldz-approved-art';
  style.textContent=`
    .cs-page.approved-cw-hero{min-height:calc(100vh - 110px);position:relative;overflow:hidden;background:#05010c;color:#fff}
    .approved-cw-hero .cs-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;filter:none!important;transform:none!important;image-rendering:auto;z-index:0}
    .approved-cw-hero .cs-overlay{position:relative;z-index:2;min-height:calc(100vh - 110px);display:flex;align-items:flex-end;padding:clamp(18px,4vw,58px);background:linear-gradient(180deg,rgba(3,1,10,.02) 22%,rgba(3,1,10,.18) 54%,rgba(3,1,10,.90) 100%)}
    .approved-cw-hero .cs-glass{width:min(760px,100%);padding:clamp(18px,3vw,32px);border:1px solid rgba(185,108,255,.48);border-radius:22px;background:rgba(7,2,18,.62);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 22px 70px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08)}
    .approved-cw-hero .cs-glass h1{margin:.28rem 0 .3rem;font-family:Orbitron,sans-serif;font-size:clamp(2rem,5vw,4.25rem)}
    .approved-cw-hero .cs-glass p{margin:.25rem 0 1rem;font-size:clamp(1rem,2vw,1.2rem)}
    .approved-cw-hero .cs-world-label{font-family:Orbitron,sans-serif;letter-spacing:.14em;color:#66dcff;text-transform:uppercase;font-size:.78rem}
    .approved-cw-hero .wx-actions{display:flex;flex-wrap:wrap;gap:10px}
    .approved-cw-hero .wx-btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:11px 16px;border:1px solid rgba(193,123,255,.5);border-radius:13px;background:linear-gradient(135deg,rgba(91,25,160,.82),rgba(172,58,235,.82));color:#fff;text-decoration:none;font-weight:800;box-shadow:inset 0 1px 0 rgba(255,255,255,.13)}
    .approved-cw-hero .wx-btn.green{background:linear-gradient(135deg,rgba(8,116,74,.9),rgba(14,151,94,.86));border-color:rgba(79,236,163,.55)}
    .approved-cw-hero .wx-btn.gold{background:linear-gradient(135deg,rgba(125,80,7,.92),rgba(177,118,20,.86));border-color:rgba(245,196,91,.55)}
    @media(max-width:720px){.cs-page.approved-cw-hero{min-height:76vh}.approved-cw-hero .cs-art{object-fit:contain;object-position:center top;background:#05010c}.approved-cw-hero .cs-overlay{min-height:76vh;align-items:flex-end;padding:12px}.approved-cw-hero .cs-glass{border-radius:16px;padding:16px}.approved-cw-hero .wx-btn{flex:1 1 46%;font-size:.87rem}}
  `;
  document.head.appendChild(style);
}

function render(){
  document.body.classList.add('comingsoon-next','worldz-rich-page');
  document.title=`${site.title} • CryptoWorldz`;
  installStyles();
  app.outerHTML=`<main class="cs-page approved-cw-hero" data-approved-art="cryptoworldz-we-need-you"><img class="cs-art" src="${HERO}" alt="CryptoWorldz We Need You — approved Worldz recruitment artwork" decoding="async" fetchpriority="high"><div class="cs-overlay"><section class="cs-glass"><span class="cs-world-label">${site.label}</span><h1>${site.title}</h1><p>One World • One Mission • One CryptoWorldz</p><div class="wx-actions"><a class="wx-btn green" href="${HQ}" target="_blank" rel="noopener noreferrer">Join CryptoWorldz HQ</a><a class="wx-btn" href="${BOT}" target="_blank" rel="noopener noreferrer">Open @CryptoWorldzBot</a><a class="wx-btn gold" href="https://oneworldz.com">Visit OneWorldz</a><a class="wx-btn" href="https://cryptoworldz.xyz">Visit CryptoWorldz</a></div></section></div></main>`;
}
render();

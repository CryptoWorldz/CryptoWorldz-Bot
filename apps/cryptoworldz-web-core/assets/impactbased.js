const config = window.CRYPTOWORLDZ_CONFIG || {};
const app = document.querySelector('#app');
const nav = document.querySelector('#main-nav');
const brandTitle = document.querySelector('#brand-title');
const brandSubtitle = document.querySelector('#brand-subtitle');
const walletButton = document.querySelector('#wallet-button');

const BOARD = config.basedBidBoardUrl || 'https://www.based.bid/b/Charity.Based';
const HQ = 'https://t.me/CryptoWorldzHQ';
const BOT = 'https://t.me/CryptoWorldzBot';
const PIPELINE = [
  ['$SMILES','Action Creates Smiles','Uganda • food • water • education • medical care'],
  ['$SolMars','MuskMan','SolWorldz community launch pipeline'],
  ['$SolBud','Black Bud','SolWorldz community launch pipeline'],
  ['$GIA','Global Impact Alliance','Global impact project pipeline'],
  ['$W','Uganda Unite','Uganda-focused Solana project pipeline'],
  ['$RHL','Robin Hood Law','Fairness and community-first policy project'],
  ['$NBC','Next Big Coin','Existing ecosystem project under verification review']
];

function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function btn(url,label,kind='wx-btn'){return `<a class="${kind}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;}

async function liveTokens(){
  if(!config.supabaseUrl||!config.supabasePublishableKey)return [];
  const url=`${config.supabaseUrl}/rest/v1/ecosystem_tokens?select=name,symbol,chain_id,contract_address,launch_status,logo_url,trade_url,dexscreener_url,launch_url,description&is_public=eq.true&launch_status=eq.live&order=display_order.asc`;
  try{const r=await fetch(url,{headers:{apikey:config.supabasePublishableKey,Authorization:`Bearer ${config.supabasePublishableKey}`}});return r.ok?await r.json():[];}catch{return [];}
}

function worlds(){
  return [
    ['OneWorldz','https://oneworldz.com'],['CryptoWorldz','https://cryptoworldz.xyz'],['SolWorldz','https://solworldz.xyz'],['Purple Diamond Crew','https://purplediamondcrew.com'],
    ['EthWorldz','https://ethworldz.xyz'],['BaseWorldz','https://baseworldz.xyz'],['BNBWorldz','https://bnbworldz.xyz'],['XRPWorldz','https://xrpworldz.xyz'],['SuiWorldz','https://suiworldz.xyz'],['HyperWorldz','https://hyperworldz.xyz']
  ].map(([n,u])=>`<a href="${u}" target="_blank" rel="noopener noreferrer">Visit ${n}</a>`).join('');
}

async function render(){
  document.body.classList.add('worldz-rich-page','impactbased-page');
  document.title='ImpactBased • Purpose-led Launch Board';
  brandTitle.textContent='IMPACTBASED';
  brandSubtitle.textContent='HELPING THE PEOPLE WHO HELP PEOPLE';
  walletButton.textContent='Open @CryptoWorldzBot';
  walletButton.onclick=()=>window.open(BOT,'_blank','noopener,noreferrer');
  nav.innerHTML=[
    ['Home','#home'],['Launch Pipeline','#pipeline'],['Help the People','?page=help'],['Token Feature','?page=tokens'],['Open Based.bid Board',BOARD],['Visit OneWorldz','https://oneworldz.com'],['Zed HQ',HQ]
  ].map(([l,u])=>`<a href="${u}"${u.startsWith('http')?' target="_blank" rel="noopener noreferrer"':''}>${l}</a>`).join('');

  const live=await liveTokens();
  const liveCards=live.length?live.map(t=>`<article class="wx-card"><span class="wx-tag live">LIVE • VERIFIED REGISTRY</span><div class="wx-symbol">${esc(t.symbol)}</div><h3>${esc(t.name)}</h3><p>${esc(t.description||`${t.chain_id||'Blockchain'} token`)}</p>${t.contract_address?`<p style="font-size:.78rem;word-break:break-all">${esc(t.contract_address)}</p>`:''}<div class="wx-actions">${t.dexscreener_url?btn(t.dexscreener_url,'DEX Screener'):''}${t.trade_url?btn(t.trade_url,'Market'):''}${t.launch_url?btn(t.launch_url,'Launch Page'):''}</div></article>`).join(''):`<div class="wx-note" style="grid-column:1/-1">There are currently no public token records marked <strong>live</strong> in the shared registry. ImpactBased pipeline cards below are preparation/status cards, not trading claims.</div>`;

  app.innerHTML=`<div class="wx-shell">
    <section id="home" class="wx-hero"><img class="wx-hero-bg" src="./assets/images/website-core/blockchain/blockchain-worldz-multichain-directory.webp" alt="CryptoWorldz blockchain ecosystem"><div class="wx-hero-copy"><span class="wx-kicker">Purpose • transparency • community</span><h1>ImpactBased</h1><p>A purpose-led launch front door connecting real-world impact projects with clear public launch information and the established Based.bid board.</p><div class="wx-actions">${btn(BOARD,'Open Current Based.bid Board','wx-btn green')}<a class="wx-btn gold" href="?page=tokens">Token Feature</a><a class="wx-btn" href="?page=help">Help the People</a>${btn(HQ,'Visit CryptoWorldz HQ')}</div></div></section>

    <section class="wx-panel wx-feature"><div class="wx-copy"><span class="wx-kicker">Current board destination</span><h2>Launch with Purpose.</h2><p>The public Based.bid board is live now. It still uses the legacy <strong>Charity.Based</strong> route while this ImpactBased front door carries the updated ecosystem identity.</p><div class="wx-actions">${btn(BOARD,'Visit ImpactBased on Based.bid','wx-btn green')}${btn('https://solworldz.xyz','Visit SolWorldz')}</div></div><div style="display:grid;place-items:center"><div class="impact-orb">b</div></div></section>

    <section id="pipeline" class="wx-panel"><span class="wx-kicker">Next to launch / preparing</span><h2>ImpactBased Pipeline</h2><p>These projects can be pictured and introduced while their final public launch details are prepared. A pipeline card does not mean a contract, pool or market is live.</p><div class="wx-grid">${PIPELINE.map(([s,n,c])=>`<article class="wx-card"><span class="wx-tag">PIPELINE</span><div class="wx-symbol">${esc(s)}</div><h3>${esc(n)}</h3><p>${esc(c)}</p>${btn(BOARD,'View Board','wx-btn gold')}</article>`).join('')}</div></section>

    <section class="wx-panel"><span class="wx-kicker">Verified public registry</span><h2>Live Tokens</h2><div class="wx-grid">${liveCards}</div></section>

    <section class="wx-panel wx-feature"><img src="./assets/images/website-core/action-creates-smiles/action-creates-smiles-reagan-kids.webp" alt="Action Creates Smiles Uganda" loading="lazy"><div class="wx-copy"><span class="wx-kicker">Impact that leaves the screen</span><h2>Helping the People who Help People.</h2><p>ImpactBased exists to connect launch technology with projects that can show why they matter — food, shelter, water, education, care, dignity and stronger communities.</p><div class="wx-actions"><a class="wx-btn green" href="?page=help">Open Help the People</a>${btn('https://purplediamondcrew.com','Visit Purple Diamond Crew')}</div></div></section>

    <section class="wx-panel"><span class="wx-kicker">One ecosystem • many Worldz</span><h2>Visit the Network</h2><div class="wx-worlds">${worlds()}</div></section>
    <p class="sw-disclaimer">Always verify a token contract, launch status and external destination before interacting. ImpactBased pipeline status is informational and does not represent financial advice or a live market.</p>
  </div>`;
}
render();

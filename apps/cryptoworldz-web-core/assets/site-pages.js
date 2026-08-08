const config = window.CRYPTOWORLDZ_CONFIG || {};
const app = document.querySelector('#app');
const nav = document.querySelector('#main-nav');
const brandTitle = document.querySelector('#brand-title');
const brandSubtitle = document.querySelector('#brand-subtitle');
const walletButton = document.querySelector('#wallet-button');
const params = new URLSearchParams(location.search);
const page = params.get('page') || 'help';
const host = location.hostname.replace(/^www\./, '').toLowerCase();

const LINKS = {
  profile: 'https://www.gofundme.com/u/cryptouniverse',
  davisGfm: 'https://www.gofundme.com/f/the-davis-family-w4qys/cl/s?utm_campaign=fp_sharesheet&utm_content=amp30-no-carousel&utm_medium=customer&utm_source=copy_link&lang=en_GB',
  davisFacebook: 'https://www.facebook.com/share/19TbWGWNUo/',
  smilesGfm: 'https://gofund.me/actioncreatesmiles',
  impact: config.basedBidBoardUrl || 'https://www.based.bid/b/Charity.Based',
  zedHQ: 'https://t.me/CryptoWorldzHQ',
  zedBot: 'https://t.me/CryptoWorldzBot'
};

const sites = [
  ['SolWorldz','https://solworldz.xyz'],['OneWorldz','https://oneworldz.com'],['CryptoWorldz','https://cryptoworldz.xyz'],['Purple Diamond Crew','https://purplediamondcrew.com'],
  ['EthWorldz','https://ethworldz.xyz'],['BaseWorldz','https://baseworldz.xyz'],['BNBWorldz','https://bnbworldz.xyz'],['XRPWorldz','https://xrpworldz.xyz'],['SuiWorldz','https://suiworldz.xyz'],['HyperWorldz','https://hyperworldz.xyz'],['RobinWorldz','https://robinworldz.xyz'],['BitcoinWorldz','https://cryptoworldz.xyz/?world=bitcoinworldz&mode=coming-soon'],['HodlerWorldz','https://hodlerworldz.xyz']
];

const pipeline = [
  ['$SMILES','Action Creates Smiles','ImpactBased flagship pipeline'],
  ['$SolMars','MuskMan','ImpactBased pipeline'],
  ['$SolBud','Black Bud','ImpactBased pipeline'],
  ['$GIA','Global Impact Alliance','ImpactBased pipeline'],
  ['$W','Uganda Unite','ImpactBased pipeline • Solana-styled W identity'],
  ['$NBC','Next Big Coin','Existing / verification review'],
  ['$RHL','Robin Hood Law','Policy / launch pipeline']
];

function esc(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function btn(url,label,kind='sw-btn'){return `<a class="${kind}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;}
function localHome(){if(host==='solworldz.xyz')return 'https://solworldz.xyz';if(host==='oneworldz.com')return 'https://oneworldz.com';if(host==='purplediamondcrew.com')return 'https://purplediamondcrew.com';return 'https://cryptoworldz.xyz';}
function hostName(){if(host==='solworldz.xyz')return 'SOLWORLDZ';if(host==='oneworldz.com')return 'ONEWORLDZ';if(host==='purplediamondcrew.com')return 'PURPLE DIAMOND CREW';return 'CRYPTOWORLDZ';}

function renderNav(){
  nav.innerHTML = [
    ['Home', localHome()], ['Help the People','?page=help'], ['Token Feature','?page=tokens'], ['Visit ImpactBased',LINKS.impact], ['Visit OneWorldz','https://oneworldz.com'], ['Zed HQ',LINKS.zedHQ]
  ].map(([label,url])=>`<a href="${url}"${url.startsWith('http')?' target="_blank" rel="noopener noreferrer"':''}>${label}</a>`).join('');
}

function commonSetup(){
  document.body.classList.add('worldz-rich-page');
  brandTitle.textContent = hostName();
  brandSubtitle.textContent = 'ONE WORLD • ONE MISSION • HELPING PEOPLE';
  walletButton.textContent = 'Open @CryptoWorldzBot';
  walletButton.onclick = ()=>window.open(LINKS.zedBot,'_blank','noopener,noreferrer');
  renderNav();
}

function allSites(){return sites.map(([name,url])=>`<a class="sw-world-link" href="${url}" target="_blank" rel="noopener noreferrer">Visit ${esc(name)}</a>`).join('');}

function renderHelp(){
  document.title = `Help the People • ${hostName()}`;
  app.innerHTML = `<div class="wp-shell">
    <section class="wp-hero"><span class="sw-kicker">One World • One Mission • One Fam</span><h1>Help the People</h1><p>A shared place across the Worldz network for real donation links, real community pages and simple actions anyone can take to help spread the word.</p><div class="wp-actions">${btn(LINKS.profile,'Visit JayJayTeamDev GoFundMe Profile','sw-btn gold')}${btn(LINKS.zedHQ,'Visit CryptoWorldz HQ')}</div></section>

    <section class="wp-section"><div class="sw-heading"><div><span class="sw-kicker">Direct support</span><h2>Donation Pages</h2></div><p>Open the fundraiser at its official destination. No donation payment is collected by this website.</p></div><div class="wp-donation-grid">
      <article class="wp-donation-card"><img src="./assets/images/website-core/purple-diamond-crew/hope-chest-by-firelight.webp" alt="OneWorldz Hope Chest" loading="lazy"><div class="body"><h3>The Davis Family</h3><p>Visit the Davis Family GoFundMe or open their Facebook page to follow, like, comment and share their story.</p><div class="wp-actions">${btn(LINKS.davisGfm,'Visit Davis Family GoFundMe','sw-btn gold')}${btn(LINKS.davisFacebook,'Visit Facebook Page')}</div></div></article>
      <article class="wp-donation-card"><img src="./assets/images/website-core/action-creates-smiles/action-creates-smiles-reagan-kids.webp" alt="Action Creates Smiles Uganda" loading="lazy"><div class="body"><h3>Action Creates Smiles • Uganda</h3><p>Support food, clean water, education, medical care, safe shelter and a brighter future for children and the surrounding community.</p><div class="wp-actions">${btn(LINKS.smilesGfm,'Visit Action Creates Smiles GoFundMe','sw-btn gold')}${btn(LINKS.profile,'Visit Organizer Profile')}</div></div></article>
    </div></section>

    <section class="wp-section"><div class="sw-heading"><div><span class="sw-kicker">No donation required</span><h2>Help Get the Word Out</h2></div><p>People who cannot donate can still help a campaign reach someone who can.</p></div><div class="wp-social-grid"><a class="wp-social-action" href="${LINKS.davisFacebook}" target="_blank" rel="noopener noreferrer">✅ FOLLOW</a><a class="wp-social-action" href="${LINKS.davisFacebook}" target="_blank" rel="noopener noreferrer">✅ LIKE</a><a class="wp-social-action" href="${LINKS.davisFacebook}" target="_blank" rel="noopener noreferrer">✅ COMMENT</a><a class="wp-social-action" href="${LINKS.davisFacebook}" target="_blank" rel="noopener noreferrer">✅ SHARE</a></div><p class="wp-hash">#MakeADifferenceTogether</p></section>

    <section class="wp-section"><div class="sw-heading"><div><span class="sw-kicker">Stories of hope</span><h2>Helping Children & Communities</h2></div><p>The approved media package can rotate here as each website receives its final donation-page treatment.</p></div><div class="sw-media-row"><img src="./assets/images/website-core/action-creates-smiles/kids-cartoon-kindness-changes-everything.webp" alt="Kindness Changes Everything" loading="lazy"><img src="./assets/images/website-core/action-creates-smiles/kids-cartoon-bunk-bed.webp" alt="Children smiling together" loading="lazy"><img src="./assets/images/website-core/oneworldz/oneworldz-one-vision-one-future.webp" alt="OneWorldz mission" loading="lazy"></div></section>

    <section class="wp-section"><div class="sw-heading"><div><span class="sw-kicker">Connected network</span><h2>Visit the Worldz</h2></div><p>Donation and Help the People pages are designed as a shared pattern so every site can point visitors toward the same verified destinations.</p></div><div class="sw-world-grid">${allSites()}</div></section>

    <p class="sw-disclaimer">Always confirm the fundraiser name and destination before donating. This website links to external fundraising and social platforms and does not process donations itself.</p>
  </div>`;
}

async function liveTokens(){
  if(!config.supabaseUrl||!config.supabasePublishableKey)return [];
  const url=`${config.supabaseUrl}/rest/v1/ecosystem_tokens?select=name,symbol,chain_id,contract_address,launch_status,logo_url,trade_url,dexscreener_url,launch_url,description&is_public=eq.true&launch_status=eq.live&order=display_order.asc`;
  try{const r=await fetch(url,{headers:{apikey:config.supabasePublishableKey,Authorization:`Bearer ${config.supabasePublishableKey}`}});return r.ok?await r.json():[];}catch{return [];}
}

async function renderTokens(){
  document.title = `Token Feature • ${hostName()}`;
  const live = await liveTokens();
  const liveHtml = live.length ? live.map(t=>`<article class="wp-token-mini"><div class="symbol">${esc(t.symbol)}</div><h3>${esc(t.name)}</h3><p>${esc(t.description||`${t.chain_id||'Blockchain'} token`)}</p>${t.contract_address?`<p class="sw-disclaimer"><strong>Contract:</strong> ${esc(t.contract_address)}</p>`:''}<div class="wp-actions">${t.dexscreener_url?btn(t.dexscreener_url,'DEX Screener'):''}${t.trade_url?btn(t.trade_url,'Market'):''}${t.launch_url?btn(t.launch_url,'Launch Page'):''}</div></article>`).join('') : `<div class="sw-empty" style="grid-column:1/-1">No public tokens are currently marked <strong>live</strong> in the shared registry. Nothing is being presented as tradable until its public contract record is published and verified.</div>`;
  app.innerHTML = `<div class="wp-shell">
    <section class="wp-hero" style="background-image:linear-gradient(90deg,rgba(3,2,8,.96),rgba(8,3,18,.5)),url('./assets/images/website-core/blockchain/blockchain-worldz-multichain-directory.webp')"><span class="sw-kicker">Verified live • pictured pipeline • ImpactBased</span><h1>Token Feature</h1><p>One clear view of what is actually live, what is in the purpose-led launch pipeline and where to verify the current ImpactBased board.</p><div class="wp-actions">${btn(LINKS.impact,'Visit ImpactBased','sw-btn gold')}<a class="sw-btn green" href="?page=help">Help the People</a></div></section>
    <section class="wp-section"><div class="sw-heading"><div><span class="sw-kicker">Public registry</span><h2>Live & Verified</h2></div><p>Only records explicitly published with <strong>launch_status = live</strong> appear here.</p></div><div class="wp-token-list">${liveHtml}</div></section>
    <section class="wp-section"><div class="sw-heading"><div><span class="sw-kicker">Next / preparing</span><h2>ImpactBased Pipeline</h2></div><p>These are ecosystem projects in the launch or review pipeline. Their cards do not imply a live contract, liquidity or trading market.</p></div><div class="wp-token-list">${pipeline.map(([symbol,name,status])=>`<article class="wp-token-mini"><div class="symbol">${esc(symbol)}</div><h3>${esc(name)}</h3><p>${esc(status)}</p>${btn(LINKS.impact,'View Board','sw-btn gold')}</article>`).join('')}</div></section>
    <section class="wp-section"><div class="sw-heading"><div><span class="sw-kicker">Explore</span><h2>Connected Websites</h2></div></div><div class="sw-world-grid">${allSites()}</div></section>
    <p class="sw-disclaimer">Token information is informational only. Verify the contract address, launch status and external links before interacting with any blockchain asset.</p>
  </div>`;
}

commonSetup();
if(page==='tokens') renderTokens(); else renderHelp();

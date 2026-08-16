const config=window.CRYPTOWORLDZ_CONFIG||{};
const app=document.querySelector('#app');
const nav=document.querySelector('#main-nav');
const brandTitle=document.querySelector('#brand-title');
const brandSubtitle=document.querySelector('#brand-subtitle');
const walletButton=document.querySelector('#wallet-button');

const BOT='https://t.me/CryptoWorldzBot';
const COMMAND='https://cryptobotz.cryptoworldz.xyz/miniapp/';
const IMPACT='https://impactbased.cryptoworldz.xyz/';
const DONATE='https://donateworldz.com/';
const REAGAN='https://donateworldz.com/reagan-children/';
const HERO='./assets/images/website-core/oneworldz/oneworldz-one-vision-one-future.webp';
const CHEST='./assets/images/website-core/purple-diamond-crew/hope-chest-by-firelight.webp';

function btn(url,label,kind='wx-btn'){
  return `<a class="${kind}" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

const destinations=[
  ['CryptoWorldz','https://cryptoworldz.xyz/','Crypto headquarters'],
  ['SolWorldz','https://solworldz.xyz/','Solana'],
  ['EthWorldz','https://ethworldz.xyz/','Ethereum'],
  ['BaseWorldz','https://baseworldz.xyz/','Base'],
  ['BNBWorldz','https://bnbworldz.xyz/','BNB Chain'],
  ['XRPWorldz','https://xrpworldz.xyz/','XRP Ledger'],
  ['SuiWorldz','https://suiworldz.xyz/','Sui'],
  ['HyperWorldz','https://hyperworldz.xyz/','Hyperliquid'],
  ['RobinWorldz','https://robinworldz.xyz/','People-first recovery'],
  ['HodlerWorldz','https://hodlerworldz.xyz/','Portfolio learning'],
  ['HodlerGalaxy','https://hodlergalaxy.xyz/','Ecosystem discovery'],
  ['Purple Diamond Crew','https://purplediamondcrew.com/','Legacy + action'],
  ['FoodWorldz','https://foodworldz.com/','Food support'],
  ['DonateWorldz',DONATE,'Support pathways'],
  ['ImpactBased',IMPACT,'Purpose-led launch pathway'],
  ['Law.OneWorldz','https://law.oneworldz.com/','Public information'],
  ['Learn.OneWorldz','https://learn.oneworldz.com/','Learning centre']
];

function worldGrid(){
  return destinations.map(([name,url,role])=>`<a class="wx-world-link" href="${url}" target="_blank" rel="noopener noreferrer"><strong>${name}</strong><span>${role}</span><b>OPEN →</b></a>`).join('');
}
function pillar(icon,title,copy){
  return `<article class="pdc-action-card"><span>${icon}</span><h3>${title}</h3><p>${copy}</p></article>`;
}
function step(label){return `<span>${label}</span>`;}

document.body.classList.add('worldz-rich-page','oneworldz-live');
document.title='OneWorldz 🌏 One Vision | Helping the People Who Help People';
brandTitle.textContent='ONEWORLDZ';
brandSubtitle.textContent='ONEWORLDZ 🌏 ONE VISION';
walletButton.textContent='Open Command Centre';
walletButton.onclick=()=>window.open(COMMAND,'_blank','noopener,noreferrer');
nav.innerHTML=[
  ['Home','#home'],['Vision','#vision'],['Help People','#action'],['Explore','#worldz'],['Command Centre',COMMAND]
].map(([label,url])=>`<a href="${url}"${url.startsWith('http')?' target="_blank" rel="noopener noreferrer"':''}>${label}</a>`).join('');

app.innerHTML=`<div class="wx-shell">
<section id="home" class="wx-hero owz-fixed-hero">
  <div class="wx-hero-media"><img src="${HERO}" alt="OneWorldz One Vision artwork"></div>
  <div class="wx-hero-copy">
    <span class="wx-kicker">ONEWORLDZ 🌏 ONE VISION</span>
    <h1>One Vision.<br>One Connected Gateway.</h1>
    <p>People, planet, technology and leadership connected around measurable action — with helping people kept at the centre.</p>
    <div class="wx-actions">
      ${btn(DONATE,'Help People','wx-btn green')}
      ${btn(COMMAND,'Command Centre Ultimate™','wx-btn gold')}
      <a class="wx-btn" href="#worldz">Explore the Worldz</a>
      ${btn('https://purplediamondcrew.com/','Purple Diamond Crew','wx-btn gold')}
      ${btn('https://cryptoworldz.xyz/','Enter CryptoWorldz')}
    </div>
  </div>
</section>

<section id="vision" class="wx-panel"><span class="wx-kicker">THE ONE VISION BLUEPRINT</span><h2>Vision → Mission → Action → Results</h2><p>OneWorldz connects projects, communities and practical action around a shared goal: helping people, strengthening communities and building systems that can be measured and improved.</p><div class="pdc-action-grid">${pillar('🌍','Vision','A connected world where people, communities and technology work together for practical positive change.')}${pillar('🎯','Mission','Turn research, ideas and community effort into real projects with clear purpose and transparent outcomes.')}${pillar('🤝','Principles','Kindness, fairness, transparency, participation, accountability and respect for the people being helped.')}${pillar('📊','Results','Measure what was attempted, what worked, what failed and what should improve next.')}</div></section>

<section class="wx-panel"><span class="wx-kicker">FOUR PILLARS</span><h2>People • Planet • Technology • Leadership</h2><div class="pdc-action-grid">${pillar('👥','People','Food, shelter, education, health, dignity, opportunity and stronger communities.')}${pillar('🌱','Planet','Water, farming, sustainable systems, regeneration and responsible use of resources.')}${pillar('💻','Technology','Use digital systems, AI and blockchain where they genuinely improve access, coordination or transparency.')}${pillar('🧭','Leadership','Clear responsibility, public reasoning, measurable goals and accountable decision-making.')}</div></section>

<section id="framework" class="wx-panel owz-loop-panel"><span class="wx-kicker">GLOBAL RESEARCH + IMPROVEMENT LOOP</span><h2>Research. Verify. Improve.</h2><div class="wx-loop">${step('Research')}${step('Compare')}${step('Verify')}${step('Recommend')}${step('Implement')}${step('Measure')}${step('Improve Again')}</div><p>Ideas are researched, compared and verified before recommendations are made. Projects are implemented, measured and improved instead of being called finished simply because they launched.</p></section>

<section id="action" class="wx-panel owz-humanitarian"><span class="wx-kicker">HUMANITARIAN ACTION STAYS CENTRAL</span><h2>Helping people is not a side page.</h2><p>Food, water, shelter, education, medical support, dignity and hope remain visible at the master gateway. Reagan and the children at Action Spreads Smiles are one real pathway for direct support.</p><div class="wx-actions">${btn(REAGAN,"Action Spreads Smiles • Reagan & Children",'wx-btn green')}${btn(DONATE,'Open DonateWorldz')}${btn('https://foodworldz.com/','Open FoodWorldz','wx-btn gold')}</div></section>

<section class="wx-panel wx-feature"><div class="wx-hope-chest-media"><img src="${CHEST}" width="256" height="320" alt="The OneWorldz Hope Chest"></div><div class="wx-copy"><span class="wx-kicker">STORIES • LEGACY • SECOND CHANCES</span><h2>The Hope Chest</h2><p>Useful work, lessons and community history are preserved without confusing legacy records with current production information.</p>${btn('https://purplediamondcrew.com/','Visit Purple Diamond Crew')}</div></section>

<section id="worldz" class="wx-panel owz-worlds-panel"><span class="wx-kicker">ONE ECOSYSTEM • MANY WORLDZ</span><h2>Explore the Worldz</h2><p>Every destination below is a real live route — no “NEXT PASS” placeholders.</p><div class="wx-worlds">${worldGrid()}</div><div class="wx-actions owz-command-row">${btn(COMMAND,'Open CryptoWorldz Command Centre','wx-btn gold')}${btn(BOT,'Open @CryptoWorldzBot')}</div></section>

<section class="wx-panel"><span class="wx-kicker">LONG-TERM GOAL</span><h2>Build a structure people can join, understand and improve.</h2><p>OneWorldz holds the shared vision. The connected Worldz give different communities a clear place to contribute. Progress is judged by practical outcomes, transparent learning and whether the system helps people help people.</p></section>
<p class="sw-disclaimer">External fundraiser, social, blockchain and launch links should always be checked at their destination before interacting.</p>
</div>`;
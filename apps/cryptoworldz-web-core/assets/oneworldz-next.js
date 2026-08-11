const config=window.CRYPTOWORLDZ_CONFIG||{};
const app=document.querySelector('#app');
const nav=document.querySelector('#main-nav');
const brandTitle=document.querySelector('#brand-title');
const brandSubtitle=document.querySelector('#brand-subtitle');
const walletButton=document.querySelector('#wallet-button');
const HQ='https://t.me/CryptoWorldzHQ';
const BOT='https://t.me/CryptoWorldzBot';
const IMPACT=config.basedBidBoardUrl||'https://www.based.bid/b/Charity.Based';
const HERO='./assets/images/website-core/oneworldz/oneworldz-one-vision-one-future.webp';
const CHEST='./assets/images/website-core/purple-diamond-crew/hope-chest-by-firelight.webp';
function btn(u,l,k='wx-btn'){return `<a class="${k}" href="${u}" target="_blank" rel="noopener noreferrer">${l}</a>`;}
function worldGrid(){return [['CryptoWorldz','https://cryptoworldz.xyz'],['SolWorldz','https://solworldz.xyz'],['Purple Diamond Crew','https://purplediamondcrew.com'],['ImpactBased','https://impactbased.oneworldz.com'],['EthWorldz','https://ethworldz.xyz'],['BaseWorldz','https://baseworldz.xyz'],['BNBWorldz','https://bnbworldz.xyz'],['XRPWorldz','https://xrpworldz.xyz'],['SuiWorldz','https://suiworldz.xyz'],['HyperWorldz','https://hyperworldz.xyz'],['RobinWorldz','https://robinworldz.xyz'],['BitcoinWorldz','https://cryptoworldz.xyz/?world=bitcoinworldz&mode=coming-soon'],['HodlerWorldz','https://hodlerworldz.xyz']].map(([n,u])=>`<a href="${u}" target="_blank" rel="noopener noreferrer">Visit ${n}</a>`).join('');}
function pillar(icon,title,copy){return `<article class="pdc-action-card"><span>${icon}</span><h3>${title}</h3><p>${copy}</p></article>`;}

document.body.classList.add('worldz-rich-page');
document.title='OneWorldz 🌏 One Vision';
brandTitle.textContent='ONEWORLDZ';
brandSubtitle.textContent='ONEWORLDZ 🌏 ONE VISION';
walletButton.textContent='Open @CryptoWorldzBot';
walletButton.onclick=()=>window.open(BOT,'_blank','noopener,noreferrer');
nav.innerHTML=[['Home','#home'],['Vision','#vision'],['Framework','#framework'],['Action','#action'],['Ultimate™','/command-centre/ultimate/'],['Help & Donate','/donate/'],['Reagan Kauja','/reagan-kauja/'],['CryptoWorldz','https://cryptoworldz.xyz'],['Purple Diamond Crew','https://purplediamondcrew.com']].map(([l,u])=>`<a href="${u}"${u.startsWith('http')?' target="_blank" rel="noopener noreferrer"':''}>${l}</a>`).join('');

app.innerHTML=`<div class="wx-shell">
<section id="home" class="wx-hero"><img class="wx-hero-bg" src="${HERO}" alt="OneWorldz One Vision master artwork"><div class="wx-hero-copy"><span class="wx-kicker">OneWorldz 🌏 One Vision</span><h1>OneWorldz</h1><p>The master gateway for one connected vision: people, planet, technology and leadership working together to turn ideas into measurable action.</p><div class="wx-actions"><a class="wx-btn green" href="/donate/">Help & Donate</a><a class="wx-btn gold" href="/command-centre/ultimate/">Command Centre Ultimate™ 🥏</a><a class="wx-btn" href="/reagan-kauja/">Meet Reagan Kauja</a>${btn('https://purplediamondcrew.com','Purple Diamond Crew','wx-btn gold')}${btn('https://cryptoworldz.xyz','Enter CryptoWorldz')}</div></div></section>

<section id="vision" class="wx-panel"><span class="wx-kicker">THE ONE VISION BLUEPRINT</span><h2>Vision → Mission → Principles → Action</h2><p>OneWorldz is not one project. It is the structure that connects projects, communities and practical action around a shared goal: helping people, strengthening communities and building systems that can be measured and improved.</p><div class="pdc-action-grid">${pillar('🌍','Vision','A connected world where people, communities and technology work together for practical positive change.')}${pillar('🎯','Mission','Turn research, ideas and community effort into real projects with clear purpose and transparent outcomes.')}${pillar('🤝','Core Principles','Kindness, fairness, transparency, participation, accountability and respect for the people being helped.')}${pillar('📊','Results','Measure what was attempted, what worked, what failed and what should improve next.')}</div></section>

<section class="wx-panel"><span class="wx-kicker">FOUR PILLARS</span><h2>People • Planet • Technology • Leadership</h2><div class="pdc-action-grid">${pillar('👥','People','Food, shelter, education, health, dignity, opportunity and stronger communities.')}${pillar('🌱','Planet','Water, farming, sustainable systems, regeneration and responsible use of resources.')}${pillar('💻','Technology','Use digital systems, AI and blockchain where they genuinely improve access, coordination or transparency.')}${pillar('🧭','Leadership','Clear responsibility, public reasoning, measurable goals and accountable decision-making.')}</div></section>

<section id="framework" class="wx-panel"><span class="wx-kicker">GLOBAL RESEARCH + IMPROVEMENT LOOP</span><h2>Research → Compare → Verify → Recommend → Implement → Measure → Improve Again</h2><p>The original OneWorldz structure is retained as an operating framework. Ideas are researched, compared and verified before recommendations are made. Projects are then implemented, measured and improved instead of being treated as finished simply because they launched.</p></section>

<section class="wx-panel"><span class="wx-kicker">COMMUNITY PARTICIPATION</span><h2>People join the structure.</h2><p>OneWorldz provides the gateway. Purple Diamond Crew provides an action pathway. CryptoWorldz provides the crypto and technology hub. ImpactBased provides the purpose-led launch pathway. The individual Worldz give specialist communities their own home while remaining connected to the larger mission.</p><div class="wx-actions">${btn('https://purplediamondcrew.com','Take Action with Purple Diamond Crew','wx-btn green')}${btn('https://cryptoworldz.xyz','Explore CryptoWorldz')}${btn('https://impactbased.oneworldz.com','Visit ImpactBased','wx-btn gold')}</div></section>

<section id="action" class="wx-panel"><span class="wx-kicker">HUMANITARIAN ACTION STAYS CENTRAL</span><h2>Donation pages remain part of OneWorldz.</h2><p>Food, water, shelter, education, medical support, dignity and hope remain visible at the master gateway. Reagan Kauja and Action Spread Smiles remain a real example of the structure being used for practical support rather than being separated from the wider vision.</p><div class="wx-actions"><a class="wx-btn green" href="/donate/">Open Help & Donation Directory</a><a class="wx-btn" href="/reagan-kauja/">Reagan Kauja • Action Spread Smiles</a></div></section>

<section class="wx-panel wx-feature"><div class="wx-hope-chest-media" style="display:flex;align-items:center;justify-content:center;min-width:0"><img src="${CHEST}" width="256" height="320" style="display:block;width:min(100%,256px);height:auto;aspect-ratio:4/5;object-fit:cover;border-radius:18px" alt="The OneWorldz Hope Chest"></div><div class="wx-copy"><span class="wx-kicker">STORIES • LEGACY • SECOND CHANCES</span><h2>The Hope Chest</h2><p>Useful work, lessons and community history are preserved without confusing old branding or legacy records with current production information.</p>${btn('https://purplediamondcrew.com','Visit Purple Diamond Crew')}</div></section>

<section class="wx-panel"><span class="wx-kicker">CRYPTO + BLOCKCHAIN HUB</span><h2>CryptoWorldz carries the deeper blockchain structure.</h2><p>Blockchain Worldz, Command Centre, ImpactBased, launch partners, tokens and project communities sit under CryptoWorldz instead of overwhelming the OneWorldz front gate.</p><div class="wx-actions"><a class="wx-btn gold" href="/command-centre/ultimate/">Open Ultimate™</a>${btn('https://cryptoworldz.xyz','Enter CryptoWorldz','wx-btn green')}${btn(HQ,'CryptoWorldz HQ')}${btn(BOT,'Open @CryptoWorldzBot')}</div></section>

<section class="wx-panel"><span class="wx-kicker">ONE ECOSYSTEM • MANY WORLDZ</span><h2>Explore the Worldz</h2><div class="wx-worlds">${worldGrid()}</div></section>

<section class="wx-panel"><span class="wx-kicker">PURPOSE-LED LAUNCHES</span><h2>ImpactBased</h2><p>Purpose-driven projects can be introduced through ImpactBased while live-token status remains tied to verified public records.</p><div class="wx-actions">${btn('https://impactbased.oneworldz.com','Visit ImpactBased','wx-btn green')}${btn(IMPACT,'Open Based.bid Board','wx-btn gold')}</div></section>

<section class="wx-panel"><span class="wx-kicker">LONG-TERM GOAL</span><h2>Build a structure people can join, understand and improve.</h2><p>OneWorldz holds the shared vision. The connected Worldz give different communities a clear place to contribute. Progress is judged by practical outcomes, transparent learning and whether the system helps people help people.</p></section>
<p class="sw-disclaimer">External fundraiser, social, blockchain and launch links should always be checked at their destination before interacting.</p>
</div>`;
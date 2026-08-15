const config=window.CRYPTOWORLDZ_CONFIG||{};
const app=document.querySelector('#app');
const nav=document.querySelector('#main-nav');
const brandTitle=document.querySelector('#brand-title');
const brandSubtitle=document.querySelector('#brand-subtitle');
const walletButton=document.querySelector('#wallet-button');

const COMMAND='https://cryptobotz.cryptoworldz.xyz';
const IMPACT_BOARD=config.basedBidBoardUrl||'https://www.based.bid/b/ImpactBased';
const LINKS=Object.freeze({
  crypto:'https://cryptoworldz.xyz', pdc:'https://purplediamondcrew.com',
  learn:'https://learn.oneworldz.com', law:'https://law.oneworldz.com', impact:'https://impactbased.oneworldz.com',
  food:'https://foodworldz.com', donate:'https://donateworldz.com', sol:'https://solworldz.xyz', eth:'https://ethworldz.xyz',
  base:'https://baseworldz.xyz', bnb:'https://bnbworldz.xyz', xrp:'https://xrpworldz.xyz', sui:'https://suiworldz.xyz',
  hyper:'https://hyperworldz.xyz', robin:'https://robinworldz.xyz', hodler:'https://hodlerworldz.xyz'
});

const ASSET='./assets/images/oneworldz-pass110';
const HERO_DESKTOP=`${ASSET}/desktop/oneworldz-hero.webp`;
const HERO_MOBILE=`${ASSET}/mobile/oneworldz-hero.webp`;
const CHEST_DESKTOP=`${ASSET}/desktop/hope-chest.webp`;
const CHEST_MOBILE=`${ASSET}/mobile/hope-chest.webp?r4-cache-bust`;

function btn(u,l,k='wx-btn') { const external=u.startsWith('http'); return `<a class="${k}" href="${u}"${external?' target="_blank" rel="noopener noreferrer"':''}>${l}</a>`; }
function responsiveImage(desktop,mobile,alt) { return `<picture><source media="(max-width:780px)" srcset="${mobile}"><img src="${desktop}" alt="${alt}" loading="eager" decoding="async"></picture>`; }
function pillar(icon,title,copy){return `<article class="pdc-action-card"><span>${icon}</span><h3>${title}</h3><p>${copy}</p></article>`;}
function worldGrid(){
  const passed=[['CryptoWorldz',LINKS.crypto],['Purple Diamond Crew',LINKS.pdc]];
  const queued=['Learn.OneWorldz','Law.OneWorldz','ImpactBased','FoodWorldz','DonateWorldz','SolWorldz','EthWorldz','BaseWorldz','BNBWorldz','XRPWorldz','SuiWorldz','HyperWorldz','RobinWorldz','HodlerWorldz'];
  return passed.map(([n,u])=>`<a href="${u}" target="_blank" rel="noopener noreferrer">Visit ${n}</a>`).join('')+
    queued.map(n=>`<span class="wx-world-queued" aria-label="${n} queued for verification">${n} • NEXT PASS</span>`).join('');
}

document.body.classList.remove('oneworldz-recovered');
document.body.classList.add('worldz-rich-page');
document.title='OneWorldz 🌏 One Vision';
brandTitle.textContent='ONEWORLDZ';
brandSubtitle.textContent='ONEWORLDZ 🌏 ONE VISION';
walletButton.textContent='Open Command Centre';
walletButton.onclick=()=>window.open(COMMAND,'_blank','noopener,noreferrer');
nav.innerHTML=[['Home','#home'],['Vision','#vision'],['Framework','#framework'],['Action','#action'],['Learn','#learn'],['Law','#law'],['ImpactBased','#impact'],['Worldz','#worldz']].map(([l,u])=>`<a href="${u}">${l}</a>`).join('');

app.innerHTML=`<div class="wx-shell">
<section id="home" class="wx-hero"><picture><source media="(max-width:780px)" srcset="${HERO_MOBILE}"><img class="wx-hero-bg" src="${HERO_DESKTOP}" alt="OneWorldz One Vision master artwork" loading="eager" decoding="async"></picture><div class="wx-hero-copy"><span class="wx-kicker">OneWorldz 🌏 One Vision</span><h1>OneWorldz</h1><p>The master gateway for one connected vision: people, planet, technology and leadership working together to turn ideas into measurable action.</p><div class="wx-actions"><a class="wx-btn green" href="#action">Help People</a><a class="wx-btn gold" href="${COMMAND}" target="_blank" rel="noopener noreferrer">Command Centre Ultimate™</a><a class="wx-btn" href="#worldz">Explore the Worldz</a>${btn(LINKS.pdc,'Purple Diamond Crew','wx-btn gold')}${btn(LINKS.crypto,'Enter CryptoWorldz')}</div></div></section>
<section id="vision" class="wx-panel"><span class="wx-kicker">THE ONE VISION BLUEPRINT</span><h2>Vision → Mission → Principles → Action</h2><p>OneWorldz is the structure connecting projects, communities and practical action around a shared goal: helping people, strengthening communities and building systems that can be measured and improved.</p><div class="pdc-action-grid">${pillar('🌍','Vision','A connected world where people, communities and technology work together for practical positive change.')}${pillar('🎯','Mission','Turn research, ideas and community effort into real projects with clear purpose and transparent outcomes.')}${pillar('🤝','Core Principles','Kindness, fairness, transparency, participation, accountability and respect for the people being helped.')}${pillar('📊','Results','Measure what was attempted, what worked, what failed and what should improve next.')}</div></section>
<section class="wx-panel"><span class="wx-kicker">FOUR PILLARS</span><h2>People • Planet • Technology • Leadership</h2><div class="pdc-action-grid">${pillar('👥','People','Food, shelter, education, health, dignity, opportunity and stronger communities.')}${pillar('🌱','Planet','Water, farming, sustainable systems, regeneration and responsible use of resources.')}${pillar('💻','Technology','Use digital systems, AI and blockchain where they genuinely improve access, coordination or transparency.')}${pillar('🧭','Leadership','Clear responsibility, public reasoning, measurable goals and accountable decision-making.')}</div></section>
<section id="framework" class="wx-panel"><span class="wx-kicker">GLOBAL RESEARCH + IMPROVEMENT LOOP</span><h2>Research → Compare → Verify → Recommend → Implement → Measure → Improve Again</h2><p>Ideas are researched, compared and verified before recommendations are made. Projects are then implemented, measured and improved instead of being called finished simply because they launched.</p></section>
<section id="action" class="wx-panel"><span class="wx-kicker">HUMANITARIAN ACTION STAYS CENTRAL</span><h2>Helping the People Who Help People.</h2><p>Food, water, shelter, education, medical support, dignity and hope remain visible at the master gateway. Reagan Kauja and Action Spreads Smiles remain a real example of practical support connected to the wider OneWorldz vision.</p><div class="wx-actions"><a class="wx-btn green" href="#worldz">Open Support Pathways</a><a class="wx-btn" href="/reagan-kauja/">Reagan Kauja • Action Spreads Smiles</a></div></section>
<section class="wx-panel wx-feature"><div class="wx-hope-chest-media" style="display:flex;align-items:center;justify-content:center;min-width:0">${responsiveImage(CHEST_DESKTOP,CHEST_MOBILE,'The OneWorldz Hope Chest')}</div><div class="wx-copy"><span class="wx-kicker">STORIES • LEGACY • SECOND CHANCES</span><h2>The Hope Chest</h2><p>Useful work, lessons and community history are preserved without confusing old branding or legacy records with current production information.</p>${btn(LINKS.pdc,'Visit Purple Diamond Crew')}</div></section>
<section id="learn" class="wx-panel"><span class="wx-kicker">LEARN.ONEWORLDZ.COM</span><h2>Knowledge Creates Power.</h2><p>Practical learning, digital literacy, confidence and opportunity — designed to make difficult systems easier to understand.</p><p class="sw-disclaimer">Destination queued for its own 100% build, visual and link pass before activation.</p></section>
<section id="law" class="wx-panel"><span class="wx-kicker">LAW.ONEWORLDZ.COM</span><h2>Understand the pathway.</h2><p>Plain-language public information, rights awareness and understandable pathways with clear boundaries around professional legal advice.</p><p class="sw-disclaimer">Destination queued for its own 100% build, visual and link pass before activation.</p></section>
<section id="impact" class="wx-panel"><span class="wx-kicker">IMPACTBASED.ONEWORLDZ.COM</span><h2>Ideas with Purpose. Projects with Proof.</h2><p>Purpose-driven projects, transparent information and participation — with public claims tied to what can actually be verified.</p><p class="sw-disclaimer">Destination queued for its own 100% build, visual and link pass before activation.</p></section>
<section class="wx-panel"><span class="wx-kicker">CRYPTO + BLOCKCHAIN HUB</span><h2>CryptoWorldz carries the deeper blockchain structure.</h2><p>Blockchain Worldz, Command Centre, launch partners, tokens and project communities sit under CryptoWorldz instead of overwhelming the OneWorldz front gate.</p><div class="wx-actions">${btn(COMMAND,'Open Ultimate™','wx-btn gold')}${btn(LINKS.crypto,'Enter CryptoWorldz','wx-btn green')}</div></section>
<section id="worldz" class="wx-panel"><span class="wx-kicker">ONE ECOSYSTEM • MANY WORLDZ</span><h2>Explore the Worldz</h2><p>Only destinations that have passed the sequential verification gate are activated as links.</p><div class="wx-worlds">${worldGrid()}</div></section>
<section class="wx-panel"><span class="wx-kicker">LONG-TERM GOAL</span><h2>Build a structure people can join, understand and improve.</h2><p>OneWorldz holds the shared vision. The connected Worldz give different communities a clear place to contribute. Progress is judged by practical outcomes, transparent learning and whether the system helps people help people.</p></section>
<p class="sw-disclaimer">External destinations are activated only after verification. OneWorldz does not request wallet recovery phrases or provide personalised legal advice.</p>
</div>`;

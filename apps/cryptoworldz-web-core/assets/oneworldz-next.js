const config=window.CRYPTOWORLDZ_CONFIG||{};
const app=document.querySelector('#app');
const nav=document.querySelector('#main-nav');
const brandTitle=document.querySelector('#brand-title');
const brandSubtitle=document.querySelector('#brand-subtitle');
const walletButton=document.querySelector('#wallet-button');
const HQ='https://t.me/CryptoWorldzHQ';
const BOT='https://t.me/CryptoWorldzBot';
const IMPACT=config.basedBidBoardUrl||'https://www.based.bid/b/Charity.Based';
function btn(u,l,k='wx-btn'){return `<a class="${k}" href="${u}" target="_blank" rel="noopener noreferrer">${l}</a>`;}
function worldGrid(){return [
 ['CryptoWorldz','https://cryptoworldz.xyz'],['SolWorldz','https://solworldz.xyz'],['Purple Diamond Crew','https://purplediamondcrew.com'],['ImpactBased','https://impactbased.oneworldz.com'],
 ['EthWorldz','https://ethworldz.xyz'],['BaseWorldz','https://baseworldz.xyz'],['BNBWorldz','https://bnbworldz.xyz'],['XRPWorldz','https://xrpworldz.xyz'],['SuiWorldz','https://suiworldz.xyz'],['HyperWorldz','https://hyperworldz.xyz'],['RobinWorldz','https://robinworldz.xyz'],['BitcoinWorldz','https://bitcoinworldz.xyz'],['HodlerWorldz','https://hodlerworldz.xyz']
].map(([n,u])=>`<a href="${u}" target="_blank" rel="noopener noreferrer">Visit ${n}</a>`).join('');}

document.body.classList.add('worldz-rich-page');
document.title='OneWorldz • One Vision';
brandTitle.textContent='ONEWORLDZ';
brandSubtitle.textContent='ONE WORLDZ 🌐 ONE VISION';
walletButton.textContent='Open @CryptoWorldzBot';
walletButton.onclick=()=>window.open(BOT,'_blank','noopener,noreferrer');
nav.innerHTML=[['Home','#home'],['Our Mission','#mission'],['Help the People','?page=help'],['Token Feature','?page=tokens'],['Visit ImpactBased','https://impactbased.oneworldz.com'],['Visit CryptoWorldz','https://cryptoworldz.xyz'],['Zed HQ',HQ]].map(([l,u])=>`<a href="${u}"${u.startsWith('http')?' target="_blank" rel="noopener noreferrer"':''}>${l}</a>`).join('');

app.innerHTML=`<div class="wx-shell">
<section id="home" class="wx-hero"><img class="wx-hero-bg" src="./assets/images/website-core/oneworldz/oneworldz-one-vision-one-future.webp" alt="OneWorldz One Vision"><div class="wx-hero-copy"><span class="wx-kicker">One Worldz 🌐 One Vision</span><h1>OneWorldz</h1><p>One connected ecosystem built around people, opportunity, community action, technology and a simple belief: a better future should be built for everyone.</p><div class="wx-actions"><a class="wx-btn green" href="?page=help">Help the People</a><a class="wx-btn gold" href="?page=tokens">Token Feature</a>${btn('https://cryptoworldz.xyz','Visit CryptoWorldz')}${btn(HQ,'Join CryptoWorldz HQ')}</div></div></section>

<section id="mission" class="wx-panel wx-feature"><div class="wx-copy"><span class="wx-kicker">One Worldz 🌐 One Mission</span><h2>One future. More ways to help.</h2><p>OneWorldz connects the blockchain Worldz, humanitarian action, education, creative projects, community tools and purpose-led launches without losing sight of the people these systems should serve.</p><div class="wx-actions"><a class="wx-btn green" href="?page=help">Visit Help the People</a>${btn('https://impactbased.oneworldz.com','Visit ImpactBased')}</div></div><img src="./assets/images/website-core/blockchain/blockchain-worldz-multichain-directory.webp" alt="Connected blockchain Worldz" loading="lazy"></section>

<section class="wx-panel"><span class="wx-kicker">Helping the children • helping communities</span><h2>Kindness becomes action.</h2><p>Food, water, shelter, education, medical care, dignity and hope are not side projects. They are part of the reason the ecosystem exists.</p><div class="wx-gallery"><img src="./assets/images/website-core/action-creates-smiles/action-creates-smiles-reagan-kids.webp" alt="Action Creates Smiles Uganda" loading="lazy"><img src="./assets/images/website-core/action-creates-smiles/kids-cartoon-kindness-changes-everything.webp" alt="Kindness Changes Everything" loading="lazy"><img src="./assets/images/website-core/action-creates-smiles/kids-cartoon-bunk-bed.webp" alt="Children smiling together" loading="lazy"></div><div class="wx-actions" style="margin-top:16px"><a class="wx-btn green" href="?page=help">Open Donation / Help Page</a>${btn('https://www.gofundme.com/u/cryptouniverse','Visit GoFundMe Profile','wx-btn gold')}</div></section>

<section class="wx-panel wx-feature"><img src="./assets/images/website-core/purple-diamond-crew/hope-chest-by-firelight.webp" alt="OneWorldz Hope Chest" loading="lazy"><div class="wx-copy"><span class="wx-kicker">Stories • legacy • second chances</span><h2>The Hope Chest.</h2><p>A place for the stories, missions and verified legacy records worth preserving — not because everything old should return, but because useful work, lessons and community history should not disappear.</p>${btn('https://purplediamondcrew.com','Visit Purple Diamond Crew')}</div></section>

<section class="wx-panel"><span class="wx-kicker">Purpose-led launches</span><h2>ImpactBased</h2><p>Projects preparing for public launch can be introduced through the ImpactBased pipeline while live-token status stays strictly tied to verified public contract records.</p><div class="wx-actions">${btn('https://impactbased.oneworldz.com','Visit ImpactBased','wx-btn green')}${btn(IMPACT,'Open Based.bid Board','wx-btn gold')}<a class="wx-btn" href="?page=tokens">Token Feature Page</a></div></section>

<section class="wx-panel"><span class="wx-kicker">One ecosystem • many Worldz • and more</span><h2>Explore the Worldz</h2><div class="wx-worlds">${worldGrid()}</div></section>

<section class="wx-panel"><span class="wx-kicker">Command Centre</span><h2>Zed connects the community.</h2><p>Where a site points to the Zed Command Centre, visitors are sent to the official CryptoWorldz HQ or directly to @CryptoWorldzBot.</p><div class="wx-actions">${btn(HQ,'Visit CryptoWorldz HQ')}${btn(BOT,'Open @CryptoWorldzBot')}</div></section>
<p class="sw-disclaimer">External fundraiser, blockchain and launch links should always be checked at their destination before interacting.</p>
</div>`;

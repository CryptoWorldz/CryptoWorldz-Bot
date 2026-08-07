const app=document.querySelector('#app');
const host=location.hostname.replace(/^www\./,'').toLowerCase();
const names={
 'ethworldz.xyz':'EthWorldz','baseworldz.xyz':'BaseWorldz','bnbworldz.xyz':'BNBWorldz','xrpworldz.xyz':'XRPWorldz','suiworldz.xyz':'SuiWorldz','hyperworldz.xyz':'HyperWorldz','robinworldz.xyz':'RobinWorldz','bitcoinworldz.xyz':'BitcoinWorldz','bitworldz.xyz':'BitWorldz','hodlerworldz.xyz':'HodlerWorldz'
};
const title=names[host]||'CryptoWorldz';
const HQ='https://t.me/CryptoWorldzHQ';
const BOT='https://t.me/CryptoWorldzBot';
const parts=[1,2,3].map(n=>`./assets/images/website-core/cryptoworldz/payload/hero.part${String(n).padStart(2,'0')}.b64`);
async function background(){
 try{const chunks=await Promise.all(parts.map(p=>fetch(p).then(r=>{if(!r.ok)throw new Error(p);return r.text();})));return `data:image/webp;base64,${chunks.join('')}`;}catch{return './assets/images/website-core/blockchain/blockchain-worldz-multichain-directory.webp';}
}
async function render(){
 document.body.classList.add('comingsoon-next','worldz-rich-page');
 document.title=`${title} • Coming Soon`;
 const bg=await background();
 app.outerHTML=`<main class="cs-page"><div class="cs-bg" style="background-image:url('${bg}')"></div><div class="cs-shade"><section class="cs-card"><span class="wx-kicker">One World • One Mission • One CryptoWorldz</span><h1>${title}</h1><p><strong>We Need You.</strong> This Worldz portal is being prepared for its full launch. Join CryptoWorldz HQ, speak with the Executive Leaders and follow the ecosystem while this site comes online.</p><div class="wx-actions"><a class="wx-btn green" href="${HQ}" target="_blank" rel="noopener noreferrer">Join CryptoWorldz HQ</a><a class="wx-btn" href="${BOT}" target="_blank" rel="noopener noreferrer">Open @CryptoWorldzBot</a><a class="wx-btn gold" href="https://oneworldz.com" target="_blank" rel="noopener noreferrer">Visit OneWorldz</a><a class="wx-btn" href="?page=help">Help the People</a></div></section></div></main>`;
}
render();

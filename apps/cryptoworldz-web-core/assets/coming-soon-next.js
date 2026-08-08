const app=document.querySelector('#app');
const host=location.hostname.replace(/^www\./,'').toLowerCase();
const sites={
 'ethworldz.xyz':{title:'EthWorldz',icon:'Ξ',accent:'#8c8cff',accent2:'#d7d7ff',label:'ETHEREUM COMMUNITY'},
 'baseworldz.xyz':{title:'BaseWorldz',icon:'B',accent:'#276cff',accent2:'#8bb8ff',label:'BASE COMMUNITY'},
 'bnbworldz.xyz':{title:'BNBWorldz',icon:'BNB',accent:'#f3ba2f',accent2:'#ffe590',label:'BNB COMMUNITY'},
 'xrpworldz.xyz':{title:'XRPWorldz',icon:'X',accent:'#6fd8ff',accent2:'#ffffff',label:'XRPL COMMUNITY'},
 'suiworldz.xyz':{title:'SuiWorldz',icon:'SUI',accent:'#6fbcf0',accent2:'#ccecff',label:'SUI COMMUNITY'},
 'hyperworldz.xyz':{title:'HyperWorldz',icon:'H',accent:'#49e6c2',accent2:'#b5fff0',label:'HYPERLIQUID COMMUNITY'},
 'robinworldz.xyz':{title:'RobinWorldz',icon:'R',accent:'#6be39c',accent2:'#f2ca59',label:'RECOVER • REBUILD'},
 'bitcoinworldz.xyz':{title:'BitcoinWorldz',icon:'₿',accent:'#f7931a',accent2:'#ffe3b4',label:'BITCOIN COMMUNITY'},
 'bitworldz.xyz':{title:'BitWorldz',icon:'₿',accent:'#f7931a',accent2:'#ffe3b4',label:'BITCOIN COMMUNITY'},
 'hodlerworldz.xyz':{title:'HodlerWorldz',icon:'H',accent:'#c26cff',accent2:'#48d9ff',label:'READ-ONLY PORTFOLIO'}
};
const site=sites[host]||{title:'CryptoWorldz',icon:'CW',accent:'#b96cff',accent2:'#46d9ff',label:'CONNECTED WORLDZ'};
const HQ='https://t.me/CryptoWorldzHQ';
const BOT='https://t.me/CryptoWorldzBot';

function vectorHero(){
 const stars=Array.from({length:42},(_,i)=>`<circle cx="${(i*137+43)%1180}" cy="${(i*83+27)%690}" r="${i%7===0?3:i%3===0?2:1}"/>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720"><defs><radialGradient id="s"><stop stop-color="#35105d"/><stop offset=".5" stop-color="#120528"/><stop offset="1" stop-color="#030613"/></radialGradient><linearGradient id="r" x2="1" y2="1"><stop stop-color="${site.accent2}"/><stop offset=".5" stop-color="${site.accent}"/><stop offset="1" stop-color="#6725a9"/></linearGradient></defs><rect width="1200" height="720" fill="url(#s)"/><g fill="#fff" opacity=".7">${stars}</g><circle cx="600" cy="330" r="225" fill="none" stroke="${site.accent}" stroke-opacity=".18" stroke-width="48"/><circle cx="600" cy="330" r="185" fill="#080415" stroke="url(#r)" stroke-width="10"/><circle cx="600" cy="330" r="150" fill="none" stroke="${site.accent2}" stroke-opacity=".38" stroke-width="3" stroke-dasharray="14 18"/><text x="600" y="365" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-weight="900" font-size="96">${site.icon}</text><text x="600" y="610" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-weight="900" font-size="54">${site.title.toUpperCase()}</text><text x="600" y="658" text-anchor="middle" fill="${site.accent2}" font-family="Arial,sans-serif" font-weight="700" font-size="24" letter-spacing="5">${site.label}</text><text x="70" y="70" fill="${site.accent2}" font-family="Arial,sans-serif" font-size="20">ONE WORLD • ONE MISSION</text></svg>`;
 return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function render(){
 document.body.classList.add('comingsoon-next','worldz-rich-page');
 document.title=`${site.title} • Coming Soon`;
 app.outerHTML=`<main class="cs-page"><div class="cs-bg" aria-label="Official ${site.title} vector artwork" style="background-image:url('${vectorHero()}')"></div><div class="cs-shade"><section class="cs-card"><span class="wx-kicker">One World • One Mission • One CryptoWorldz</span><h1>${site.title}</h1><p><strong>We Need You.</strong> This Worldz portal is being prepared for its full launch. Join CryptoWorldz HQ, speak with the Executive Leaders and follow the ecosystem while this site comes online.</p><div class="wx-actions"><a class="wx-btn green" href="${HQ}" target="_blank" rel="noopener noreferrer">Join CryptoWorldz HQ</a><a class="wx-btn" href="${BOT}" target="_blank" rel="noopener noreferrer">Open @CryptoWorldzBot</a><a class="wx-btn gold" href="https://oneworldz.com" target="_blank" rel="noopener noreferrer">Visit OneWorldz</a><a class="wx-btn" href="?page=help">Help the People</a></div></section></div></main>`;
}
render();

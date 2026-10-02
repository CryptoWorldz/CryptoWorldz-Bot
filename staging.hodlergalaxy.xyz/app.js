(()=>{'use strict';
const menu=document.querySelector('#menu'),nav=document.querySelector('#nav');
menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu?.setAttribute('aria-expanded','false');}));
const screen=document.querySelector('#party-screen');
document.querySelectorAll('.party-console button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.party-console button').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  const copy={
    'BUILD NIGHT':'DevCity rooms • pair up • review • test • ship • prove.',
    'ACADEMY LIVE':'Wallet safety • liquidity • vesting • fees • scam awareness • Q&A.',
    'FOUNDING 100 SHOWCASE':'Qualified teams present progress, contributors and Worldz Proof — not price hype.',
    'IMPACT MISSION':'Coordinate verified practical help while keeping donations separate from investment activity.'
  };
  screen.innerHTML='<b>'+b.dataset.mode+'</b><span>'+copy[b.dataset.mode]+'</span>';
}));
})();
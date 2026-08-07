(() => {
  const page=new URLSearchParams(location.search).get('page');
  if(!['help','donate','tokens'].includes(page))return;
  const host=location.hostname.replace(/^www\./,'').toLowerCase();
  const names={
    'solworldz.xyz':'SOLWORLDZ','oneworldz.com':'ONEWORLDZ','purplediamondcrew.com':'PURPLE DIAMOND CREW','cryptoworldz.xyz':'CRYPTOWORLDZ',
    'ethworldz.xyz':'ETHWORLDZ','baseworldz.xyz':'BASEWORLDZ','bnbworldz.xyz':'BNBWORLDZ','xrpworldz.xyz':'XRPWORLDZ','suiworldz.xyz':'SUIWORLDZ','hyperworldz.xyz':'HYPERWORLDZ','robinworldz.xyz':'ROBINWORLDZ','bitcoinworldz.xyz':'BITCOINWORLDZ','bitworldz.xyz':'BITWORLDZ','hodlerworldz.xyz':'HODLERWORLDZ','impactbased.oneworldz.com':'IMPACTBASED'
  };
  const title=names[host]||'CRYPTOWORLDZ';
  const apply=()=>{
    const brand=document.querySelector('#brand-title');
    const sub=document.querySelector('#brand-subtitle');
    const nav=document.querySelector('#main-nav');
    if(brand)brand.textContent=title;
    if(sub)sub.textContent='ONE WORLD • ONE MISSION • HELPING PEOPLE';
    if(nav){
      const home=[...nav.querySelectorAll('a')].find(a=>a.textContent.trim()==='Home');
      if(home)home.href=`https://${host}`;
      const impact=[...nav.querySelectorAll('a')].find(a=>a.textContent.trim()==='Visit ImpactBased');
      if(impact){impact.href='https://impactbased.oneworldz.com';impact.target='_blank';impact.rel='noopener noreferrer';}
    }
  };
  apply();
  const o=new MutationObserver(apply);o.observe(document.body,{subtree:true,childList:true});setTimeout(()=>o.disconnect(),7000);
})();

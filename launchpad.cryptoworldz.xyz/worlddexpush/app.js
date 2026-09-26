const TOKENS=[
 {name:'WORLDZ',symbol:'WLDZ',chain:'solana',mint:'AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U'},
 {name:'REVIVE',symbol:'RVIV',chain:'solana',mint:'DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R'}
];

const mark=(ok,label)=>'<span class="'+(ok?'pass':'wait')+'">'+(ok?'✅':'⏳')+' '+label+'</span>';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function json(url){
 const r=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});
 if(!r.ok) throw new Error('HTTP '+r.status);
 return r.json();
}

async function inspect(t){
 const result={token:t,jupiter:null,dex:null,error:[]};
 try{
   const rows=await json('https://api.jup.ag/tokens/v2/search?query='+encodeURIComponent(t.mint));
   result.jupiter=Array.isArray(rows)?(rows.find(x=>x.id===t.mint||x.address===t.mint)||rows[0]||null):null;
 }catch(e){result.error.push('Jupiter: '+e.message)}
 try{
   const rows=await json('https://api.dexscreener.com/token-pairs/v1/'+encodeURIComponent(t.chain)+'/'+encodeURIComponent(t.mint));
   result.dex=Array.isArray(rows)?rows:[];
 }catch(e){result.error.push('DEX Screener: '+e.message)}
 return result;
}

function renderRow(r){
 const j=r.jupiter||{}, pairs=r.dex||[];
 const dexIdentity=pairs.some(p=>p.baseToken?.address===r.token.mint&&p.baseToken?.name===r.token.name&&p.baseToken?.symbol===r.token.symbol);
 const dexPrice=pairs.some(p=>p.priceUsd!=null);
 const jName=j.name===r.token.name,jSymbol=j.symbol===r.token.symbol,jLogo=!!(j.icon||j.logoURI),jPrice=j.usdPrice!=null;
 const indexed=!!r.jupiter;
 const dexIndexed=pairs.length>0;
 const state=(jName&&jSymbol&&jLogo&&jPrice&&dexIndexed&&dexPrice)?'ALL GREEN':'UPSTREAM WORK REMAINS';
 return `<article class="status-card">
   <div class="rowhead"><div><b>${esc(r.token.name)} • $${esc(r.token.symbol)}</b><small>${esc(r.token.mint)}</small></div><strong>${state}</strong></div>
   <div class="checks">
     ${mark(jName,'Jupiter NAME')}
     ${mark(jSymbol,'Jupiter SYMBOL')}
     ${mark(jLogo,'Jupiter LOGO')}
     ${mark(jPrice,'Jupiter PRICE')}
     ${mark(indexed,'Jupiter INDEXED')}
     ${mark(dexIdentity,'DEX NAME + SYMBOL')}
     ${mark(dexPrice,'DEX PRICE')}
     ${mark(dexIndexed,'DEX INDEXED')}
   </div>
   <p>Jupiter API: ${indexed?esc((j.name||'blank')+' / '+(j.symbol||'blank')):'not returned'} • DEX pairs: ${pairs.length}</p>
   ${r.error.length?'<p class="err">'+r.error.map(esc).join(' • ')+'</p>':''}
 </article>`;
}

async function run(){
 const root=document.querySelector('#live-status'),btn=document.querySelector('#refresh-status');
 btn.disabled=true;btn.textContent='Checking upstream…';root.innerHTML='<p>Reading Jupiter and DEX Screener…</p>';
 const rows=await Promise.all(TOKENS.map(inspect));
 root.innerHTML=rows.map(renderRow).join('');
 document.querySelector('#checked-at').textContent='Checked '+new Date().toLocaleString();
 btn.disabled=false;btn.textContent='Refresh upstream status';
}
document.querySelector('#refresh-status')?.addEventListener('click',run);
run();

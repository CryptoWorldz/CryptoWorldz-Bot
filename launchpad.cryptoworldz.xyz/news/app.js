(()=>{"use strict";
const $=s=>document.querySelector(s);
const FILTERS=["ALL","XRP","SOL","BTC","ETH","BASE","SUI","HYPER","ROBINHOOD","DEFI","SECURITY","BUILDERS","WORLDZ"];
let items=[],active="ALL";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function when(x){if(!x)return"Time unavailable";const d=new Date(x);return Number.isNaN(d.getTime())?"Time unavailable":d.toLocaleString();}
function renderFilters(){const root=$("#filters");root.innerHTML=FILTERS.map(x=>'<button type="button" data-filter="'+x+'" class="'+(x===active?"active":"")+'">'+x+'</button>').join("");}
function render(){
  renderFilters();
  const list=active==="ALL"?items:items.filter(x=>x.topic===active);
  $("#status").textContent=list.length?list.length+" headline"+(list.length===1?"":"s")+" shown • refreshes from the source feed":"No matching live headlines right now.";
  $("#feed").innerHTML=list.map(x=>'<a class="story" target="_blank" rel="noopener noreferrer" href="'+esc(x.url)+'"><span class="src">'+esc(x.source)+'</span><span><b>'+esc(x.title)+'</b><small>'+esc(when(x.publishedAt))+' • '+esc(x.sourceClass)+'</small></span><span class="topic">'+esc(x.topic)+'</span></a>').join("");
}
async function load(){
 try{
   const r=await fetch("/newswire.php?_="+Date.now(),{cache:"no-store"});
   if(!r.ok)throw new Error("HTTP "+r.status);
   const j=await r.json();
   items=Array.isArray(j.items)?j.items:[];
   $("#sources").innerHTML=(j.sources||[]).map(x=>'<a class="source" target="_blank" rel="noopener noreferrer" href="'+esc(x.url)+'"><b>'+esc(x.name)+'</b><small>'+esc(x.topic)+" • "+esc(x.class)+'</small></a>').join("");
   render();
 }catch(e){$("#status").textContent="NewsWire source refresh unavailable. Original-source links remain available.";$("#feed").innerHTML='<div class="notice">No headline is shown as current unless the source feed actually returned it.</div>';}
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;active=b.dataset.filter;render();});
document.addEventListener("DOMContentLoaded",()=>{renderFilters();load();setInterval(load,120000);});
})();
const fmt=n=>new Intl.NumberFormat("en-AU").format(n);
const grid=document.querySelector("#token-grid");

function card(t){
  const rw=t.reward_weighting_percent;
  return `
  <article class="token-card" style="--accent:${t.accent||"#a24cff"}">
    <div class="token-number">#${String(t.number).padStart(3,"0")} • PLANNED</div>
    <h3>${t.name} <span class="ticker">$${t.ticker}</span></h3>
    <div class="supply">${fmt(t.fixed_supply)}</div>
    <div class="mission">${t.mission}</div>
    <div class="token-meta">
      <span>Fixed supply</span>
      <span>25/25/25/25</span>
      <span>1% Legacy</span>
      <span>${rw.proportional}/${rw.equalizer} Equalizer</span>
    </div>
  </article>`;
}

async function boot(){
  try{
    const res=await fetch("/tokens.json",{cache:"no-store"});
    if(!res.ok) throw new Error("registry "+res.status);
    const registry=await res.json();
    if(registry.status!=="candidate-mainnet-disabled" || registry.shared.mainnet_authorized!==false){
      throw new Error("release gate mismatch");
    }
    grid.innerHTML=registry.tokens.map(card).join("");
    document.documentElement.dataset.registryVersion=registry.version;
  }catch(err){
    console.error(err);
    grid.innerHTML='<article class="token-card"><h3>Registry unavailable</h3><div class="mission">Launch data is fail-closed until the verified registry can be loaded.</div></article>';
  }
}
boot();

let runtime=null,capabilities=null,treasuries=null,readAdapters=null,storagePolicy=null,providerBindings=null,deferredInstall=null;
const qs=s=>document.querySelector(s),qsa=s=>[...document.querySelectorAll(s)];
const escapeHtml=value=>String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
function toast(message){const el=qs("#toast");el.textContent=message;el.classList.add("show");clearTimeout(window.__worldzToast);window.__worldzToast=setTimeout(()=>el.classList.remove("show"),2500)}
function stateClass(state){return /BUILT|EXISTING|FOUNDATION/.test(state)?"good":/PLANNED|RESEARCH|GATED|PENDING/.test(state)?"warn":""}
async function json(url){const response=await fetch(url,{cache:"no-store"});if(!response.ok)throw new Error("Could not load "+url);return response.json()}
function renderModules(){
  qs("#module-count").textContent=runtime.modules.length;
  qs("#module-grid").innerHTML=runtime.modules.map(module=>{
    const href=module.route;
    const action=href?'<a class="btn module-action" href="'+escapeHtml(href)+'">Open module</a>':'<span class="btn module-action disabled">Integration planned</span>';
    return '<article class="card"><span>'+escapeHtml(module.id.toUpperCase())+'</span><h3>'+escapeHtml(module.brand)+'</h3><p>'+escapeHtml(module.authority.replaceAll("_"," "))+'</p><div class="meta"><span class="chip '+stateClass(module.state)+'">'+escapeHtml(module.state.replaceAll("_"," "))+'</span></div>'+action+'</article>'
  }).join("");
}
function renderTreasuries(){
  qs("#treasury-count").textContent=treasuries.profiles.length;
  qs("#treasury-grid").innerHTML=treasuries.profiles.map(profile=>'<article class="card"><span>'+escapeHtml(profile.id.toUpperCase())+'</span><h3>'+escapeHtml(profile.label)+'</h3><div class="treasury-rule">'+escapeHtml(profile.governance.display)+'</div><p>'+escapeHtml(profile.state.replaceAll("_"," "))+'</p><div class="meta"><span class="chip '+(profile.mainnetExecution?"good":"warn")+'">Mainnet '+(profile.mainnetExecution?"enabled":"off")+'</span></div></article>').join("");
}

function renderAdapters(){
  qs("#adapter-grid").innerHTML=readAdapters.adapters.map(adapter=>{const provider=providerBindings.providers.find(item=>item.chain===adapter.id);return '<article class="card"><span>'+escapeHtml(adapter.family)+'</span><h3>'+escapeHtml(adapter.id.toUpperCase())+'</h3><p>'+escapeHtml(adapter.custody)+'</p><div class="meta"><span class="chip '+stateClass(adapter.state)+'">'+escapeHtml(adapter.state.replaceAll("_"," "))+'</span><span class="chip">'+(adapter.execution?"EXECUTION":"READ ONLY")+'</span></div><p>'+escapeHtml(adapter.plannedReads.join(" • "))+'</p></article>').join("");
}
function renderSecurity(){
  const treasury=capabilities.modules.treasury;
  const checks=[
    ["Default capability policy",capabilities.default],
    ["Treasury mainnet broadcast",treasury.broadcast_mainnet],
    ["Treasury bridge execution",treasury.bridge_assets],
    ["Treasury automatic swap",treasury.swap_assets],
    ["Treasury signer change",treasury.change_signers],
    ["App-level mainnet broadcast",runtime.security.mainnetBroadcastEnabled],
    ["Automatic bridge",runtime.security.automaticBridgeEnabled],
    ["Automatic investment",runtime.security.automaticInvestmentEnabled]
  ];
  qs("#security-list").innerHTML=checks.map(([name,value])=>'<div class="security-row"><span>'+escapeHtml(name)+'</span><b class="'+(value===true?"allow":"deny")+'">'+escapeHtml(value===false?"DENY":String(value))+'</b></div>').join("");
  qs("#chain-count").textContent=Object.keys(capabilities.chains).length;
}
async function boot(){
  try{
    [runtime,capabilities,treasuries,readAdapters,storagePolicy,providerBindings]=await Promise.all([
      json("/worldz-app/config.json"),
      json("/worldz-app/core/capability-registry.json"),
      json("/worldz-app/core/treasury-profiles.json"),
      json("/worldz-app/core/read-adapter-registry.json"),
      json("/worldz-app/core/storage-policy.json"),
      json("/worldz-app/core/provider-bindings.json")
    ]);
    renderModules();renderTreasuries();renderAdapters();renderSecurity();
    qs("#core-state").textContent="Core loaded • mainnet off";qs("#core-state").classList.add("good");
  }catch(error){qs("#core-state").textContent="Core load error";toast(error.message)}
}
qsa(".tab").forEach(tab=>tab.addEventListener("click",()=>{qsa(".tab").forEach(x=>x.classList.remove("active"));qsa(".panel").forEach(x=>x.classList.remove("active"));tab.classList.add("active");qs("#"+tab.dataset.panel).classList.add("active")}));
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstall=event;qs("#install-app").hidden=false});
qs("#install-app").addEventListener("click",async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;qs("#install-app").hidden=true});
window.addEventListener("appinstalled",()=>toast("WorldzApp installed."));
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/worldz-app/service-worker.js").catch(()=>{}));
boot();
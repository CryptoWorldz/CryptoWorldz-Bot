let runtime=null,capabilities=null,treasuries=null,readAdapters=null,storagePolicy=null,walletConnectors=null,deferredInstall=null;
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
  qs("#adapter-grid").innerHTML=readAdapters.adapters.map(adapter=>'<article class="card"><span>'+escapeHtml(adapter.family)+'</span><h3>'+escapeHtml(adapter.id.toUpperCase())+'</h3><p>'+escapeHtml(adapter.custody)+'</p><div class="meta"><span class="chip '+stateClass(adapter.state)+'">'+escapeHtml(adapter.state.replaceAll("_"," "))+'</span><span class="chip">'+(adapter.execution?"EXECUTION":"READ ONLY")+'</span></div><p>'+escapeHtml(adapter.plannedReads.join(" • "))+'</p></article>').join("");
}
function shortAddress(value){const text=String(value||"");return text.length>18?text.slice(0,8)+"…"+text.slice(-7):text}
function renderConnections(){
  const api=window.WorldzWalletConnect;
  const detected=api?api.detected():{solana:false,evm:false};
  const session=api?api.loadSession():{walletConnections:[]};
  const live=session.walletConnections||[];
  qs("#connection-summary").innerHTML='<b>'+live.length+'</b><span>connected public wallet session'+(live.length===1?"":"s")+' • session-only by default • signing disabled</span>';
  qs("#connection-grid").innerHTML=walletConnectors.connectors.map(connector=>{
    const chain=connector.family==="SOLANA"?"solana":connector.family==="EVM"?"evm":connector.family.toLowerCase();
    const current=live.find(item=>item.chain===chain);
    const available=connector.id==="solana_injected"?detected.solana:connector.id==="evm_eip1193"?detected.evm:false;
    const connectable=connector.id==="solana_injected"||connector.id==="evm_eip1193";
    let action='<span class="btn module-action disabled">Adapter planned</span>';
    if(connectable&&current) action='<button class="btn module-action" type="button" data-wallet-action="disconnect" data-connector="'+escapeHtml(connector.id)+'">Disconnect</button>';
    else if(connectable&&available) action='<button class="btn primary module-action" type="button" data-wallet-action="connect" data-connector="'+escapeHtml(connector.id)+'">Connect wallet</button>';
    else if(connectable) action='<span class="btn module-action disabled">Wallet not detected</span>';
    return '<article class="card"><span>'+escapeHtml(connector.family)+'</span><h3>'+escapeHtml(connector.label)+'</h3><p>'+escapeHtml(connector.standard.replaceAll("_"," "))+'</p><div class="meta"><span class="chip '+stateClass(connector.state)+'">'+escapeHtml(connector.state.replaceAll("_"," "))+'</span><span class="chip">NO SIGNING</span></div>'+(current?'<div class="wallet-address"><b>'+escapeHtml(shortAddress(current.publicAddress))+'</b><small>'+escapeHtml(current.provider)+(current.network?" • "+escapeHtml(current.network):"")+'</small></div>':'<p>Public address appears here only after you approve the connection in your wallet.</p>')+action+'</article>'
  }).join("");
  qsa("[data-wallet-action]").forEach(button=>button.addEventListener("click",async()=>{
    const id=button.dataset.connector, action=button.dataset.walletAction;
    try{
      button.disabled=true;
      if(action==="connect"){
        if(id==="solana_injected") await api.connectSolana();
        else if(id==="evm_eip1193") await api.connectEvm();
        toast("External wallet connected • signing remains disabled");
      }else{
        const current=(api.loadSession().walletConnections||[]).find(item=>(id==="solana_injected"&&item.chain==="solana")||(id==="evm_eip1193"&&item.chain==="evm"));
        if(current) await api.disconnect(current.chain,current.provider);
        toast("Wallet removed from WorldzApp session");
      }
      renderConnections();
    }catch(error){toast(error.message||"Wallet connection failed");renderConnections()}
  }));
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
    [runtime,capabilities,treasuries,readAdapters,storagePolicy,walletConnectors]=await Promise.all([
      json("/worldz-app/config.json"),
      json("/worldz-app/core/capability-registry.json"),
      json("/worldz-app/core/treasury-profiles.json"),
      json("/worldz-app/core/read-adapter-registry.json"),
      json("/worldz-app/core/storage-policy.json"),
      json("/worldz-app/core/wallet-connectors.json")
    ]);
    renderModules();renderTreasuries();renderAdapters();renderConnections();renderSecurity();
    qs("#core-state").textContent="Stage 3 core loaded • mainnet off";qs("#core-state").classList.add("good");
  }catch(error){qs("#core-state").textContent="Core load error";toast(error.message)}
}
qsa(".tab").forEach(tab=>tab.addEventListener("click",()=>{qsa(".tab").forEach(x=>x.classList.remove("active"));qsa(".panel").forEach(x=>x.classList.remove("active"));tab.classList.add("active");qs("#"+tab.dataset.panel).classList.add("active")}));
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstall=event;qs("#install-app").hidden=false});
qs("#install-app").addEventListener("click",async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;qs("#install-app").hidden=true});
window.addEventListener("appinstalled",()=>toast("WorldzApp installed."));
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/worldz-app/service-worker.js").catch(()=>{}));
boot();
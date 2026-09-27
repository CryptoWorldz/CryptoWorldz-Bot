let config=null;let deferredInstall=null;
const qs=s=>document.querySelector(s),qsa=s=>[...document.querySelectorAll(s)];
function toast(message){const el=qs("#toast");el.textContent=message;el.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),2600)}
function stateClass(state){return /READY|CONFIRMED|VERIFIED/.test(state)?"good":/PENDING|PLANNED|RESEARCH|NOT_DEPLOYED/.test(state)?"warn":""}
async function loadConfig(){
  const res=await fetch("/miracle-wallet/config.json",{cache:"no-store"});if(!res.ok)throw new Error("Config unavailable");config=await res.json();
  qs("#miracle-state").textContent=config.miracleTreasury.mainnetState.replaceAll("_"," ");
  qs("#chain-grid").innerHTML=config.chains.map(chain=>`<article class="card"><span>${chain.label.toUpperCase()}</span><h3>${chain.provider}</h3><p>Chain-native custody adapter.</p><span class="state ${stateClass(chain.state)}">${chain.state.replaceAll("_"," ")}</span></article>`).join("");
  const confirmed=config.miracleTreasury.confirmedPublicSigners.map(s=>`<article class="card accent"><span>CONFIRMED SIGNER</span><h3>${s.label}</h3><p class="signer-address">${s.address}</p><span class="state good">${s.status}</span></article>`).join("");
  const pending=config.miracleTreasury.privateSignerSlots.map(s=>`<article class="card"><span>CHURCH SIGNER SLOT ${s.slot}</span><h3>Consent + address pending</h3><p>Public wallet-to-person association stays private until the signer consents.</p><span class="state warn">${s.status.replaceAll("_"," ")}</span></article>`).join("");
  qs("#signer-grid").innerHTML=confirmed+pending;
}
qsa(".tab").forEach(tab=>tab.addEventListener("click",()=>{qsa(".tab").forEach(x=>x.classList.remove("active"));qsa(".panel").forEach(x=>x.classList.remove("active"));tab.classList.add("active");qs("#"+tab.dataset.target).classList.add("active");}));
qs("#proposal-form").addEventListener("submit",event=>{event.preventDefault();const form=new FormData(event.currentTarget);const draft={schema:"WORLDZ-TREASURY-PROPOSAL-DRAFT-V1",createdAt:new Date().toISOString(),treasury:form.get("treasury"),chain:form.get("chain"),action:form.get("action"),asset:form.get("asset")||null,amount:form.get("amount")||null,destination:form.get("destination")||null,reason:form.get("reason")||null,execution:"DISABLED_FOUNDATION_MODE",requiredNext:["validate canonical treasury","validate destination","simulate exact transaction","human review","collect chain-native multisig threshold","WorldzProof final-state reconciliation"]};qs("#proposal-preview").textContent=JSON.stringify(draft,null,2);toast("Review draft created — nothing was signed or sent.");});
qs("#proposal-form").addEventListener("reset",()=>setTimeout(()=>qs("#proposal-preview").textContent="No proposal drafted.",0));
qs("#connect-signer").addEventListener("click",async()=>{if(window.solana?.connect){try{const response=await window.solana.connect();const key=response?.publicKey?.toString?.()||window.solana.publicKey?.toString?.();toast(key?"Signer connected: "+key.slice(0,6)+"…"+key.slice(-4):"Solana signer connected");}catch{toast("Signer connection cancelled.");}}else{toast("No injected Solana wallet found. Mobile WalletConnect adapter is the next build stage.");}});
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstall=event;qs("#install-app").hidden=false});
qs("#install-app").addEventListener("click",async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;qs("#install-app").hidden=true});
window.addEventListener("appinstalled",()=>toast("WorldzMiracleWallet installed."));
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/miracle-wallet/service-worker.js").catch(()=>{}));
loadConfig().catch(err=>{qs("#miracle-state").textContent="CONFIG LOAD ERROR";toast(err.message)});

(()=>{
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat('en-AU',{maximumFractionDigits:4}).format(Number(n)||0);
const feeColors=['#a74cff','#5d8bff','#38e3b0','#ffd166','#ff759c','#b66cff'];
let registry=null,details=null,mainnet=null,platform=null,selected='WLDZ',walletProvider=null,lastManifest=null;
const build={chain:'solana',engine:'flash',quote:'SOL'};

const gateLabels={
 preMainnetExecutionProofPassed:'Pre-mainnet execution proof',
 onlyBFeeClaimProofPassed:'Quote-side fee-claim proof',
 autoRouteProofPassed:'AUTO route accounting proof',
 holderNativeSolProofPassed:'Native-SOL holder reward proof',
 lpGrowthProofPassed:'LP-growth proof',
 buybackBurnProofPassed:'Buyback / burn proof',
 charityNativeSolProofPassed:'Impact route proof',
 atomicRollbackProofPassed:'Atomic rollback / fail-closed proof',
 vanityMintPublicAddressFinal:'Final WLDZ mint public address',
 multisigAndDestinationsVerified:'Multisig + destination addresses verified',
 graceTimeEnforcedVestingVerified:'Time-enforced vesting verified',
 productionRpcAndClusterVerified:'Production RPC + cluster verified',
 mainnetLiquidityFundingApproved:'Mainnet liquidity funding approved',
 austracPositionResolved:'AUSTRAC position resolved',
 asicPositionResolved:'ASIC position resolved',
 tokenDisclosuresReviewed:'Token / service disclosures reviewed',
 independentSecurityReviewComplete:'Independent security review complete',
 accountingRecordkeepingRunbookApproved:'Accounting / recordkeeping runbook approved',
 incidentRecoveryRunbookApproved:'Incident / recovery runbook approved',
 finalLaunchHumanAuthorizationRecorded:'Final human launch authorization recorded'
};

function humanKey(k){return String(k).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());}
function tokenByTicker(t){return registry.tokens.find(x=>x.ticker===t);}
function setDot(id,state){const el=$(id);if(!el)return;el.className='state-dot '+(state==='healthy'?'good':state==='gateway'||state==='protected'?'warn':state==='missing'||state==='degraded'?'bad':'idle');}
function step(n){
  $$('.wizard-step').forEach(x=>x.classList.toggle('active',x.dataset.panel===String(n)));
  $$('.step-tab').forEach(x=>x.classList.toggle('active',x.dataset.step===String(n)));
  const target=$('.builder'); if(target&&window.innerWidth<720)target.scrollIntoView({behavior:'smooth',block:'start'});
}
function selectChoice(group,el,key,value){
  $$(group+' .choice').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');build[key]=value;
}
function renderMarket(){
  $('#launch-market').innerHTML=registry.tokens.map(t=>{
    const d=details.tokens[t.ticker];
    return `<button class="market-card" data-market="${t.ticker}">
      <span class="market-num">#${String(t.number).padStart(3,'0')}</span>
      <div><strong>${t.name}</strong><em>$${t.ticker}</em><small>${d.launchStatus.replaceAll('-',' ').toUpperCase()}</small></div>
      <div class="market-stat"><span>Supply</span><b>${fmt(t.fixed_supply)}</b></div>
      <div class="market-stat"><span>Legacy</span><b>1%</b></div>
      <span class="arrow">→</span>
    </button>`;
  }).join('');
  $$('[data-market]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.market;renderToken();location.hash='genesis';}));
}
function renderSwitcher(){
  $('#token-switcher').innerHTML=registry.tokens.map(t=>`<button class="token-tab ${t.ticker===selected?'active':''}" type="button" data-token="${t.ticker}"><b>#${String(t.number).padStart(3,'0')} ${t.name}</b><span>$${t.ticker} • ${fmt(t.fixed_supply)}</span></button>`).join('');
  $$('#token-switcher .token-tab').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.token;renderToken();}));
}
function renderToken(){
  const t=tokenByTicker(selected),d=details.tokens[selected]; if(!t||!d)return;
  renderSwitcher();
  $('#token-number').textContent='#'+String(t.number).padStart(3,'0');
  $('#token-name').textContent=t.name;$('#token-ticker').textContent='$'+t.ticker;$('#token-supply').textContent=fmt(t.fixed_supply);
  $('#token-mission').textContent=d.mission;
  $('#token-facts').innerHTML=d.facts.map(x=>'<span>'+x+'</span>').join('');
  const alloc=Object.entries(t.allocations);
  $('#allocation-master').innerHTML=alloc.map(([k,v])=>`<div class="alloc-quarter"><strong>${v}%</strong><span>${d.allocationLabels[k]||humanKey(k)}</span></div>`).join('');
  $('#suballocations').innerHTML=alloc.map(([k])=>`<div class="sub-group"><h4>${d.allocationLabels[k]||humanKey(k)}</h4>${(d.suballocations[k]||[]).map(x=>`<div class="sub-row"><span>${x[0]}</span><b>${x[1]}%</b></div>`).join('')}</div>`).join('');
  const fees=Object.entries(t.fee_split_percent);
  $('#fee-bar').innerHTML=fees.map(([k,v],i)=>`<span class="fee-segment" title="${humanKey(k)} ${v}%" style="width:${v}%;background:${feeColors[i%feeColors.length]}"></span>`).join('');
  $('#fee-legend').innerHTML=fees.map(([k,v],i)=>`<div class="fee-item"><span class="fee-swatch" style="background:${feeColors[i%feeColors.length]}"></span><span>${humanKey(k)}</span><b>${v}%</b></div>`).join('');
  $('#token-state').textContent=selected==='WLDZ'?'MAINNET LOCKED':'SEQUENCED / LOCKED';
}
function renderProof(){
  const r=mainnet.readiness;
  const keys=['preMainnetExecutionProofPassed','onlyBFeeClaimProofPassed','autoRouteProofPassed','holderNativeSolProofPassed','lpGrowthProofPassed','buybackBurnProofPassed','charityNativeSolProofPassed','atomicRollbackProofPassed'];
  $('#proof-list').innerHTML=keys.map(k=>`<div class="proof-row"><span class="ok">${r[k]?'✓':'×'}</span><span>${gateLabels[k]} — <b>${r[k]?'PASS':'NOT PROVEN'}</b></span></div>`).join('');
  const entries=Object.entries(r),green=entries.filter(([,v])=>v===true).length,blocked=entries.length-green;
  $('#gate-title').textContent='WLDZ — '+green+' of '+entries.length+' readiness controls green';
  $('#gate-copy').textContent='Engineering proof and public mainnet authorization are separate. Any unresolved production control remains red.';
  $('#green-count').textContent=green;$('#blocked-count').textContent=blocked;$('#gate-meter-fill').style.width=((green/entries.length)*100).toFixed(1)+'%';
  $('#gate-grid').innerHTML=entries.map(([k,v])=>`<div class="gate-item ${v?'pass':'block'}"><span class="mark">${v?'✓':'×'}</span><span>${gateLabels[k]||humanKey(k)}</span></div>`).join('');
}
function feeMath(){
  const fee=Number($('#project-fee').value)||0,vol=Math.max(0,Number($('#example-volume').value)||0);
  const gross=vol*(fee/100),worldz=gross*(platform.feePolicy.worldzLaunchPadShareOfCollectedProjectFeePercent/100),project=gross-worldz;
  $('#project-fee-value').textContent=fee.toFixed(2)+'%';
  $('#gross-fee').textContent=fmt(gross);$('#worldz-fee').textContent=fmt(worldz);$('#project-pool').textContent=fmt(project);
  const total=$$('.route-input').reduce((s,x)=>s+(Number(x.value)||0),0);
  $('#route-total').textContent=total.toFixed(0)+'%';$('#route-total').className='pill '+(Math.abs(total-100)<.001?'safe':'locked');
}
function currentRoutes(){
  const out={};$$('.route-input').forEach(x=>out[x.dataset.route]=Number(x.value)||0);return out;
}
function manifestBase(){
  return {
    schema:'worldzlaunchpad.launch-intent.v1',
    platformVersion:platform.version,
    network:build.chain,
    launchEngine:build.engine,
    token:{
      name:$('#build-name').value.trim(),
      symbol:$('#build-symbol').value.trim().toUpperCase(),
      fixedSupply:Number($('#build-supply').value),
      decimals:Number($('#build-decimals').value),
      description:$('#build-description').value.trim(),
      revokeMintAuthorityAfterInitialMint:$('#fixed-supply').checked,
      freezeAuthority:false
    },
    quoteAsset:build.quote,
    feePolicy:{
      projectTradingFeePercent:Number($('#project-fee').value),
      worldzLaunchPadShareOfCollectedProjectFeePercent:platform.feePolicy.worldzLaunchPadShareOfCollectedProjectFeePercent,
      projectDistributionPercent:currentRoutes(),
      walletTransferTax:false
    },
    execution:{
      requestedEnvironment:'devnet',
      custody:'self-custody',
      simulateBeforeSign:true,
      publicMainnetCreatorLaunch:false
    }
  };
}
async function sha256(text){
  const bytes=new TextEncoder().encode(text),hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function runPreflight(){
  const m=manifestBase(),routes=Object.values(m.feePolicy.projectDistributionPercent).reduce((a,b)=>a+b,0);
  const checks=[
    ['Chain selected',!!m.network,m.network],
    ['Executable public test adapter',m.network==='solana',m.network==='solana'?'Solana Devnet':'Adapter not enabled yet'],
    ['Launch engine selected',!!m.launchEngine,m.launchEngine],
    ['Token name',m.token.name.length>=2,m.token.name||'Missing'],
    ['Ticker',/^[A-Z0-9_$]{2,10}$/.test(m.token.symbol),m.token.symbol||'Missing'],
    ['Fixed supply',Number.isInteger(m.token.fixedSupply)&&m.token.fixedSupply>0,fmt(m.token.fixedSupply)],
    ['Decimals',Number.isInteger(m.token.decimals)&&m.token.decimals>=0&&m.token.decimals<=9,String(m.token.decimals)],
    ['Project trading fee',m.feePolicy.projectTradingFeePercent>=.5&&m.feePolicy.projectTradingFeePercent<=4,m.feePolicy.projectTradingFeePercent.toFixed(2)+'%'],
    ['Distribution routes = 100%',Math.abs(routes-100)<.001,routes.toFixed(0)+'%'],
    ['Worldz platform rule',m.feePolicy.worldzLaunchPadShareOfCollectedProjectFeePercent===10,'10% of collected project fee revenue'],
    ['Wallet transfer tax',m.feePolicy.walletTransferTax===false,'OFF'],
    ['Mainnet creator execution',m.execution.publicMainnetCreatorLaunch===false,'LOCKED']
  ];
  $('#preflight-grid').innerHTML=checks.map(([label,ok,detail])=>`<div class="preflight ${ok?'pass':'fail'}"><span>${ok?'✓':'×'}</span><div><b>${label}</b><small>${detail}</small></div></div>`).join('');
  const all=checks.every(x=>x[1]);
  const canonical=JSON.stringify(m);
  const hash=await sha256(canonical);m.intentHash=hash;m.createdAt=new Date().toISOString();lastManifest=m;
  $('#manifest-id').textContent=hash.slice(0,16).toUpperCase();
  $('#manifest-preview').textContent=JSON.stringify(m,null,2);
  $('#download-manifest').disabled=!all;
  const link=$('#devnet-launch-link');
  if(all&&m.network==='solana'){
    const q=new URLSearchParams({name:m.token.name,symbol:m.token.symbol,supply:String(m.token.fixedSupply),decimals:String(m.token.decimals),fixed:m.token.revokeMintAuthorityAfterInitialMint?'1':'0',engine:m.launchEngine,quote:m.quoteAsset,fee:String(m.feePolicy.projectTradingFeePercent),intent:hash});
    link.href='/devnet/?'+q.toString();link.classList.remove('disabled-link');link.setAttribute('aria-disabled','false');
  }else{link.href='/devnet/';link.classList.add('disabled-link');link.setAttribute('aria-disabled','true');}
  return all;
}
function downloadManifest(){
  if(!lastManifest)return;
  const blob=new Blob([JSON.stringify(lastManifest,null,2)+'\n'],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(lastManifest.token.symbol||'WORLDZ')+'-worldzlaunchpad-manifest.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function getWalletProvider(){return [window.phantom&&window.phantom.solana,window.solflare,window.solana].filter(Boolean).find(p=>typeof p.connect==='function')||null;}
async function connectWallet(){
  walletProvider=getWalletProvider();
  if(!walletProvider){alert('No injected Solana wallet detected. On mobile, open this page inside Phantom or Solflare.');return;}
  try{
    const response=await walletProvider.connect();const key=(response&&response.publicKey)||walletProvider.publicKey;
    if(!key)throw new Error('No public key returned');const address=key.toString();$('#wallet-mini').textContent=address.slice(0,4)+'…'+address.slice(-4);$('#wallet-mini').classList.add('connected');
  }catch{}
}
function renderRuntimeStatus(data){
  const z=data.zed||{},a=data.auto||{},g=data.grace||{};
  setDot('#zed-dot',z.state);setDot('#auto-dot',a.state);setDot('#grace-dot',g.state);
  $('#zed-state').textContent=z.state==='healthy'?'ZED Runtime Healthy':z.state==='gateway'?'ZED Gateway Healthy':'ZED Status '+(z.state||'unknown');
  $('#zed-detail').textContent=(z.service||'Public gateway')+(z.runtime?' • '+z.runtime:'');
  $('#auto-state').textContent=a.state==='healthy'?'AUTO Healthy':a.state==='protected'?'AUTO Protected':'AUTO '+(a.state||'unknown');
  $('#auto-detail').textContent='HTTP '+(a.code||0)+' • protected actions stay outside this browser';
  $('#grace-state').textContent=g.state==='healthy'?'G.R.A.C.E. Healthy':g.state==='protected'?'G.R.A.C.E. Protected':'G.R.A.C.E. '+(g.state||'unknown');
  $('#grace-detail').textContent=(g.service||'HTTP '+(g.code||0))+(g.posting?' • '+g.posting:'');
  $('#runtime-notice').textContent='Read-only runtime probe updated '+new Date().toLocaleTimeString()+'. Unknown or protected is never silently treated as green.';
}
async function refreshRuntime(){
  const b=$('#refresh-runtime');b.disabled=true;b.textContent='Checking…';
  try{const r=await fetch('/status.php?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error();renderRuntimeStatus(await r.json());}
  catch{['#zed-dot','#auto-dot','#grace-dot'].forEach(x=>setDot(x,'degraded'));$('#runtime-notice').textContent='Runtime status unavailable. Treated as unknown, not green.';}
  finally{b.disabled=false;b.textContent='Refresh Runtime';}
}
function bind(){
  $$('.next-step').forEach(b=>b.addEventListener('click',()=>step(b.dataset.next)));
  $$('.prev-step').forEach(b=>b.addEventListener('click',()=>step(b.dataset.prev)));
  $$('.step-tab').forEach(b=>b.addEventListener('click',()=>step(b.dataset.step)));
  $$('#chain-grid .choice').forEach(b=>b.addEventListener('click',()=>selectChoice('#chain-grid',b,'chain',b.dataset.chain)));
  $$('#engine-grid .choice').forEach(b=>b.addEventListener('click',()=>selectChoice('#engine-grid',b,'engine',b.dataset.engine)));
  $$('.quote').forEach(b=>b.addEventListener('click',()=>{$$('.quote').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');build.quote=b.dataset.quote;$('#wxrp-proof').classList.toggle('show',build.quote==='wXRP');}));
  $('#project-fee').addEventListener('input',feeMath);$('#example-volume').addEventListener('input',feeMath);$$('.route-input').forEach(x=>x.addEventListener('input',feeMath));
  $('#run-preflight').addEventListener('click',runPreflight);$('#download-manifest').addEventListener('click',downloadManifest);
  $('#wallet-mini').addEventListener('click',connectWallet);$('#refresh-runtime').addEventListener('click',refreshRuntime);
  $('#devnet-launch-link').addEventListener('click',e=>{if(e.currentTarget.getAttribute('aria-disabled')==='true')e.preventDefault();});
}
async function boot(){
  try{
    const [a,b,c,d]=await Promise.all([
      fetch('/tokens.json?v=20260920-platform-v3',{cache:'no-store'}),
      fetch('/console-data.json?v=20260920-platform-v3',{cache:'no-store'}),
      fetch('/wldz-mainnet-plan.json?v=20260920-platform-v3',{cache:'no-store'}),
      fetch('/platform-config.json?v=20260920-platform-v3',{cache:'no-store'})
    ]);
    if(!a.ok||!b.ok||!c.ok||!d.ok)throw new Error('Launch data unavailable');
    registry=await a.json();details=await b.json();mainnet=await c.json();platform=await d.json();
    if(registry.status!=='candidate-mainnet-disabled'||registry.shared.mainnet_authorized!==false||mainnet.executionEnabled!==false||mainnet.launchAuthorization!==false||platform.publicMainnetCreatorLaunchesEnabled!==false)throw new Error('Fail-closed contract mismatch');
    if(platform.feePolicy.projectTradingFeeMaxPercent!==4||platform.feePolicy.worldzLaunchPadShareOfCollectedProjectFeePercent!==10)throw new Error('Fair Fee contract mismatch');
    renderMarket();renderToken();renderProof();bind();feeMath();refreshRuntime();
  }catch(e){console.error(e);document.body.dataset.boot='failed';alert('WorldzLaunchPad refused to initialize because its verified configuration did not pass fail-closed checks.');}
}
boot();
})();
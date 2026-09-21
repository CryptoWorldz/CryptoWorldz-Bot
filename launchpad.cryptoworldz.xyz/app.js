(()=>{
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat('en-AU',{maximumFractionDigits:4}).format(Number(n)||0);
const feeColors=['#a74cff','#5d8bff','#38e3b0','#ffd166','#ff759c','#b66cff'];
let platform=null,walletProvider=null,lastManifest=null;
const build={chain:'solana',engine:'flash',quote:'SOL'};
const PUBLIC_REGISTRY_URL='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-launch-register';


function humanKey(k){return String(k).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());}
function setDot(id,state){const el=$(id);if(!el)return;el.className='state-dot '+(state==='healthy'?'good':state==='gateway'||state==='protected'?'warn':state==='missing'||state==='degraded'?'bad':'idle');}
function step(n){
  $$('.wizard-step').forEach(x=>x.classList.toggle('active',x.dataset.panel===String(n)));
  $$('.step-tab').forEach(x=>x.classList.toggle('active',x.dataset.step===String(n)));
  const target=$('.builder'); if(target&&window.innerWidth<720)target.scrollIntoView({behavior:'smooth',block:'start'});
}
function selectChoice(group,el,key,value){
  $(group+' .choice').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');build[key]=value;
}
function markChoice(selector,dataKey,value){
  $(selector).forEach(x=>x.classList.toggle('selected',x.dataset[dataKey]===value));
}
function selectChain(el,chain){
  selectChoice('#chain-grid',el,'chain',chain);
  if(chain==='base'){
    build.engine='evm-fixed';build.quote='ETH';
    markChoice('#engine-grid .choice','engine','evm-fixed');
    markChoice('.quote','quote','ETH');
    $('#wxrp-proof').classList.remove('show');
    $('#build-decimals').value='18';
    const creator=$('[data-allocation="creatorTeam"]'),growth=$('[data-allocation="growthEcosystem"]');
    if(Number(creator.value)>5){const delta=Number(creator.value)-5;creator.value='5';growth.value=String((Number(growth.value)||0)+delta);}
  }else if(chain==='solana'){
    if(build.engine==='evm-fixed'){build.engine='flash';markChoice('#engine-grid .choice','engine','flash');}
    if(build.quote==='ETH'){build.quote='SOL';markChoice('.quote','quote','SOL');}
    if(Number($('#build-decimals').value)===18)$('#build-decimals').value='9';
  }
  feeMath();
}
function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function shortAddress(v){const x=String(v||'');return x.length>12?x.slice(0,6)+'…'+x.slice(-6):x;}
function renderFounding100(founding){
  const target=$('#founding-market'),badge=$('#founding-count');if(!target||!badge)return;
  const f=founding||{},positions=Array.isArray(f.positions)?f.positions:[],qualified=Number(f.qualifiedCount)||0,pending=Number(f.pendingReviewCount)||0;
  badge.innerHTML='<i></i> '+Math.max(0,100-qualified)+' OF 100 POSITIONS REMAIN';
  if(!positions.length){
    target.innerHTML='<article class="market-card"><span class="market-num">#001?</span><div><strong>FOUNDING 100 POSITION #001 IS OPEN</strong><em>Verified mainnet launches only</em><small>No devnet launch can claim a Founding position.</small></div><div class="market-stat"><span>WORLDZ allocation</span><b>0.10% per qualified position</b></div><span class="arrow">→</span></article>';
    return;
  }
  target.innerHTML=positions.slice(0,12).map(x=>{
    const pos=x.founding_position?'#'+String(x.founding_position).padStart(3,'0'):'CANDIDATE '+String(x.candidate_order);
    const state=String(x.status||'pending_review').replaceAll('_',' ').toUpperCase();
    return '<article class="market-card"><span class="market-num">'+escapeHtml(pos)+'</span><div><strong>'+escapeHtml(x.token_name||'Unnamed')+'</strong><em>
  const target=$('#launch-market');if(!target)return;
  target.innerHTML='<article class="market-card"><div><strong>Loading public launches…</strong><small>Worldz Proof registry</small></div></article>';
  try{
    const r=await fetch(PUBLIC_REGISTRY_URL,{method:'GET',headers:{Accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw new Error('registry_http_'+r.status);
    const out=await r.json();
    renderFounding100(out.founding100);
    const launches=Array.isArray(out.launches)?out.launches:[];
    if(!launches.length){
      target.innerHTML='<article class="market-card"><span class="market-num">#001?</span><div><strong>FIRST PUBLIC LAUNCH SLOT OPEN</strong><em>Who will be first?</em><small>Build + prove your token through WorldzLaunchPad™</small></div><div class="market-stat"><span>Platform share</span><b>10% of token fee only</b></div><span class="arrow">→</span></article>';
      return;
    }
    target.innerHTML=launches.map((x,i)=>{
      const env=escapeHtml(String(x.environment||'').toUpperCase());
      const name=escapeHtml(x.token_name||'Unnamed');
      const symbol=escapeHtml(x.symbol||'TOKEN');
      const engine=escapeHtml(x.engine||'');
      const stage=escapeHtml(String(x.stage||'registered').replaceAll('_',' ').toUpperCase());
      const mint=escapeHtml(shortAddress(x.mint));
      const fee=Number(x.project_fee_percent);
      const feeText=Number.isFinite(fee)?fee.toFixed(2)+'%':'—';
      return '<article class="market-card"><span class="market-num">#'+String(i+1).padStart(3,'0')+'</span><div><strong>'+name+'</strong><em>$'+symbol+'</em><small>'+stage+' • '+env+'</small></div><div class="market-stat"><span>Engine</span><b>'+engine+'</b></div><div class="market-stat"><span>Token fee</span><b>'+feeText+'</b></div><div class="market-stat"><span>Mint</span><b>'+mint+'</b></div><span class="arrow">✓</span></article>';
    }).join('');
  }catch(e){
    target.innerHTML='<article class="market-card"><div><strong>Public registry temporarily unavailable</strong><small>Launch building remains available. Registry failures are shown as unknown, never silently green.</small></div></article>';
  }
}
function renderProof(){
  const gate=$('#public-gate-grid');if(!gate||!platform)return;
  const treasury=platform.treasuryRouting||{};
  const checks=[
    ['Public creator platform',platform.publicLaunchPad===true,'LIVE'],
    ['10% platform fee-only cap',platform.feePolicy?.platformShareCapPercentOfCollectedProjectFee===10,'HARD RULE'],
    ['0% platform token-supply share',platform.feePolicy?.worldzLaunchPadShareOfTokenSupplyPercent===0,'HARD RULE'],
    ['0% platform initial-liquidity share',platform.feePolicy?.worldzLaunchPadShareOfInitialLiquidityPercent===0,'HARD RULE'],
    ['Base Sepolia token adapter',platform.baseEvmFair?.status==='BASE_SEPOLIA_BETA','TESTNET'],
    ['Founding 100 registry',platform.founding100?.totalPositions===100,'100 POSITIONS'],
    ['Treasury Multisig vault registered',!!treasury.vaultAddress,treasury.vaultAddress?shortAddress(treasury.vaultAddress):'PENDING'],
    ['Public mainnet execution',platform.publicMainnetCreatorLaunchesEnabled===true,platform.publicMainnetCreatorLaunchesEnabled?'ENABLED':'FINAL GATE']
  ];
  gate.innerHTML=checks.map(([label,ok,detail])=>'<div class="gate-item '+(ok?'pass':'block')+'"><span class="mark">'+(ok?'✓':'×')+'</span><span>'+escapeHtml(label)+' — <b>'+escapeHtml(detail)+'</b></span></div>').join('');
  const pill=$('#mainnet-gate-pill'),title=$('#mainnet-gate-title'),copy=$('#mainnet-gate-copy');
  if(platform.publicMainnetCreatorLaunchesEnabled){
    pill.textContent='LIVE';pill.className='pill safe';
    title.textContent='Public mainnet creator launches enabled';
    copy.textContent='This route passed the published Worldz proof gate.';
  }else{
    pill.textContent='FINAL GATE';pill.className='pill locked';
    title.textContent='Treasury Multisig + end-to-end routing proof required';
    copy.textContent=treasury.vaultAddress
      ?'Treasury vault is registered. Mainnet remains locked until the exact 10% fee-only route and remaining release checks are proven.'
      :'The public platform is live now. Mainnet execution remains locked until the verified Worldz Treasury Multisig vault address and exact 10% fee-only route are proven end-to-end.';
  }
}
function feeMath(){
  const fee=Number($('#project-fee').value)||0,vol=Math.max(0,Number($('#example-volume').value)||0);
  const gross=vol*(fee/100),worldz=gross*(platform.feePolicy.worldzLaunchPadShareOfCollectedProjectFeePercent/100),project=gross-worldz;
  $('#project-fee-value').textContent=fee.toFixed(2)+'%';
  $('#gross-fee').textContent=fmt(gross);$('#worldz-fee').textContent=fmt(worldz);$('#project-pool').textContent=fmt(project);
  const total=$('.route-input').reduce((s,x)=>s+(Number(x.value)||0),0);
  $('#route-total').textContent=total.toFixed(0)+'%';$('#route-total').className='pill '+(Math.abs(total-100)<.001?'safe':'locked');
  const at=allocationTotal();
  $('#allocation-total').textContent=at.toFixed(0)+'%';$('#allocation-total').className='pill '+(Math.abs(at-100)<.001?'safe':'locked');
}
function currentRoutes(){
  const out={};$('.route-input').forEach(x=>out[x.dataset.route]=Number(x.value)||0);return out;
}
function currentAllocations(){
  const out={};$('.allocation-input').forEach(x=>out[x.dataset.allocation]=Number(x.value)||0);return out;
}
function allocationTotal(){return Object.values(currentAllocations()).reduce((a,b)=>a+b,0);}
function publicBenefitRouteTotal(){
  const r=currentRoutes();return (r.holders||0)+(r.lp||0)+(r.community||0);
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
      worldzLaunchPadShareOfCollectedProjectFeePercent:10,
      projectRetainedShareOfCollectedProjectFeePercent:90,
      worldzLaunchPadShareOfTokenSupplyPercent:0,
      worldzLaunchPadShareOfInitialLiquidityPercent:0,
      projectDistributionPercent:currentRoutes(),
      walletTransferTax:false
    },
    supplyAllocationPercent:currentAllocations(),
    safetyPolicy:{
      standard:platform.safeLaunchPolicy.version,
      creatorUnlockedAtGenesisPercent:Number($('#creator-unlocked').value),
      founderCliffDays:Number($('#founder-cliff').value),
      founderVestingMonths:Number($('#founder-vesting').value),
      creatorControlledLpLockPercent:100,
      lpLockDays:Number($('#lp-lock-days').value),
      treasuryProgramMultisigAddress:$('#multisig-address').value.trim(),
      mintAuthorityRevocationMandatory:true,
      freezeAuthorityRevocationMandatory:true,
      walletTransferTaxPercent:0,
      hiddenPrivateAllocationsAllowed:false,
      blacklistOrSellRestrictionAllowed:false
    },
    execution:{
      requestedEnvironment:build.chain==='base'?'base-sepolia':'devnet',
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
  const alloc=m.supplyAllocationPercent,allocTotal=Object.values(alloc).reduce((a,b)=>a+b,0),r=m.feePolicy.projectDistributionPercent,p=platform.safeLaunchPolicy;
  const solanaAdapter=m.network==='solana'&&['flash','curve','curve-pro'].includes(m.launchEngine);
  const baseAdapter=m.network==='base'&&m.launchEngine==='evm-fixed';
  const adapterReady=solanaAdapter||baseAdapter;
  const quoteReady=baseAdapter?m.quoteAsset==='ETH':(m.launchEngine==='flash'||m.quoteAsset==='SOL');
  const decimalsReady=baseAdapter?m.token.decimals===18:(m.launchEngine==='flash'||m.token.decimals===6);
  const creatorCap=baseAdapter?5:p.allocations.creatorTeamMaxPercent;
  const checks=[
    ['Chain selected',!!m.network,m.network],
    ['Executable public test adapter',adapterReady,baseAdapter?'Base Sepolia • Worldz EVM Fair':solanaAdapter?'Solana Devnet • '+m.launchEngine:'Adapter not enabled yet'],
    ['Quote supported by selected test engine',quoteReady,baseAdapter?'ETH required on Base Sepolia':m.launchEngine==='flash'?m.quoteAsset+' • Flash disclosure rules':m.quoteAsset==='SOL'?'SOL supported':'Curve / Curve Pro Devnet currently require SOL'],
    ['Engine fee contract',m.launchEngine!=='curve'||m.feePolicy.projectTradingFeePercent===2,m.launchEngine==='curve'?'Worldz Curve Devnet beta requires 2.00%':'0.50–3.00% configured project fee'],
    ['Engine decimals contract',decimalsReady,baseAdapter?'Base EVM Fair v1 requires 18 decimals':m.launchEngine==='flash'?String(m.token.decimals):'Curve / Curve Pro Devnet beta require 6 decimals'],
    ['Raydium Curve preset supply',m.launchEngine!=='curve'||m.token.fixedSupply===1000000000,m.launchEngine==='curve'?'1,000,000,000 required by current reviewed GlobalConfig':'Not applicable'],
    ['Launch engine selected',!!m.launchEngine,m.launchEngine],
    ['Token name',m.token.name.length>=2,m.token.name||'Missing'],
    ['Ticker',/^[A-Z0-9_$]{2,10}$/.test(m.token.symbol),m.token.symbol||'Missing'],
    ['Fixed supply range',Number.isInteger(m.token.fixedSupply)&&m.token.fixedSupply>=p.token.supplyMin&&m.token.fixedSupply<=p.token.supplyMax,fmt(m.token.fixedSupply)],
    ['Mint authority revocation',m.token.revokeMintAuthorityAfterInitialMint===true,'COMPULSORY AFTER GENESIS'],
    ['Freeze authority revocation',m.token.freezeAuthority===false,'COMPULSORY'],
    ['Decimals',Number.isInteger(m.token.decimals)&&m.token.decimals>=p.token.decimalsMin&&m.token.decimals<=p.token.decimalsMax,String(m.token.decimals)],
    ['Genesis allocations = 100%',Math.abs(allocTotal-100)<.001,allocTotal.toFixed(0)+'%'],
    ['Allocation values valid',Object.values(alloc).every(v=>Number.isFinite(v)&&v>=0&&v<=100),'No negative or >100% allocation'],
    ['Creator/team allocation cap',alloc.creatorTeam>=0&&alloc.creatorTeam<=creatorCap,alloc.creatorTeam.toFixed(1)+'% / max '+creatorCap+'%'+(baseAdapter?' (Base v1 has no vesting adapter yet)':'')],
    ['Creator liquid-at-genesis cap',m.safetyPolicy.creatorUnlockedAtGenesisPercent>=0&&m.safetyPolicy.creatorUnlockedAtGenesisPercent<=p.allocations.creatorTeamUnlockedAtGenesisMaxPercent&&m.safetyPolicy.creatorUnlockedAtGenesisPercent<=alloc.creatorTeam,m.safetyPolicy.creatorUnlockedAtGenesisPercent.toFixed(1)+'% / max '+Math.min(p.allocations.creatorTeamUnlockedAtGenesisMaxPercent,alloc.creatorTeam)+'%'],
    ['Liquidity allocation range',alloc.liquidity>=p.allocations.liquidityMinPercent&&alloc.liquidity<=p.allocations.liquidityMaxPercent,alloc.liquidity.toFixed(1)+'%'],
    ['Community/public minimum',alloc.communityPublic>=p.allocations.communityPublicMinPercent,alloc.communityPublic.toFixed(1)+'% / min '+p.allocations.communityPublicMinPercent+'%'],
    ['Treasury/reserve cap',alloc.treasuryReserve<=p.allocations.treasuryReserveMaxPercent,alloc.treasuryReserve.toFixed(1)+'% / max '+p.allocations.treasuryReserveMaxPercent+'%'],
    ['Founder cliff',m.safetyPolicy.founderCliffDays>=p.allocations.founderCliffMinDays,m.safetyPolicy.founderCliffDays+' days'],
    ['Founder vesting',m.safetyPolicy.founderVestingMonths>=p.allocations.founderVestingMinMonths,m.safetyPolicy.founderVestingMonths+' months'],
    ['Creator-controlled LP lock',m.safetyPolicy.creatorControlledLpLockPercent===100&&m.safetyPolicy.lpLockDays>=p.allocations.lpLockMinDays,'100% • '+m.safetyPolicy.lpLockDays+' days'],
    ['Project trading fee',m.feePolicy.projectTradingFeePercent>=platform.feePolicy.projectTradingFeeMinPercent&&m.feePolicy.projectTradingFeePercent<=platform.feePolicy.projectTradingFeeMaxPercent,m.feePolicy.projectTradingFeePercent.toFixed(2)+'%'],
    ['Distribution routes = 100%',Math.abs(routes-100)<.001,routes.toFixed(0)+'%'],
    ['Fee-route values valid',Object.values(r).every(v=>Number.isFinite(v)&&v>=0&&v<=100),'No negative or >100% route'],
    ['Creator fee-route cap',r.creator>=0&&r.creator<=p.feeRoutes.creatorMaxPercent,r.creator.toFixed(0)+'% / max '+p.feeRoutes.creatorMaxPercent+'%'],
    ['Treasury fee-route cap',r.treasury<=p.feeRoutes.treasuryMaxPercent,r.treasury.toFixed(0)+'% / max '+p.feeRoutes.treasuryMaxPercent+'%'],
    ['LP-growth fee-route minimum',r.lp>=p.feeRoutes.lpGrowthMinPercent,r.lp.toFixed(0)+'% / min '+p.feeRoutes.lpGrowthMinPercent+'%'],
    ['Holders + LP + community minimum',publicBenefitRouteTotal()>=p.feeRoutes.holdersLpCommunityCombinedMinPercent,publicBenefitRouteTotal().toFixed(0)+'% / min '+p.feeRoutes.holdersLpCommunityCombinedMinPercent+'%'],
    ['Worldz fee-only rule',m.feePolicy.worldzLaunchPadShareOfCollectedProjectFeePercent===10&&m.feePolicy.projectRetainedShareOfCollectedProjectFeePercent===90&&m.feePolicy.worldzLaunchPadShareOfTokenSupplyPercent===0&&m.feePolicy.worldzLaunchPadShareOfInitialLiquidityPercent===0,'10% platform / 90% project • 0% supply • 0% initial liquidity'],
    ['Wallet transfer tax',m.feePolicy.walletTransferTax===false,'0% • HARD LOCK'],
    ['Mainnet enforcement',m.execution.publicMainnetCreatorLaunch===false,'FAIL-CLOSED UNTIL ON-CHAIN PROOF']
  ];
  $('#preflight-grid').innerHTML=checks.map(([label,ok,detail])=>`<div class="preflight ${ok?'pass':'fail'}"><span>${ok?'✓':'×'}</span><div><b>${label}</b><small>${detail}</small></div></div>`).join('');
  const all=checks.every(x=>x[1]);
  const canonical=JSON.stringify(m);
  const hash=await sha256(canonical);m.intentHash=hash;m.createdAt=new Date().toISOString();lastManifest=m;
  $('#manifest-id').textContent=hash.slice(0,16).toUpperCase();
  $('#manifest-preview').textContent=JSON.stringify(m,null,2);
  $('#download-manifest').disabled=!all;
  const link=$('#devnet-launch-link');
  if(all&&adapterReady){
    const route=m.feePolicy.projectDistributionPercent,alloc=m.supplyAllocationPercent,sp=m.safetyPolicy;
    const q=new URLSearchParams({name:m.token.name,symbol:m.token.symbol,supply:String(m.token.fixedSupply),decimals:String(m.token.decimals),fixed:'1',description:m.token.description||'',engine:m.launchEngine,quote:m.quoteAsset,fee:String(m.feePolicy.projectTradingFeePercent),intent:hash,route_creator:String(route.creator||0),route_holders:String(route.holders||0),route_lp:String(route.lp||0),route_treasury:String(route.treasury||0),route_community:String(route.community||0),alloc_creatorTeam:String(alloc.creatorTeam||0),alloc_liquidity:String(alloc.liquidity||0),alloc_communityPublic:String(alloc.communityPublic||0),alloc_treasuryReserve:String(alloc.treasuryReserve||0),alloc_growthEcosystem:String(alloc.growthEcosystem||0),creator_unlocked:String(sp.creatorUnlockedAtGenesisPercent),founder_cliff:String(sp.founderCliffDays),founder_vesting:String(sp.founderVestingMonths),lp_lock_days:String(sp.lpLockDays),multisig:sp.treasuryProgramMultisigAddress});
    const routeBase=baseAdapter?'/base/':m.launchEngine==='curve'?'/curve/':m.launchEngine==='curve-pro'?'/curve-pro/':'/devnet/';
    link.href=routeBase+'?'+q.toString();link.classList.remove('disabled-link');link.setAttribute('aria-disabled','false');
    link.textContent=baseAdapter?'Open Base Sepolia Lab →':m.launchEngine==='curve'?'Open Worldz Curve Devnet →':m.launchEngine==='curve-pro'?'Open Curve Pro Devnet →':'Open Flash Devnet Launch →';
  }else{link.href='#';link.classList.add('disabled-link');link.setAttribute('aria-disabled','true');link.textContent='Executable Adapter Not Ready';}
  return all;
}
function downloadManifest(){
  if(!lastManifest)return;
  const blob=new Blob([JSON.stringify(lastManifest,null,2)+'\n'],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(lastManifest.token.symbol||'TOKEN')+'-worldzlaunchpad-manifest.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function getWalletProvider(){return [window.phantom&&window.phantom.solana,window.solflare,window.solana].filter(Boolean).find(p=>typeof p.connect==='function')||null;}
async function connectWallet(){
  if(build.chain==='base'){
    if(!window.ethereum){alert('No EVM wallet detected. Open in Coinbase Wallet / MetaMask or another EIP-1193 wallet.');return;}
    try{
      const accounts=await window.ethereum.request({method:'eth_requestAccounts'});
      const address=accounts?.[0];if(!address)throw new Error('No EVM account returned');
      $('#wallet-mini').textContent=address.slice(0,6)+'…'+address.slice(-4);$('#wallet-mini').classList.add('connected');
    }catch{}
    return;
  }
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
  $('#chain-grid .choice').forEach(b=>b.addEventListener('click',()=>selectChain(b,b.dataset.chain)));
  $('#engine-grid .choice').forEach(b=>b.addEventListener('click',()=>selectChoice('#engine-grid',b,'engine',b.dataset.engine)));
  $$('.quote').forEach(b=>b.addEventListener('click',()=>{$$('.quote').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');build.quote=b.dataset.quote;$('#wxrp-proof').classList.toggle('show',build.quote==='wXRP');}));
  $('#project-fee').addEventListener('input',feeMath);$('#example-volume').addEventListener('input',feeMath);$('.route-input').forEach(x=>x.addEventListener('input',feeMath));$('.allocation-input').forEach(x=>x.addEventListener('input',feeMath));
  $('#run-preflight').addEventListener('click',runPreflight);$('#download-manifest').addEventListener('click',downloadManifest);
  $('#wallet-mini').addEventListener('click',connectWallet);$('#refresh-runtime').addEventListener('click',refreshRuntime);
  $('#devnet-launch-link').addEventListener('click',e=>{if(e.currentTarget.getAttribute('aria-disabled')==='true')e.preventDefault();});
}
async function boot(){
  try{
    const r=await fetch('/platform-config.json?v=20260921-public-v6',{cache:'no-store'});
    if(!r.ok)throw new Error('Platform configuration unavailable');
    platform=await r.json();
    if(platform.publicLaunchPad!==true||platform.publicLaunchIntakeEnabled!==true)throw new Error('Public LaunchPad contract mismatch');
    if(platform.feePolicy?.projectTradingFeeMaxPercent!==3||platform.feePolicy?.worldzLaunchPadShareOfCollectedProjectFeePercent!==10||platform.feePolicy?.platformShareCapPercentOfCollectedProjectFee!==10)throw new Error('10% fee-only contract mismatch');
    if(platform.feePolicy?.worldzLaunchPadShareOfTokenSupplyPercent!==0||platform.feePolicy?.worldzLaunchPadShareOfInitialLiquidityPercent!==0||platform.feePolicy?.walletTransferTaxPercent!==0)throw new Error('Worldz zero-supply/liquidity/transfer-tax contract mismatch');
    const p=platform.safeLaunchPolicy;
    if(!p||p.version!=='WORLDZ-SAFE-LAUNCH-1'||p.compulsory.fixedSupply!==true||p.compulsory.revokeMintAuthorityAfterGenesis!==true||p.compulsory.revokeFreezeAuthorityAfterGenesis!==true)throw new Error('Safe Launch Standard contract mismatch');
    if(platform.baseEvmFair?.status!=='BASE_SEPOLIA_BETA'||platform.baseEvmFair?.mainnetExecution!==false)throw new Error('Base testnet adapter contract mismatch');
    if(platform.founding100?.totalPositions!==100||platform.founding100?.futureWorldzPoolPercent!==10||platform.founding100?.equalAllocationPerQualifiedPositionPercent!==0.1)throw new Error('Founding 100 contract mismatch');
    bind();feeMath();renderProof();renderMarket();refreshRuntime();
  }catch(e){
    console.error(e);document.body.dataset.boot='failed';
    alert('WorldzLaunchPad refused to initialize because its public launch configuration did not pass fail-closed checks.');
  }
}
boot();

})();+escapeHtml(x.symbol||'TOKEN')+'</em><small>'+escapeHtml(state)+' • '+escapeHtml(String(x.network||'').toUpperCase())+'</small></div><div class="market-stat"><span>Team</span><b>'+escapeHtml(x.team_label||'Identity review pending')+'</b></div><div class="market-stat"><span>WORLDZ allocation</span><b>'+escapeHtml(x.worldz_allocation_percent||0.1)+'%</b></div><span class="arrow">'+(x.status==='qualified'?'✓':'…')+'</span></article>';
  }).join('')+(pending?'<article class="market-card"><div><strong>'+pending+' candidate'+(pending===1?'':'s')+' awaiting review</strong><small>Candidate status is not an award.</small></div></article>':'');
}
async function renderMarket(){
  const target=$('#launch-market');if(!target)return;
  target.innerHTML='<article class="market-card"><div><strong>Loading public launches…</strong><small>Worldz Proof registry</small></div></article>';
  try{
    const r=await fetch(PUBLIC_REGISTRY_URL,{method:'GET',headers:{Accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw new Error('registry_http_'+r.status);
    const out=await r.json();
    const launches=Array.isArray(out.launches)?out.launches:[];
    if(!launches.length){
      target.innerHTML='<article class="market-card"><span class="market-num">#001?</span><div><strong>FIRST PUBLIC LAUNCH SLOT OPEN</strong><em>Who will be first?</em><small>Build + prove your token through WorldzLaunchPad™</small></div><div class="market-stat"><span>Platform share</span><b>10% of token fee only</b></div><span class="arrow">→</span></article>';
      return;
    }
    target.innerHTML=launches.map((x,i)=>{
      const env=escapeHtml(String(x.environment||'').toUpperCase());
      const name=escapeHtml(x.token_name||'Unnamed');
      const symbol=escapeHtml(x.symbol||'TOKEN');
      const engine=escapeHtml(x.engine||'');
      const stage=escapeHtml(String(x.stage||'registered').replaceAll('_',' ').toUpperCase());
      const mint=escapeHtml(shortAddress(x.mint));
      const fee=Number(x.project_fee_percent);
      const feeText=Number.isFinite(fee)?fee.toFixed(2)+'%':'—';
      return '<article class="market-card"><span class="market-num">#'+String(i+1).padStart(3,'0')+'</span><div><strong>'+name+'</strong><em>$'+symbol+'</em><small>'+stage+' • '+env+'</small></div><div class="market-stat"><span>Engine</span><b>'+engine+'</b></div><div class="market-stat"><span>Token fee</span><b>'+feeText+'</b></div><div class="market-stat"><span>Mint</span><b>'+mint+'</b></div><span class="arrow">✓</span></article>';
    }).join('');
  }catch(e){
    target.innerHTML='<article class="market-card"><div><strong>Public registry temporarily unavailable</strong><small>Launch building remains available. Registry failures are shown as unknown, never silently green.</small></div></article>';
  }
}
function renderProof(){
  const gate=$('#public-gate-grid');if(!gate||!platform)return;
  const treasury=platform.treasuryRouting||{};
  const checks=[
    ['Public creator platform',platform.publicLaunchPad===true,'LIVE'],
    ['10% platform fee-only cap',platform.feePolicy?.platformShareCapPercentOfCollectedProjectFee===10,'HARD RULE'],
    ['0% platform token-supply share',platform.feePolicy?.worldzLaunchPadShareOfTokenSupplyPercent===0,'HARD RULE'],
    ['0% platform initial-liquidity share',platform.feePolicy?.worldzLaunchPadShareOfInitialLiquidityPercent===0,'HARD RULE'],
    ['Base Sepolia token adapter',platform.baseEvmFair?.status==='BASE_SEPOLIA_BETA','TESTNET'],
    ['Founding 100 registry',platform.founding100?.totalPositions===100,'100 POSITIONS'],
    ['Treasury Multisig vault registered',!!treasury.vaultAddress,treasury.vaultAddress?shortAddress(treasury.vaultAddress):'PENDING'],
    ['Public mainnet execution',platform.publicMainnetCreatorLaunchesEnabled===true,platform.publicMainnetCreatorLaunchesEnabled?'ENABLED':'FINAL GATE']
  ];
  gate.innerHTML=checks.map(([label,ok,detail])=>'<div class="gate-item '+(ok?'pass':'block')+'"><span class="mark">'+(ok?'✓':'×')+'</span><span>'+escapeHtml(label)+' — <b>'+escapeHtml(detail)+'</b></span></div>').join('');
  const pill=$('#mainnet-gate-pill'),title=$('#mainnet-gate-title'),copy=$('#mainnet-gate-copy');
  if(platform.publicMainnetCreatorLaunchesEnabled){
    pill.textContent='LIVE';pill.className='pill safe';
    title.textContent='Public mainnet creator launches enabled';
    copy.textContent='This route passed the published Worldz proof gate.';
  }else{
    pill.textContent='FINAL GATE';pill.className='pill locked';
    title.textContent='Treasury Multisig + end-to-end routing proof required';
    copy.textContent=treasury.vaultAddress
      ?'Treasury vault is registered. Mainnet remains locked until the exact 10% fee-only route and remaining release checks are proven.'
      :'The public platform is live now. Mainnet execution remains locked until the verified Worldz Treasury Multisig vault address and exact 10% fee-only route are proven end-to-end.';
  }
}
function feeMath(){
  const fee=Number($('#project-fee').value)||0,vol=Math.max(0,Number($('#example-volume').value)||0);
  const gross=vol*(fee/100),worldz=gross*(platform.feePolicy.worldzLaunchPadShareOfCollectedProjectFeePercent/100),project=gross-worldz;
  $('#project-fee-value').textContent=fee.toFixed(2)+'%';
  $('#gross-fee').textContent=fmt(gross);$('#worldz-fee').textContent=fmt(worldz);$('#project-pool').textContent=fmt(project);
  const total=$('.route-input').reduce((s,x)=>s+(Number(x.value)||0),0);
  $('#route-total').textContent=total.toFixed(0)+'%';$('#route-total').className='pill '+(Math.abs(total-100)<.001?'safe':'locked');
  const at=allocationTotal();
  $('#allocation-total').textContent=at.toFixed(0)+'%';$('#allocation-total').className='pill '+(Math.abs(at-100)<.001?'safe':'locked');
}
function currentRoutes(){
  const out={};$('.route-input').forEach(x=>out[x.dataset.route]=Number(x.value)||0);return out;
}
function currentAllocations(){
  const out={};$('.allocation-input').forEach(x=>out[x.dataset.allocation]=Number(x.value)||0);return out;
}
function allocationTotal(){return Object.values(currentAllocations()).reduce((a,b)=>a+b,0);}
function publicBenefitRouteTotal(){
  const r=currentRoutes();return (r.holders||0)+(r.lp||0)+(r.community||0);
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
      worldzLaunchPadShareOfCollectedProjectFeePercent:10,
      projectRetainedShareOfCollectedProjectFeePercent:90,
      worldzLaunchPadShareOfTokenSupplyPercent:0,
      worldzLaunchPadShareOfInitialLiquidityPercent:0,
      projectDistributionPercent:currentRoutes(),
      walletTransferTax:false
    },
    supplyAllocationPercent:currentAllocations(),
    safetyPolicy:{
      standard:platform.safeLaunchPolicy.version,
      creatorUnlockedAtGenesisPercent:Number($('#creator-unlocked').value),
      founderCliffDays:Number($('#founder-cliff').value),
      founderVestingMonths:Number($('#founder-vesting').value),
      creatorControlledLpLockPercent:100,
      lpLockDays:Number($('#lp-lock-days').value),
      treasuryProgramMultisigAddress:$('#multisig-address').value.trim(),
      mintAuthorityRevocationMandatory:true,
      freezeAuthorityRevocationMandatory:true,
      walletTransferTaxPercent:0,
      hiddenPrivateAllocationsAllowed:false,
      blacklistOrSellRestrictionAllowed:false
    },
    execution:{
      requestedEnvironment:build.chain==='base'?'base-sepolia':'devnet',
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
  const alloc=m.supplyAllocationPercent,allocTotal=Object.values(alloc).reduce((a,b)=>a+b,0),r=m.feePolicy.projectDistributionPercent,p=platform.safeLaunchPolicy;
  const solanaAdapter=m.network==='solana'&&['flash','curve','curve-pro'].includes(m.launchEngine);
  const baseAdapter=m.network==='base'&&m.launchEngine==='evm-fixed';
  const adapterReady=solanaAdapter||baseAdapter;
  const quoteReady=baseAdapter?m.quoteAsset==='ETH':(m.launchEngine==='flash'||m.quoteAsset==='SOL');
  const decimalsReady=baseAdapter?m.token.decimals===18:(m.launchEngine==='flash'||m.token.decimals===6);
  const creatorCap=baseAdapter?5:p.allocations.creatorTeamMaxPercent;
  const checks=[
    ['Chain selected',!!m.network,m.network],
    ['Executable public test adapter',adapterReady,baseAdapter?'Base Sepolia • Worldz EVM Fair':solanaAdapter?'Solana Devnet • '+m.launchEngine:'Adapter not enabled yet'],
    ['Quote supported by selected test engine',quoteReady,baseAdapter?'ETH required on Base Sepolia':m.launchEngine==='flash'?m.quoteAsset+' • Flash disclosure rules':m.quoteAsset==='SOL'?'SOL supported':'Curve / Curve Pro Devnet currently require SOL'],
    ['Engine fee contract',m.launchEngine!=='curve'||m.feePolicy.projectTradingFeePercent===2,m.launchEngine==='curve'?'Worldz Curve Devnet beta requires 2.00%':'0.50–3.00% configured project fee'],
    ['Engine decimals contract',decimalsReady,baseAdapter?'Base EVM Fair v1 requires 18 decimals':m.launchEngine==='flash'?String(m.token.decimals):'Curve / Curve Pro Devnet beta require 6 decimals'],
    ['Raydium Curve preset supply',m.launchEngine!=='curve'||m.token.fixedSupply===1000000000,m.launchEngine==='curve'?'1,000,000,000 required by current reviewed GlobalConfig':'Not applicable'],
    ['Launch engine selected',!!m.launchEngine,m.launchEngine],
    ['Token name',m.token.name.length>=2,m.token.name||'Missing'],
    ['Ticker',/^[A-Z0-9_$]{2,10}$/.test(m.token.symbol),m.token.symbol||'Missing'],
    ['Fixed supply range',Number.isInteger(m.token.fixedSupply)&&m.token.fixedSupply>=p.token.supplyMin&&m.token.fixedSupply<=p.token.supplyMax,fmt(m.token.fixedSupply)],
    ['Mint authority revocation',m.token.revokeMintAuthorityAfterInitialMint===true,'COMPULSORY AFTER GENESIS'],
    ['Freeze authority revocation',m.token.freezeAuthority===false,'COMPULSORY'],
    ['Decimals',Number.isInteger(m.token.decimals)&&m.token.decimals>=p.token.decimalsMin&&m.token.decimals<=p.token.decimalsMax,String(m.token.decimals)],
    ['Genesis allocations = 100%',Math.abs(allocTotal-100)<.001,allocTotal.toFixed(0)+'%'],
    ['Allocation values valid',Object.values(alloc).every(v=>Number.isFinite(v)&&v>=0&&v<=100),'No negative or >100% allocation'],
    ['Creator/team allocation cap',alloc.creatorTeam>=0&&alloc.creatorTeam<=creatorCap,alloc.creatorTeam.toFixed(1)+'% / max '+creatorCap+'%'+(baseAdapter?' (Base v1 has no vesting adapter yet)':'')],
    ['Creator liquid-at-genesis cap',m.safetyPolicy.creatorUnlockedAtGenesisPercent>=0&&m.safetyPolicy.creatorUnlockedAtGenesisPercent<=p.allocations.creatorTeamUnlockedAtGenesisMaxPercent&&m.safetyPolicy.creatorUnlockedAtGenesisPercent<=alloc.creatorTeam,m.safetyPolicy.creatorUnlockedAtGenesisPercent.toFixed(1)+'% / max '+Math.min(p.allocations.creatorTeamUnlockedAtGenesisMaxPercent,alloc.creatorTeam)+'%'],
    ['Liquidity allocation range',alloc.liquidity>=p.allocations.liquidityMinPercent&&alloc.liquidity<=p.allocations.liquidityMaxPercent,alloc.liquidity.toFixed(1)+'%'],
    ['Community/public minimum',alloc.communityPublic>=p.allocations.communityPublicMinPercent,alloc.communityPublic.toFixed(1)+'% / min '+p.allocations.communityPublicMinPercent+'%'],
    ['Treasury/reserve cap',alloc.treasuryReserve<=p.allocations.treasuryReserveMaxPercent,alloc.treasuryReserve.toFixed(1)+'% / max '+p.allocations.treasuryReserveMaxPercent+'%'],
    ['Founder cliff',m.safetyPolicy.founderCliffDays>=p.allocations.founderCliffMinDays,m.safetyPolicy.founderCliffDays+' days'],
    ['Founder vesting',m.safetyPolicy.founderVestingMonths>=p.allocations.founderVestingMinMonths,m.safetyPolicy.founderVestingMonths+' months'],
    ['Creator-controlled LP lock',m.safetyPolicy.creatorControlledLpLockPercent===100&&m.safetyPolicy.lpLockDays>=p.allocations.lpLockMinDays,'100% • '+m.safetyPolicy.lpLockDays+' days'],
    ['Project trading fee',m.feePolicy.projectTradingFeePercent>=platform.feePolicy.projectTradingFeeMinPercent&&m.feePolicy.projectTradingFeePercent<=platform.feePolicy.projectTradingFeeMaxPercent,m.feePolicy.projectTradingFeePercent.toFixed(2)+'%'],
    ['Distribution routes = 100%',Math.abs(routes-100)<.001,routes.toFixed(0)+'%'],
    ['Fee-route values valid',Object.values(r).every(v=>Number.isFinite(v)&&v>=0&&v<=100),'No negative or >100% route'],
    ['Creator fee-route cap',r.creator>=0&&r.creator<=p.feeRoutes.creatorMaxPercent,r.creator.toFixed(0)+'% / max '+p.feeRoutes.creatorMaxPercent+'%'],
    ['Treasury fee-route cap',r.treasury<=p.feeRoutes.treasuryMaxPercent,r.treasury.toFixed(0)+'% / max '+p.feeRoutes.treasuryMaxPercent+'%'],
    ['LP-growth fee-route minimum',r.lp>=p.feeRoutes.lpGrowthMinPercent,r.lp.toFixed(0)+'% / min '+p.feeRoutes.lpGrowthMinPercent+'%'],
    ['Holders + LP + community minimum',publicBenefitRouteTotal()>=p.feeRoutes.holdersLpCommunityCombinedMinPercent,publicBenefitRouteTotal().toFixed(0)+'% / min '+p.feeRoutes.holdersLpCommunityCombinedMinPercent+'%'],
    ['Worldz fee-only rule',m.feePolicy.worldzLaunchPadShareOfCollectedProjectFeePercent===10&&m.feePolicy.projectRetainedShareOfCollectedProjectFeePercent===90&&m.feePolicy.worldzLaunchPadShareOfTokenSupplyPercent===0&&m.feePolicy.worldzLaunchPadShareOfInitialLiquidityPercent===0,'10% platform / 90% project • 0% supply • 0% initial liquidity'],
    ['Wallet transfer tax',m.feePolicy.walletTransferTax===false,'0% • HARD LOCK'],
    ['Mainnet enforcement',m.execution.publicMainnetCreatorLaunch===false,'FAIL-CLOSED UNTIL ON-CHAIN PROOF']
  ];
  $('#preflight-grid').innerHTML=checks.map(([label,ok,detail])=>`<div class="preflight ${ok?'pass':'fail'}"><span>${ok?'✓':'×'}</span><div><b>${label}</b><small>${detail}</small></div></div>`).join('');
  const all=checks.every(x=>x[1]);
  const canonical=JSON.stringify(m);
  const hash=await sha256(canonical);m.intentHash=hash;m.createdAt=new Date().toISOString();lastManifest=m;
  $('#manifest-id').textContent=hash.slice(0,16).toUpperCase();
  $('#manifest-preview').textContent=JSON.stringify(m,null,2);
  $('#download-manifest').disabled=!all;
  const link=$('#devnet-launch-link');
  if(all&&adapterReady){
    const route=m.feePolicy.projectDistributionPercent,alloc=m.supplyAllocationPercent,sp=m.safetyPolicy;
    const q=new URLSearchParams({name:m.token.name,symbol:m.token.symbol,supply:String(m.token.fixedSupply),decimals:String(m.token.decimals),fixed:'1',description:m.token.description||'',engine:m.launchEngine,quote:m.quoteAsset,fee:String(m.feePolicy.projectTradingFeePercent),intent:hash,route_creator:String(route.creator||0),route_holders:String(route.holders||0),route_lp:String(route.lp||0),route_treasury:String(route.treasury||0),route_community:String(route.community||0),alloc_creatorTeam:String(alloc.creatorTeam||0),alloc_liquidity:String(alloc.liquidity||0),alloc_communityPublic:String(alloc.communityPublic||0),alloc_treasuryReserve:String(alloc.treasuryReserve||0),alloc_growthEcosystem:String(alloc.growthEcosystem||0),creator_unlocked:String(sp.creatorUnlockedAtGenesisPercent),founder_cliff:String(sp.founderCliffDays),founder_vesting:String(sp.founderVestingMonths),lp_lock_days:String(sp.lpLockDays),multisig:sp.treasuryProgramMultisigAddress});
    const routeBase=baseAdapter?'/base/':m.launchEngine==='curve'?'/curve/':m.launchEngine==='curve-pro'?'/curve-pro/':'/devnet/';
    link.href=routeBase+'?'+q.toString();link.classList.remove('disabled-link');link.setAttribute('aria-disabled','false');
    link.textContent=baseAdapter?'Open Base Sepolia Lab →':m.launchEngine==='curve'?'Open Worldz Curve Devnet →':m.launchEngine==='curve-pro'?'Open Curve Pro Devnet →':'Open Flash Devnet Launch →';
  }else{link.href='#';link.classList.add('disabled-link');link.setAttribute('aria-disabled','true');link.textContent='Executable Adapter Not Ready';}
  return all;
}
function downloadManifest(){
  if(!lastManifest)return;
  const blob=new Blob([JSON.stringify(lastManifest,null,2)+'\n'],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(lastManifest.token.symbol||'TOKEN')+'-worldzlaunchpad-manifest.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function getWalletProvider(){return [window.phantom&&window.phantom.solana,window.solflare,window.solana].filter(Boolean).find(p=>typeof p.connect==='function')||null;}
async function connectWallet(){
  if(build.chain==='base'){
    if(!window.ethereum){alert('No EVM wallet detected. Open in Coinbase Wallet / MetaMask or another EIP-1193 wallet.');return;}
    try{
      const accounts=await window.ethereum.request({method:'eth_requestAccounts'});
      const address=accounts?.[0];if(!address)throw new Error('No EVM account returned');
      $('#wallet-mini').textContent=address.slice(0,6)+'…'+address.slice(-4);$('#wallet-mini').classList.add('connected');
    }catch{}
    return;
  }
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
  $('#chain-grid .choice').forEach(b=>b.addEventListener('click',()=>selectChain(b,b.dataset.chain)));
  $('#engine-grid .choice').forEach(b=>b.addEventListener('click',()=>selectChoice('#engine-grid',b,'engine',b.dataset.engine)));
  $$('.quote').forEach(b=>b.addEventListener('click',()=>{$$('.quote').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');build.quote=b.dataset.quote;$('#wxrp-proof').classList.toggle('show',build.quote==='wXRP');}));
  $('#project-fee').addEventListener('input',feeMath);$('#example-volume').addEventListener('input',feeMath);$('.route-input').forEach(x=>x.addEventListener('input',feeMath));$('.allocation-input').forEach(x=>x.addEventListener('input',feeMath));
  $('#run-preflight').addEventListener('click',runPreflight);$('#download-manifest').addEventListener('click',downloadManifest);
  $('#wallet-mini').addEventListener('click',connectWallet);$('#refresh-runtime').addEventListener('click',refreshRuntime);
  $('#devnet-launch-link').addEventListener('click',e=>{if(e.currentTarget.getAttribute('aria-disabled')==='true')e.preventDefault();});
}
async function boot(){
  try{
    const r=await fetch('/platform-config.json?v=20260921-public-v6',{cache:'no-store'});
    if(!r.ok)throw new Error('Platform configuration unavailable');
    platform=await r.json();
    if(platform.publicLaunchPad!==true||platform.publicLaunchIntakeEnabled!==true)throw new Error('Public LaunchPad contract mismatch');
    if(platform.feePolicy?.projectTradingFeeMaxPercent!==3||platform.feePolicy?.worldzLaunchPadShareOfCollectedProjectFeePercent!==10||platform.feePolicy?.platformShareCapPercentOfCollectedProjectFee!==10)throw new Error('10% fee-only contract mismatch');
    if(platform.feePolicy?.worldzLaunchPadShareOfTokenSupplyPercent!==0||platform.feePolicy?.worldzLaunchPadShareOfInitialLiquidityPercent!==0||platform.feePolicy?.walletTransferTaxPercent!==0)throw new Error('Worldz zero-supply/liquidity/transfer-tax contract mismatch');
    const p=platform.safeLaunchPolicy;
    if(!p||p.version!=='WORLDZ-SAFE-LAUNCH-1'||p.compulsory.fixedSupply!==true||p.compulsory.revokeMintAuthorityAfterGenesis!==true||p.compulsory.revokeFreezeAuthorityAfterGenesis!==true)throw new Error('Safe Launch Standard contract mismatch');
    if(platform.baseEvmFair?.status!=='BASE_SEPOLIA_BETA'||platform.baseEvmFair?.mainnetExecution!==false)throw new Error('Base testnet adapter contract mismatch');
    if(platform.founding100?.totalPositions!==100||platform.founding100?.futureWorldzPoolPercent!==10||platform.founding100?.equalAllocationPerQualifiedPositionPercent!==0.1)throw new Error('Founding 100 contract mismatch');
    bind();feeMath();renderProof();renderMarket();refreshRuntime();
  }catch(e){
    console.error(e);document.body.dataset.boot='failed';
    alert('WorldzLaunchPad refused to initialize because its public launch configuration did not pass fail-closed checks.');
  }
}
boot();

})();
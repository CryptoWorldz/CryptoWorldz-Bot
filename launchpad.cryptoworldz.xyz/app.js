(()=>{
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat('en-AU').format(Number(n)||0);
const feeColors=['#a74cff','#63b3ff','#65e6aa','#ffd166','#ff7a9b','#d781ff'];
let registry=null, details=null, mainnet=null, selected='WLDZ', walletProvider=null;

const gateLabels={
 preMainnetExecutionProofPassed:'Pre-mainnet execution proof',
 onlyBFeeClaimProofPassed:'Quote-side OnlyB fee-claim proof',
 autoRouteProofPassed:'AUTO route accounting proof',
 holderNativeSolProofPassed:'Native-SOL holder reward proof',
 lpGrowthProofPassed:'LP-growth proof',
 buybackBurnProofPassed:'Buyback / burn proof',
 charityNativeSolProofPassed:'Charity native-SOL route proof',
 atomicRollbackProofPassed:'Atomic rollback / fail-closed proof',
 vanityMintPublicAddressFinal:'Final WLDZ vanity mint public address',
 multisigAndDestinationsVerified:'Multisig + destination addresses verified',
 graceTimeEnforcedVestingVerified:'G.R.A.C.E. time-enforced vesting verified',
 productionRpcAndClusterVerified:'Production RPC + mainnet-beta cluster verified',
 mainnetLiquidityFundingApproved:'Mainnet liquidity funding approved',
 austracPositionResolved:'AUSTRAC position resolved',
 asicPositionResolved:'ASIC position resolved',
 tokenDisclosuresReviewed:'Token / service disclosures reviewed',
 independentSecurityReviewComplete:'Independent security review complete',
 accountingRecordkeepingRunbookApproved:'Accounting / recordkeeping runbook approved',
 incidentRecoveryRunbookApproved:'Incident / recovery runbook approved',
 finalLaunchHumanAuthorizationRecorded:'Final human launch authorization recorded'
};

function tokenByTicker(ticker){return registry.tokens.find(t=>t.ticker===ticker);}
function humanKey(k){return String(k).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());}
function setDot(id,state){
 const el=$(id); el.className='state-dot '+(state==='healthy'?'good':state==='gateway'||state==='protected'?'warn':state==='missing'||state==='degraded'?'bad':'idle');
}
function renderSwitcher(){
 $('#token-switcher').innerHTML=registry.tokens.map(t=>`<button class="token-tab ${t.ticker===selected?'active':''}" type="button" role="tab" aria-selected="${t.ticker===selected}" data-token="${t.ticker}"><b>#${String(t.number).padStart(3,'0')} ${t.name}</b><span>$${t.ticker} • ${fmt(t.fixed_supply)}</span></button>`).join('');
 $$('#token-switcher .token-tab').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.token;renderToken();}));
}
function renderToken(){
 const t=tokenByTicker(selected), d=details.tokens[selected];
 renderSwitcher();
 $('#token-number').textContent='#'+String(t.number).padStart(3,'0');
 $('#token-name').textContent=t.name; $('#token-ticker').textContent='$'+t.ticker; $('#token-supply').textContent=fmt(t.fixed_supply); $('#token-mission').textContent=d.mission;
 $('#token-facts').innerHTML=d.facts.map(x=>'<span>'+x+'</span>').join('');
 const allocEntries=Object.entries(t.allocations);
 $('#allocation-master').innerHTML=allocEntries.map(([k,v])=>`<div class="alloc-quarter"><strong>${v}%</strong><span>${d.allocationLabels[k]||humanKey(k)}</span></div>`).join('');
 $('#suballocations').innerHTML=allocEntries.map(([k])=>`<div class="sub-group"><h4>${d.allocationLabels[k]||humanKey(k)}</h4>${(d.suballocations[k]||[]).map(x=>`<div class="sub-row"><span>${x[0]}</span><b>${x[1]}%</b></div>`).join('')}</div>`).join('');
 const fees=Object.entries(t.fee_split_percent);
 $('#fee-bar').innerHTML=fees.map(([k,v],i)=>`<span class="fee-segment" title="${humanKey(k)} ${v}%" style="width:${v}%;background:${feeColors[i%feeColors.length]}"></span>`).join('');
 $('#fee-legend').innerHTML=fees.map(([k,v],i)=>`<div class="fee-item"><span class="fee-swatch" style="background:${feeColors[i%feeColors.length]}"></span><span>${humanKey(k)}</span><b>${v}%</b></div>`).join('');
 $('#grace-title').textContent=t.name+' Development';
 $('#vesting-stack').innerHTML=d.vesting.map(v=>`<div class="vesting-row"><div class="fill" style="width:${Math.min(100,v.percent*4)}%"></div><div class="row-content"><span><b>${v.label}</b><br><small>${v.note}</small></span><strong>${v.percent}%</strong></div></div>`).join('');
 $('#vesting-timeline').textContent=d.timeline;
 const isWldz=selected==='WLDZ';
 $('#grace-verify').textContent=isWldz && mainnet.readiness.graceTimeEnforcedVestingVerified?'VERIFIED':'PRODUCTION VERIFY REQUIRED';
 $('#grace-verify').className='pill '+(isWldz&&mainnet.readiness.graceTimeEnforcedVestingVerified?'safe':'pending');
 $('#token-state').textContent=isWldz?'MAINNET LOCKED':'SEQUENCED / LOCKED';
 $('#launch-reason').textContent=isWldz?'WLDZ requires every remaining mainnet readiness control plus explicit human authorization.':'Deployment order requires earlier launch proof to be stable before this token proceeds.';
 renderGate();
}
function renderProof(){
 const r=mainnet.readiness;
 const proofKeys=['preMainnetExecutionProofPassed','onlyBFeeClaimProofPassed','autoRouteProofPassed','holderNativeSolProofPassed','lpGrowthProofPassed','buybackBurnProofPassed','charityNativeSolProofPassed','atomicRollbackProofPassed'];
 $('#proof-list').innerHTML=proofKeys.map(k=>`<div class="proof-row"><span class="ok">✓</span><span>${gateLabels[k]} — <b>${r[k]?'PASS':'NOT PROVEN'}</b></span></div>`).join('');
}
function renderGate(){
 if(selected!=='WLDZ'){
   $('#gate-title').textContent=selected+' — sequenced behind earlier proof';
   $('#gate-copy').textContent='The four-token master deliberately sequences launches. This token does not inherit a green mainnet gate merely because WLDZ has engineering proof.';
   $('#green-count').textContent='0'; $('#blocked-count').textContent='Gate not opened'; $('#gate-meter-fill').style.width='0%';
   const common=['Identity + fixed supply locked','Allocation totals = 100%','Fee routes = 100%','1% Legacy Loyalty pool defined','Wallet mapping','Production vesting','DEX/LP proof','AUTO routing','Equalizer / anti-Sybil proof','Signer / multisig authority','Jurisdiction + marketing review','Explicit JayJayTeamDev signing'];
   $('#gate-grid').innerHTML=common.map((x,i)=>`<div class="gate-item ${i<4?'pass':'block'}"><span class="mark">${i<4?'✓':'×'}</span><span>${x}</span></div>`).join('');
   return;
 }
 const entries=Object.entries(mainnet.readiness), green=entries.filter(([,v])=>v===true).length, blocked=entries.length-green;
 $('#gate-title').textContent='WLDZ — '+green+' of '+entries.length+' readiness controls green';
 $('#gate-copy').textContent='Preparation proof is accepted; production addresses, vesting, funding, legal/disclosure, security and final human authorization remain fail-closed where unresolved.';
 $('#green-count').textContent=green; $('#blocked-count').textContent=blocked; $('#gate-meter-fill').style.width=((green/entries.length)*100).toFixed(1)+'%';
 $('#gate-grid').innerHTML=entries.map(([k,v])=>`<div class="gate-item ${v?'pass':'block'}"><span class="mark">${v?'✓':'×'}</span><span>${gateLabels[k]||humanKey(k)}</span></div>`).join('');
}
function getWalletProvider(){
 const candidates=[window.phantom&&window.phantom.solana,window.solflare,window.solana].filter(Boolean);
 return candidates.find(p=>typeof p.connect==='function')||null;
}
async function connectWallet(){
 walletProvider=getWalletProvider();
 if(!walletProvider){
   $('#wallet-help').textContent="No injected Solana wallet was detected. On mobile, open launchpad.cryptoworldz.xyz inside Phantom or Solflare's in-app browser; on desktop, install/enable a compatible wallet extension.";
   $('#wallet-status').textContent='Wallet provider not detected'; setDot('#wallet-dot','warn'); return;
 }
 try{
   const response=await walletProvider.connect();
   const key=(response&&response.publicKey)||walletProvider.publicKey;
   if(!key) throw new Error('No public key returned');
   const address=key.toString();
   $('#wallet-address').textContent=address; $('#wallet-status').textContent='Connected • read-only LaunchPad session'; setDot('#wallet-dot','healthy');
   $('#connect-wallet').textContent='Wallet Connected'; $('#disconnect-wallet').disabled=false; $('#wallet-mini').textContent=address.slice(0,4)+'…'+address.slice(-4);
 }catch(e){
   $('#wallet-status').textContent='Connection cancelled or unavailable'; setDot('#wallet-dot','warn');
 }
}
async function disconnectWallet(){
 try{if(walletProvider&&typeof walletProvider.disconnect==='function')await walletProvider.disconnect();}catch{}
 walletProvider=null; $('#wallet-address').textContent='Public address will appear here'; $('#wallet-status').textContent='Not connected'; setDot('#wallet-dot','idle');
 $('#connect-wallet').textContent='Connect Solana Wallet'; $('#disconnect-wallet').disabled=true; $('#wallet-mini').textContent='Connect Wallet';
}
function renderRuntimeStatus(data){
 const z=data.zed||{}, a=data.auto||{}, g=data.grace||{};
 setDot('#zed-dot',z.state); setDot('#auto-dot',a.state); setDot('#grace-dot',g.state);
 $('#zed-state').textContent=z.state==='healthy'?'ZED Runtime Healthy':z.state==='gateway'?'Public Gateway Healthy':'ZED Runtime Degraded';
 $('#zed-detail').textContent=(z.service||'Public gateway')+(z.runtime?' • '+z.runtime:'');
 $('#auto-state').textContent=a.state==='healthy'?'AUTO Healthy':a.state==='protected'?'AUTO Route Protected':a.state==='missing'?'AUTO Route Missing':'AUTO Degraded';
 $('#auto-detail').textContent='HTTP '+(a.code||0);
 $('#grace-state').textContent=g.state==='healthy'?'G.R.A.C.E. Healthy':g.state==='protected'?'G.R.A.C.E. Protected':g.state==='missing'?'G.R.A.C.E. Health Missing':'G.R.A.C.E. Degraded';
 $('#grace-detail').textContent=(g.service||'HTTP '+(g.code||0))+(g.posting?' • '+g.posting:'');
 const full=z.state==='healthy'&&['healthy','protected'].includes(a.state)&&['healthy','protected'].includes(g.state);
 $('#runtime-notice').textContent=full?'Core runtime surfaces are responding. Protected operator actions remain outside this public LaunchPad.':'Public status is reporting one or more missing/degraded runtime surfaces. The LaunchPad does not hide that condition and mainnet remains locked.';
}
async function refreshRuntime(){
 const b=$('#refresh-runtime'); b.disabled=true; b.textContent='Checking…';
 try{
   const r=await fetch('/status.php?ts='+Date.now(),{cache:'no-store'});
   if(!r.ok)throw new Error('HTTP '+r.status);
   renderRuntimeStatus(await r.json());
 }catch(e){
   ['#zed-dot','#auto-dot','#grace-dot'].forEach(id=>setDot(id,'degraded'));
   $('#zed-state').textContent=$('#auto-state').textContent=$('#grace-state').textContent='Status unavailable';
   $('#runtime-notice').textContent='Live status probe could not be reached from this page. This is treated as unknown, not green.';
 }finally{b.disabled=false;b.textContent='Refresh Status';}
}
async function boot(){
 try{
   const [r1,r2,r3]=await Promise.all([
     fetch('/tokens.json',{cache:'no-store'}),fetch('/console-data.json',{cache:'no-store'}),fetch('/wldz-mainnet-plan.json',{cache:'no-store'})
   ]);
   if(!r1.ok||!r2.ok||!r3.ok)throw new Error('Launch data unavailable');
   registry=await r1.json(); details=await r2.json(); mainnet=await r3.json();
   if(registry.status!=='candidate-mainnet-disabled'||registry.shared.mainnet_authorized!==false||mainnet.executionEnabled!==false||mainnet.launchAuthorization!==false)throw new Error('Fail-closed release contract mismatch');
   const supply=[100000000,200000000,250000000,348000000];
   if(registry.tokens.length!==4||registry.tokens.some((t,i)=>t.fixed_supply!==supply[i]))throw new Error('Four-token master mismatch');
   renderProof(); renderToken(); refreshRuntime();
 }catch(e){
   console.error(e); document.body.dataset.boot='failed';
   $('#runtime-notice').textContent='WorldzLaunchPad refused to initialize because its verified launch data did not pass the fail-closed checks.';
 }
}
$('#connect-wallet').addEventListener('click',connectWallet); $('#wallet-mini').addEventListener('click',connectWallet); $('#disconnect-wallet').addEventListener('click',disconnectWallet); $('#refresh-runtime').addEventListener('click',refreshRuntime);
boot();
})();
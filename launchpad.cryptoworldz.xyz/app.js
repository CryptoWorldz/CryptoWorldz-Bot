(()=>{
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat('en-AU',{maximumFractionDigits:4}).format(Number(n)||0);
const feeColors=['#a74cff','#5d8bff','#38e3b0','#ffd166','#ff759c','#b66cff'];
let platform=null,walletProvider=null,lastManifest=null;
const build={chain:'solana',engine:'flash',quote:'SOL'};
let experienceMode='beginner';
let selectedRecipe='CUSTOM';
const CHAIN_CULTURE_NOTES=Object.freeze({
  solana:'SolWorldz: fast creator UX with Solana-native liquidity and proof. Worldz connects Solana without erasing Solana.',
  ethereum:'EthWorldz: EVM-native execution, Ethereum identity and transparent contract/market proof stay first-class.',
  base:'BaseWorldz: EVM-native execution with Base-native gas, liquidity and ecosystem context.',
  bnb:'BNBWorldz: BNB-native execution and Pancake/BNB market conventions remain visible where supported.',
  robinhood:'RobinWorldz: EVM-compatible execution with Robinhood Chain-specific market infrastructure exposed where verified.',
  xrpl:'XRPWorldz: native XRPL DEX, AMM, issuer controls, trust-line/MPT rules and XRP-first terminology — not a Solana clone.',
  sui:'SuiWorldz: Move-native assets and Sui-native execution remain native to Sui.'
});
const BEGINNER_HELP=Object.freeze({
  1:'Pick the blockchain community you want to launch in. Worldz will only show routes that have a real adapter or clearly mark them as planned/testnet.',
  2:'Choose how the token reaches a market. Direct liquidity starts with a pool; a curve starts with price discovery and can graduate into liquidity.',
  3:'Set the token identity and fixed supply. Worldz requires authority controls to be disclosed before a verified launch.',
  4:'Choose what your token trades against. A quote asset is the asset buyers use on the other side of the market.',
  5:'Choose distribution and fees inside the published Worldz limits. Nothing hidden should appear after you sign.',
  6:'Review the evidence before anything signs. Submitted is not confirmed; Worldz only treats chain-confirmed execution as success.'
});
const INTERMEDIATE_HELP=Object.freeze({
  1:'Choose a chain with its native execution model visible. Unsupported routes remain gated.',
  2:'Choose the market engine and graduation path. Worldz shows venue/protocol limits before signing.',
  3:'Set fixed supply, decimals and disclosed authorities with custom allocation controls.',
  4:'Choose the quote asset and liquidity relationship you want the market to use.',
  5:'Tune vesting, allocations and fees inside the 1.00% default / 3.00% hard-cap policy and disclosed venue rules.',
  6:'Review the manifest, proof gates and transaction simulation before any wallet approval.'
});
const ADVANCED_HELP=Object.freeze({
  1:'Worldz Leaders: select the sovereign chain rail while preserving chain-native execution and future Layer 1 + Layer 1.5 + 8 portability.',
  2:'Choose Flash, Curve, Curve Pro or verified chain-native architecture with graduation and liquidity topology exposed.',
  3:'Engineer full Token DNA: supply, utility, emissions/burn policy, authorities, vesting and concentration proof.',
  4:'Configure native or verified CrossPair quote architecture, including XRP/wXRP routes where proof exists.',
  5:'Configure multisig/treasury topology, creator economics, routing manifests and cross-chain constraints without bypassing Safe Launch rules.',
  6:'Inspect raw WorldzProof, adapter status, simulations, signer requirements and fail-closed release gates.'
});
const PUBLIC_REGISTRY_URL='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-launch-register';


function humanKey(k){return String(k).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());}
function setDot(id,state){const el=$(id);if(!el)return;el.className='state-dot '+(state==='healthy'?'good':state==='gateway'||state==='protected'?'warn':state==='missing'||state==='degraded'?'bad':'idle');}
function step(n){
  $$('.wizard-step').forEach(x=>x.classList.toggle('active',x.dataset.panel===String(n)));
  $$('.step-tab').forEach(x=>x.classList.toggle('active',x.dataset.step===String(n)));
  const help=$('#experience-help');
  if(help){
    const messages=experienceMode==='beginner'?BEGINNER_HELP:experienceMode==='intermediate'?INTERMEDIATE_HELP:ADVANCED_HELP;
    const label=experienceMode==='beginner'?'Beginner':experienceMode==='intermediate'?'Intermediate':'Advanced • Worldz Leaders';
    help.textContent=label+' Mode: '+(messages[Number(n)]||'Worldz keeps the choice explicit before you sign.');
  }
  const target=$('.builder'); if(target&&window.innerWidth<720)target.scrollIntoView({behavior:'smooth',block:'start'});
}
function setExperienceMode(mode){
  experienceMode=['beginner','intermediate','advanced'].includes(mode)?mode:'beginner';
  document.body.dataset.experience=experienceMode;
  $$('.experience-choice').forEach(x=>x.classList.toggle('hero-card',x.dataset.experience===experienceMode));
  $$('.experience-choice').forEach(x=>x.classList.toggle('active',x.dataset.experience===experienceMode));
  const labels=experienceMode==='beginner'
    ? ['World','Launch Style','Token','Trading Pair','Setup','Review']
    : experienceMode==='intermediate'
      ? ['Chain','Engine','Token','Pair','Economics','Proof']
      : ['Sovereign Rail','Architecture','Token DNA','CrossPair','Treasury + Economics','WorldzProof'];
  $$('.step-tab span').forEach((x,i)=>{if(labels[i])x.textContent=labels[i];});
  const active=$('.wizard-step.active');
  step(active?active.dataset.panel:1);
}
function updateChainCultureNote(chain){
  const note=$('#chain-culture-note');
  if(note)note.textContent=CHAIN_CULTURE_NOTES[chain]||'Worldz uses chain-native execution and keeps unsupported routes clearly gated.';
}
function selectChoice(group,el,key,value){
  $$(group+' .choice').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');build[key]=value;
}
function markChoice(selector,dataKey,value){
  $$(selector).forEach(x=>x.classList.toggle('selected',x.dataset[dataKey]===value));
}
function selectChain(el,chain){
  selectChoice('#chain-grid',el,'chain',chain);
  updateChainCultureNote(chain);
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
  const target=$('#founding-market'),badge=$('#founding-count');
  if(!target||!badge)return;
  const f=founding||{};
  const positions=Array.isArray(f.positions)?f.positions:[];
  const qualified=Number(f.qualifiedCount)||0;
  const pending=Number(f.pendingReviewCount)||0;
  badge.innerHTML='<i></i> '+Math.max(0,100-qualified)+' OF 100 POSITIONS REMAIN';
  if(!positions.length){
    target.innerHTML='<article class="market-card"><span class="market-num">#001?</span><div><strong>FOUNDING 100 POSITION #001 IS OPEN</strong><em>Verified mainnet launches only</em><small>No devnet launch can claim a Founding position.</small></div><div class="market-stat"><span>WORLDZ allocation</span><b>0.10% per qualified position</b></div><span class="arrow">→</span></article>';
    return;
  }
  target.innerHTML=positions.slice(0,12).map(x=>{
    const pos=x.founding_position?'#'+String(x.founding_position).padStart(3,'0'):'CANDIDATE '+String(x.candidate_order);
    const state=String(x.status||'pending_review').replaceAll('_',' ').toUpperCase();
    const name=escapeHtml(x.token_name||'Unnamed');
    const symbol=escapeHtml(x.symbol||'TOKEN');
    const team=escapeHtml(x.team_label||'Identity review pending');
    const allocation=Number(x.worldz_allocation_percent);
    const allocationText=Number.isFinite(allocation)?allocation.toFixed(2)+'%':'0.10%';
    const inner='<span class="market-num">'+escapeHtml(pos)+'</span><div><strong>'+name+'</strong><em>$'+symbol+'</em><small>'+escapeHtml(state)+' • '+escapeHtml(String(x.network||'').toUpperCase())+'</small></div><div class="market-stat"><span>Team</span><b>'+team+'</b></div><div class="market-stat"><span>WORLDZ allocation</span><b>'+allocationText+'</b></div><span class="arrow">'+(x.status==='qualified'?'TRUST →':'…')+'</span>';
    return x.mint?'<a class="market-card" href="/trust/?mint='+encodeURIComponent(x.mint)+'">'+inner+'</a>':'<article class="market-card">'+inner+'</article>';
  }).join('')+(pending?'<article class="market-card"><div><strong>'+pending+' candidate'+(pending===1?'':'s')+' awaiting review</strong><small>Candidate status is not an award.</small></div></article>':'');
}

async function renderMarket(){
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
      const mintShort=escapeHtml(shortAddress(x.mint));
      const fee=Number(x.project_fee_percent);
      const feeText=Number.isFinite(fee)?fee.toFixed(2)+'%':'—';
      const content='<span class="market-num">#'+String(i+1).padStart(3,'0')+'</span><div><strong>'+name+'</strong><em>$'+symbol+'</em><small>'+stage+' • '+env+'</small></div><div class="market-stat"><span>Engine</span><b>'+engine+'</b></div><div class="market-stat"><span>Token fee</span><b>'+feeText+'</b></div><div class="market-stat"><span>Mint</span><b>'+mintShort+'</b></div><span class="arrow">TRUST →</span>';
      return x.mint?'<a class="market-card" href="/trust/?mint='+encodeURIComponent(x.mint)+'" aria-label="Open Trust Passport for '+name+'">'+content+'</a>':'<article class="market-card">'+content+'</article>';
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
    ['3 / 5 / 8 LaunchPad contribution',JSON.stringify(platform.feePolicy?.worldzLaunchPadContributionChoicesPercent)==='[3,5,8]','CREATOR CHOICE'],
    ['0.60% disclosed platform genesis share',platform.feePolicy?.worldzLaunchPadShareOfTokenSupplyPercent===0.6,'0.25 / 0.20 / 0.15'],
    ['0% platform initial-liquidity share',platform.feePolicy?.worldzLaunchPadShareOfInitialLiquidityPercent===0,'HARD RULE'],
    ['Base Sepolia token adapter',platform.baseEvmFair?.status==='BASE_SEPOLIA_BETA','TESTNET'],
    ['Sui native fixed-supply adapter',platform.suiNative?.status==='DEVNET_BETA','DEVNET'],
    ['Founding 100 registry',platform.founding100?.totalPositions===100,'100 POSITIONS'],
    ['Worldz Trust Orbit',platform.trustOrbit?.status==='PUBLIC_BETA_LIVE','PROOF PASSPORT'],
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
      ?'Treasury vault is registered. Mainnet remains locked until the selected 3% / 5% / 8% Fee Flow V3 route and remaining release checks are proven.'
      :'The public platform is live now. Mainnet execution remains locked until the verified Worldz Treasury Multisig vault address and selected 3% / 5% / 8% Fee Flow V3 route are proven end-to-end.';
  }
}
function selectedLaunchPadContribution(){
  const allowed=platform?.feePolicy?.worldzLaunchPadContributionChoicesPercent||[3,5,8];
  const fallback=Number(platform?.feePolicy?.worldzLaunchPadContributionDefaultPercent||5);
  const el=$('#launchpad-contribution');
  const picked=Number(el?.value??fallback);
  return allowed.includes(picked)?picked:fallback;
}
function currentRoutes(){
  return {
    operationsProductDevelopment:20,
    treasury:20,
    lpGrowth:15,
    legacyCore:10,
    worldzCoreFamilyMarketBuys:10,
    impactCharity:10,
    teamBuilderRewards:5,
    futureLaunchInfrastructure:5,
    launchReferrer:5
  };
}
function setRecipeSelection(id){
  selectedRecipe=String(id||'CUSTOM');
  $$('#launch-recipes .choice').forEach(x=>x.classList.toggle('selected',x.dataset.recipe===selectedRecipe));
  const state=$('#recipe-state');if(state)state.textContent=selectedRecipe.replaceAll('_',' ');
}
function applyLaunchRecipe(id){
  const recipes=platform?.launchRecipes?.recipes||[];
  const recipe=recipes.find(x=>x.id===id);
  if(!recipe)return;
  setRecipeSelection(recipe.id);
  if(recipe.allocations){
    const values={...recipe.allocations};
    if(build.chain==='base'&&Number(values.creatorTeam)>5){
      const delta=Number(values.creatorTeam)-5;
      values.creatorTeam=5;
      values.growthEcosystem=Number(values.growthEcosystem||0)+delta;
    }
    for(const [key,value] of Object.entries(values)){
      const input=$('[data-allocation="'+key+'"]');if(input)input.value=String(value);
    }
  }
  feeMath();
}
function markRecipeCustom(){
  if(selectedRecipe!=='CUSTOM')setRecipeSelection('CUSTOM');
}
function feeMath(){
  const fee=Number($('#project-fee').value)||0,vol=Math.max(0,Number($('#example-volume').value)||0);
  const routes=currentRoutes(),launchPad=selectedLaunchPadContribution();
  const gross=vol*(fee/100),worldzAmount=gross*(launchPad/100),creatorRetained=gross-worldzAmount;
  $('#project-fee-value').textContent=fee.toFixed(2)+'%';
  const lpv=$('#launchpad-contribution-value');if(lpv)lpv.textContent=launchPad+'%';
  $('#gross-fee').textContent=fmt(gross);$('#worldz-fee').textContent=fmt(worldzAmount);$('#project-pool').textContent=fmt(creatorRetained);
  const total=Object.values(routes).reduce((s,x)=>s+(Number(x)||0),0);
  const rt=$('#route-total');if(rt){rt.textContent=total.toFixed(0)+'%';rt.className='pill '+(Math.abs(total-100)<.001?'safe':'locked');}
  const at=allocationTotal();
  $('#allocation-total').textContent=at.toFixed(0)+'%';$('#allocation-total').className='pill '+(Math.abs(at-100)<.001?'safe':'locked');
}
function currentAllocations(){
  const out={};$$('.allocation-input').forEach(x=>out[x.dataset.allocation]=Number(x.value)||0);return out;
}
function allocationTotal(){return Object.values(currentAllocations()).reduce((a,b)=>a+b,0);}
function publicBenefitRouteTotal(){
  const r=currentRoutes();
  return r.legacyCore+r.worldzCoreFamilyMarketBuys+r.lpGrowth+r.impactCharity+r.teamBuilderRewards+r.futureLaunchInfrastructure;
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
      version:'WORLDZ-FEE-FLOW-V3',
      builder:'WORLDZ-CHAIN-NATIVE-FEE-BUILDER-V1',
      projectTradingFeePercent:Number($('#project-fee').value),
      publicDefaultPercent:1,
      publicMaximumPercent:3,
      preferredIncrementPercent:0.25,
      worldzLaunchPadContributionPercent:selectedLaunchPadContribution(),
      creatorRetentionPercent:100-selectedLaunchPadContribution(),
      worldzLaunchPadContributionChoicesPercent:[3,5,8],
      worldzInternalDistributionPercent:currentRoutes(),
      treasuryLaneSplitPercent:{worldzOperationsTreasury:70,worldzMiracleTeamTreasury:30},
      legacyCorePercentOfWorldzContribution:10,
      legacyCoreTokenCount:12,
      worldzCoreFamilyMarketBuyPercentOfWorldzContribution:10,
      worldzLaunchPadShareOfTokenSupplyPercent:0.6,
      worldzLaunchPadShareOfInitialLiquidityPercent:0,
      walletTransferTax:false
    },
    launchRecipe:selectedRecipe,
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
  const m=manifestBase(),routes=Object.values(m.feePolicy.worldzInternalDistributionPercent).reduce((a,b)=>a+b,0);
  const alloc=m.supplyAllocationPercent,allocTotal=Object.values(alloc).reduce((a,b)=>a+b,0),r=m.feePolicy.worldzInternalDistributionPercent,p=platform.safeLaunchPolicy;
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
    ['Operations Treasury cap',alloc.treasuryReserve<=p.allocations.treasuryReserveMaxPercent,alloc.treasuryReserve.toFixed(1)+'% / max '+p.allocations.treasuryReserveMaxPercent+'%'],
    ['Founder cliff',m.safetyPolicy.founderCliffDays>=p.allocations.founderCliffMinDays,m.safetyPolicy.founderCliffDays+' days'],
    ['Founder vesting',m.safetyPolicy.founderVestingMonths>=p.allocations.founderVestingMinMonths,m.safetyPolicy.founderVestingMonths+' months'],
    ['Creator-controlled LP lock',m.safetyPolicy.creatorControlledLpLockPercent===100&&m.safetyPolicy.lpLockDays>=p.allocations.lpLockMinDays,'100% • '+m.safetyPolicy.lpLockDays+' days'],
    ['Project trading fee',m.feePolicy.projectTradingFeePercent>=platform.feePolicy.projectTradingFeeMinPercent&&m.feePolicy.projectTradingFeePercent<=platform.feePolicy.projectTradingFeeMaxPercent,m.feePolicy.projectTradingFeePercent.toFixed(2)+'%'],
    ['Project fee increment',Math.abs(((m.feePolicy.projectTradingFeePercent-platform.feePolicy.projectTradingFeeMinPercent)/platform.feePolicy.stepPercent)-Math.round((m.feePolicy.projectTradingFeePercent-platform.feePolicy.projectTradingFeeMinPercent)/platform.feePolicy.stepPercent))<1e-9,'0.25% steps'],
    ['Fee Flow V3 Worldz-internal split = 100%',Math.abs(routes-100)<.001,routes.toFixed(0)+'% OF WORLDZ SHARE'],
    ['Worldz internal values valid',Object.values(r).every(v=>Number.isFinite(v)&&v>=0&&v<=100),'No negative or >100% internal route'],
    ['Creator retention',[97,95,92].includes(m.feePolicy.creatorRetentionPercent),m.feePolicy.creatorRetentionPercent+'% OF ELIGIBLE FEE REVENUE'],
    ['Worldz contribution',[3,5,8].includes(m.feePolicy.worldzLaunchPadContributionPercent),m.feePolicy.worldzLaunchPadContributionPercent+'% • CREATOR SELECTED'],
    ['Operations / Product lane',r.operationsProductDevelopment===20,'20% OF WORLDZ SHARE'],
    ['Treasury lane',r.treasury===20,'20% OF WORLDZ SHARE'],
    ['Treasury 70/30 split',m.feePolicy.treasuryLaneSplitPercent.worldzOperationsTreasury===70&&m.feePolicy.treasuryLaneSplitPercent.worldzMiracleTeamTreasury===30,'70% OPERATIONS • 30% MIRACLE TEAM'],
    ['LP Growth lane',r.lpGrowth===15,'15% OF WORLDZ SHARE'],
    ['Legacy Core lane',r.legacyCore===10&&m.feePolicy.legacyCoreTokenCount===12,'10% OF WORLDZ SHARE • CLOSED 12 TOKEN SET'],
    ['WLDZ/RVIV/PNEX/MRCL lane',r.worldzCoreFamilyMarketBuys===10,'10% OF WORLDZ SHARE • 2.5% EACH'],
    ['Impact / Charity lane',r.impactCharity===10,'10% OF WORLDZ SHARE'],
    ['Team / Builder lane',r.teamBuilderRewards===5,'5% OF WORLDZ SHARE'],
    ['Future Launch / Infrastructure lane',r.futureLaunchInfrastructure===5,'5% OF WORLDZ SHARE'],
    ['Launch Referrer lane',r.launchReferrer===5,'5% OF WORLDZ SHARE'],
    ['0.60% genesis share / 0% initial LP take',m.feePolicy.worldzLaunchPadShareOfTokenSupplyPercent===0.6&&m.feePolicy.worldzLaunchPadShareOfInitialLiquidityPercent===0,'DISCLOSED HARD RULE'],
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
    const route=m.feePolicy.worldzInternalDistributionPercent,alloc=m.supplyAllocationPercent,sp=m.safetyPolicy;
    const q=new URLSearchParams({name:m.token.name,symbol:m.token.symbol,supply:String(m.token.fixedSupply),decimals:String(m.token.decimals),fixed:'1',description:m.token.description||'',engine:m.launchEngine,quote:m.quoteAsset,fee:String(m.feePolicy.projectTradingFeePercent),intent:hash,fee_v3:'1',launchpad_contribution:String(m.feePolicy.worldzLaunchPadContributionPercent),creator_retention:String(m.feePolicy.creatorRetentionPercent),v3_ops:String(route.operationsProductDevelopment||0),v3_treasury:String(route.treasury||0),v3_lp:String(route.lpGrowth||0),v3_legacy:String(route.legacyCore||0),v3_core_buys:String(route.worldzCoreFamilyMarketBuys||0),v3_impact:String(route.impactCharity||0),v3_team:String(route.teamBuilderRewards||0),v3_future:String(route.futureLaunchInfrastructure||0),v3_referrer:String(route.launchReferrer||0),alloc_creatorTeam:String(alloc.creatorTeam||0),alloc_liquidity:String(alloc.liquidity||0),alloc_communityPublic:String(alloc.communityPublic||0),alloc_treasuryReserve:String(alloc.treasuryReserve||0),alloc_growthEcosystem:String(alloc.growthEcosystem||0),creator_unlocked:String(sp.creatorUnlockedAtGenesisPercent),founder_cliff:String(sp.founderCliffDays),founder_vesting:String(sp.founderVestingMonths),lp_lock_days:String(sp.lpLockDays),multisig:sp.treasuryProgramMultisigAddress});
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
  $$('#launch-recipes .choice').forEach(b=>b.addEventListener('click',()=>applyLaunchRecipe(b.dataset.recipe)));
  $$('.experience-choice').forEach(b=>b.addEventListener('click',()=>setExperienceMode(b.dataset.experience)));
  $$('.next-step').forEach(b=>b.addEventListener('click',()=>step(b.dataset.next)));
  $$('.prev-step').forEach(b=>b.addEventListener('click',()=>step(b.dataset.prev)));
  $$('.step-tab').forEach(b=>b.addEventListener('click',()=>step(b.dataset.step)));
  $$('#chain-grid .choice').forEach(b=>b.addEventListener('click',()=>selectChain(b,b.dataset.chain)));
  $$('#engine-grid .choice').forEach(b=>b.addEventListener('click',()=>selectChoice('#engine-grid',b,'engine',b.dataset.engine)));
  $$('.quote').forEach(b=>b.addEventListener('click',()=>{$$('.quote').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');build.quote=b.dataset.quote;$('#wxrp-proof').classList.toggle('show',build.quote==='wXRP');}));
  $('#project-fee').addEventListener('input',feeMath);$('#example-volume').addEventListener('input',feeMath);$('#launchpad-contribution')?.addEventListener('change',feeMath);$$('.allocation-input').forEach(x=>x.addEventListener('input',()=>{markRecipeCustom();feeMath();}));
  $('#run-preflight').addEventListener('click',runPreflight);$('#download-manifest').addEventListener('click',downloadManifest);
  $('#wallet-mini').addEventListener('click',connectWallet);$('#refresh-runtime').addEventListener('click',refreshRuntime);
  $('#devnet-launch-link').addEventListener('click',e=>{if(e.currentTarget.getAttribute('aria-disabled')==='true')e.preventDefault();});
}
function validatePlatformConfig(candidate){
  if(candidate.publicLaunchPad!==true||candidate.publicLaunchIntakeEnabled!==true)throw new Error('Public LaunchPad contract mismatch');
  if(
    candidate.feePolicy?.projectTradingFeeDefaultPercent!==1||
    candidate.feePolicy?.projectTradingFeeMaxPercent!==3||
    candidate.feePolicy?.stepPercent!==0.25||
    candidate.feePolicy?.sixToTenPercentProjectTradingFeesOffered!==false||
    JSON.stringify(candidate.feePolicy?.worldzLaunchPadContributionChoicesPercent)!=='[3,5,8]'||
    candidate.feePolicy?.worldzLaunchPadContributionDefaultPercent!==5||
    JSON.stringify(candidate.feePolicy?.creatorRetentionByContribution)!=='{"3":97,"5":95,"8":92}'||
    candidate.feePolicy?.legacyCoreTokenCount!==12||
    candidate.feePolicy?.legacyCorePercentOfWorldzContribution!==10||
    candidate.feePolicy?.coreFamilyMarketBuyPercentOfWorldzContribution!==10||
    candidate.feePolicy?.worldzInternalSplitPercent?.operationsProductDevelopment!==20||
    candidate.feePolicy?.worldzInternalSplitPercent?.treasury!==20||
    candidate.feePolicy?.treasuryLane?.worldzOperationsTreasuryPercent!==70||
    candidate.feePolicy?.treasuryLane?.worldzMiracleTeamTreasuryPercent!==30
  )throw new Error('Worldz Fee Flow V3 contract mismatch');
  if(candidate.feePolicy?.worldzLaunchPadShareOfTokenSupplyPercent!==0.6||candidate.feePolicy?.worldzLaunchPadShareOfInitialLiquidityPercent!==0||candidate.feePolicy?.walletTransferTaxPercent!==0)throw new Error('Worldz 0.60% genesis / zero-liquidity / zero-transfer-tax contract mismatch');
  const p=candidate.safeLaunchPolicy;
  if(!p||p.version!=='WORLDZ-SAFE-LAUNCH-1'||p.compulsory.fixedSupply!==true||p.compulsory.revokeMintAuthorityAfterGenesis!==true||p.compulsory.revokeFreezeAuthorityAfterGenesis!==true)throw new Error('Safe Launch Standard contract mismatch');
  if(candidate.baseEvmFair?.status!=='BASE_SEPOLIA_BETA'||candidate.baseEvmFair?.mainnetExecution!==false)throw new Error('Base testnet adapter contract mismatch');
  if(candidate.founding100?.totalPositions!==100||candidate.founding100?.futureWorldzPoolPercent!==10||candidate.founding100?.equalAllocationPerQualifiedPositionPercent!==0.1)throw new Error('Founding 100 contract mismatch');
  if(candidate.trustOrbit?.version!=='WORLDZ-TRUST-ORBIT-1'||candidate.trustOrbit?.status!=='PUBLIC_BETA_LIVE'||candidate.trustOrbit?.jupiterIntegration?.officialJupiterEndorsement!==false)throw new Error('Trust Orbit contract mismatch');
  if(candidate.investmentCentre?.status!=='READ_ONLY_PORTFOLIO_RESEARCH_BETA'||candidate.investmentCentre?.executionEnabled!==false||candidate.investmentCentre?.guaranteeOfReturns!==false)throw new Error('Investment Centre contract mismatch');
  if(candidate.worldzMint?.version!=='WORLDZMINT-1'||candidate.worldzMint?.platformTokenSupplyTakePercent!==0.6||candidate.worldzMint?.compulsory?.revokeMintAuthorityAfterGenesis!==true||candidate.worldzMint?.compulsory?.revokeFreezeAuthorityAfterGenesis!==true)throw new Error('WorldzMINT contract mismatch');
  if(candidate.confidenceCurve?.version!=='WORLDZ-CONFIDENCE-CURVE-1'||candidate.confidenceCurve?.mainnetExecutionEnabled!==false||candidate.confidenceCurve?.feePolicy?.worldzSharePercentOfCollectedSupportedProjectTradingFee!==10)throw new Error('Confidence Curve contract mismatch');
  if(candidate.confidencePulse?.version!=='WORLDZ-CONFIDENCE-PULSE-1'||candidate.confidencePulse?.systemTradesCountTowardConfidence!==false)throw new Error('Confidence Pulse contract mismatch');
  if(candidate.confidenceConstellation?.version!=='WORLDZ-CONFIDENCE-CONSTELLATION-1'||candidate.confidenceConstellation?.opaqueSafetyScore!==false)throw new Error('Confidence Constellation contract mismatch');
  if(candidate.launchRecipes?.version!=='WORLDZ-LAUNCH-RECIPES-V1'||!Array.isArray(candidate.launchRecipes?.recipes)||candidate.launchRecipes.recipes.length<7)throw new Error('Launch Recipes contract mismatch');
  if(candidate.intelligenceStack?.rexTokenIntelligence?.overallSafetyScore!==false)throw new Error('REX evidence-only contract mismatch');
  return candidate;
}
async function fetchPlatformConfig(){
  const url='/platform-config.json?fresh='+Date.now();
  const r=await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
  if(!r.ok)throw new Error('Platform configuration unavailable (HTTP '+r.status+')');
  return validatePlatformConfig(await r.json());
}
async function boot(){
  let firstError=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      platform=await fetchPlatformConfig();
      bind();setExperienceMode('beginner');setRecipeSelection('CUSTOM');updateChainCultureNote(build.chain);feeMath();renderProof();renderMarket();refreshRuntime();
      document.body.dataset.boot='ready';
      return;
    }catch(e){
      firstError=firstError||e;
      console.error('WorldzLaunchPad boot attempt '+attempt+' failed',e);
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,900));
    }
  }
  document.body.dataset.boot='failed';
  const detail=(firstError&&firstError.message)?firstError.message:'Unknown configuration mismatch';
  alert('WorldzLaunchPad safety check blocked startup: '+detail+'\n\nThe builder stayed fail-closed. Refresh once after the deployment finishes.');
}
boot();

})();

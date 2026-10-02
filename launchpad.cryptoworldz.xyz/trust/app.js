const $=s=>document.querySelector(s);
const API='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-trust-orbit';
const REAL_INTELLIGENCE='/intelligence.php';

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmtNum(v,dec=2){
  const n=Number(v);if(!Number.isFinite(n))return '—';
  if(Math.abs(n)>=1e9)return (n/1e9).toFixed(dec)+'B';
  if(Math.abs(n)>=1e6)return (n/1e6).toFixed(dec)+'M';
  if(Math.abs(n)>=1e3)return (n/1e3).toFixed(dec)+'K';
  return n.toLocaleString(undefined,{maximumFractionDigits:dec});
}
function usd(v){const n=Number(v);if(!Number.isFinite(n))return '—';return '$'+(n<0.01?n.toPrecision(3):n.toLocaleString(undefined,{maximumFractionDigits:4}));}
function ringClass(status){
  if(['VERIFIED','VRFD_VERIFIED','PROOF_PRESENT','MINT_VERIFIED','TARGET_MET','VESTING_PROOF','LOCK_AND_LIQUIDITY_PROOF','ORGANIC_EVIDENCE'].includes(status))return 'good';
  if(['OPEN_AUTHORITY'].includes(status))return 'bad';
  return 'warn';
}
function ringCopy(r){
  const e=r.evidence||{};
  if(r.id==='authority')return e.mintAuthority===null&&e.freezeAuthority===null?'Mint and freeze authorities are both permanently absent.':'Mint authority: '+(e.mintAuthority?'OPEN':'NONE')+' • Freeze authority: '+(e.freezeAuthority?'OPEN':'NONE');
  if(r.id==='distribution')return e.top10Percentage!=null?'Largest 10 token accounts hold '+fmtNum(e.top10Percentage,2)+'% of current supply.':e.jupiterTopHoldersPercentage!=null?'Jupiter reports top-holder concentration of '+fmtNum(e.jupiterTopHoldersPercentage,2)+'%.':'Distribution concentration data is not currently available.';
  if(r.id==='worldz')return r.status==='NOT_WORLDZ_REGISTERED'?'No public WorldzMINT or WorldzLaunchPad proof is registered for this mint.':r.status==='MINT_VERIFIED'?'WorldzMINT fixed-supply genesis proof is registered. This does not claim a trading market or liquidity.':r.status==='VERIFIED'?'Worldz mainnet release-gate proof is registered and verified.':'A Worldz record exists, but the mainnet release gate is not marked fully verified.';
  if(r.id==='jupiter_identity')return r.status==='VRFD_VERIFIED'?'Jupiter currently reports this token as verified.':r.status==='JUPITER_UNVERIFIED'?'Jupiter has token data but does not currently report VRFD verification.':'No matching Jupiter token record was returned.';
  if(r.id==='organic_market')return e.organicScore!=null?'Jupiter Organic Score: '+fmtNum(e.organicScore,1)+' / 100 • '+String(e.organicScoreLabel||'').toUpperCase()+'.':'Jupiter has not returned enough organic-market data yet.';
  if(r.id==='locks_control')return e.worldzLockEnforced||e.worldzVestingEnforced?'Enforceable Worldz lock/vesting evidence is recorded for this launch.':'No token-specific enforceable lock/vesting proof is currently recorded in Worldz Trust Orbit.';
  return '';
}
function metric(label,value){return '<div class="metric"><small>'+esc(label)+'</small><b>'+esc(value)+'</b></div>';}
function pct(v,dec=2){const n=Number(v);return Number.isFinite(n)?n.toFixed(dec)+'%':'—';}
function starClass(status){
  return ['VERIFIED','TARGET_MET','VESTING_PROOF','LOCK_AND_LIQUIDITY_PROOF','ORGANIC_EVIDENCE','VRFD_VERIFIED'].includes(status)?'good':'warn';
}
function starCopy(x){
  const e=x.evidence||{};
  if(x.id==='authority')return x.status==='VERIFIED'?'Mint + freeze authorities are permanently absent.':'Authority proof is incomplete.';
  if(x.id==='holder')return e.largestObservedTokenAccountPercent!=null?'Largest observed token account: '+pct(e.largestObservedTokenAccountPercent)+'. Target marker: ≤'+pct(e.targetMaxPercent,0)+'.':'Holder concentration data is still building.';
  if(x.id==='dev')return e.jupiterDevBalancePercent!=null?'Jupiter-reported dev balance: '+pct(e.jupiterDevBalancePercent)+'. Target marker: ≤'+pct(e.targetMaxPercent,0)+'.':e.worldzMintCreatorLiquidPercent!=null?'Disclosed creator liquid allocation: '+pct(e.worldzMintCreatorLiquidPercent)+'. Strongest target: ≤'+pct(e.targetMaxPercent,0)+'.':'Dev-balance evidence is not yet available.';
  if(x.id==='team')return e.worldzVestingEnforced?'Enforceable vesting proof is present.':'Mint allocation disclosure alone is not team vesting proof.';
  if(x.id==='treasury')return e.treasuryAddress?'Treasury disclosed at '+pct(e.treasuryPercent)+'. Multisig status is verified separately when evidence exists.':'Treasury evidence is not yet available.';
  if(x.id==='liquidity')return e.liquidity!=null?'Observed liquidity: '+usd(e.liquidity)+'. LP-lock evidence: '+(e.worldzLockEnforced?'YES':'NOT YET')+'.':'Trading liquidity has not been established or observed.';
  if(x.id==='market')return e.matchedOrganicVolume24h!=null?'Matched organic 24h volume: '+usd(e.matchedOrganicVolume24h)+' • organic buyers: '+fmtNum(e.organicBuyerCount24h,0)+'.':'Organic-market evidence is still building.';
  if(x.id==='identity')return e.jupiterVerified?'Jupiter currently reports VRFD verification.':e.jupiterRecord?'Jupiter token record exists; VRFD not currently shown.':'No Jupiter token record returned yet.';
  return '';
}

function rexCard(name,status,copy){
  const cls=status==='EVIDENCE PRESENT'?'good':status==='REVIEW REQUIRED'?'bad':'warn';
  return '<article class="ring '+cls+'"><div class="ring-top"><h3>'+esc(name)+'</h3><span class="state">'+esc(status)+'</span></div><p>'+esc(copy)+'</p></article>';
}
function buildRexSignals(out){
  const rings=Array.isArray(out.rings)?out.rings:[];
  const authority=rings.find(x=>x.id==='authority')||{},distribution=rings.find(x=>x.id==='distribution')||{},locks=rings.find(x=>x.id==='locks_control')||{};
  const ae=authority.evidence||{},de=distribution.evidence||{},le=locks.evidence||{};
  const top10=de.top10Percentage??de.jupiterTopHoldersPercentage;
  return [
    ['Mint Authority',ae.mintAuthority===null?'EVIDENCE PRESENT':ae.mintAuthority?'REVIEW REQUIRED':'UNKNOWN',ae.mintAuthority===null?'Mint authority is absent.':ae.mintAuthority?'Mint authority remains active.':'Mint authority evidence unavailable.'],
    ['Freeze Authority',ae.freezeAuthority===null?'EVIDENCE PRESENT':ae.freezeAuthority?'REVIEW REQUIRED':'UNKNOWN',ae.freezeAuthority===null?'Freeze authority is absent.':ae.freezeAuthority?'Freeze authority remains active.':'Freeze authority evidence unavailable.'],
    ['Holder Concentration',top10!=null?(Number(top10)>50?'REVIEW REQUIRED':'EVIDENCE PRESENT'):'UNKNOWN',top10!=null?'Top 10 observed token accounts: '+pct(top10)+'. This is a concentration fact, not a safety score.':'Holder concentration evidence unavailable.'],
    ['Liquidity Protection',(le.worldzLockEnforced||le.worldzVestingEnforced)?'EVIDENCE PRESENT':'UNKNOWN',(le.worldzLockEnforced||le.worldzVestingEnforced)?'Worldz lock/vesting evidence is recorded.':'No independent token-specific Worldz lock/vesting proof is currently available.'],
    ['Related Wallets','UNKNOWN','Related-wallet analysis is not yet connected to a verified provider feed for this passport.'],
    ['Creator Selling','UNKNOWN','Creator-selling history is not inferred without original-deployer and transaction evidence.'],
    ['Bundled / Sniper Activity','UNKNOWN','Bundler/sniper evidence requires a verified provider or on-chain analysis feed.'],
    ['Malicious Links','UNKNOWN','Link reputation is not yet independently verified by this passport.']
  ];
}
function renderCreatorHistory(out){
  const w=out.worldz||{};
  return [
    metric('Worldz launch record',w.launchRegistered?'REGISTERED':'NONE / EXTERNAL'),
    metric('Original deployer','EVIDENCE PENDING'),
    metric('Related wallets','EVIDENCE PENDING'),
    metric('Previous launches','EVIDENCE PENDING')
  ].join('');
}
async function realIntelligence(mint){
  try{
    const r=await fetch(REAL_INTELLIGENCE+'?mint='+encodeURIComponent(mint)+'&x='+Date.now(),{cache:'no-store'});
    const out=await r.json().catch(()=>null);
    return r.ok&&out?.ok?out:null;
  }catch{return null;}
}
function renderRealIntelligence(real){
  if(!real){
    $('#data-sources').innerHTML=metric('Cross-provider evidence','UNAVAILABLE');
    $('#liquidity-intel').innerHTML=metric('Observed liquidity','—');
    return;
  }
  const providers=Array.isArray(real.providers)?real.providers:[];
  $('#data-sources').innerHTML=providers.map(x=>metric(x.provider,String(x.status||'UNKNOWN').replaceAll('_',' '))).join('');
  const liq=real.liquidity||{};
  $('#liquidity-intel').innerHTML=[
    metric('DEX pairs observed',liq.pairCount??'—'),
    metric('Deepest liquidity',liq.deepestPair?.liquidityUsd!=null?usd(liq.deepestPair.liquidityUsd):'—'),
    metric('Observed DEX liquidity',liq.aggregateObservedDexLiquidityUsd!=null?usd(liq.aggregateObservedDexLiquidityUsd):'—'),
    metric('Deepest venue',liq.deepestPair?.dexId||'—')
  ].join('');
}
async function lookup(mint){
  $('#status').className='status';$('#status').textContent='Reading Solana + Worldz Proof + Jupiter signals…';
  $('#result').classList.add('hidden');
  try{
    const [trustResponse,real]=await Promise.all([
      fetch(API+'?mint='+encodeURIComponent(mint),{cache:'no-store'}),
      realIntelligence(mint)
    ]);
    const out=await trustResponse.json().catch(()=>({}));
    if(!trustResponse.ok||!out.ok)throw new Error(out.detail||out.error||('HTTP '+trustResponse.status));
    out.realIntelligence=real;
    render(out);
    const u=new URL(location.href);u.searchParams.set('mint',mint);history.replaceState(null,'',u);
    $('#status').className='status good';$('#status').textContent='TRUST PASSPORT UPDATED ✅\nEvidence checked: '+new Date(out.checkedAt).toLocaleString();
  }catch(e){
    $('#status').className='status bad';$('#status').textContent='TRUST PASSPORT CHECK FAILED\n'+(e?.message||String(e));
  }
}
function render(out){
  const j=out.jupiter||{},w=out.worldz||{},o=out.onChain||{},pulse=out.confidencePulse||{},real=out.realIntelligence||null;
  $('#token-name').textContent=j.name||w.mint?.tokenName||w.launch?.tokenName||'Solana Token';
  $('#token-symbol').textContent=j.symbol?String.fromCharCode(36)+j.symbol:(w.mint?.symbol?String.fromCharCode(36)+w.mint.symbol:'SOLANA TOKEN');
  $('#mint').textContent=out.mint;
  const icon=$('#token-icon');
  if(j.icon){icon.src=j.icon;icon.style.display='block';}else{icon.removeAttribute('src');icon.style.display='none';}
  $('#metrics').innerHTML=[
    metric('Supply',o.rawSupply?fmtNum(Number(o.rawSupply)/(10**Number(o.decimals||0)),2):'—'),
    metric('Jupiter VRFD',j.isVerified===true?'VERIFIED':'Not verified'),
    metric('Organic Score',j.organicScore!=null?fmtNum(j.organicScore,1)+'/100':'—'),
    metric('Organic Label',j.organicScoreLabel?String(j.organicScoreLabel).toUpperCase():'—'),
    metric('Holders',j.holderCount!=null?fmtNum(j.holderCount,0):'—'),
    metric('Liquidity',j.liquidity!=null?usd(j.liquidity):'—'),
    metric('Price',j.usdPrice!=null?usd(j.usdPrice):'—'),
    metric('Worldz Launch',w.launchRegistered?'REGISTERED':'External / none')
  ].join('');
  $('#pulse-metrics').innerHTML=[
    metric('Raw Market Cap',pulse.rawMarketCap!=null?usd(pulse.rawMarketCap):'—'),
    metric('Matched Organic 24h',pulse.matchedOrganicVolume24h!=null?usd(pulse.matchedOrganicVolume24h):'—'),
    metric('Matched Turnover',pct(pulse.matchedOrganicTurnover24h)),
    metric('Organic Balance',pct(pulse.organicTwoSidedBalance)),
    metric('Organic Buyers 24h',pulse.organicBuyerCount24h!=null?fmtNum(pulse.organicBuyerCount24h,0):'—'),
    metric('Organic Volume Share',pct(pulse.organicShareOfVolume24h)),
    metric('Liquidity / MCap',pct(pulse.liquidityToMarketCap)),
    metric('System Trades',pulse.systemTradesCountTowardConfidence===false?'EXCLUDED':'UNKNOWN')
  ].join('');
  $('#constellation').innerHTML=(out.confidenceConstellation||[]).map(x=>'<article class="star '+starClass(x.status)+'"><b>⭐ '+esc(x.name)+'</b><span>'+esc(String(x.status).replaceAll('_',' '))+'</span><p>'+esc(starCopy(x))+'</p></article>').join('');
  if(real?.onchain){
    const ro=real.onchain;
    const rr=real.rugcheck||{};
    const rc=real.creatorHistory||{};
    const rex=[
      ['Mint Authority',ro.mintAuthority===null?'EVIDENCE PRESENT':'REVIEW REQUIRED',ro.mintAuthority===null?'Mint authority is absent on Solana.':'Mint authority remains active: '+String(ro.mintAuthority)],
      ['Freeze Authority',ro.freezeAuthority===null?'EVIDENCE PRESENT':'REVIEW REQUIRED',ro.freezeAuthority===null?'Freeze authority is absent on Solana.':'Freeze authority remains active: '+String(ro.freezeAuthority)],
      ['Holder Concentration',ro.top10ObservedTokenAccountPercent==null?'UNKNOWN':Number(ro.top10ObservedTokenAccountPercent)>50?'REVIEW REQUIRED':'EVIDENCE PRESENT',ro.top10ObservedTokenAccountPercent==null?'Top-10 concentration unavailable.':'Top 10 observed token accounts hold '+pct(ro.top10ObservedTokenAccountPercent)+'. Accounts may include LP, treasury or exchange custody.'],
      ['Liquidity Protection','UNKNOWN',real.liquidity?.deepestPair?'Liquidity is observed, but lock/permanent-protection evidence is a separate proof.':'No DEX pair was observed by the connected provider.'],
      ['Related Wallets','UNKNOWN','No wallet relationship is inferred without attributable evidence.'],
      ['Creator Selling','UNKNOWN',rc.originalDeployerCandidate?'Original deployer evidence exists; sell history still requires transaction reconstruction.':'Original deployer evidence is incomplete, so creator selling is not inferred.'],
      ['Provider Risk Signals',Array.isArray(rr.risks)&&rr.risks.length?'REVIEW REQUIRED':'UNKNOWN',Array.isArray(rr.risks)&&rr.risks.length?rr.risks.length+' RugCheck risk signal(s) observed. Open provider evidence before drawing conclusions.':'No provider risk rows were returned or the provider was unavailable.'],
      ['Malicious Links','UNKNOWN','Token-risk feeds are not treated as malicious-link reputation feeds.']
    ];
    $('#rex-signals').innerHTML=rex.map(x=>rexCard(x[0],x[1],x[2])).join('');
    $('#creator-history').innerHTML=[
      metric('History state',rc.status||'UNKNOWN'),
      metric('Original deployer',rc.originalDeployerCandidate?String(rc.originalDeployerCandidate).slice(0,6)+'…'+String(rc.originalDeployerCandidate).slice(-6):'NOT PROVEN'),
      metric('Creation tx',rc.creationSignature?String(rc.creationSignature).slice(0,8)+'…':'—'),
      metric('Worldz previous launches',rc.worldzRegistry?.launchCount??'—'),
      metric('History complete',rc.historyComplete===true?'YES':rc.historyComplete===false?'NO':'UNKNOWN')
    ].join('');
  }else{
    $('#rex-signals').innerHTML=buildRexSignals(out).map(x=>rexCard(x[0],x[1],x[2])).join('');
    $('#creator-history').innerHTML=renderCreatorHistory(out);
  }
  renderRealIntelligence(real);
  $('#rings').innerHTML=(out.rings||[]).map(r=>'<article class="ring '+ringClass(r.status)+'"><div class="ring-top"><h3>'+esc(r.name)+'</h3><span class="state">'+esc(String(r.status).replaceAll('_',' '))+'</span></div><p>'+esc(ringCopy(r))+'</p></article>').join('');
  const count=out.proofSummary?.verifiedEvidenceRings??0,total=out.proofSummary?.totalRings??6;
  $('#passport-note').innerHTML='<b>'+esc(count)+' of '+esc(total)+' rings currently contain a positive verified/proof-present state.</b> This is an evidence count, <b>not</b> a safety score. A token can still carry risks that these rings do not measure.';
  $('#result').classList.remove('hidden');
}
$('#lookup-form').addEventListener('submit',e=>{e.preventDefault();const mint=$('#mint-input').value.trim();if(mint)lookup(mint);});
const initial=new URLSearchParams(location.search).get('mint');if(initial){$('#mint-input').value=initial;lookup(initial);}

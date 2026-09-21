const $=s=>document.querySelector(s);
const API='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-trust-orbit';

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

async function lookup(mint){
  $('#status').className='status';$('#status').textContent='Reading Solana + Worldz Proof + Jupiter signals…';
  $('#result').classList.add('hidden');
  try{
    const r=await fetch(API+'?mint='+encodeURIComponent(mint),{cache:'no-store'});
    const out=await r.json().catch(()=>({}));
    if(!r.ok||!out.ok)throw new Error(out.detail||out.error||('HTTP '+r.status));
    render(out);
    const u=new URL(location.href);u.searchParams.set('mint',mint);history.replaceState(null,'',u);
    $('#status').className='status good';$('#status').textContent='TRUST PASSPORT UPDATED ✅\nEvidence checked: '+new Date(out.checkedAt).toLocaleString();
  }catch(e){
    $('#status').className='status bad';$('#status').textContent='TRUST PASSPORT CHECK FAILED\n'+(e?.message||String(e));
  }
}
function render(out){
  const j=out.jupiter||{},w=out.worldz||{},o=out.onChain||{},pulse=out.confidencePulse||{};
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
  $('#rings').innerHTML=(out.rings||[]).map(r=>'<article class="ring '+ringClass(r.status)+'"><div class="ring-top"><h3>'+esc(r.name)+'</h3><span class="state">'+esc(String(r.status).replaceAll('_',' '))+'</span></div><p>'+esc(ringCopy(r))+'</p></article>').join('');
  const count=out.proofSummary?.verifiedEvidenceRings??0,total=out.proofSummary?.totalRings??6;
  $('#passport-note').innerHTML='<b>'+esc(count)+' of '+esc(total)+' rings currently contain a positive verified/proof-present state.</b> This is an evidence count, <b>not</b> a safety score. A token can still carry risks that these rings do not measure.';
  $('#result').classList.remove('hidden');
}
$('#lookup-form').addEventListener('submit',e=>{e.preventDefault();const mint=$('#mint-input').value.trim();if(mint)lookup(mint);});
const initial=new URLSearchParams(location.search).get('mint');if(initial){$('#mint-input').value=initial;lookup(initial);}

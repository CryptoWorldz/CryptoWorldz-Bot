import {isInstalled,getAddress,getNetwork,submitTransaction} from 'https://esm.sh/@gemwallet/api@3.7.0?bundle';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const BLACKHOLE_ACCOUNT='rrrrrrrrrrrrrrrrrrrrrhoLvTp';
let wallet='',network='',lastNativeProof=null;
const state={defaultRipple:false,noFreeze:false,allowEscrow:false,trust:false,issued:false,amm:false,offer:false,blackholeKey:false,masterDisabled:false};

function status(t,c=''){const e=$('#status');e.textContent=t;e.className='status'+(c?' '+c:'');}
function proofStatus(t,c=''){const e=$('#proof');e.textContent=t;e.className='status'+(c?' '+c:'');}
function validAddr(s){return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(String(s||''));}
function positive(v){return /^\d+(\.\d+)?$/.test(String(v||''))&&Number(v)>0;}
function drops(x){const n=Number(x);if(!Number.isFinite(n)||n<=0)throw new Error('XRP amount must be greater than zero.');return String(Math.round(n*1_000_000));}
function feeUnits(p){const n=Number(p);if(!Number.isFinite(n)||n<0||n>1)throw new Error('XRPL AMM fee must be 0%–1%.');return Math.round(n*1000);}
function marketRoute(){return $('#market-route').value;}
function values(){return{
  issuer:$('#issuer').value.trim(),hot:$('#hot').value.trim(),currency:$('#currency').value.trim().toUpperCase(),
  supply:$('#supply').value.trim(),route:marketRoute(),
  tokenLiquidity:$('#token-liquidity').value.trim(),xrpLiquidity:$('#xrp-liquidity').value.trim(),ammFee:Number($('#amm-fee').value),
  clobToken:$('#clob-token').value.trim(),clobPrice:$('#clob-price').value.trim()
};}
function ammPrice(v=values()){const t=Number(v.tokenLiquidity),x=Number(v.xrpLiquidity);return t>0&&x>0?x/t:null;}
function clobTotal(v=values()){const t=Number(v.clobToken),p=Number(v.clobPrice);return t>0&&p>0?t*p:null;}
function divergence(v=values()){
  const a=ammPrice(v),c=Number(v.clobPrice);
  if(!(a>0&&c>0))return null;
  return Math.abs(c-a)/a*100;
}
function updateMath(){
  const a=ammPrice(),total=clobTotal(),d=divergence();
  $('#amm-price').value=a==null?'':a.toPrecision(8);
  $('#clob-total').value=total==null?'':total.toFixed(6)+' XRP';
  $('#price-divergence').value=d==null?'':d.toFixed(2)+'%';
}
function renderRoute(){
  const route=marketRoute();
  $('#amm-card').style.display=route==='CLOB'?'none':'block';
  $('#clob-card').style.display=route==='AMM'?'none':'block';
  $$('#market-route-cards .choice').forEach(x=>x.classList.toggle('selected',x.dataset.route===route));
  updateMath();preflight(false);
}
async function connect(){
  try{
    const ins=await isInstalled();if(!ins?.result?.isInstalled)throw new Error('GemWallet extension is not installed.');
    const [a,n]=await Promise.all([getAddress(),getNetwork()]);
    wallet=a?.result?.address||'';network=n?.result?.network||'';
    if(!validAddr(wallet))throw new Error('GemWallet returned no XRPL classic address.');
    if(String(network).toLowerCase()!=='testnet')throw new Error('Switch GemWallet to XRPL Testnet first.');
    if(!$('#issuer').value)$('#issuer').value=wallet;
    $('#connect').textContent=wallet.slice(0,6)+'…'+wallet.slice(-5);$('#connect').classList.add('connected');
    status('GEMWALLET CONNECTED\n'+wallet+'\nNetwork: '+network+'\nNo transaction requested.','good');
    preflight(false);
  }catch(e){status('XRPL WALLET CONNECTION FAILED\n'+(e?.message||e),'bad');}
}
function baseErrors(v){
  const e=[];
  if(!wallet)e.push('Connect GemWallet.');
  if(String(network).toLowerCase()!=='testnet')e.push('GemWallet must be on Testnet.');
  if(!validAddr(v.issuer))e.push('Issuer address is invalid.');
  if(!validAddr(v.hot))e.push('Hot wallet address is invalid.');
  if(v.issuer&&v.hot&&v.issuer===v.hot)e.push('Issuer and hot wallet must be different accounts.');
  if(!/^[A-Z0-9]{3}$/.test(v.currency)||v.currency==='XRP')e.push('Use a 3-character token code other than XRP.');
  if(!positive(v.supply))e.push('Supply must be positive.');
  return e;
}
function marketErrors(v){
  const e=[];
  if(v.route==='AMM'||v.route==='BOTH'){
    if(!positive(v.tokenLiquidity))e.push('AMM token amount must be positive.');
    if(!positive(v.xrpLiquidity))e.push('AMM XRP amount must be positive.');
    if(Number(v.tokenLiquidity)>=Number(v.supply))e.push('AMM token amount must be less than intended supply.');
    if(!Number.isFinite(v.ammFee)||v.ammFee<0||v.ammFee>1)e.push('XRPL AMM fee must be 0%–1%.');
  }
  if(v.route==='CLOB'||v.route==='BOTH'){
    if(!positive(v.clobToken))e.push('CLOB token amount must be positive.');
    if(!positive(v.clobPrice))e.push('CLOB XRP-per-token price must be positive.');
    if(Number(v.clobToken)>=Number(v.supply))e.push('CLOB token amount must be less than intended supply.');
  }
  if(v.route==='BOTH'){
    if(Number(v.tokenLiquidity)+Number(v.clobToken)>Number(v.supply))e.push('AMM + CLOB token commitments cannot exceed intended supply.');
    const d=divergence(v);if(d!=null&&d>10)e.push('Hybrid CLOB seed price differs from the AMM implied ratio by more than 10%. Align the two starting prices first.');
  }
  return e;
}
function setButtons(ok){
  ['#default-ripple','#no-freeze','#trust','#issue'].forEach(id=>$(id).disabled=!ok);
  $('#amm').disabled=!ok||marketRoute()==='CLOB';
  $('#offer').disabled=!ok||marketRoute()==='AMM';
  const tokenEscrowEnabled=lastNativeProof?.features?.TokenEscrow?.enabled===true;
  $('#allow-escrow').disabled=!ok||!tokenEscrowEnabled;
  updateBlackholeButtons();
}
function preflight(show=true){
  const v=values(),e=[...baseErrors(v),...marketErrors(v)];
  updateMath();
  const ok=!e.length;setButtons(ok);
  if(show)status(e.length?'XRPL PREFLIGHT BLOCKED\n• '+e.join('\n• '):
    'XRPL PREFLIGHT PASS\nIssuer: '+v.issuer+'\nHot wallet: '+v.hot+'\nCurrency: '+v.currency+'\nIntended supply: '+v.supply+'\nMarket route: '+v.route+
    (v.route!=='CLOB'?'\nAMM fee: '+v.ammFee+'%':'')+'\n\nEvery wallet approval remains explicit. A returned hash is SUBMITTED, not CONFIRMED.','good');
  return ok;
}
async function txStatus(hash){
  const r=await fetch('/xrpl-transaction-status.php?network=testnet&tx='+encodeURIComponent(hash)+'&x='+Date.now(),{cache:'no-store'});
  const out=await r.json().catch(()=>({}));
  if(!r.ok||!out.ok)throw new Error(out.error||('HTTP '+r.status));
  return out;
}
async function waitForFinal(hash,label){
  for(let i=0;i<7;i++){
    await new Promise(resolve=>setTimeout(resolve,i===0?900:1400));
    try{
      const out=await txStatus(hash);
      if(out.state==='CONFIRMED'){
        proofStatus(label+' — CONFIRMED\nTransaction: '+hash+'\nLedger: '+String(out.ledgerIndex||'—')+'\nFee: '+String(out.feeDrops||'—')+' drops','good');
        return out;
      }
      if(out.state==='FAILED'){
        proofStatus(label+' — FAILED\nTransaction: '+hash+'\nResult: '+String(out.transactionResult||'unknown'),'bad');
        return out;
      }
      proofStatus(label+' — '+(out.state==='CONFIRMING'?'CONFIRMING':'SUBMITTED')+'\nTransaction: '+hash+'\nWaiting for validated XRPL evidence…','warn');
    }catch{}
  }
  proofStatus(label+' — SUBMITTED / FINALITY NOT YET PROVEN\nTransaction: '+hash+'\nUse Read XRPL Native Proof or transaction diagnosis before retrying.','warn');
  return {state:'SUBMITTED',txId:hash};
}
async function send(tx,label){
  if(!preflight(false))throw new Error('Preflight blocked. Run XRPL Preflight for details.');
  const out=await submitTransaction({transaction:tx});
  if(out?.type==='reject'||!out?.result?.hash)throw new Error(label+' was rejected or returned no transaction hash.');
  const hash=String(out.result.hash).toUpperCase();
  proofStatus(label+' — SUBMITTED\nTransaction: '+hash+'\nNot yet confirmed.','warn');
  return waitForFinal(hash,label);
}
async function ensureAccount(expected,label){
  await connect();if(wallet!==expected)throw new Error('Switch GemWallet to the '+label+' account '+expected+' and reconnect.');
}
function markIfConfirmed(result,key){if(result?.state==='CONFIRMED')state[key]=true;return result?.state==='CONFIRMED';}

async function readNativeProof(){
  const v=values();
  if(!validAddr(v.issuer))return status('Enter/connect a valid issuer first.','bad');
  const q=new URLSearchParams({network:'testnet',issuer:v.issuer});
  if(validAddr(v.hot))q.set('hot',v.hot);
  if(/^[A-Z0-9]{3}$/.test(v.currency))q.set('currency',v.currency);
  $('#read-proof').disabled=true;$('#read-proof').textContent='Reading…';
  try{
    const r=await fetch('/xrpl-intelligence.php?'+q.toString()+'&x='+Date.now(),{cache:'no-store'});
    const out=await r.json().catch(()=>({}));
    if(!r.ok||!out.ok)throw new Error(out.error||('HTTP '+r.status));
    lastNativeProof=out;
    renderNativeProof(out);setButtons(preflight(false));
    return out;
  }catch(e){proofStatus('XRPL NATIVE PROOF UNAVAILABLE\n'+(e?.message||e),'bad');return null;}
  finally{$('#read-proof').disabled=false;$('#read-proof').textContent='Read XRPL Native Proof';}
}
function renderNativeProof(out){
  const i=out.issuer||{},t=out.token||{},m=out.markets||{},f=out.features||{},s=out.standardDecision||{};
  const issuerState=i.accountFound?(i.blackholeVerified?'BLACKHOLED / IMMUTABLE':'ACCOUNT FOUND'):'NOT PROVEN';
  const supplyState=i.blackholeVerified?'FIXED-SUPPLY CONTROL PROVEN':(i.disableMaster?'MASTER DISABLED — CHECK ALTERNATIVE CONTROL':'ISSUER REMAINS OPERABLE');
  $('#native-proof').innerHTML=[
    ['Issuer',issuerState],
    ['Default Ripple',i.defaultRipple===true?'YES':i.defaultRipple===false?'NO':'UNKNOWN'],
    ['No Freeze',i.noFreeze===true?'YES':i.noFreeze===false?'NO':'UNKNOWN'],
    ['Supply control',supplyState],
    ['Issued obligation',t.issuedObligation??'—'],
    ['Hot trust line',t.hotTrustLine?'FOUND':'NOT PROVEN'],
    ['AMM',m.amm?.status||'NOT READ'],
    ['CLOB asks / bids',m.clob?String(m.clob.askCount)+' / '+String(m.clob.bidCount):'NOT READ']
  ].map(x=>'<div><small>'+String(x[0])+'</small><b>'+String(x[1])+'</b></div>').join('');
  const mpt1=f.MPTokensV1?.enabled===true, mpt2=f.MPTokensV2?.enabled===true;
  $('#mpt-status').textContent=
    'MPTokensV1 issuance: '+(mpt1?'ENABLED':f.MPTokensV1?.enabled===false?'NOT ENABLED':'UNKNOWN')+
    '\nMPTokensV2 market parity: '+(mpt2?'ENABLED — separate Worldz execution proof still required':'NOT PROVEN')+
    '\nCurrent XRPWorldz trading launch standard: '+String(s.current||'TRUST_LINE_TOKEN');
  proofStatus(
    'XRPL NATIVE PROOF READ\nIssuer: '+issuerState+
    '\nRegularKey: '+String(i.regularKey||'none')+
    '\nSignerList count: '+String(i.signerListCount??'unknown')+
    '\nDelegate count: '+String(i.delegateCount??'unknown')+
    '\nAMM: '+String(m.amm?.status||'not read')+
    '\nCLOB asks / bids: '+String(m.clob?.askCount??'—')+' / '+String(m.clob?.bidCount??'—')+
    '\n\nEvidence is shown separately; no fake safety score.','good');
}
function blackholeReadyForKey(){
  const i=lastNativeProof?.issuer;
  return !!i?.accountFound && i.signerListCount===0 && i.delegateCount===0 && $('#blackhole-confirm').value.trim()==='BLACKHOLE';
}
function blackholeReadyForDisable(){
  const i=lastNativeProof?.issuer;
  return blackholeReadyForKey() && i?.regularKey===BLACKHOLE_ACCOUNT && i?.disableMaster!==true;
}
function updateBlackholeButtons(){
  $('#set-blackhole-key').disabled=!blackholeReadyForKey();
  $('#disable-master').disabled=!blackholeReadyForDisable();
}

$('#connect').onclick=connect;$('#check').onclick=()=>preflight(true);$('#read-proof').onclick=readNativeProof;
$('#market-route').addEventListener('change',renderRoute);
$$('#market-route-cards .choice').forEach(b=>b.addEventListener('click',()=>{$('#market-route').value=b.dataset.route;renderRoute();}));
for(const id of ['#hot','#currency','#supply','#token-liquidity','#xrp-liquidity','#amm-fee','#clob-token','#clob-price']){
  $(id).addEventListener('input',()=>{updateMath();preflight(false);});
}
$('#blackhole-confirm').addEventListener('input',updateBlackholeButtons);

$('#default-ripple').onclick=async()=>{try{const v=values();await ensureAccount(v.issuer,'issuer');const r=await send({TransactionType:'AccountSet',Account:v.issuer,SetFlag:8},'Default Ripple enabled');markIfConfirmed(r,'defaultRipple');if(r.state==='CONFIRMED')await readNativeProof();}catch(e){status(e?.message||e,'bad');}};
$('#no-freeze').onclick=async()=>{try{const v=values();await ensureAccount(v.issuer,'issuer');const r=await send({TransactionType:'AccountSet',Account:v.issuer,SetFlag:6},'No Freeze enabled');markIfConfirmed(r,'noFreeze');if(r.state==='CONFIRMED')await readNativeProof();}catch(e){status(e?.message||e,'bad');}};
$('#allow-escrow').onclick=async()=>{try{const v=values();if(lastNativeProof?.features?.TokenEscrow?.enabled!==true)throw new Error('TokenEscrow amendment is not proven enabled by XRPL evidence.');await ensureAccount(v.issuer,'issuer');const r=await send({TransactionType:'AccountSet',Account:v.issuer,SetFlag:17},'Trust-line token escrow enabled');markIfConfirmed(r,'allowEscrow');if(r.state==='CONFIRMED')await readNativeProof();}catch(e){status(e?.message||e,'bad');}};
$('#trust').onclick=async()=>{try{const v=values();await ensureAccount(v.hot,'hot');const r=await send({TransactionType:'TrustSet',Account:v.hot,LimitAmount:{currency:v.currency,issuer:v.issuer,value:v.supply}},'Hot-wallet trust line created');markIfConfirmed(r,'trust');if(r.state==='CONFIRMED')await readNativeProof();}catch(e){status(e?.message||e,'bad');}};
$('#issue').onclick=async()=>{try{const v=values();await ensureAccount(v.issuer,'issuer');const r=await send({TransactionType:'Payment',Account:v.issuer,Destination:v.hot,Amount:{currency:v.currency,issuer:v.issuer,value:v.supply}},'Token supply issued');markIfConfirmed(r,'issued');if(r.state==='CONFIRMED')await readNativeProof();}catch(e){status(e?.message||e,'bad');}};
$('#amm').onclick=async()=>{try{const v=values();if(v.route==='CLOB')throw new Error('AMM route is not selected.');await ensureAccount(v.hot,'hot');const r=await send({TransactionType:'AMMCreate',Account:v.hot,Amount:{currency:v.currency,issuer:v.issuer,value:v.tokenLiquidity},Amount2:drops(v.xrpLiquidity),TradingFee:feeUnits(v.ammFee)},'XRPL Token/XRP AMM creation');markIfConfirmed(r,'amm');if(r.state==='CONFIRMED')await readNativeProof();}catch(e){status(e?.message||e,'bad');}};
$('#offer').onclick=async()=>{try{const v=values();if(v.route==='AMM')throw new Error('CLOB route is not selected.');await ensureAccount(v.hot,'hot');const total=clobTotal(v);if(!(total>0))throw new Error('CLOB seed total is invalid.');const r=await send({TransactionType:'OfferCreate',Account:v.hot,TakerGets:{currency:v.currency,issuer:v.issuer,value:v.clobToken},TakerPays:drops(total)},'XRPL native DEX seed offer');markIfConfirmed(r,'offer');if(r.state==='CONFIRMED')await readNativeProof();}catch(e){status(e?.message||e,'bad');}};
$('#set-blackhole-key').onclick=async()=>{try{
  const v=values();if(!blackholeReadyForKey())throw new Error('Read live issuer proof first, ensure no SignerList/Delegate objects, and type BLACKHOLE.');
  await ensureAccount(v.issuer,'issuer');
  const r=await send({TransactionType:'SetRegularKey',Account:v.issuer,RegularKey:BLACKHOLE_ACCOUNT},'Blackhole RegularKey set');
  markIfConfirmed(r,'blackholeKey');if(r.state==='CONFIRMED')await readNativeProof();
}catch(e){status(e?.message||e,'bad');}};
$('#disable-master').onclick=async()=>{try{
  const v=values();if(!blackholeReadyForDisable())throw new Error('Live proof must show the blackhole RegularKey and no signer/delegate control before disabling the master key.');
  await ensureAccount(v.issuer,'issuer');
  const r=await send({TransactionType:'AccountSet',Account:v.issuer,SetFlag:4},'Issuer master key disabled');
  markIfConfirmed(r,'masterDisabled');if(r.state==='CONFIRMED')await readNativeProof();
}catch(e){status(e?.message||e,'bad');}};

renderRoute();updateMath();updateBlackholeButtons();

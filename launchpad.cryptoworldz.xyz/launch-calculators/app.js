import {Buffer} from 'https://esm.sh/buffer@6.0.3?bundle';
globalThis.Buffer ??= Buffer;
import {Connection,PublicKey} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {CpAmm} from 'https://esm.sh/@meteora-ag/cp-amm-sdk@1.4.10?bundle';
import BN from 'https://esm.sh/bn.js@5.2.2?bundle';

const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const connection=new Connection(RPC,'confirmed');
const cpAmm=new CpAmm(connection);
const $=s=>document.querySelector(s);
const fmt=(n,d=6)=>Number(n).toLocaleString('en-AU',{maximumFractionDigits:d});
const MARKETS={
 WLDZ:{symbol:'WLDZ',pool:'GCFKk1H5Z8EfxFuAvDEXTHn8b28deUA7HxVRsipjfPiJ',mint:'AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U'},
 RVIV:{symbol:'RVIV',pool:'YWEMDsd6o3dm8uXNnmnWWU3c1UtFqDUKEMfbQ512i5c',mint:'DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R'}
};
function human(raw,decimals){
 const n=BigInt(raw.toString()),base=10n**BigInt(decimals),whole=n/base;
 const frac=String(n%base).padStart(decimals,'0').replace(/0+$/,'');
 return Number(frac?whole+'.'+frac:String(whole));
}
async function mintInfo(mint){
 const r=await connection.getParsedAccountInfo(mint,'confirmed');
 const info=r.value?.data?.parsed?.info;
 if(!info||!Number.isInteger(info.decimals))throw new Error('Token decimals unavailable');
 return {decimals:info.decimals,supply:Number(info.supply)/10**info.decimals};
}
async function livePool(poolAddress){
 const pool=new PublicKey(poolAddress);
 const state=await cpAmm.fetchPoolState(pool);
 const [a,b]=await Promise.all([mintInfo(state.tokenAMint),mintInfo(state.tokenBMint)]);
 return {pool,state,a,b};
}
function quoteDeposit(ctx,sol){
 const raw=new BN(String(Math.round(Number(sol)*1e9)));
 const q=cpAmm.getDepositQuote({
  inAmount:raw,isTokenA:false,sqrtPrice:ctx.state.sqrtPrice,
  minSqrtPrice:ctx.state.sqrtMinPrice,maxSqrtPrice:ctx.state.sqrtMaxPrice,
  collectFeeMode:ctx.state.collectFeeMode,tokenAAmount:ctx.state.tokenAAmount,
  tokenBAmount:ctx.state.tokenBAmount,liquidity:ctx.state.liquidity
 });
 return {sol:human(q.consumedInputAmount,ctx.b.decimals),base:human(q.outputAmount,ctx.a.decimals),q};
}
function quoteBuy(ctx,sol,slippageBps=100){
 if(Number(sol)<=0)return {sol:0,base:0,impact:0,fee:0};
 const raw=new BN(String(Math.round(Number(sol)*1e9)));
 const q=cpAmm.getQuote({inAmount:raw,inputTokenMint:ctx.state.tokenBMint,slippageBps:Number(slippageBps),poolState:ctx.state});
 return {
  sol:human(q.consumedInAmount??q.swapInAmount,ctx.b.decimals),
  base:human(q.swapOutAmount,ctx.a.decimals),
  impact:Number(q.priceImpact?.toString?.()??q.priceImpact??NaN),
  fee:human(q.totalFee,ctx.b.decimals)
 };
}
function syncPool(){
 const key=$('#lp-market').value;
 if(key!=='CUSTOM')$('#lp-pool').value=MARKETS[key].pool;
 else $('#lp-pool').value='';
}
$('#lp-market').addEventListener('change',syncPool);syncPool();

function budget(){
 const aud=Number($('#aud-budget').value),price=Number($('#sol-aud').value),reserve=Number($('#sol-reserve').value);
 const body=$('#budget-body');
 if(!(aud>=0)||!(price>0)||!(reserve>=0)){body.innerHTML='<tr><td colspan="5">Enter a valid AUD budget, SOL/AUD price and reserve.</td></tr>';return}
 const gross=aud/price,spend=Math.max(0,gross-reserve);
 body.innerHTML='<tr><td>A$'+fmt(aud,2)+'</td><td>'+fmt(gross,8)+' SOL</td><td>'+fmt(reserve,8)+' SOL</td><td>'+fmt(spend,8)+' SOL</td><td class="'+(spend>0?'ok':'bad')+'">'+(spend>0?'READY TO ALLOCATE':'RESERVE EXCEEDS BUDGET')+'</td></tr>';
 $('#price-sol-aud').value=price;
}
['aud-budget','sol-aud','sol-reserve'].forEach(id=>$('#'+id).addEventListener('input',budget));
$('#fetch-sol').addEventListener('click',async()=>{
 const btn=$('#fetch-sol');btn.disabled=true;btn.textContent='FETCHING…';
 try{
  const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=aud',{cache:'no-store'});
  const j=await r.json();
  const p=Number(j?.solana?.aud);
  if(!(p>0))throw new Error('SOL/AUD unavailable');
  $('#sol-aud').value=p;budget();priceCalc();
 }catch(e){alert('Live SOL/AUD price unavailable. Enter the price manually.');}
 finally{btn.disabled=false;btn.textContent='FETCH SOL/AUD';}
});

$('#lp-quote').addEventListener('click',async()=>{
 const body=$('#lp-body');body.innerHTML='<tr><td colspan="6">Reading live Meteora pool…</td></tr>';
 try{
  const poolAddress=$('#lp-pool').value.trim(),sol=Number($('#lp-sol').value),owned=Number($('#lp-owned').value||0);
  if(!(sol>0))throw new Error('Enter SOL to add');
  const ctx=await livePool(poolAddress),dq=quoteDeposit(ctx,sol);
  const poolA=human(ctx.state.tokenAAmount,ctx.a.decimals),poolB=human(ctx.state.tokenBAmount,ctx.b.decimals);
  const supplyImpossible=dq.base>ctx.a.supply+1e-9;
  const walletOk=owned>=dq.base;
  const status=supplyImpossible?'IMPOSSIBLE — QUOTE EXCEEDS TOTAL TOKEN SUPPLY':walletOk?'WALLET HAS ENOUGH BASE TOKEN':'NEED '+fmt(dq.base-owned,6)+' MORE BASE TOKENS';
  body.innerHTML='<tr><td>'+poolAddress.slice(0,7)+'…'+poolAddress.slice(-6)+'</td><td>'+fmt(poolA,6)+'</td><td>'+fmt(poolB,9)+' SOL</td><td>'+fmt(dq.sol,9)+' SOL</td><td><b>'+fmt(dq.base,6)+'</b></td><td class="'+(supplyImpossible?'bad':walletOk?'ok':'warn')+'">'+status+'</td></tr>';
 }catch(e){body.innerHTML='<tr><td colspan="6" class="bad">'+String(e.message||e)+'</td></tr>'}
});

$('#hybrid-run').addEventListener('click',async()=>{
 const body=$('#hybrid-body');body.innerHTML='<tr><td colspan="7">Calculating live pool options…</td></tr>';
 try{
  const m=MARKETS[$('#hybrid-market').value],total=Number($('#hybrid-sol').value),owned=Number($('#hybrid-owned').value||0),slip=Number($('#hybrid-slip').value||100);
  if(!(total>0))throw new Error('Enter a SOL budget');
  const ctx=await livePool(m.pool);
  const splits=[100,75,50,25,0];
  const rows=[];
  for(const buyPct of splits){
   const buySol=total*buyPct/100,lpSol=total-buySol;
   let buy={base:0,impact:0},lp={base:0};
   try{if(buySol>0)buy=quoteBuy(ctx,buySol,slip);}catch(e){buy={base:0,impact:NaN,error:String(e.message||e)}}
   try{if(lpSol>0)lp=quoteDeposit(ctx,lpSol);}catch(e){lp={base:Infinity,error:String(e.message||e)}}
   const available=owned+(Number.isFinite(buy.base)?buy.base:0);
   const feasible=!buy.error&&!lp.error&&lp.base<=available&&lp.base<=ctx.a.supply;
   rows.push('<tr><td>'+buyPct+'% BUY / '+(100-buyPct)+'% LP</td><td>'+fmt(buySol,8)+'</td><td>'+fmt(lpSol,8)+'</td><td>'+(buy.error?'QUOTE FAILED':fmt(buy.base,6))+'</td><td>'+(lp.error?'QUOTE FAILED':fmt(lp.base,6))+'</td><td>'+(Number.isFinite(buy.impact)?fmt(buy.impact,4)+'%':'—')+'</td><td class="'+(feasible?'ok':'bad')+'">'+(feasible?'YES':'NO')+'</td></tr>');
  }
  body.innerHTML=rows.join('');
 }catch(e){body.innerHTML='<tr><td colspan="7" class="bad">'+String(e.message||e)+'</td></tr>'}
});

function priceCalc(){
 const supply=Number($('#price-supply').value),circ=Number($('#price-circ').value),p=Number($('#price-sol-token').value),solAud=Number($('#price-sol-aud').value||$('#sol-aud').value);
 const body=$('#price-body');
 const rows=[
  ['Initial price',p>0?fmt(p,12)+' SOL / token':'—'],
  ['Fully diluted value',p>0?fmt(supply*p,6)+' SOL':'—'],
  ['Launch circulating market cap',p>0?fmt(circ*p,6)+' SOL':'—'],
  ['FDV in AUD',p>0&&solAud>0?'A$'+fmt(supply*p*solAud,2):'Enter SOL/AUD'],
  ['Circulating MC in AUD',p>0&&solAud>0?'A$'+fmt(circ*p*solAud,2):'Enter SOL/AUD']
 ];
 body.innerHTML=rows.map(r=>'<tr><td>'+r[0]+'</td><td><b>'+r[1]+'</b></td></tr>').join('');
 const base=Number($('#seed-base').value),sol=Number($('#seed-sol').value);
 $('#reserve-result').textContent=base>0&&sol>=0
  ? 'Two-sided reserve ratio: '+fmt(sol/base,12)+' SOL/token\nImplied FDV: '+fmt((sol/base)*supply,6)+' SOL'
  : 'Enter base tokens and SOL.';
}
['price-supply','price-circ','price-sol-token','price-sol-aud','seed-base','seed-sol'].forEach(id=>$('#'+id).addEventListener('input',priceCalc));
priceCalc();

function distCalc(){
 const supply=Number($('#dist-supply').value),include=$('#dist-worldz').value==='yes';
 let pct=0,tokens=0;
 document.querySelectorAll('#dist-rows tr').forEach(tr=>{
  const p=Number(tr.querySelector('.dist-pct')?.value||0);pct+=p;
  const t=supply*p/100;tokens+=t;tr.querySelector('.dist-tokens').textContent=fmt(t,4);
 });
 const worldzPct=include?0.6:0,worldzTokens=supply*worldzPct/100;
 $('#dist-total-pct').textContent=fmt(pct+worldzPct,4)+'%';
 $('#dist-total-tokens').textContent=fmt(tokens+worldzTokens,4);
 const split=include?[
  ['No.1 Operations Multisig',0.30],['Miricle Team Multisig',0.18],['Purple Diamond Crew Multisig',0.12]
 ]:[];
 $('#worldz-split').innerHTML=split.length?split.map(([n,p])=>'<tr><td>'+n+'</td><td>'+p.toFixed(2)+'%</td><td>'+fmt(supply*p/100,4)+'</td></tr>').join(''):'<tr><td colspan="3">Worldz 0.60% allocation excluded for this calculation.</td></tr>';
 const total=pct+worldzPct;
 $('#dist-status').innerHTML=total===100?'<span class="ok">100% ACCOUNTED FOR.</span>':total<100?'<span class="warn">'+fmt(100-total,4)+'% remains unallocated.</span>':'<span class="bad">OVER-ALLOCATED BY '+fmt(total-100,4)+'%.</span>';
 chainCalc();
}
function chainCalc(){
 const supply=Number($('#dist-supply').value),amounts=[...document.querySelectorAll('.chain-amount')].map(x=>Number(x.value||0)),total=amounts.reduce((a,b)=>a+b,0);
 $('#chain-total').textContent=fmt(total,4);
 $('#chain-status').innerHTML=total<=supply
  ? '<span class="ok">Within canonical supply ceiling.</span> Representations still need lock/burn/reserve proof so the same tokens are not counted twice.'
  : '<span class="bad">EXCEEDS CANONICAL SUPPLY BY '+fmt(total-supply,4)+' TOKENS.</span>';
}
$('#dist-calc').addEventListener('click',distCalc);
$('#dist-supply').addEventListener('input',distCalc);
$('#dist-worldz').addEventListener('change',distCalc);
document.querySelectorAll('.dist-pct,.chain-amount').forEach(x=>x.addEventListener('input',()=>x.classList.contains('chain-amount')?chainCalc():distCalc()));
distCalc();budget();

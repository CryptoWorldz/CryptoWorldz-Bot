import crypto from 'node:crypto';

export const EPOCH_SECONDS=21600n;
export const LEGACY_BUCKET_BPS_OF_CONTROLLED=1500n; // 15%
export const LEGACY_VAULTS=10n;

export function integerSqrt(n){
  n=BigInt(n);
  if(n<0n)throw new Error('sqrt negative');
  if(n<2n)return n;
  let x0=n,x1=(x0+n/x0)>>1n;
  while(x1<x0){x0=x1;x1=(x0+n/x0)>>1n;}
  return x0;
}

export function qualifyingBalance(startRaw,endRaw,minimumRaw){
  const s=BigInt(startRaw),e=BigInt(endRaw),m=BigInt(minimumRaw);
  if(s<m||e<m)return 0n;
  return s<e?s:e;
}

function allocateExact(total,weighted){
  total=BigInt(total);
  const rows=weighted.filter(x=>BigInt(x.weight)>0n);
  if(!rows.length)return [];
  const denom=rows.reduce((s,x)=>s+BigInt(x.weight),0n);
  let used=0n;
  return rows.map((x,i)=>{
    const amount=i===rows.length-1?total-used:(total*BigInt(x.weight))/denom;
    used+=amount;
    return {...x,amount};
  });
}

export function calculateEpoch({fundedLamports,minimumRaw,startBalances,endBalances,excludedWallets=[]}){
  fundedLamports=BigInt(fundedLamports);
  if(fundedLamports<0n)throw new Error('negative funding');
  const excluded=new Set(excludedWallets);
  const wallets=[...new Set([...Object.keys(startBalances),...Object.keys(endBalances)])].sort();
  const eligible=[];
  for(const wallet of wallets){
    if(excluded.has(wallet))continue;
    const q=qualifyingBalance(startBalances[wallet]||'0',endBalances[wallet]||'0',minimumRaw);
    if(q>0n)eligible.push({wallet,qualifyingBalanceRaw:q});
  }
  if(!eligible.length)return {eligibleWallets:0,entitlements:[],allocatedLamports:'0',rollForwardLamports:fundedLamports.toString()};

  const equalPool=fundedLamports/2n;
  const sqrtPool=fundedLamports-equalPool;
  const equalRows=allocateExact(equalPool,eligible.map(x=>({wallet:x.wallet,weight:1n})));
  const sqrtRows=allocateExact(sqrtPool,eligible.map(x=>({wallet:x.wallet,weight:integerSqrt(x.qualifyingBalanceRaw)})));
  const equalMap=new Map(equalRows.map(x=>[x.wallet,x.amount]));
  const sqrtMap=new Map(sqrtRows.map(x=>[x.wallet,x.amount]));

  const entitlements=eligible.map(x=>({
    wallet:x.wallet,
    qualifyingBalanceRaw:x.qualifyingBalanceRaw.toString(),
    equalLamports:(equalMap.get(x.wallet)||0n).toString(),
    sqrtLamports:(sqrtMap.get(x.wallet)||0n).toString(),
    rewardLamports:((equalMap.get(x.wallet)||0n)+(sqrtMap.get(x.wallet)||0n)).toString()
  }));
  const allocated=entitlements.reduce((s,x)=>s+BigInt(x.rewardLamports),0n);
  if(allocated!==fundedLamports)throw new Error('epoch does not reconcile');
  return {eligibleWallets:eligible.length,entitlements,allocatedLamports:allocated.toString(),rollForwardLamports:'0'};
}

export function canonicalEpochHash(payload){
  const stable=JSON.stringify(payload,(k,v)=>typeof v==='bigint'?v.toString():v);
  return crypto.createHash('sha256').update(stable).digest('hex');
}

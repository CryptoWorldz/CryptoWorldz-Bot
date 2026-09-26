import crypto from 'node:crypto';

export const EPOCH_SECONDS=21_600;
export const LEGACY_BUCKET_BPS_OF_CONTROLLED=1500n; // 15%
export const LEGACY_VAULTS=10n;

export function integerSqrt(value){
  const n=BigInt(value);
  if(n<0n)throw new Error('sqrt negative');
  if(n<2n)return n;
  let x0=1n << (BigInt(n.toString(2).length) >> 1n);
  let x1=(x0+n/x0)>>1n;
  while(x1<x0){x0=x1;x1=(x0+n/x0)>>1n;}
  while((x0+1n)*(x0+1n)<=n)x0++;
  while(x0*x0>n)x0--;
  return x0;
}

export function qualifyingBalance(startRaw,endRaw,minimumRaw){
  const s=BigInt(startRaw),e=BigInt(endRaw),m=BigInt(minimumRaw);
  if(m<=0n)throw new Error('minimum must be positive');
  if(s<m||e<m)return 0n;
  return s<e?s:e;
}

function allocateFloor(total,weighted){
  const amount=BigInt(total);
  if(amount<0n)throw new Error('negative allocation pool');
  const rows=weighted
    .map(x=>({...x,weight:BigInt(x.weight)}))
    .filter(x=>x.weight>0n)
    .sort((a,b)=>a.wallet.localeCompare(b.wallet));
  if(!rows.length)return {rows:[],allocated:0n,carry:amount};
  const denom=rows.reduce((s,x)=>s+x.weight,0n);
  let allocated=0n;
  const allocations=rows.map(x=>{
    const part=(amount*x.weight)/denom;
    allocated+=part;
    return {...x,amount:part};
  });
  return {rows:allocations,allocated,carry:amount-allocated};
}

/**
 * Canonical six-hour Legacy Flywheel settlement.
 *
 * Integer policy:
 * - all wallet entitlements are floored to whole lamports;
 * - rounding dust is NEVER gifted to an arbitrary wallet;
 * - rounding carry remains in the legacy vault and must be added to the next epoch's funding.
 */
export function calculateEpoch({
  startsAtUnix,
  endsAtUnix,
  fundedLamports,
  minimumRaw,
  startBalances,
  endBalances,
  excludedWallets=[],
}){
  if(!Number.isInteger(startsAtUnix)||!Number.isInteger(endsAtUnix)){
    throw new Error('epoch timestamps must be integer unix seconds');
  }
  if(endsAtUnix-startsAtUnix!==EPOCH_SECONDS){
    throw new Error('epoch must be exactly 21600 seconds');
  }

  const funded=BigInt(fundedLamports);
  if(funded<0n)throw new Error('negative funding');
  const excluded=new Set(excludedWallets);
  const wallets=[...new Set([...Object.keys(startBalances),...Object.keys(endBalances)])].sort();
  const eligible=[];

  for(const wallet of wallets){
    if(excluded.has(wallet))continue;
    const q=qualifyingBalance(startBalances[wallet]||'0',endBalances[wallet]||'0',minimumRaw);
    if(q>0n)eligible.push({wallet,qualifyingBalanceRaw:q});
  }

  if(!eligible.length){
    return {
      startsAtUnix,
      endsAtUnix,
      eligibleWallets:0,
      entitlements:[],
      fundedLamports:funded.toString(),
      allocatedLamports:'0',
      roundingCarryLamports:funded.toString(),
    };
  }

  const equalPool=funded/2n;
  const sqrtPool=funded-equalPool;
  const equal=allocateFloor(equalPool,eligible.map(x=>({wallet:x.wallet,weight:1n})));
  const sqrt=allocateFloor(
    sqrtPool,
    eligible.map(x=>({wallet:x.wallet,weight:integerSqrt(x.qualifyingBalanceRaw)}))
  );
  const equalMap=new Map(equal.rows.map(x=>[x.wallet,x.amount]));
  const sqrtMap=new Map(sqrt.rows.map(x=>[x.wallet,x.amount]));

  const entitlements=eligible.map(x=>({
    wallet:x.wallet,
    qualifyingBalanceRaw:x.qualifyingBalanceRaw.toString(),
    equalLamports:(equalMap.get(x.wallet)||0n).toString(),
    sqrtLamports:(sqrtMap.get(x.wallet)||0n).toString(),
    rewardLamports:((equalMap.get(x.wallet)||0n)+(sqrtMap.get(x.wallet)||0n)).toString(),
  }));

  const allocated=entitlements.reduce((s,x)=>s+BigInt(x.rewardLamports),0n);
  const carry=equal.carry+sqrt.carry;
  if(allocated+carry!==funded)throw new Error('epoch accounting does not reconcile');

  return {
    startsAtUnix,
    endsAtUnix,
    eligibleWallets:eligible.length,
    entitlements,
    fundedLamports:funded.toString(),
    equalPoolLamports:equalPool.toString(),
    sqrtPoolLamports:sqrtPool.toString(),
    allocatedLamports:allocated.toString(),
    roundingCarryLamports:carry.toString(),
  };
}

export function canonicalEpochHash(payload){
  const stable=JSON.stringify(payload,(k,v)=>typeof v==='bigint'?v.toString():v);
  return crypto.createHash('sha256').update(stable).digest('hex');
}

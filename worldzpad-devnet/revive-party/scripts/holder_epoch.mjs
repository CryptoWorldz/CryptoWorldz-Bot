export const EPOCH_SECONDS=21_600;

export function integerSqrt(value){
  const n=BigInt(value);
  if(n<0n) throw new Error('sqrt of negative');
  if(n<2n) return n;
  let x0=1n << (BigInt(n.toString(2).length) >> 1n);
  let x1=(x0+n/x0)>>1n;
  while(x1<x0){x0=x1;x1=(x0+n/x0)>>1n;}
  while((x0+1n)*(x0+1n)<=n)x0++;
  while(x0*x0>n)x0--;
  return x0;
}

function sortWallets(rows){
  return [...rows].sort((a,b)=>a.wallet.localeCompare(b.wallet));
}

export function settleLegacyEpoch({
  startsAtUnix,
  endsAtUnix,
  fundedLamports,
  minimumBalanceRaw,
  holders,
  excludedWallets=[],
}){
  if(!Number.isInteger(startsAtUnix)||!Number.isInteger(endsAtUnix)) throw new Error('epoch timestamps must be integer unix seconds');
  if(endsAtUnix-startsAtUnix!==EPOCH_SECONDS) throw new Error('epoch must be exactly 21600 seconds');
  const funded=BigInt(fundedLamports);
  const minimum=BigInt(minimumBalanceRaw);
  if(funded<0n||minimum<=0n) throw new Error('invalid funded/minimum amount');

  const excluded=new Set(excludedWallets);
  const eligible=sortWallets(holders.map(h=>({
    ...h,
    startBalanceRaw:BigInt(h.startBalanceRaw),
    endBalanceRaw:BigInt(h.endBalanceRaw),
  })).filter(h=>{
    if(excluded.has(h.wallet)||h.system===true)return false;
    const qualifying=h.startBalanceRaw<h.endBalanceRaw?h.startBalanceRaw:h.endBalanceRaw;
    return qualifying>=minimum;
  }).map(h=>({
    ...h,
    qualifyingBalanceRaw:h.startBalanceRaw<h.endBalanceRaw?h.startBalanceRaw:h.endBalanceRaw,
  })));

  if(eligible.length===0){
    return {startsAtUnix,endsAtUnix,fundedLamports:funded,eligible:[],rewards:{},carryLamports:funded};
  }

  const equalPool=funded/2n;
  const sqrtPool=funded-equalPool;
  const equalEach=equalPool/BigInt(eligible.length);
  const equalCarry=equalPool-(equalEach*BigInt(eligible.length));
  const sqrtWeights=eligible.map(h=>integerSqrt(h.qualifyingBalanceRaw));
  const totalSqrt=sqrtWeights.reduce((a,b)=>a+b,0n);
  if(totalSqrt===0n) throw new Error('zero sqrt weight');

  const rewards={};
  let sqrtAllocated=0n;
  let totalRewards=0n;
  eligible.forEach((h,i)=>{
    const sqrtReward=(sqrtPool*sqrtWeights[i])/totalSqrt;
    sqrtAllocated+=sqrtReward;
    const amount=equalEach+sqrtReward;
    totalRewards+=amount;
    rewards[h.wallet]={
      amountLamports:amount,
      equalLamports:equalEach,
      sqrtLamports:sqrtReward,
      qualifyingBalanceRaw:h.qualifyingBalanceRaw,
      sqrtWeight:sqrtWeights[i],
    };
  });

  const sqrtCarry=sqrtPool-sqrtAllocated;
  const carry=equalCarry+sqrtCarry;
  if(totalRewards+carry!==funded) throw new Error('holder epoch does not reconcile');

  return {
    startsAtUnix,endsAtUnix,fundedLamports:funded,
    eligible:eligible.map(h=>h.wallet),
    rewards,
    equalPoolLamports:equalPool,
    sqrtPoolLamports:sqrtPool,
    carryLamports:carry,
  };
}

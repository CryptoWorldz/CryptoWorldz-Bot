// Compatibility adapter only.
// Canonical Legacy Flywheel money math lives in legacy_epoch_engine.mjs.
import {
  EPOCH_SECONDS,
  calculateEpoch,
  integerSqrt,
  qualifyingBalance,
} from './legacy_epoch_engine.mjs';

export { EPOCH_SECONDS, integerSqrt, qualifyingBalance };

export function settleLegacyEpoch({
  startsAtUnix,
  endsAtUnix,
  fundedLamports,
  minimumBalanceRaw,
  holders,
  excludedWallets=[],
}){
  const startBalances={};
  const endBalances={};
  const excluded=new Set(excludedWallets);
  for(const holder of holders){
    startBalances[holder.wallet]=String(holder.startBalanceRaw);
    endBalances[holder.wallet]=String(holder.endBalanceRaw);
    if(holder.system===true)excluded.add(holder.wallet);
  }
  const result=calculateEpoch({
    startsAtUnix,
    endsAtUnix,
    fundedLamports,
    minimumRaw:minimumBalanceRaw,
    startBalances,
    endBalances,
    excludedWallets:[...excluded],
  });
  return {
    ...result,
    eligible:result.entitlements.map(x=>x.wallet),
    rewards:Object.fromEntries(result.entitlements.map(x=>[x.wallet,{
      amountLamports:BigInt(x.rewardLamports),
      equalLamports:BigInt(x.equalLamports),
      sqrtLamports:BigInt(x.sqrtLamports),
      qualifyingBalanceRaw:BigInt(x.qualifyingBalanceRaw),
      sqrtWeight:integerSqrt(x.qualifyingBalanceRaw),
    }])),
    carryLamports:BigInt(result.roundingCarryLamports),
  };
}

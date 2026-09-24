import { MAGIC } from './common.mjs';

export const PARTNER_DENOMINATOR = 490n;
export const PARTNER_DESTINATION_WEIGHTS = Object.freeze({
  referrer: 170n,
  legacy_01: 15n,
  legacy_02: 15n,
  legacy_03: 15n,
  legacy_04: 15n,
  legacy_05: 15n,
  legacy_06: 15n,
  legacy_07: 15n,
  legacy_08: 15n,
  legacy_09: 15n,
  legacy_10: 15n,
  worldzLaunchPad: 85n,
  oneWorldzImpact: 85n,
});

const weightTotal=Object.values(PARTNER_DESTINATION_WEIGHTS).reduce((a,b)=>a+b,0n);
if(weightTotal!==PARTNER_DENOMINATOR) throw new Error('partner destination weights must total 490');
if(MAGIC.routerWeights.referrer!==170 || MAGIC.routerWeights.legacy!==150 ||
   MAGIC.routerWeights.worldz!==85 || MAGIC.routerWeights.impact!==85 ||
   MAGIC.routerWeights.total!==490) throw new Error('MAGIC partner router weights drifted');

export function cumulativePartnerEntitlements(totalPartnerLamports){
  const total=BigInt(totalPartnerLamports);
  if(total<0n) throw new Error('negative partner fee total');
  const entitlements={};
  let allocated=0n;
  for(const [name,weight] of Object.entries(PARTNER_DESTINATION_WEIGHTS)){
    const amount=(total*weight)/PARTNER_DENOMINATOR;
    entitlements[name]=amount;
    allocated+=amount;
  }
  return {
    totalPartnerLamports: total,
    entitlements,
    carryLamports: total-allocated,
  };
}

export function deltaPartnerEntitlements(previousTotalPartnerLamports,nextTotalPartnerLamports){
  const prev=cumulativePartnerEntitlements(previousTotalPartnerLamports);
  const next=cumulativePartnerEntitlements(nextTotalPartnerLamports);
  if(next.totalPartnerLamports<prev.totalPartnerLamports) throw new Error('partner fee total cannot go backwards');
  const deltas={};
  let paid=0n;
  for(const name of Object.keys(PARTNER_DESTINATION_WEIGHTS)){
    const delta=next.entitlements[name]-prev.entitlements[name];
    if(delta<0n) throw new Error('negative route delta');
    deltas[name]=delta;
    paid+=delta;
  }
  return {
    previousTotalPartnerLamports:prev.totalPartnerLamports,
    nextTotalPartnerLamports:next.totalPartnerLamports,
    deltas,
    routedLamports:paid,
    cumulativeCarryLamports:next.carryLamports,
  };
}

export function modelGrossFee(volumeLamports){
  const volume=BigInt(volumeLamports);
  if(volume<0n) throw new Error('negative volume');
  const gross=(volume*75n)/10_000n;
  const protocol=(gross*20n)/100n;
  const worldzControlled=gross-protocol;
  const creator=(worldzControlled*51n)/100n;
  const partner=worldzControlled-creator;
  return {volume,gross,protocol,worldzControlled,creator,partner};
}

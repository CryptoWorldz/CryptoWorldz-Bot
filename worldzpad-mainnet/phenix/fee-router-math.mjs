#!/usr/bin/env node
const WEIGHTS=Object.freeze({
  creator:510n,
  referrer:170n,
  legacyVault01:15n,legacyVault02:15n,legacyVault03:15n,legacyVault04:15n,legacyVault05:15n,
  legacyVault06:15n,legacyVault07:15n,legacyVault08:15n,legacyVault09:15n,legacyVault10:15n,
  worldzLaunchPad:85n,
  oneWorldzImpact:85n
});
const DENOM=1000n;
if(Object.values(WEIGHTS).reduce((a,b)=>a+b,0n)!==DENOM) throw new Error("weights != 1000");

export function cumulative(totalRaw){
  const total=BigInt(totalRaw);
  if(total<0n) throw new Error("negative total");
  const entitlements={}; let allocated=0n;
  for(const [name,w] of Object.entries(WEIGHTS)){
    const n=(total*w)/DENOM;
    entitlements[name]=n; allocated+=n;
  }
  return {total,entitlements,carry:total-allocated};
}
export function delta(previousRaw,nextRaw){
  const a=cumulative(previousRaw), b=cumulative(nextRaw);
  if(b.total<a.total) throw new Error("claimed total cannot go backwards");
  const deltas={}; let routed=0n;
  for(const k of Object.keys(WEIGHTS)){
    const d=b.entitlements[k]-a.entitlements[k];
    if(d<0n) throw new Error("negative delta");
    deltas[k]=d; routed+=d;
  }
  return {previous:a.total,next:b.total,deltas,routed,carry:b.carry};
}
function selfTest(){
  const x=cumulative(1_000_000n);
  if(x.entitlements.creator!==510_000n) throw new Error("creator");
  if(x.entitlements.referrer!==170_000n) throw new Error("referrer");
  if(x.entitlements.worldzLaunchPad!==85_000n||x.entitlements.oneWorldzImpact!==85_000n) throw new Error("worldz/impact");
  for(let i=1;i<=10;i++) if(x.entitlements["legacyVault"+String(i).padStart(2,"0")]!==15_000n) throw new Error("legacy "+i);
  if(x.carry!==0n) throw new Error("exact case carry");
  let prev=0n;
  for(const next of [1n,7n,999n,1001n,1234567n,999999999n]){
    const d=delta(prev,next);
    if(d.routed+d.carry>next) throw new Error("overallocation");
    prev=next;
  }
  console.log("PNEX_FEE_ROUTER_MATH=PASS weights=510/170/15x10/85/85 cumulative_delta=YES overallocate=NO");
}
if(process.argv.includes("--self-test")) selfTest();

"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const policy=require("../worldzpad-mainnet/fairfee/worldz-fee-flow.v2.json");

const fixed=Object.values(policy.fixedAllocationsPercent).reduce((a,b)=>a+b,0);

test("Worldz Fee Flow V2 fixes the non-variable allocation at 85%",()=>{
  assert.equal(fixed,85);
});

test("3/5/8 LaunchPad choices each reconcile to 100%",()=>{
  assert.deepEqual(policy.platformContributionChoice.allowedPercent,[3,5,8]);
  for(const profile of Object.values(policy.profiles)){
    assert.equal(fixed+profile.worldzLaunchPadPercent+profile.treasuryReservePercent,100);
    assert.equal(profile.totalPercent,100);
  }
});

test("Legacy allocation is exactly the locked 15% / 12-token core",()=>{
  assert.equal(policy.legacyCore.totalPercent,15);
  assert.equal(policy.legacyCore.closedTokenCount,12);
  assert.equal(policy.legacyCore.equalPercentEach,1.25);
  assert.equal(policy.legacyCore.noSecondLegacyDeduction,true);
});

test("Worldz family buy flywheel is equal across WLDZ RVIV PNEX MRCL",()=>{
  assert.equal(policy.worldzCoreFamilyMarketBuys.totalPercent,12);
  assert.equal(policy.worldzCoreFamilyMarketBuys.equalPercentEach,3);
  assert.deepEqual(policy.worldzCoreFamilyMarketBuys.tokens.map(x=>x.symbol),["WLDZ","RVIV","PNEX","MRCL"]);
  assert.equal(policy.worldzCoreFamilyMarketBuys.tokens.find(x=>x.symbol==="PNEX").canonicalMint,null);
  assert.equal(policy.worldzCoreFamilyMarketBuys.tokens.find(x=>x.symbol==="MRCL").canonicalMint,null);
});

test("mainnet money movement remains fail closed",()=>{
  assert.equal(policy.executionSafety.mainnetAutomaticRoutingEnabled,false);
  assert.equal(policy.executionSafety.mainnetAutomaticMarketBuysEnabled,false);
  assert.equal(policy.executionSafety.mainnetAutomaticBurnEnabled,false);
  assert.equal(policy.executionSafety.treasuryMultisigRequired,true);
});

"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const src=fs.readFileSync(path.resolve(__dirname,"../supabase/functions/worldz-launch-register/index.ts"),"utf8");

test("Launch Register advertises Fee Flow V3 as the canonical public contract",()=>{
  assert.match(src,/WORLDZ-LAUNCH-REGISTER-V3/);
  assert.match(src,/WORLDZ-FEE-FLOW-V3/);
  assert.match(src,/worldzLaunchPadContributionChoicesPercent:/);
  assert.match(src,/worldzLaunchPadContributionDefaultPercent: 5/);
  assert.match(src,/creatorRetentionByContributionPercent: \{ "3": 97, "5": 95, "8": 92 \}/);
  assert.match(src,/legacyCore: \{ percentOfWorldzContribution: 10, tokenCount: 12, closed: true \}/);
  assert.match(src,/worldzCoreFamily: \{ percentOfWorldzContribution: 10, equalShareWithinLanePercent: 25, symbols: \["WLDZ","RVIV","PNEX","MRCL"\] \}/);
});

test("Fee Flow V3 locks the internal Worldz split and 3-5-8 creator choice",()=>{
  for(const marker of [
    "operationsProductDevelopment: 20",
    "treasury: 20",
    "lpGrowth: 15",
    "legacyCore: 10",
    "worldzCoreFamilyMarketBuys: 10",
    "impactCharity: 10",
    "teamBuilderRewards: 5",
    "futureLaunchInfrastructure: 5",
    "launchReferrer: 5"
  ]) assert.ok(src.includes(marker),marker);
  assert.match(src,/V3_LAUNCHPAD_CHOICES = \[3, 5, 8\]/);
  assert.match(src,/V3_CREATOR_RETENTION_BY_CHOICE: Record<number,number> = \{ 3: 97, 5: 95, 8: 92 \}/);
  assert.match(src,/fee_flow_v3_internal_route_drift/);
  assert.match(src,/fee_flow_v3_creator_retention_invariant_failed/);
});

test("Fee Flow V3 market settlement remains fail closed on mainnet",()=>{
  assert.match(src,/fee_flow_v3_mainnet_settlement_not_proven/);
  assert.match(src,/devnet_adapter_cannot_claim_fee_flow_v3_onchain_settlement/);
  assert.match(src,/feeFlowV3OnchainSettlement: false/);
});

test("Launch Register preserves wallet and on-chain proof requirements",()=>{
  assert.match(src,/WORLDZLAUNCHPAD_REGISTER_V1/);
  assert.match(src,/nacl\.sign\.detached\.verify/);
  assert.match(src,/verifyMint/);
  assert.match(src,/verifyPool/);
  assert.match(src,/verifyTxSigner/);
  assert.match(src,/worldz_registry_requires_no_freeze_authority/);
});

test("V2 and 90/10 remain explicitly historical compatibility only",()=>{
  assert.match(src,/FEE_FLOW_V2/);
  assert.match(src,/legacyAdapter: \{/);
  assert.match(src,/profileOnly: true/);
  assert.match(src,/LEGACY-ADAPTER/);
  assert.match(src,/legacy_curve_fee_split_must_be_project_90_worldz_10/);
});

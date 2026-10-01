"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const src=fs.readFileSync(path.resolve(__dirname,"../supabase/functions/worldz-launch-register/index.ts"),"utf8");

test("Launch Register advertises Fee Flow V2 as the canonical public contract",()=>{
  assert.match(src,/WORLDZ-LAUNCH-REGISTER-V2/);
  assert.match(src,/WORLDZ-FEE-FLOW-V2/);
  assert.match(src,/worldzLaunchPadContributionChoicesPercent:/);
  assert.match(src,/worldzLaunchPadContributionDefaultPercent: 5/);
  assert.match(src,/legacyCore: \{ totalPercent: 15, tokenCount: 12, equalPercentEach: 1\.25, closed: true \}/);
  assert.match(src,/worldzCoreFamily: \{ totalPercent: 12, equalPercentEach: 3, symbols: \["WLDZ","RVIV","PNEX","MRCL"\] \}/);
});

test("Fee Flow V2 fixed lanes and 3-5-8 treasury balancing are server enforced",()=>{
  for(const marker of [
    "creatorDeveloper: 10",
    "launchReferrer: 15",
    "legacyCore: 15",
    "worldzCoreFamilyMarketBuys: 12",
    "lpGrowth: 10",
    "launchedTokenBuybackAndBurn: 8",
    "impactCharity: 5",
    "teamBuilderRewards: 5",
    "futureTokenDeploymentReserve: 5"
  ]) assert.ok(src.includes(marker),marker);
  assert.match(src,/V2_LAUNCHPAD_CHOICES = \[3, 5, 8\]/);
  assert.match(src,/V2_TREASURY_BY_CHOICE: Record<number,number> = \{ 3: 12, 5: 10, 8: 7 \}/);
  assert.match(src,/fee_flow_v2_fixed_route_drift/);
  assert.match(src,/fee_flow_v2_treasury_balance_mismatch/);
});

test("V2 market settlement remains fail closed on mainnet",()=>{
  assert.match(src,/fee_flow_v2_mainnet_settlement_not_proven/);
  assert.match(src,/devnet_adapter_cannot_claim_fee_flow_v2_onchain_settlement/);
  assert.match(src,/feeFlowV2OnchainSettlement: false/);
});

test("Launch Register preserves wallet and on-chain proof requirements",()=>{
  assert.match(src,/WORLDZLAUNCHPAD_REGISTER_V1/);
  assert.match(src,/nacl\.sign\.detached\.verify/);
  assert.match(src,/verifyMint/);
  assert.match(src,/verifyPool/);
  assert.match(src,/verifyTxSigner/);
  assert.match(src,/worldz_registry_requires_no_freeze_authority/);
});

test("Legacy adapters remain explicitly labelled compatibility only",()=>{
  assert.match(src,/legacyAdapter: \{/);
  assert.match(src,/profileOnly: true/);
  assert.match(src,/LEGACY-ADAPTER/);
  assert.match(src,/legacy_curve_fee_split_must_be_project_90_worldz_10/);
});

"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Fee Flow V3 locks creator retention to 97/95/92 and Worldz to 3/5/8",()=>{
  const v3=json("worldzpad-mainnet/fairfee/worldz-fee-flow.v3.json");
  assert.equal(v3.schema,"WORLDZ-FEE-FLOW-V3");
  assert.deepEqual(v3.creatorChoice.allowedWorldzContributionPercent,[3,5,8]);
  assert.deepEqual(v3.creatorChoice.profiles.BUILD_3,{worldzContributionPercent:3,creatorRetentionPercent:97,label:"BUILD"});
  assert.equal(v3.creatorChoice.profiles.GROW_5.worldzContributionPercent,5);
  assert.equal(v3.creatorChoice.profiles.GROW_5.creatorRetentionPercent,95);
  assert.equal(v3.creatorChoice.profiles.BOOST_8.worldzContributionPercent,8);
  assert.equal(v3.creatorChoice.profiles.BOOST_8.creatorRetentionPercent,92);
});

test("Only the Worldz contribution is internally split and the lanes total 100",()=>{
  const v3=json("worldzpad-mainnet/fairfee/worldz-fee-flow.v3.json");
  assert.deepEqual(v3.worldzInternalSplitPercent,{
    operationsProductDevelopment:20,
    treasury:20,
    lpGrowth:15,
    legacyCore:10,
    worldzCoreFamilyMarketBuys:10,
    impactCharity:10,
    teamBuilderRewards:5,
    futureLaunchInfrastructure:5,
    launchReferrer:5
  });
  assert.equal(Object.values(v3.worldzInternalSplitPercent).reduce((a,b)=>a+b,0),100);
  assert.match(v3.scopeRule,/creator retains the remaining 97%, 95% or 92%/);
});

test("Treasury lane is 20 percent of Worldz share and splits 70/30",()=>{
  const v3=json("worldzpad-mainnet/fairfee/worldz-fee-flow.v3.json");
  assert.equal(v3.treasuryLane.percentOfWorldzContribution,20);
  assert.equal(v3.treasuryLane.split.worldzOperationsTreasuryPercent,70);
  assert.equal(v3.treasuryLane.split.worldzMiracleTeamTreasuryPercent,30);
  assert.equal(v3.treasuryLane.effectivePercentOfWorldzContribution.worldzOperationsTreasury,14);
  assert.equal(v3.treasuryLane.effectivePercentOfWorldzContribution.worldzMiracleTeamTreasury,6);
  assert.equal(v3.treasuryLane.governance.worldzOperationsTreasury,"3-of-5");
  assert.equal(v3.treasuryLane.governance.worldzMiracleTeamTreasury,"4-of-7");
});

test("Miracle revenue treasury and MRCL 20 percent token vault are separate accounting buckets",()=>{
  const v3=json("worldzpad-mainnet/fairfee/worldz-fee-flow.v3.json");
  const miracle=json("worldzpad-mainnet/miracle/miracle.v1.json");
  const profiles=json("launchpad.cryptoworldz.xyz/worldz-app/core/treasury-profiles.json");
  const mt=profiles.profiles.find(x=>x.id==="miracle-church");
  assert.equal(v3.miracleSeparation.mrclMiracleTeamTokenVaultPercent,20);
  assert.equal(v3.miracleSeparation.worldzMiracleTeamTreasuryRevenueShareOfTreasuryLanePercent,30);
  assert.equal(v3.miracleSeparation.accountingBucketsSeparate,true);
  assert.equal(miracle.committedAllocations.miracleTeamVault.percent,20);
  assert.equal(miracle.committedAllocations.miracleTeamVault.proposedMultisig.policy,"4-of-7");
  assert.equal(miracle.treasuryProfiles.miracleChurchTreasury.revenueRouting.shareOfTreasuryLanePercent,30);
  assert.equal(mt.governance.display,"4-of-7");
  assert.equal(mt.revenueRouting.shareOfTreasuryLanePercent,30);
  assert.equal(mt.mrclTokenVault.allocationPercent,20);
  assert.equal(mt.mrclTokenVault.accountingSeparateFromRevenueRouting,true);
});

test("V2 is preserved for audit but is no longer canonical for new intakes",()=>{
  const v2=json("worldzpad-mainnet/fairfee/worldz-fee-flow.v2.json");
  const platform=json("launchpad.cryptoworldz.xyz/platform-config.json");
  assert.equal(v2.status,"SUPERSEDED_FOR_NEW_INTAKES__HISTORICAL_AUDIT_ONLY");
  assert.equal(v2.supersededBy,"worldzpad-mainnet/fairfee/worldz-fee-flow.v3.json");
  assert.equal(platform.feePolicy.feeFlowVersion,"WORLDZ-FEE-FLOW-V3");
  assert.equal(platform.feePolicy.worldzFeeFlowPolicy,"worldzpad-mainnet/fairfee/worldz-fee-flow.v3.json");
});

test("Treasury policy accrues Miracle share until 4-of-7 destination is deployed",()=>{
  const treasury=json("launchpad.cryptoworldz.xyz/treasury-policy.json");
  assert.equal(treasury.governance.operations.display,"3-of-5");
  assert.equal(treasury.governance.miracleTeam.display,"4-of-7");
  assert.equal(treasury.governance.miracleTeam.status,"FUNDING_PENDING_NOT_DEPLOYED");
  assert.equal(treasury.governance.miracleTeam.revenueSharePercentOfTreasuryLane,30);
  assert.equal(treasury.activation.miracleTeamRoutingEnabled,false);
  assert.equal(treasury.activation.unavailableDestinationRule,"ACCRUE_DO_NOT_REDIRECT");
  assert.equal(treasury.activation.mainnetFeeRoutingEnabled,false);
});

test("Public LaunchPad explains the creator-first V3 economics",()=>{
  const home=read("launchpad.cryptoworldz.xyz/index.html");
  const economics=read("launchpad.cryptoworldz.xyz/economics/index.html");
  const revenue=read("launchpad.cryptoworldz.xyz/revenue/index.html");
  assert.match(home,/97% \/ 95% \/ 92%/);
  assert.match(home,/WORLDZ FEE FLOW V3/);
  assert.match(home,/70% Operations \/ 30% Community Team/);
  assert.match(economics,/Creator 97% • Worldz 3%/);
  assert.match(economics,/Creator 95% • Worldz 5%/);
  assert.match(economics,/Creator 92% • Worldz 8%/);
  assert.match(revenue,/Creator keeps 97% • Worldz 3%/);
});

test("Mainnet automatic fee routing remains disabled",()=>{
  const v3=json("worldzpad-mainnet/fairfee/worldz-fee-flow.v3.json");
  const platform=json("launchpad.cryptoworldz.xyz/platform-config.json");
  assert.equal(v3.safety.automaticMainnetRoutingEnabled,false);
  assert.equal(v3.safety.automaticMarketBuysEnabled,false);
  assert.equal(v3.safety.automaticBurnEnabled,false);
  assert.equal(platform.publicMainnetCreatorLaunchesEnabled,false);
});

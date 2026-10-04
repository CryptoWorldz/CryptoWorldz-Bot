import fs from 'node:fs/promises';

const platform=JSON.parse(await fs.readFile('launchpad.cryptoworldz.xyz/platform-config.json','utf8'));
const treasury=JSON.parse(await fs.readFile('launchpad.cryptoworldz.xyz/treasury-policy.json','utf8'));
const omniFee=JSON.parse(await fs.readFile('worldzpad-omnichain/fee-policy.v1.json','utf8'));

async function getJson(url){
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'WorldzMainnetReadiness/1.0'}});
  const text=await r.text(); let body=null; try{body=JSON.parse(text)}catch{}
  return {ok:r.ok,status:r.status,body,error:r.ok?null:text.slice(0,300)};
}

const registerUrl='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-launch-register';
const squadsUrl='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-squads-verify?address='+encodeURIComponent(platform.treasuryRouting.multisigConfigAddress);
const [reg,sq]=await Promise.all([getJson(registerUrl),getJson(squadsUrl)]);

const liveGate=reg.body||{};
const liveSquads=sq.body||{};
const targetMembers=Number(platform.treasuryRouting.targetMemberCount||5);
const targetThreshold=Number(platform.treasuryRouting.targetThreshold||3);

const checks={
  publicPlatformLive:platform.publicLaunchPad===true,
  solanaMainnetMintLive:platform.worldzMint?.environments?.includes('mainnet-beta')===true,
  localPublicMarketGateOpen:platform.publicMainnetCreatorLaunchesEnabled===true,
  serverPublicMarketGateOpen:liveGate.mainnetPublicLaunchEnabled===true,
  treasuryAddressRegistered:typeof liveGate.treasuryMultisigReady==='boolean'&&liveGate.treasuryMultisigReady===true,
  squadsDecoded:liveSquads.accountType==='squads_v4_multisig',
  squadsProgramOwnerVerified:liveSquads.verifiedSquadsProgramOwner===true,
  operationsMemberTargetMet:Number(liveSquads.memberCount)===targetMembers,
  operationsThresholdTargetMet:Number(liveSquads.threshold)===targetThreshold,
  feeRoutingActivated:treasury.activation?.mainnetFeeRoutingEnabled===true,
  backendFeeFlowV3MatchesLocal:liveGate.standard==='WORLDZ-LAUNCH-REGISTER-V3'
    && liveGate.feeFlowVersion==='WORLDZ-FEE-FLOW-V3'
    && JSON.stringify(liveGate.worldzLaunchPadContributionChoicesPercent)==='[3,5,8]'
    && Number(liveGate.worldzLaunchPadContributionDefaultPercent)===5
    && JSON.stringify(liveGate.creatorRetentionByContributionPercent||{})===JSON.stringify(platform.feePolicy.creatorRetentionByContribution||{})
    && Number(liveGate.legacyCore?.percentOfWorldzContribution)===Number(platform.feePolicy.legacyCorePercentOfWorldzContribution)
    && Number(liveGate.legacyCore?.tokenCount)===Number(platform.feePolicy.legacyCoreTokenCount)
    && Number(liveGate.worldzCoreFamily?.percentOfWorldzContribution)===Number(platform.feePolicy.coreFamilyMarketBuyPercentOfWorldzContribution)
    && JSON.stringify(liveGate.worldzCoreFamily?.symbols||[])===JSON.stringify(platform.feePolicy.coreFamilySymbols||[])
    && JSON.stringify(liveGate.worldzInternalDistributionPercent||{})===JSON.stringify(platform.feePolicy.worldzInternalSplitPercent||{})
    && Number(liveGate.treasuryLane?.operationsPercent)===50
    && Number(liveGate.treasuryLane?.miracleTeamPercent)===30
    && Number(liveGate.treasuryLane?.purpleDiamondCrewPercent)===20
    && Number(liveGate.tokenSupplyTakePercent)===0.6
    && JSON.stringify(liveGate.tokenSupplySplitPercent||{})===JSON.stringify({operations:0.30,communityTeam:0.18,purpleDiamondCrew:0.12})
    && Number(liveGate.initialLiquidityTakePercent)===0
    && Number(liveGate.walletTransferTaxPercent)===0,
  legacyAdapterDeclared:liveGate.legacyAdapter?.profileOnly===true
    && Number(liveGate.legacyAdapter?.platformSharePercentOfCollectedTokenFee)===10
    && Number(liveGate.legacyAdapter?.projectSharePercentOfCollectedTokenFee)===90,
  legacyOmnichainAdapterDeclared:omniFee.targetGrossTraderFeeBps===75
    && omniFee.worldzControlledSplitPercent?.creator===51
    && omniFee.worldzControlledSplitPercent?.referrer===17
    && omniFee.worldzControlledSplitPercent?.legacyFlywheel===15
    && omniFee.worldzControlledSplitPercent?.worldzLaunchPad===8.5
    && omniFee.worldzControlledSplitPercent?.impact===8.5
};

const blockers=[];
if(!checks.localPublicMarketGateOpen) blockers.push('LOCAL_PUBLIC_MAINNET_MARKET_GATE_CLOSED');
if(!checks.serverPublicMarketGateOpen) blockers.push('SERVER_PUBLIC_MAINNET_MARKET_GATE_CLOSED');
if(!checks.squadsDecoded||!checks.squadsProgramOwnerVerified) blockers.push('SQUADS_OPERATIONS_TREASURY_NOT_VERIFIED');
if(!checks.operationsMemberTargetMet||!checks.operationsThresholdTargetMet) blockers.push('OPERATIONS_TREASURY_NOT_AT_3_OF_5_TARGET');
if(!checks.feeRoutingActivated) blockers.push('MAINNET_FEE_ROUTING_NOT_ACTIVATED');
if(!checks.backendFeeFlowV3MatchesLocal) blockers.push('BACKEND_FEE_FLOW_V3_CONTRACT_DRIFT');

const releaseGate=(platform.releaseGate?.mainnetCreatorLaunch||[]).map(item=>({requirement:item,status:'REQUIRES_SEPARATE_PROOF'}));
const report={
 schema:'WORLDZ-MAINNET-READINESS-AUDIT-V1',
 generatedAt:new Date().toISOString(),
 readOnly:true,
 network:'solana-mainnet-beta',
 tokenMinting:{available:checks.solanaMainnetMintLive,path:'/mint/?network=mainnet-beta'},
 publicMarketLaunch:{
   enabled:checks.localPublicMarketGateOpen&&checks.serverPublicMarketGateOpen,
   safeToOpenNow:blockers.length===0&&releaseGate.length===0,
   path:'/mainnet/',
   blockers
 },
 treasury:{
   configuredVault:platform.treasuryRouting.vaultAddress,
   configuredMultisig:platform.treasuryRouting.multisigConfigAddress,
   live:liveSquads,
   target:{members:targetMembers,threshold:targetThreshold}
 },
 feeContracts:{
   currentPublicBackend:{
     standard:liveGate.standard??null,
     feeFlowVersion:liveGate.feeFlowVersion??null,
     launchPadChoices:liveGate.worldzLaunchPadContributionChoicesPercent??null,
     creatorRetention:liveGate.creatorRetentionByContributionPercent??null,
     worldzInternal:liveGate.worldzInternalDistributionPercent??null,
     treasuryLane:liveGate.treasuryLane??null,
     legacyCore:liveGate.legacyCore??null,
     worldzCoreFamily:liveGate.worldzCoreFamily??null
   },
   currentLocal:{
     feeFlowVersion:'WORLDZ-FEE-FLOW-V3',
     launchPadChoices:platform.feePolicy.worldzLaunchPadContributionChoicesPercent,
     creatorRetention:platform.feePolicy.creatorRetentionByContribution,
     worldzInternal:platform.safeLaunchPolicy.feeRoutes.worldzInternalSplitPercent,
     treasuryLane:platform.safeLaunchPolicy.feeRoutes.treasuryLane
   },
   legacyAdapter:liveGate.legacyAdapter??null,
   historicalOmnichainAdapter:{grossBps:omniFee.targetGrossTraderFeeBps,split:omniFee.worldzControlledSplitPercent},
   note:'Worldz Fee Flow V3 is the new-launch registry standard. Current mainnet market settlement remains fail-closed until treasury/venue V3 settlement is independently proven. The 90/10 and 51/17/15/8.5/8.5 profiles are retained only as explicitly labelled legacy adapter contracts.'
 },
 checks,
 releaseGate
};
await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/worldz-mainnet-readiness.json',JSON.stringify(report,null,2)+'\n');

console.log('WORLDZ_MAINNET_READINESS=READ_ONLY');
console.log('TOKEN_MINT_MAINNET='+(checks.solanaMainnetMintLive?'LIVE':'OFF'));
console.log('PUBLIC_MARKET_MAINNET='+(report.publicMarketLaunch.enabled?'OPEN':'CLOSED'));
console.log('BLOCKERS='+JSON.stringify(blockers));
console.log('SQUADS='+JSON.stringify({threshold:liveSquads.threshold??null,memberCount:liveSquads.memberCount??null,verified:checks.squadsProgramOwnerVerified}));
console.log('REPORT=artifacts/worldz-mainnet-readiness.json');

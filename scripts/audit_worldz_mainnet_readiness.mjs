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
const targetMembers=Number(platform.treasuryRouting.targetMemberCount||10);
const targetThreshold=Number(platform.treasuryRouting.targetThreshold||5);

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
  legacyBackendFeeContractMatchesLocal:Number(liveGate.platformSharePercentOfCollectedTokenFee)===Number(platform.feePolicy.platformShareCapPercentOfCollectedProjectFee)
    && Number(liveGate.projectSharePercentOfCollectedTokenFee)===Number(platform.feePolicy.projectRetainedShareOfCollectedProjectFeePercent),
  nextGenEconomicsDeclared:omniFee.targetGrossTraderFeeBps===75
    && omniFee.worldzControlledSplitPercent?.creator===51
    && omniFee.worldzControlledSplitPercent?.referrer===17
    && omniFee.worldzControlledSplitPercent?.legacyFlywheel===15
    && omniFee.worldzControlledSplitPercent?.worldzLaunchPad===8.5
    && omniFee.worldzControlledSplitPercent?.oneWorldzImpact===8.5
};

const blockers=[];
if(!checks.localPublicMarketGateOpen) blockers.push('LOCAL_PUBLIC_MAINNET_MARKET_GATE_CLOSED');
if(!checks.serverPublicMarketGateOpen) blockers.push('SERVER_PUBLIC_MAINNET_MARKET_GATE_CLOSED');
if(!checks.squadsDecoded||!checks.squadsProgramOwnerVerified) blockers.push('SQUADS_OPERATIONS_TREASURY_NOT_VERIFIED');
if(!checks.operationsMemberTargetMet||!checks.operationsThresholdTargetMet) blockers.push('OPERATIONS_TREASURY_NOT_AT_5_OF_10_TARGET');
if(!checks.feeRoutingActivated) blockers.push('MAINNET_FEE_ROUTING_NOT_ACTIVATED');
if(!checks.legacyBackendFeeContractMatchesLocal) blockers.push('BACKEND_LOCAL_FEE_CONTRACT_DRIFT');

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
   currentPublicBackend:{project:liveGate.projectSharePercentOfCollectedTokenFee??null,worldz:liveGate.platformSharePercentOfCollectedTokenFee??null},
   currentLocal:{project:platform.feePolicy.projectRetainedShareOfCollectedProjectFeePercent,worldz:platform.feePolicy.platformShareCapPercentOfCollectedProjectFee},
   nextGenOmnichain:{grossBps:omniFee.targetGrossTraderFeeBps,split:omniFee.worldzControlledSplitPercent},
   note:'Current public Confidence Curve backend remains 90/10. The newer 51/17/15/8.5/8.5 Omnichain fee engine is a separate build and must not be represented as live until its settlement router is proven.'
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

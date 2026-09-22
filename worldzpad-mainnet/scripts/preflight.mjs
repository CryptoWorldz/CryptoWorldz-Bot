import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('worldzpad-mainnet');
const candidatePath=path.join(root,'wldz-one-sided-launch.candidate.json');
const candidate=JSON.parse(fs.readFileSync(candidatePath,'utf8'));

const fail=(m)=>{throw new Error('WLDZ_MAINNET_PREP_FAIL: '+m)};
const A=(x,m)=>{if(!x)fail(m)};

const allowedStatuses=new Set(['PREPARED_NOT_SIGNED','OWNER_AUTHORIZED__AWAITING_LIVE_SQUADS_THRESHOLD','OWNER_AUTHORIZED__TEMPORARY_1_OF_2_CUSTODY__ONCHAIN_EXECUTION_PENDING']);
A(allowedStatuses.has(candidate.status),'unexpected candidate status');
A(typeof candidate.launchAuthorized==='boolean','launchAuthorized must be boolean');
A(candidate.executionEnabled===false,'executionEnabled must remain false until the live Squads threshold is satisfied');
if(candidate.launchAuthorized){
  A(candidate.status==='OWNER_AUTHORIZED__TEMPORARY_1_OF_2_CUSTODY__ONCHAIN_EXECUTION_PENDING','owner-authorized status mismatch');
  A(candidate.ownerAuthorization?.authorizedBy==='JayJayTeamDev','owner authorization identity drift');
  A(Array.isArray(candidate.ownerAuthorization?.scope)&&candidate.ownerAuthorization.scope.includes('TRANSFER_8M_WLDZ_TO_JAYJAYTEAMDEV')&&candidate.ownerAuthorization.scope.includes('LAUNCH_15M_WLDZ_ONE_SIDED_METEORA_DAMM_V2')&&candidate.ownerAuthorization.scope.includes('PERMANENTLY_LOCK_LP_POSITION'),'owner authorization scope drift');
}else{
  A(candidate.status==='PREPARED_NOT_SIGNED','unsigned status mismatch');
}
A(candidate.network==='mainnet-beta','network drift');
A(candidate.token.name==='WORLDZ'&&candidate.token.symbol==='WLDZ','token identity drift');
A(candidate.token.mint==='AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U','canonical mint drift');
A(candidate.token.tokenProgram==='SPL_TOKEN','token program drift');
A(candidate.token.decimals===6,'decimals drift');
A(candidate.token.supplyTokens===100000000,'fixed supply drift');
A(candidate.token.mintAuthority==='REVOKED','mint authority policy drift');
A(candidate.token.freezeAuthority==='REVOKED','freeze authority policy drift');
A(candidate.treasury.multisig==='B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN','Squads multisig drift');
A(candidate.treasury.vault==='n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB','Squads vault drift');
A(candidate.treasury.vaultIndex===0,'vault index drift');
A(candidate.treasury.currentThreshold==='1-of-2 temporary','threshold declaration drift');
A(candidate.launch.engine==='METEORA_DAMM_V2_ONE_SIDED','launch engine drift');
A(candidate.launch.baseAmountTokens===15000000,'15M launch amount drift');
A(candidate.launch.liquidityCeilingPercent===15,'15% launch ceiling drift');
A(candidate.launch.quoteAmountSol===0,'starting quote must remain zero');
A(candidate.launch.collectFeeMode==='ONLY_B_QUOTE','collect fee mode drift');
A(candidate.launch.baseFeeBps===200,'base fee drift');
A(candidate.launch.dynamicFeeEnabled===false,'dynamic fee must remain disabled');
A(candidate.launch.permanentLockAfterCreate===true,'permanent lock policy drift');

const report={
  status:candidate.launchAuthorized?'PASS_OWNER_AUTHORIZED_TEMPORARY_1_OF_2_CUSTODY':'PASS_PREPARATION_ONLY',
  generatedAt:new Date().toISOString(),
  executionEnabled:false,
  launchAuthorized:candidate.launchAuthorized,
  network:candidate.network,
  token:{
    name:candidate.token.name,
    symbol:candidate.token.symbol,
    mint:candidate.token.mint,
    program:candidate.token.tokenProgram,
    decimals:candidate.token.decimals,
    fixedSupply:candidate.token.supplyTokens,
    mintAuthority:candidate.token.mintAuthority,
    freezeAuthority:candidate.token.freezeAuthority,
  },
  squads:{
    multisig:candidate.treasury.multisig,
    vault:candidate.treasury.vault,
    vaultIndex:candidate.treasury.vaultIndex,
    threshold:candidate.treasury.currentThreshold,
  },
  launch:{
    engine:candidate.launch.engine,
    baseAmountTokens:candidate.launch.baseAmountTokens,
    liquidityCeilingPercent:candidate.launch.liquidityCeilingPercent,
    startingQuoteSol:candidate.launch.quoteAmountSol,
    collectFeeMode:candidate.launch.collectFeeMode,
    baseFeeBps:candidate.launch.baseFeeBps,
    permanentLockAfterCreate:candidate.launch.permanentLockAfterCreate,
  },
  note:candidate.launchAuthorized?'Owner authorization is recorded. This preflight still does not sign, broadcast, bypass Squads, or enable execution.':'Current canonical WLDZ preparation gate. This file does not broadcast, sign, authorize, or execute a launch.',
};
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
fs.writeFileSync(path.join(root,'artifacts','wldz-mainnet-preparation-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('WLDZ_MAINNET_PREPARATION=PASS execution_enabled=0 launch_authorized='+(candidate.launchAuthorized?1:0));

import fs from 'node:fs';
import path from 'node:path';
import {
  Connection,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  ExtensionType,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getExtensionTypes,
  getMetadataPointerState,
  getMintCloseAuthority,
  getPermanentDelegate,
  getTransferFeeConfig,
  getTransferHook,
  unpackMint,
} from '@solana/spl-token';
import { LEGACY_MINTS } from './common.mjs';

const RPC=process.env.LEGACY_READ_RPC_URL||clusterApiUrl('mainnet-beta');
if(!/^https:\/\//i.test(RPC))throw new Error('LEGACY_READ_RPC_URL must be https');
const connection=new Connection(RPC,'confirmed');

const distribution=JSON.parse(
  fs.readFileSync('../../worldzpad-mainnet/revive/revive-distribution-wallets.v1.json','utf8')
);
const policy=JSON.parse(
  fs.readFileSync('../../worldzpad-mainnet/legacy-flywheel/worldz-legacy-flywheel.v1.json','utf8')
);

const ownerControlled=new Map(
  (distribution.verifiedLegacyDevWallets||[]).map(x=>[x.address,x.label])
);
const watchOnly=new Map(
  (distribution.watchOnlyDistributionWallets||[]).map(x=>[x.address,x.label])
);
const programWallets=new Map(
  (distribution.programPools||[]).map(x=>[x.address,x.role])
);
const historicalDistribution=new Map(
  (policy.historicalDistributionWallets?.wallets||[]).map(x=>[x.address,x.label])
);

function pk(value){
  if(!value)return null;
  const key=value instanceof PublicKey?value:new PublicKey(value);
  return key.equals(PublicKey.default)?null:key.toBase58();
}
function classify(address){
  if(!address)return {class:'NONE_OR_REVOKED',label:null,worldzControlled:false};
  if(ownerControlled.has(address))return {class:'VERIFIED_OWNER_CONTROLLED',label:ownerControlled.get(address),worldzControlled:true};
  if(watchOnly.has(address))return {class:'WATCH_ONLY_DISTRIBUTION',label:watchOnly.get(address),worldzControlled:false};
  if(programWallets.has(address))return {class:'WORLDZ_PROGRAM_POOL',label:programWallets.get(address),worldzControlled:true};
  if(historicalDistribution.has(address))return {class:'HISTORICAL_DISTRIBUTION',label:historicalDistribution.get(address),worldzControlled:false};
  return {class:'EXTERNAL_OR_UNCLASSIFIED',label:null,worldzControlled:false};
}
function authority(name,value){
  const address=pk(value);
  return {name,address,...classify(address)};
}
function feeState(fee){
  if(!fee)return null;
  return {
    transferFeeConfigAuthority:authority('transferFeeConfigAuthority',fee.transferFeeConfigAuthority),
    withdrawWithheldAuthority:authority('withdrawWithheldAuthority',fee.withdrawWithheldAuthority),
    withheldAmountRaw:fee.withheldAmount.toString(),
    older:{
      epoch:fee.olderTransferFee.epoch.toString(),
      basisPoints:Number(fee.olderTransferFee.transferFeeBasisPoints),
      maximumFeeRaw:fee.olderTransferFee.maximumFee.toString(),
    },
    newer:{
      epoch:fee.newerTransferFee.epoch.toString(),
      basisPoints:Number(fee.newerTransferFee.transferFeeBasisPoints),
      maximumFeeRaw:fee.newerTransferFee.maximumFee.toString(),
    },
  };
}
function recoveryClass(row){
  const tf=row.extensions.transferFeeConfig;
  if(!tf)return {
    state:'NO_TOKEN2022_TRANSFER_FEE_CONTROL',
    action:'Worldz Flywheel remains separate. Do not invent or harvest a legacy-token tax route.',
  };
  const a=[tf.transferFeeConfigAuthority,tf.withdrawWithheldAuthority];
  if(a.every(x=>x.address===null))return {
    state:'TRANSFER_FEE_AUTHORITIES_REVOKED',
    action:'On-chain transfer-fee control is immutable/revoked. No takeover path exists or is required.',
  };
  if(a.every(x=>x.address===null||x.worldzControlled===true))return {
    state:'WORLDZ_CONTROL_PROVABLE',
    action:'Eligible for a future owner-approved authority migration to a Worldz multisig. No authority change is executed by this audit.',
  };
  return {
    state:'THIRD_PARTY_OR_UNVERIFIED_CONTROL',
    action:'Do not bypass or seize authority. Preserve evidence, identify the controller, and use cooperation or an explicitly approved successor/migration path if needed.',
  };
}

const mintKeys=LEGACY_MINTS.map(([,mint])=>new PublicKey(mint));
const infos=await connection.getMultipleAccountsInfo(mintKeys,'confirmed');
if(infos.length!==LEGACY_MINTS.length)throw new Error('mint batch length mismatch');

const rows=[];
for(let i=0;i<LEGACY_MINTS.length;i++){
  const [symbol,mintAddress]=LEGACY_MINTS[i];
  const address=mintKeys[i], info=infos[i];
  if(!info)throw new Error(symbol+' mint account not found');
  const program=info.owner;
  const tokenProgram=program.equals(TOKEN_2022_PROGRAM_ID)
    ?'TOKEN_2022'
    :program.equals(TOKEN_PROGRAM_ID)
      ?'SPL_TOKEN'
      :'UNSUPPORTED_PROGRAM';
  if(tokenProgram==='UNSUPPORTED_PROGRAM')throw new Error(symbol+' unsupported mint owner '+program.toBase58());

  const mint=unpackMint(address,info,program);
  const types=getExtensionTypes(mint.tlvData||Buffer.alloc(0));
  const typeNames=types.map(x=>ExtensionType[x]||String(x));
  const transferFee=getTransferFeeConfig(mint);
  const permanentDelegate=getPermanentDelegate(mint);
  const transferHook=getTransferHook(mint);
  const metadataPointer=getMetadataPointerState(mint);
  const closeAuthority=getMintCloseAuthority(mint);

  const row={
    order:i+1,
    symbol,
    mint:mintAddress,
    tokenProgram,
    tokenProgramId:program.toBase58(),
    supplyRaw:mint.supply.toString(),
    decimals:mint.decimals,
    authorities:{
      mint:authority('mintAuthority',mint.mintAuthority),
      freeze:authority('freezeAuthority',mint.freezeAuthority),
    },
    extensionTypes:typeNames,
    extensions:{
      transferFeeConfig:feeState(transferFee),
      permanentDelegate:permanentDelegate?authority('permanentDelegate',permanentDelegate.delegate):null,
      transferHook:transferHook?{
        authority:authority('transferHookAuthority',transferHook.authority),
        programId:pk(transferHook.programId),
      }:null,
      metadataPointer:metadataPointer?{
        authority:authority('metadataPointerAuthority',metadataPointer.authority),
        metadataAddress:pk(metadataPointer.metadataAddress),
      }:null,
      mintCloseAuthority:closeAuthority?authority('mintCloseAuthority',closeAuthority.closeAuthority):null,
    },
  };
  row.controlRecovery=recoveryClass(row);
  rows.push(row);
}

const summary={
  total:rows.length,
  token2022:rows.filter(x=>x.tokenProgram==='TOKEN_2022').length,
  classicSpl:rows.filter(x=>x.tokenProgram==='SPL_TOKEN').length,
  withTransferFeeConfig:rows.filter(x=>x.extensions.transferFeeConfig!==null).length,
  worldzControlProvable:rows.filter(x=>x.controlRecovery.state==='WORLDZ_CONTROL_PROVABLE').length,
  thirdPartyOrUnverifiedControl:rows.filter(x=>x.controlRecovery.state==='THIRD_PARTY_OR_UNVERIFIED_CONTROL').length,
  revokedTransferFeeAuthorities:rows.filter(x=>x.controlRecovery.state==='TRANSFER_FEE_AUTHORITIES_REVOKED').length,
};

const report={
  proof:'WORLDZ_LEGACY_AUTHORITY_AUDIT',
  capturedAt:new Date().toISOString(),
  network:'solana-mainnet-beta',
  readOnly:true,
  tokenMovement:false,
  authorityChanges:false,
  legacyAssets:rows,
  summary,
  sourceSeparationRule:{
    worldzFlywheel:'Only Worldz-controlled fee revenue explicitly routed into the ten Legacy vaults is distributed by the six-hour Worldz Flywheel.',
    existingPlatformRewards:'TaxSplit, RevShare or any other legacy platform fee/reward stream is external to the Worldz Flywheel unless a later owner-approved migration explicitly changes that source.',
    antiDoubleHandling:true,
    automaticLegacyFeeHarvesting:false,
    automaticAuthorityTakeover:false,
  },
  decisionRule:'On-chain authority state wins. Verified owner-controlled authority may be migrated only by an explicit future signed action. Null authority is immutable/revoked. Third-party or unverified authority is never bypassed.',
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync(path.join('artifacts','legacy-authority-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(
  'LEGACY_AUTHORITY_AUDIT=PASS assets='+summary.total+
  ' token2022='+summary.token2022+
  ' classic='+summary.classicSpl+
  ' transfer_fee='+summary.withTransferFeeConfig+
  ' worldz_control='+summary.worldzControlProvable+
  ' third_party='+summary.thirdPartyOrUnverifiedControl+
  ' revoked='+summary.revokedTransferFeeAuthorities+
  ' read_only=YES movement=OFF takeover=OFF'
);
for(const x of rows){
  const tf=x.extensions.transferFeeConfig;
  console.log(
    'LEGACY_AUTHORITY symbol='+x.symbol+
    ' mint='+x.mint+
    ' program='+x.tokenProgram+
    ' extensions='+(x.extensionTypes.join(',')||'none')+
    ' mint_auth='+(x.authorities.mint.address||'none')+
    ' freeze_auth='+(x.authorities.freeze.address||'none')+
    ' transfer_fee_bps='+(tf?tf.newer.basisPoints:'none')+
    ' fee_config_auth='+(tf?.transferFeeConfigAuthority.address||'none')+
    ' withdraw_auth='+(tf?.withdrawWithheldAuthority.address||'none')+
    ' permanent_delegate='+(x.extensions.permanentDelegate?.address||'none')+
    ' hook_program='+(x.extensions.transferHook?.programId||'none')+
    ' recovery='+x.controlRecovery.state
  );
}

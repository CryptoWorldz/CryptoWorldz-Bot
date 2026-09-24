import fs from 'node:fs';
import path from 'node:path';
import {
  Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import {
  ActivationType, BaseFeeMode, CollectFeeMode, DammV2BaseFeeMode,
  DammV2DynamicFeeMode, DynamicBondingCurveClient, MigratedCollectFeeMode,
  MigrationFeeOption, MigrationOption, TokenAuthorityOption, TokenDecimal,
  TokenType, buildCurve, deriveDbcPoolAddress
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { MAGIC, deriveLegacyVaults, staticRouterProgramId, staticRouterAuthority } from './common.mjs';

const RPC=process.env.SOLANA_RPC_URL||clusterApiUrl('devnet');
if(/mainnet/i.test(RPC))throw new Error('MAINNET RPC FORBIDDEN');
const connection=new Connection(RPC,'confirmed');
const client=new DynamicBondingCurveClient(connection,'confirmed');
function payerFromEnvironment(){
  const raw=process.env.DEVNET_PAYER_SECRET_JSON?.trim();
  if(raw){
    let parsed;
    try{parsed=JSON.parse(raw);}catch{throw new Error('DEVNET_PAYER_SECRET_JSON must be a JSON byte array');}
    if(!Array.isArray(parsed)||parsed.length!==64)throw new Error('DEVNET_PAYER_SECRET_JSON must contain 64 secret-key bytes');
    return {keypair:Keypair.fromSecretKey(Uint8Array.from(parsed)),source:'prefunded_actions_secret'};
  }
  const file=process.env.DEVNET_PAYER_KEYPAIR_FILE?.trim();
  if(file && fs.existsSync(file)){
    const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!Array.isArray(parsed)||parsed.length!==64)throw new Error('DEVNET_PAYER_KEYPAIR_FILE must contain 64 secret-key bytes');
    return {keypair:Keypair.fromSecretKey(Uint8Array.from(parsed)),source:'pow_funded_ephemeral_file'};
  }
  return {keypair:Keypair.generate(),source:'ephemeral_generated'};
}
const payerConfig=payerFromEnvironment();
const payer=payerConfig.keypair;
const config=Keypair.generate();
const baseMint=Keypair.generate();
const DBC_PROGRAM=new PublicKey('dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN');

async function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function fund(){
  const minimumLamports=50_000_000;
  let bal=await connection.getBalance(payer.publicKey,'confirmed');
  if(bal>=minimumLamports)return {mode:payerConfig.source,sig:null,requestedSol:0,balance:bal};
  let err;
  for(const sol of [0.25,0.1,0.05]){
    try{
      const sig=await connection.requestAirdrop(payer.publicKey,Math.floor(sol*LAMPORTS_PER_SOL));
      const bh=await connection.getLatestBlockhash('confirmed');
      await connection.confirmTransaction({signature:sig,...bh},'confirmed');
      bal=await connection.getBalance(payer.publicKey,'confirmed');
      if(bal>=minimumLamports)return {mode:'rpc_airdrop',sig,requestedSol:sol,balance:bal};
    }catch(e){err=e;await sleep(2500);}
  }
  throw new Error('devnet payer funding unavailable source='+payerConfig.source+' balance='+bal+' error='+(err?.message||err));
}
const airdrop=await fund();

const curve=buildCurve({
  token:{
    tokenType:TokenType.SPLToken,
    tokenBaseDecimal:TokenDecimal.SIX,
    tokenQuoteDecimal:TokenDecimal.NINE,
    tokenAuthorityOption:TokenAuthorityOption.Immutable,
    totalTokenSupply:200_000_000,
    leftover:0
  },
  fee:{
    baseFeeParams:{
      baseFeeMode:BaseFeeMode.FeeSchedulerLinear,
      feeSchedulerParam:{startingFeeBps:75,endingFeeBps:75,numberOfPeriod:0,totalDuration:0}
    },
    dynamicFeeEnabled:false,
    collectFeeMode:CollectFeeMode.QuoteToken,
    creatorTradingFeePercentage:51,
    poolCreationFee:0,
    enableFirstSwapWithMinFee:false
  },
  migration:{
    migrationOption:MigrationOption.MET_DAMM_V2,
    migrationFeeOption:MigrationFeeOption.Customizable,
    migrationFee:{feePercentage:0,creatorFeePercentage:51},
    migratedPoolFee:{
      collectFeeMode:MigratedCollectFeeMode.QuoteToken,
      dynamicFee:DammV2DynamicFeeMode.Disabled,
      poolFeeBps:75,
      baseFeeMode:DammV2BaseFeeMode.FeeTimeSchedulerLinear
    }
  },
  liquidityDistribution:{
    partnerLiquidityPercentage:0,
    partnerPermanentLockedLiquidityPercentage:40,
    creatorLiquidityPercentage:0,
    creatorPermanentLockedLiquidityPercentage:60
  },
  lockedVesting:{
    totalLockedVestingAmount:0,
    numberOfVestingPeriod:0,
    cliffUnlockAmount:0,
    totalVestingDuration:0,
    cliffDurationFromMigrationTime:0
  },
  activationType:ActivationType.Timestamp,
  percentageSupplyOnMigration:15,
  migrationQuoteThreshold:1
});

const tx=await client.partner.createConfigAndPool({
  config:config.publicKey,
  feeClaimer:payer.publicKey,
  leftoverReceiver:payer.publicKey,
  payer:payer.publicKey,
  quoteMint:NATIVE_MINT,
  ...curve,
  preCreatePoolParam:{
    baseMint:baseMint.publicKey,
    name:'REVIVE Devnet Proof',
    symbol:'RVIVD',
    uri:'https://launchpad.cryptoworldz.xyz/metadata.php?devnet=revive-proof',
    poolCreator:payer.publicKey
  }
});
const sim=await connection.simulateTransaction(tx,[payer,config,baseMint]);
if(sim.value.err)throw new Error('DBC simulation failed: '+JSON.stringify(sim.value.err)+'\n'+(sim.value.logs||[]).slice(-20).join('\n'));
const sig=await sendAndConfirmTransaction(connection,tx,[payer,config,baseMint],{commitment:'confirmed',preflightCommitment:'confirmed'});
const pool=deriveDbcPoolAddress(NATIVE_MINT,baseMint.publicKey,config.publicKey);
const [configInfo,poolInfo,mintInfo]=await Promise.all([
  connection.getAccountInfo(config.publicKey,'confirmed'),
  connection.getAccountInfo(pool,'confirmed'),
  connection.getAccountInfo(baseMint.publicKey,'confirmed')
]);
if(!configInfo||!configInfo.owner.equals(DBC_PROGRAM))throw new Error('config owner mismatch');
if(!poolInfo||!poolInfo.owner.equals(DBC_PROGRAM))throw new Error('pool owner mismatch');
if(!mintInfo)throw new Error('base mint missing');

fs.mkdirSync('artifacts',{recursive:true});
fs.mkdirSync('.runtime',{recursive:true});
const report={
  proof:'REVIVE_DBC_DEVNET_ONCHAIN',
  network:'devnet',
  rpc:RPC,
  sdk:'@meteora-ag/dynamic-bonding-curve-sdk@1.5.12',
  dbcProgram:DBC_PROGRAM.toBase58(),
  payer:payer.publicKey.toBase58(),
  config:config.publicKey.toBase58(),
  baseMint:baseMint.publicKey.toBase58(),
  pool:pool.toBase58(),
  transaction:sig,
  funding:airdrop,
  fee:{grossBps:75,dynamic:false,creatorControlledPercent:51,partnerControlledPercent:49},
  migratedPool:{feeBps:75,dynamic:false,creatorPermanentLockedPercent:60,partnerPermanentLockedPercent:40,totalPermanentLockedPercent:100},
  router:{
    weights:MAGIC.routerWeights,
    staticFixture:{
      programId:staticRouterProgramId().toBase58(),
      authority:staticRouterAuthority().toBase58(),
      seedContract:'legacy-vault + authority + legacy_mint',
      vaultPdas:deriveLegacyVaults(),
      deployStatus:'NOT_DEPLOYED',
    }
  },
  mainnetExecution:false
};
fs.writeFileSync(path.join('artifacts','revive-dbc-devnet-proof.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join('.runtime','revive-devnet-secrets.json'),JSON.stringify({
  payer:Array.from(payer.secretKey),config:Array.from(config.secretKey),baseMint:Array.from(baseMint.secretKey)
}));
console.log('REVIVE_DBC_DEVNET=PASS tx='+sig+' pool='+pool.toBase58()+' fee_bps=75 creator=51 partner=49 migrated_fee_bps=75 lock=100');

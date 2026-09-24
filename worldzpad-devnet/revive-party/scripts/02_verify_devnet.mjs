import fs from 'node:fs';
import {
  Connection, PublicKey, clusterApiUrl
} from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import {
  BaseFeeMode,
  CollectFeeMode,
  DammV2BaseFeeMode,
  DammV2DynamicFeeMode,
  DynamicBondingCurveClient,
  MigratedCollectFeeMode,
  MigrationOption,
  TokenAuthorityOption,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { MAGIC } from './common.mjs';

const report=JSON.parse(fs.readFileSync('artifacts/revive-dbc-devnet-proof.json','utf8'));
if(report.network!=='devnet'||report.mainnetExecution!==false)throw new Error('network safety proof failed');

const RPC=process.env.SOLANA_RPC_URL||clusterApiUrl('devnet');
if(/mainnet/i.test(RPC))throw new Error('MAINNET RPC FORBIDDEN');
const connection=new Connection(RPC,'confirmed');
const client=new DynamicBondingCurveClient(connection,'confirmed');
const DBC=new PublicKey(report.dbcProgram);
const configKey=new PublicKey(report.config);
const poolKey=new PublicKey(report.pool);

const [configAccount,poolAccount,configState,poolState,txStatus]=await Promise.all([
  connection.getAccountInfo(configKey,'confirmed'),
  connection.getAccountInfo(poolKey,'confirmed'),
  client.state.getPoolConfig(configKey),
  client.state.getPool(poolKey),
  connection.getSignatureStatus(report.transaction,{searchTransactionHistory:true}),
]);

if(!configAccount||!configAccount.owner.equals(DBC))throw new Error('config owner mismatch');
if(!poolAccount||!poolAccount.owner.equals(DBC))throw new Error('pool owner mismatch');
if(!configState)throw new Error('Meteora SDK could not decode PoolConfig');
if(!poolState)throw new Error('Meteora SDK could not decode pool');
if(!txStatus?.value||txStatus.value.err)throw new Error('creation transaction not confirmed cleanly');

// Independent DBC on-chain assertions. Do not trust values echoed into the creation report.
const baseFee=configState.poolFees?.baseFee;
if(!baseFee)throw new Error('decoded base fee missing');
const expectedCliffFeeNumerator=7_500_000n; // 75 * 1_000_000_000 / 10_000
if(BigInt(baseFee.cliffFeeNumerator.toString())!==expectedCliffFeeNumerator)throw new Error('on-chain DBC base fee is not 75 bps');
if(Number(baseFee.firstFactor)!==0)throw new Error('on-chain DBC fee scheduler periods must be zero');
if(BigInt(baseFee.secondFactor.toString())!==0n||BigInt(baseFee.thirdFactor.toString())!==0n)throw new Error('on-chain DBC fee scheduler must be fixed');
if(Number(baseFee.baseFeeMode)!==Number(BaseFeeMode.FeeSchedulerLinear))throw new Error('on-chain DBC base fee mode mismatch');
if(configState.poolFees.dynamicFee!==null)throw new Error('on-chain DBC dynamic fee must be disabled');
if(Number(configState.collectFeeMode)!==Number(CollectFeeMode.QuoteToken))throw new Error('on-chain DBC must collect quote-token fees');
if(Number(configState.creatorTradingFeePercentage)!==51)throw new Error('on-chain creator fee share is not 51%');
if(Number(configState.migrationOption)!==Number(MigrationOption.MET_DAMM_V2))throw new Error('on-chain migration option is not DAMM v2');
if(Number(configState.tokenUpdateAuthority)!==Number(TokenAuthorityOption.Immutable))throw new Error('on-chain proof token is not immutable');
if(!configState.quoteMint.equals(NATIVE_MINT))throw new Error('on-chain quote mint is not wrapped SOL');

if(Number(configState.partnerLiquidityPercentage)!==0)throw new Error('partner claimable migrated liquidity must be zero');
if(Number(configState.creatorLiquidityPercentage)!==0)throw new Error('creator claimable migrated liquidity must be zero');
if(Number(configState.partnerPermanentLockedLiquidityPercentage)!==40)throw new Error('partner permanent lock must be 40%');
if(Number(configState.creatorPermanentLockedLiquidityPercentage)!==60)throw new Error('creator permanent lock must be 60%');
if(
  Number(configState.partnerLiquidityPercentage)+
  Number(configState.creatorLiquidityPercentage)+
  Number(configState.partnerPermanentLockedLiquidityPercentage)+
  Number(configState.creatorPermanentLockedLiquidityPercentage)!==100
)throw new Error('migrated liquidity percentages do not reconcile to 100%');

if(Number(configState.migratedPoolFeeBps)!==75)throw new Error('on-chain DAMM v2 target fee is not 75 bps');
if(Number(configState.migratedDynamicFee)!==Number(DammV2DynamicFeeMode.Disabled))throw new Error('on-chain DAMM v2 dynamic fee must be disabled');
if(Number(configState.migratedCollectFeeMode)!==Number(MigratedCollectFeeMode.QuoteToken))throw new Error('on-chain DAMM v2 collect fee mode mismatch');
if(Number(configState.migratedPoolBaseFeeMode)!==Number(DammV2BaseFeeMode.FeeTimeSchedulerLinear))throw new Error('on-chain DAMM v2 base fee mode mismatch');

// Pool must point back to the exact config/base mint created in the proof.
if(!poolState.poolState.config.equals(configKey))throw new Error('pool/config relationship mismatch');
if(!poolState.poolState.baseMint.equals(new PublicKey(report.baseMint)))throw new Error('pool/base mint relationship mismatch');

if(report.router.legacyVaultPdas.length!==10||new Set(report.router.legacyVaultPdas.map(x=>x.pda)).size!==10)throw new Error('PDA proof mismatch');
if(JSON.stringify(report.router.weights)!==JSON.stringify(MAGIC.routerWeights))throw new Error('router weights mismatch');

const decoded={
  proof:'REVIVE_DBC_DEVNET_ONCHAIN_DECODED',
  transaction:report.transaction,
  config:report.config,
  pool:report.pool,
  dbcProgram:report.dbcProgram,
  onchain:{
    grossBaseFeeBps:75,
    cliffFeeNumerator:baseFee.cliffFeeNumerator.toString(),
    feeSchedulerPeriods:Number(baseFee.firstFactor),
    dynamicFeeEnabled:false,
    collectFeeMode:'QUOTE_TOKEN',
    creatorTradingFeePercentage:Number(configState.creatorTradingFeePercentage),
    migrationOption:'DAMM_V2',
    migratedPoolFeeBps:Number(configState.migratedPoolFeeBps),
    migratedDynamicFee:'DISABLED',
    partnerLiquidityPercentage:Number(configState.partnerLiquidityPercentage),
    partnerPermanentLockedLiquidityPercentage:Number(configState.partnerPermanentLockedLiquidityPercentage),
    creatorLiquidityPercentage:Number(configState.creatorLiquidityPercentage),
    creatorPermanentLockedLiquidityPercentage:Number(configState.creatorPermanentLockedLiquidityPercentage),
    permanentLockedTargetPercentage:
      Number(configState.partnerPermanentLockedLiquidityPercentage)+
      Number(configState.creatorPermanentLockedLiquidityPercentage),
  },
  limitation:'This proves the DBC configuration stored on Solana devnet. It does NOT by itself prove a completed DAMM v2 migration or post-migration lock accounts.',
  mainnetExecution:false,
};
fs.writeFileSync('artifacts/revive-dbc-devnet-verified.json',JSON.stringify(decoded,null,2)+'\n');

console.log(
  'REVIVE_DBC_VERIFY=PASS tx='+report.transaction+
  ' config='+report.config+
  ' pool='+report.pool+
  ' onchain_fee_bps=75 creator=51 dynamic=OFF damm_v2_target_bps=75 lock_config=100'
);

import fs from 'node:fs';
import {Connection,PublicKey,clusterApiUrl} from '@solana/web3.js';
import {getMint,TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {CollectFeeMode,CpAmm} from '@meteora-ag/cp-amm-sdk';
import BN from 'bn.js';

const RPC=process.env.SOLANA_RPC_URL?.trim()||clusterApiUrl('devnet');
const DEVNET_GENESIS_HASH='EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
const e=JSON.parse(fs.readFileSync('artifacts/revive-direct-damm-v2-devnet.json','utf8'));
if(e.mainnetExecution!==false||e.canonicalMainnetRvivTouched!==false)throw new Error('network safety evidence failed');
if(e.devnetPriceSolPerRviv!==0.000045||e.mainnetPrice!==null)throw new Error('price evidence drift');

const connection=new Connection(RPC,'confirmed');
const genesisHash=await connection.getGenesisHash();
if(genesisHash!==DEVNET_GENESIS_HASH)throw new Error('DEVNET RPC REQUIRED genesis='+genesisHash);
const cpAmm=new CpAmm(connection);
const mintKey=new PublicKey(e.mockExistingMint);
const poolKey=new PublicKey(e.pool);
const positionKey=new PublicKey(e.position);
const [mint,pool,position,createStatus,swapStatus,claimStatus]=await Promise.all([
  getMint(connection,mintKey,'confirmed',TOKEN_PROGRAM_ID),
  cpAmm.fetchPoolState(poolKey),
  cpAmm.fetchPositionState(positionKey),
  connection.getSignatureStatus(e.createSignature,{searchTransactionHistory:true}),
  connection.getSignatureStatus(e.firstBuy.signature,{searchTransactionHistory:true}),
  connection.getSignatureStatus(e.feeClaim.signature,{searchTransactionHistory:true}),
]);
if(mint.mintAuthority!==null||mint.freezeAuthority!==null)throw new Error('mock mint authorities not revoked');
if(mint.supply!==200_000_000n*1_000_000n)throw new Error('mock mint supply drift');
if(!pool.tokenAMint.equals(mintKey))throw new Error('pool base mint mismatch');
if(Number(pool.collectFeeMode)!==Number(CollectFeeMode.OnlyB))throw new Error('pool fee mode mismatch');
if(Number(pool.poolFees.dynamicFee.initialized)!==0)throw new Error('dynamic fee enabled');
const decoded=await cpAmm.fetchPoolFees(poolKey);
if(BigInt(decoded.cliffFeeNumerator.toString())!==7_500_000n||Number(decoded.numberOfPeriod)!==0)throw new Error('75-bps fixed fee not stored');
if(position.permanentLockedLiquidity.lte(new BN(0)))throw new Error('permanent lock absent');
if(!position.unlockedLiquidity.isZero()||!position.vestedLiquidity.isZero())throw new Error('position not fully permanent-locked');
const evidenceClaimedQuoteRaw=BigInt(e.feeClaim.claimedQuoteRaw);
const onchainClaimedQuoteRaw=BigInt(position.metrics.totalClaimedBFee.toString());
if(evidenceClaimedQuoteRaw<=0n)throw new Error('no claimed quote fee evidence');
if(onchainClaimedQuoteRaw<evidenceClaimedQuoteRaw)throw new Error('on-chain claimed quote-fee metric does not support evidence');
for(const [name,status] of [['create',createStatus],['swap',swapStatus],['claim',claimStatus]]){
  if(!status?.value||status.value.err)throw new Error(name+' transaction not cleanly confirmed');
}
const verified={...e,independentVerification:{
  mockMintAuthoritiesRevoked:true,
  fixedSupplyRaw:mint.supply.toString(),
  onchainBaseFeeBps:75,
  dynamicFee:false,
  collectFeeMode:'ONLY_B_QUOTE',
  permanentLockedLiquidity:position.permanentLockedLiquidity.toString(),
  unlockedLiquidity:position.unlockedLiquidity.toString(),
  allTransactionsConfirmed:true,
  onchainClaimedQuoteRaw:onchainClaimedQuoteRaw.toString(),
}};
fs.writeFileSync('artifacts/revive-direct-damm-v2-verified.json',JSON.stringify(verified,null,2)+'\n');
console.log('REVIVE_DIRECT_DAMM_VERIFY=PASS pool='+e.pool+' mint='+e.mockExistingMint+' fee_bps=75 permanent_lock=YES fee_claim_raw='+e.feeClaim.claimedQuoteRaw);

import fs from 'node:fs';
import path from 'node:path';
import {
  Connection, Keypair, sendAndConfirmTransaction, clusterApiUrl
} from '@solana/web3.js';
import {
  AuthorityType,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
} from '@solana/spl-token';
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  MAX_SQRT_PRICE,
  SwapMode,
  derivePositionNftAccount,
  getBaseFeeParams,
  getCurrentPoint,
  getSqrtPriceFromPrice,
  getUnClaimLpFee,
} from '@meteora-ag/cp-amm-sdk';
import BN from 'bn.js';

const RPC=process.env.SOLANA_RPC_URL?.trim()||clusterApiUrl('devnet');
const DEVNET_GENESIS_HASH='EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
const payerFile=process.env.DEVNET_PAYER_KEYPAIR_FILE||'/tmp/revive-devnet-payer.json';
if(!fs.existsSync(payerFile))throw new Error('devnet payer file missing');
const payer=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(payerFile,'utf8'))));
const connection=new Connection(RPC,'confirmed');
const genesisHash=await connection.getGenesisHash();
if(genesisHash!==DEVNET_GENESIS_HASH)throw new Error('DEVNET RPC REQUIRED genesis='+genesisHash);
const balance=await connection.getBalance(payer.publicKey,'confirmed');
if(balance<50_000_000)throw new Error('DEVNET_PAYER_NOT_FUNDED balance='+balance);

const cfg=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-direct-damm-v2-existing-mint.v1.json','utf8'));
const decimals=6;
const supplyRaw=200_000_000n*1_000_000n;
const launchRaw=30_000_000n*1_000_000n;
const firstBuyLamports=1_000_000; // 0.001 SOL disposable test buy

// Create a disposable existing mint first, then revoke authorities before DAMM v2 sees it.
const mockMint=await createMint(connection,payer,payer.publicKey,payer.publicKey,decimals,undefined,undefined,TOKEN_PROGRAM_ID);
const mockAta=await getOrCreateAssociatedTokenAccount(connection,payer,mockMint,payer.publicKey,false,'confirmed',undefined,TOKEN_PROGRAM_ID);
await mintTo(connection,payer,mockMint,mockAta.address,payer,supplyRaw,[],undefined,TOKEN_PROGRAM_ID);
await setAuthority(connection,payer,mockMint,payer,AuthorityType.MintTokens,null,[],undefined,TOKEN_PROGRAM_ID);
await setAuthority(connection,payer,mockMint,payer,AuthorityType.FreezeAccount,null,[],undefined,TOKEN_PROGRAM_ID);
const mintState=await getMint(connection,mockMint,'confirmed',TOKEN_PROGRAM_ID);
if(mintState.supply!==supplyRaw)throw new Error('mock supply mismatch');
if(mintState.mintAuthority!==null||mintState.freezeAuthority!==null)throw new Error('mock authorities not revoked');

const cpAmm=new CpAmm(connection);
const initSqrtPrice=getSqrtPriceFromPrice('0.000045',6,9);
const tokenAAmount=new BN(launchRaw.toString());
const tokenBAmount=new BN(0);
const liquidityDelta=cpAmm.preparePoolCreationSingleSide({
  tokenAAmount,
  minSqrtPrice:initSqrtPrice,
  maxSqrtPrice:MAX_SQRT_PRICE,
  initSqrtPrice,
  collectFeeMode:CollectFeeMode.OnlyB,
});
if(liquidityDelta.lte(new BN(0)))throw new Error('zero liquidity delta');

const baseFee=getBaseFeeParams({
  baseFeeMode:BaseFeeMode.FeeTimeSchedulerLinear,
  feeTimeSchedulerParam:{startingFeeBps:75,endingFeeBps:75,numberOfPeriod:0,totalDuration:0},
});
const poolFees={baseFee,compoundingFeeBps:0,padding:0,dynamicFee:null};
const positionNft=Keypair.generate();
const {tx:createTx,pool,position}=await cpAmm.createCustomPool({
  payer:payer.publicKey,
  creator:payer.publicKey,
  positionNft:positionNft.publicKey,
  tokenAMint:mockMint,
  tokenBMint:NATIVE_MINT,
  tokenAAmount,
  tokenBAmount,
  sqrtMinPrice:initSqrtPrice,
  sqrtMaxPrice:MAX_SQRT_PRICE,
  liquidityDelta,
  initSqrtPrice,
  poolFees,
  hasAlphaVault:false,
  activationType:ActivationType.Timestamp,
  collectFeeMode:CollectFeeMode.OnlyB,
  activationPoint:null,
  tokenAProgram:TOKEN_PROGRAM_ID,
  tokenBProgram:TOKEN_PROGRAM_ID,
  isLockLiquidity:true,
});
const createSig=await sendAndConfirmTransaction(connection,createTx,[payer,positionNft],{commitment:'confirmed'});

let poolState=await cpAmm.fetchPoolState(pool);
let positionState=await cpAmm.fetchPositionState(position);
const decodedFees=await cpAmm.fetchPoolFees(pool);
if(!decodedFees)throw new Error('unable to decode pool base fee');
if(BigInt(decodedFees.cliffFeeNumerator.toString())!==7_500_000n)throw new Error('on-chain base fee is not 75 bps');
if(Number(decodedFees.numberOfPeriod)!==0)throw new Error('fee scheduler unexpectedly active');
if(Number(poolState.poolFees.dynamicFee.initialized)!==0)throw new Error('dynamic fee unexpectedly enabled');
if(Number(poolState.collectFeeMode)!==Number(CollectFeeMode.OnlyB))throw new Error('collect fee mode is not quote-only');
if(positionState.permanentLockedLiquidity.lte(new BN(0)))throw new Error('permanent lock missing');
if(!positionState.unlockedLiquidity.isZero()||!positionState.vestedLiquidity.isZero())throw new Error('position still has removable/vesting liquidity');

// First disposable quote-side buy.
const currentPoint=await getCurrentPoint(connection,poolState.activationType);
const quote=await cpAmm.getQuote2({
  inputTokenMint:NATIVE_MINT,
  slippage:1,
  currentPoint,
  poolState,
  tokenADecimal:6,
  tokenBDecimal:9,
  hasReferral:false,
  swapMode:SwapMode.ExactIn,
  amountIn:new BN(firstBuyLamports),
});
if(!quote.minimumAmountOut||quote.minimumAmountOut.lte(new BN(0)))throw new Error('first buy quote failed');
const swapTx=await cpAmm.swap2({
  payer:payer.publicKey,
  pool,
  inputTokenMint:NATIVE_MINT,
  outputTokenMint:mockMint,
  tokenAMint:poolState.tokenAMint,
  tokenBMint:poolState.tokenBMint,
  tokenAVault:poolState.tokenAVault,
  tokenBVault:poolState.tokenBVault,
  tokenAProgram:TOKEN_PROGRAM_ID,
  tokenBProgram:TOKEN_PROGRAM_ID,
  referralTokenAccount:null,
  swapMode:SwapMode.ExactIn,
  amountIn:new BN(firstBuyLamports),
  minimumAmountOut:quote.minimumAmountOut,
  poolState,
});
const swapSig=await sendAndConfirmTransaction(connection,swapTx,[payer],{commitment:'confirmed'});

// Claim LP-position fees from the permanently locked position.
// Native-SOL claims unwrap wSOL, so verify the actual claim through the position's
// on-chain cumulative claimed-fee metric instead of an ATA balance that gets closed.
poolState=await cpAmm.fetchPoolState(pool);
positionState=await cpAmm.fetchPositionState(position);
const unclaimedBefore=getUnClaimLpFee(poolState,positionState);
const claimableQuoteRaw=BigInt(unclaimedBefore.feeTokenB.toString());
if(claimableQuoteRaw<=0n)throw new Error('locked position has no quote fee available to claim');
const claimedBeforeRaw=BigInt(positionState.metrics.totalClaimedBFee.toString());
const positionNftAccount=derivePositionNftAccount(positionNft.publicKey);
const claimTx=await cpAmm.claimPositionFee({
  receiver:null,
  owner:payer.publicKey,
  pool,
  position,
  positionNftAccount,
  tokenAVault:poolState.tokenAVault,
  tokenBVault:poolState.tokenBVault,
  tokenAMint:poolState.tokenAMint,
  tokenBMint:poolState.tokenBMint,
  tokenAProgram:TOKEN_PROGRAM_ID,
  tokenBProgram:TOKEN_PROGRAM_ID,
});
const claimSig=await sendAndConfirmTransaction(connection,claimTx,[payer],{commitment:'confirmed'});
const finalPosition=await cpAmm.fetchPositionState(position);
const claimedAfterRaw=BigInt(finalPosition.metrics.totalClaimedBFee.toString());
const claimedQuoteRaw=claimedAfterRaw-claimedBeforeRaw;
if(claimedQuoteRaw<=0n)throw new Error('locked position fee claim did not increase on-chain claimed quote fees');
if(claimedQuoteRaw>claimableQuoteRaw)throw new Error('claimed quote fee exceeded pre-claim entitlement');
if(finalPosition.permanentLockedLiquidity.lte(new BN(0)))throw new Error('permanent lock disappeared after fee claim');
if(!finalPosition.unlockedLiquidity.isZero())throw new Error('locked position became removable');

const evidence={
  proof:'REVIVE_DIRECT_DAMM_V2_DEVNET',
  network:'devnet',
  canonicalMainnetRvivMint:cfg.canonicalToken.mint,
  canonicalMainnetRvivTouched:false,
  mockExistingMint:mockMint.toBase58(),
  mockSupplyRaw:supplyRaw.toString(),
  mockMintAuthority:null,
  mockFreezeAuthority:null,
  devnetPriceSolPerRviv:0.000045,
  mainnetPrice:null,
  initialBaseTokens:30_000_000,
  initialQuoteSol:0,
  fee:{baseFeeBps:75,dynamicFee:false,collectFeeMode:'ONLY_B_QUOTE'},
  pool:pool.toBase58(),
  position:position.toBase58(),
  positionNft:positionNft.publicKey.toBase58(),
  createSignature:createSig,
  firstBuy:{
    inputLamports:String(firstBuyLamports),
    outputRaw:quote.outputAmount.toString(),
    claimingFeeRaw:quote.claimingFee.toString(),
    compoundingFeeRaw:quote.compoundingFee.toString(),
    protocolFeeRaw:quote.protocolFee.toString(),
    referralFeeRaw:quote.referralFee.toString(),
    signature:swapSig,
  },
  lockedPosition:{
    permanentLockedLiquidity:finalPosition.permanentLockedLiquidity.toString(),
    unlockedLiquidity:finalPosition.unlockedLiquidity.toString(),
    vestedLiquidity:finalPosition.vestedLiquidity.toString(),
  },
  feeClaim:{
    claimedQuoteRaw:claimedQuoteRaw.toString(),
    signature:claimSig,
  },
  mainnetExecution:false,
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/revive-direct-damm-v2-devnet.json',JSON.stringify(evidence,null,2)+'\n');
console.log('REVIVE_DIRECT_DAMM_DEVNET=PASS pool='+evidence.pool+' price=0.000045 fee_bps=75 permanent_lock=YES first_buy='+swapSig+' fee_claim='+claimSig+' mainnet=LOCKED');

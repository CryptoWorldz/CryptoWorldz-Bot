import fs from 'node:fs';
import path from 'node:path';
import BN from 'bn.js';
import {
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  AuthorityType,
  createMint,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
} from '@solana/spl-token';
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  DammV2BaseFeeMode,
  DammV2DynamicFeeMode,
  DynamicBondingCurveClient,
  MigratedCollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenType,
  buildCurve,
  deriveDbcPoolAddress,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import {
  devnetConnection,
  ensureDevnetSol,
  jsonSafe,
  payerFromEnvironment,
  routePartnerQuoteAtomic,
} from './common.mjs';

const {rpc,connection}=devnetConnection();
const client=new DynamicBondingCurveClient(connection,'confirmed');
const payerConfig=payerFromEnvironment();
const payer=payerConfig.keypair;
fs.mkdirSync('artifacts',{recursive:true});
fs.mkdirSync('.runtime',{recursive:true});

const report={
  proof:'BITWORLDZ_SOLANA_DEVNET_MOCK_BTC_BITPAIR_V1',
  network:'devnet',
  rpc,
  status:'STARTED',
  stages:[],
  mainnetExecution:false,
  mockBitcoin:{
    symbol:'mBTC',
    decimals:8,
    assetClass:'WRAPPED_BTC_SIMULATION_ONLY',
    backing:'NONE__DEVNET_TEST_TOKEN_ONLY',
  },
};

function ok(stage,data={}){
  report.stages.push({stage,status:'PASS',...jsonSafe(data)});
}
function save(){
  fs.writeFileSync('artifacts/bitworldz-live-bitpair.json',JSON.stringify(jsonSafe(report),null,2)+'\n');
}

try{
  const funding=await ensureDevnetSol(connection,payer);
  ok('DEVNET_PAYER',{payer:payer.publicKey.toBase58(),payerSource:payerConfig.source,funding});

  const quoteMint=await createMint(connection,payer,payer.publicKey,null,8);
  const quoteAta=await getOrCreateAssociatedTokenAccount(connection,payer,quoteMint,payer.publicKey);
  const mockBtcAtomic=1_000_000_000n; // 10.00000000 mBTC units
  const mintSig=await mintTo(connection,payer,quoteMint,quoteAta.address,payer,mockBtcAtomic);
  const revokeSig=await setAuthority(connection,payer,quoteMint,payer.publicKey,AuthorityType.MintTokens,null);
  report.mockBitcoin.mint=quoteMint.toBase58();
  report.mockBitcoin.ownerAta=quoteAta.address.toBase58();
  report.mockBitcoin.mintedAtomic=mockBtcAtomic.toString();
  report.mockBitcoin.mintAuthorityRevoked=true;
  ok('CREATE_MOCK_BTC_QUOTE',{quoteMint:quoteMint.toBase58(),mintSig,revokeSig});

  const config=Keypair.generate();
  const baseMint=Keypair.generate();

  const curve=buildCurve({
    token:{
      tokenType:TokenType.SPLToken,
      tokenBaseDecimal:6,
      tokenQuoteDecimal:8,
      tokenAuthorityOption:TokenAuthorityOption.Immutable,
      totalTokenSupply:100_000_000,
      leftover:0,
    },
    fee:{
      baseFeeParams:{
        baseFeeMode:BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam:{startingFeeBps:75,endingFeeBps:75,numberOfPeriod:0,totalDuration:0},
      },
      dynamicFeeEnabled:false,
      collectFeeMode:CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage:51,
      poolCreationFee:0,
      enableFirstSwapWithMinFee:false,
    },
    migration:{
      migrationOption:MigrationOption.MET_DAMM_V2,
      migrationFeeOption:MigrationFeeOption.Customizable,
      migrationFee:{feePercentage:0,creatorFeePercentage:51},
      migratedPoolFee:{
        collectFeeMode:MigratedCollectFeeMode.QuoteToken,
        dynamicFee:DammV2DynamicFeeMode.Disabled,
        poolFeeBps:75,
        baseFeeMode:DammV2BaseFeeMode.FeeTimeSchedulerLinear,
      },
    },
    liquidityDistribution:{
      partnerLiquidityPercentage:0,
      partnerPermanentLockedLiquidityPercentage:40,
      creatorLiquidityPercentage:0,
      creatorPermanentLockedLiquidityPercentage:60,
    },
    lockedVesting:{
      totalLockedVestingAmount:0,
      numberOfVestingPeriod:0,
      cliffUnlockAmount:0,
      totalVestingDuration:0,
      cliffDurationFromMigrationTime:0,
    },
    activationType:ActivationType.Timestamp,
    percentageSupplyOnMigration:15,
    migrationQuoteThreshold:0.01,
  });

  const tx=await client.partner.createConfigAndPool({
    config:config.publicKey,
    feeClaimer:payer.publicKey,
    leftoverReceiver:payer.publicKey,
    payer:payer.publicKey,
    quoteMint,
    ...curve,
    preCreatePoolParam:{
      baseMint:baseMint.publicKey,
      name:'BitWorldz Mock BTC Devnet',
      symbol:'BWBTC',
      uri:'https://launchpad.cryptoworldz.xyz/bitworldz/',
      poolCreator:payer.publicKey,
    },
  });

  const sim=await connection.simulateTransaction(tx,[payer,config,baseMint]);
  if(sim.value.err){
    report.status='BLOCKED_AT_DBC_CREATE_SIMULATION';
    report.blocker={
      message:'Meteora DBC rejected the custom mock-BTC quote pool simulation. This can indicate a quote-token badge/permission requirement or another devnet compatibility gate.',
      error:jsonSafe(sim.value.err),
      logs:(sim.value.logs||[]).slice(-30),
    };
    save();
    throw new Error('DBC custom quote simulation blocked: '+JSON.stringify(sim.value.err));
  }
  ok('DBC_CREATE_SIMULATION',{unitsConsumed:sim.value.unitsConsumed??null});

  const createSig=await sendAndConfirmTransaction(connection,tx,[payer,config,baseMint],{
    commitment:'confirmed',
    preflightCommitment:'confirmed',
  });
  const pool=deriveDbcPoolAddress(quoteMint,baseMint.publicKey,config.publicKey);
  ok('CREATE_BITPAIR_ONCHAIN',{
    transaction:createSig,
    config:config.publicKey.toBase58(),
    baseMint:baseMint.publicKey.toBase58(),
    quoteMint:quoteMint.toBase58(),
    pool:pool.toBase58(),
  });

  const poolState=await client.state.getPool(pool);
  const configState=await client.state.getPoolConfig(config.publicKey);
  if(!poolState||!configState) throw new Error('DBC state decode failed after creation');
  if(!configState.quoteMint.equals(quoteMint)) throw new Error('on-chain quote mint mismatch');
  if(Number(configState.creatorTradingFeePercentage)!==51) throw new Error('creator fee percentage mismatch');
  if(Number(configState.partnerPermanentLockedLiquidityPercentage)!==40||
     Number(configState.creatorPermanentLockedLiquidityPercentage)!==60) throw new Error('permanent lock target mismatch');
  ok('DECODE_BITPAIR_STATE',{
    quoteMint:configState.quoteMint.toBase58(),
    creatorTradingFeePercentage:Number(configState.creatorTradingFeePercentage),
    partnerPermanentLockedLiquidityPercentage:Number(configState.partnerPermanentLockedLiquidityPercentage),
    creatorPermanentLockedLiquidityPercentage:Number(configState.creatorPermanentLockedLiquidityPercentage),
    permanentLockTargetPercent:100,
    note:'This proves configured post-graduation permanent-lock percentages, not a completed DAMM v2 migration.',
  });

  const currentSlot=await connection.getSlot('confirmed');
  const currentTime=await connection.getBlockTime(currentSlot);
  if(currentTime===null) throw new Error('devnet block time unavailable');
  const buyAmount=new BN('100000'); // 0.00100000 mBTC
  const buyQuote=await client.pool.swapQuote({
    virtualPool:poolState,
    config:configState,
    swapBaseForQuote:false,
    amountIn:buyAmount,
    slippageBps:100,
    hasReferral:false,
    currentPoint:new BN(String(currentTime)),
    eligibleForFirstSwapWithMinFee:false,
  });
  const buyTx=await client.pool.swap({
    owner:payer.publicKey,
    pool,
    amountIn:buyAmount,
    minimumAmountOut:buyQuote.minimumAmountOut,
    swapBaseForQuote:false,
    referralTokenAccount:null,
  });
  const buySig=await sendAndConfirmTransaction(connection,buyTx,[payer],{commitment:'confirmed'});
  ok('BUY_SIMULATION_ONCHAIN',{
    transaction:buySig,
    quoteInputAtomic:buyAmount.toString(),
    quotedOutputAtomic:buyQuote.outputAmount?.toString?.()??null,
    tradingFeeAtomic:buyQuote.tradingFee?.toString?.()??null,
    protocolFeeAtomic:buyQuote.protocolFee?.toString?.()??null,
  });

  const baseAta=await getAssociatedTokenAddress(baseMint.publicKey,payer.publicKey);
  const baseBal=await connection.getTokenAccountBalance(baseAta,'confirmed');
  const acquired=BigInt(baseBal.value.amount);
  if(acquired<=1n) throw new Error('buy produced no usable base-token balance');
  const sellAtomic=acquired/4n;
  const poolAfterBuy=await client.state.getPool(pool);
  const configAfterBuy=await client.state.getPoolConfig(config.publicKey);
  const slot2=await connection.getSlot('confirmed');
  const time2=await connection.getBlockTime(slot2);
  if(time2===null) throw new Error('devnet block time unavailable for sell');
  const sellQuote=await client.pool.swapQuote({
    virtualPool:poolAfterBuy,
    config:configAfterBuy,
    swapBaseForQuote:true,
    amountIn:new BN(sellAtomic.toString()),
    slippageBps:100,
    hasReferral:false,
    currentPoint:new BN(String(time2)),
    eligibleForFirstSwapWithMinFee:false,
  });
  const sellTx=await client.pool.swap({
    owner:payer.publicKey,
    pool,
    amountIn:new BN(sellAtomic.toString()),
    minimumAmountOut:sellQuote.minimumAmountOut,
    swapBaseForQuote:true,
    referralTokenAccount:null,
  });
  const sellSig=await sendAndConfirmTransaction(connection,sellTx,[payer],{commitment:'confirmed'});
  ok('SELL_SIMULATION_ONCHAIN',{
    transaction:sellSig,
    baseInputAtomic:sellAtomic.toString(),
    quotedQuoteOutputAtomic:sellQuote.outputAmount?.toString?.()??null,
    tradingFeeAtomic:sellQuote.tradingFee?.toString?.()??null,
    protocolFeeAtomic:sellQuote.protocolFee?.toString?.()??null,
  });

  const fees=await client.state.getPoolFeeBreakdown(pool);
  const partnerQuoteAtomic=BigInt(fees?.partner?.totalQuoteFee?.toString?.()||'0');
  const creatorQuoteAtomic=BigInt(fees?.creator?.totalQuoteFee?.toString?.()||'0');
  const partnerRoutePreview=routePartnerQuoteAtomic(partnerQuoteAtomic);
  ok('FEE_ACCRUAL_AND_WORLDZ_ROUTE_PREVIEW',{
    creatorQuoteFeeAtomic:creatorQuoteAtomic.toString(),
    partnerQuoteFeeAtomic:partnerQuoteAtomic.toString(),
    partnerRoutePreview,
    transferStatus:'PREVIEW_ONLY__ROUTER_PROGRAM_NOT_EXECUTED',
  });

  const finalPool=await client.state.getPool(pool);
  const progress=await client.state.getPoolQuoteTokenCurveProgress(pool);
  ok('LIQUIDITY_STATE_PROOF',{
    quoteReserveAtomic:finalPool?.poolState?.quoteReserve?.toString?.()??null,
    baseReserveAtomic:finalPool?.poolState?.baseReserve?.toString?.()??null,
    migrationProgress:progress,
    isMigrated:Number(finalPool?.poolState?.isMigrated??0),
    permanentLockConfigurationPercent:100,
    actualPostMigrationLockProof:false,
  });

  report.status='PASS_PRE_GRADUATION';
  report.accounts={
    payer:payer.publicKey.toBase58(),
    config:config.publicKey.toBase58(),
    baseMint:baseMint.publicKey.toBase58(),
    quoteMint:quoteMint.toBase58(),
    pool:pool.toBase58(),
  };
  report.transactions={mockQuoteMint:mintSig,mockQuoteRevoke:revokeSig,create:createSig,buy:buySig,sell:sellSig};
  report.limitations=[
    'Mock mBTC has no real Bitcoin backing and is devnet-only.',
    'Worldz partner fee routing is calculated from accrued on-chain partner fees but not transferred by the undeployed router.',
    '100% permanent lock is proven as DBC configuration only; completed DAMM v2 migration/lock accounts require a separate graduation proof.',
  ];
  save();
  fs.writeFileSync(path.join('.runtime','bitworldz-devnet-secrets.json'),JSON.stringify({
    payer:Array.from(payer.secretKey),
    config:Array.from(config.secretKey),
    baseMint:Array.from(baseMint.secretKey),
  }));
  console.log('BITWORLDZ_LIVE_BITPAIR=PASS_PRE_GRADUATION pool='+pool.toBase58()+' buy='+buySig+' sell='+sellSig);
}catch(error){
  if(report.status==='STARTED') report.status='FAIL';
  report.error=error?.message||String(error);
  save();
  console.error('BITWORLDZ_LIVE_BITPAIR='+report.status+' '+report.error);
  process.exitCode=1;
}

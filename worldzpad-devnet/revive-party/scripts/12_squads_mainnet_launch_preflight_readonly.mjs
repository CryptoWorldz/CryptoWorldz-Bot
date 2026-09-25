#!/usr/bin/env node
// REVIVE Squads-aware mainnet preflight — READ ONLY.
// Builds the real Squads v4 + Meteora DAMM v2 instruction path against live
// mainnet state. Simulates only. NEVER signs, sends or broadcasts.
//
// 0.000045 SOL/RVIV is retained only as the existing cost/simulation fixture.
// Mainnet opening price remains UNSET and this script cannot authorize it.

import fs from 'node:fs';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  MAX_SQRT_PRICE,
  getBaseFeeParams,
  getSqrtPriceFromPrice,
} from '@meteora-ag/cp-amm-sdk';
import BN from 'bn.js';
import * as squads from '@sqds/multisig';

const RPC=process.env.SOLANA_MAINNET_RPC_URL?.trim()||clusterApiUrl('mainnet-beta');
const MAINNET_GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const MEMBER=new PublicKey('Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u');
const MULTISIG=new PublicKey('B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN');
const CANONICAL_VAULT=new PublicKey('n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB');

const cfg=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-launch-contract.v1.json','utf8'));
const route=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-direct-damm-v2-existing-mint.v1.json','utf8'));
if(cfg.launch.publicMainnetExecutionEnabled!==false)throw new Error('SAFETY_GATE mainnet execution must remain OFF');
if(route.mainnetGates.enabled!==false)throw new Error('SAFETY_GATE route mainnet gate must remain OFF');
if(route.pricing.mainnet.priceSolPerRviv!==null)throw new Error('SAFETY_GATE mainnet price must remain UNSET');

const connection=new Connection(RPC,'confirmed');
const genesis=await connection.getGenesisHash();
if(genesis!==MAINNET_GENESIS)throw new Error('MAINNET RPC REQUIRED genesis='+genesis);

const multisigAccount=await squads.accounts.Multisig.fromAccountAddress(connection,MULTISIG,'confirmed');
const threshold=Number(multisigAccount.threshold);
const transactionIndex=BigInt(multisigAccount.transactionIndex.toString());
const nextIndex=transactionIndex+1n;
const memberRecord=multisigAccount.members.find(x=>x.key.equals(MEMBER));
if(!memberRecord)throw new Error('JayJayTeamDev is not a live Squads member');
const permissions={
  initiate:squads.types.Permissions.has(memberRecord.permissions,squads.types.Permission.Initiate),
  vote:squads.types.Permissions.has(memberRecord.permissions,squads.types.Permission.Vote),
  execute:squads.types.Permissions.has(memberRecord.permissions,squads.types.Permission.Execute),
};
if(!permissions.initiate||!permissions.vote||!permissions.execute){
  throw new Error('JayJayTeamDev lacks required Squads initiate/vote/execute permission '+JSON.stringify(permissions));
}
if(threshold!==1)throw new Error('Minimum single-member path unavailable: live threshold='+threshold);

const [vaultPda]=squads.getVaultPda({multisigPda:MULTISIG,index:0});
if(!vaultPda.equals(CANONICAL_VAULT))throw new Error('Squads vault #0 mismatch');
const [transactionPda]=squads.getTransactionPda({multisigPda:MULTISIG,index:nextIndex});
const [proposalPda]=squads.getProposalPda({multisigPda:MULTISIG,transactionIndex:nextIndex});
const [positionNftPda,positionNftBump]=squads.getEphemeralSignerPda({
  transactionPda,
  ephemeralSignerIndex:0,
});

const rvivMint=new PublicKey(cfg.token.canonicalMint);
const rvivAta=getAssociatedTokenAddressSync(rvivMint,vaultPda,true,TOKEN_PROGRAM_ID);
const wsolAta=getAssociatedTokenAddressSync(NATIVE_MINT,vaultPda,true,TOKEN_PROGRAM_ID);
const [memberBalance,vaultBalance,rvivBalance,wsolInfo]=await Promise.all([
  connection.getBalance(MEMBER,'confirmed'),
  connection.getBalance(vaultPda,'confirmed'),
  connection.getTokenAccountBalance(rvivAta,'confirmed'),
  connection.getAccountInfo(wsolAta,'confirmed'),
]);
const launchRaw=30_000_000n*1_000_000n;
if(BigInt(rvivBalance.value.amount)<launchRaw)throw new Error('Vault lacks 30M RVIV');
if(!wsolInfo)throw new Error('Canonical Squads vault wSOL ATA unexpectedly missing');

const cpAmm=new CpAmm(connection);
const costOnlyPrice='0.000045';
const initSqrtPrice=getSqrtPriceFromPrice(costOnlyPrice,6,9);
const tokenAAmount=new BN(launchRaw.toString());
const tokenBAmount=new BN(0);
const liquidityDelta=cpAmm.preparePoolCreationSingleSide({
  tokenAAmount,
  minSqrtPrice:initSqrtPrice,
  maxSqrtPrice:MAX_SQRT_PRICE,
  initSqrtPrice,
  collectFeeMode:CollectFeeMode.OnlyB,
});
const baseFee=getBaseFeeParams({
  baseFeeMode:BaseFeeMode.FeeTimeSchedulerLinear,
  feeTimeSchedulerParam:{startingFeeBps:75,endingFeeBps:75,numberOfPeriod:0,totalDuration:0},
});
if(!baseFee)throw new Error('Meteora rejected fixed 75-bps fee');

const {tx:poolTx,pool,position}=await cpAmm.createCustomPool({
  payer:vaultPda,
  creator:vaultPda,
  positionNft:positionNftPda,
  tokenAMint:rvivMint,
  tokenBMint:NATIVE_MINT,
  tokenAAmount,
  tokenBAmount,
  sqrtMinPrice:initSqrtPrice,
  sqrtMaxPrice:MAX_SQRT_PRICE,
  liquidityDelta,
  initSqrtPrice,
  poolFees:{baseFee,compoundingFeeBps:0,padding:0,dynamicFee:null},
  hasAlphaVault:false,
  activationType:ActivationType.Timestamp,
  collectFeeMode:CollectFeeMode.OnlyB,
  activationPoint:null,
  tokenAProgram:TOKEN_PROGRAM_ID,
  tokenBProgram:TOKEN_PROGRAM_ID,
  isLockLiquidity:true,
});

const rentSpecs=[
  ['meteora_pool',1112],
  ['meteora_position',408],
  ['rviv_pool_vault',165],
  ['wsol_pool_vault',165],
  ['position_nft_mint_token2022_with_meteora_metadata',465],
  ['position_nft_account_token2022',165],
];
let poolRentLamports=0n;
const rents={};
for(const [name,bytes] of rentSpecs){
  const lamports=BigInt(await connection.getMinimumBalanceForRentExemption(bytes,'confirmed'));
  rents[name]={bytes,lamports:lamports.toString()};
  poolRentLamports+=lamports;
}
const mandatoryQuoteLamports=1n;
const vaultNeedBeforeExecution=poolRentLamports+mandatoryQuoteLamports;
const exactVaultTopUp=vaultNeedBeforeExecution>BigInt(vaultBalance)
  ? vaultNeedBeforeExecution-BigInt(vaultBalance)
  : 0n;

const latest=await connection.getLatestBlockhash('confirmed');
const innerMessage=new TransactionMessage({
  payerKey:vaultPda,
  recentBlockhash:latest.blockhash,
  instructions:poolTx.instructions,
});
const messageBytes=squads.utils.transactionMessageToMultisigTransactionMessageBytes({
  message:innerMessage,
  vaultPda,
});
const [wrappedMessage]=squads.types.transactionMessageBeet.deserialize(Buffer.from(messageBytes));

const {accountMetas}=await squads.utils.accountsForTransactionExecute({
  connection,
  transactionPda,
  vaultPda,
  message:wrappedMessage,
  ephemeralSignerBumps:[positionNftBump],
  programId:squads.PROGRAM_ID,
});

const createIx=squads.instructions.vaultTransactionCreate({
  multisigPda:MULTISIG,
  transactionIndex:nextIndex,
  creator:MEMBER,
  rentPayer:MEMBER,
  vaultIndex:0,
  ephemeralSigners:1,
  transactionMessage:innerMessage,
  memo:'REVIVE mainnet direct DAMM v2 — 30M RVIV — 75 bps — 100% permanent lock',
});
const proposalCreateIx=squads.instructions.proposalCreate({
  multisigPda:MULTISIG,
  creator:MEMBER,
  rentPayer:MEMBER,
  transactionIndex:nextIndex,
  isDraft:false,
});
const approveIx=squads.instructions.proposalApprove({
  multisigPda:MULTISIG,
  transactionIndex:nextIndex,
  member:MEMBER,
  memo:'JayJayTeamDev approval — threshold 1',
});
const executeIx=squads.generated.createVaultTransactionExecuteInstruction({
  multisig:MULTISIG,
  proposal:proposalPda,
  transaction:transactionPda,
  member:MEMBER,
  anchorRemainingAccounts:accountMetas,
},squads.PROGRAM_ID);
const topUpIx=SystemProgram.transfer({
  fromPubkey:MEMBER,
  toPubkey:vaultPda,
  lamports:Number(exactVaultTopUp),
});

function legacyTx(instructions){
  const tx=new Transaction({feePayer:MEMBER,recentBlockhash:latest.blockhash});
  tx.add(...instructions);
  return tx;
}
function serializedSize(tx){
  try{return tx.serialize({requireAllSignatures:false,verifySignatures:false}).length;}
  catch(e){return {error:String(e?.message||e)};}
}
async function feeFor(tx){
  const x=await connection.getFeeForMessage(tx.compileMessage(),'confirmed');
  return x.value;
}
async function simulate(tx,addresses=[]){
  const wire=tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64');
  const params={
    encoding:'base64',
    sigVerify:false,
    replaceRecentBlockhash:true,
    commitment:'confirmed',
  };
  if(addresses.length)params.accounts={encoding:'base64',addresses:addresses.map(x=>x.toBase58())};
  const response=await fetch(RPC,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method:'simulateTransaction',params:[wire,params]}),
  });
  const env=await response.json();
  if(env.error)return {rpcError:env.error};
  return env.result?.value??null;
}

const atomicTx=legacyTx([topUpIx,createIx,proposalCreateIx,approveIx,executeIx]);
const setupTx=legacyTx([topUpIx,createIx,proposalCreateIx,approveIx]);
const executeTx=legacyTx([executeIx]);

const atomicSize=serializedSize(atomicTx);
const setupSize=serializedSize(setupTx);
const executeSize=serializedSize(executeTx);

const setupFee=typeof setupSize==='number'&&setupSize<=1232?await feeFor(setupTx):null;
const executeFee=typeof executeSize==='number'&&executeSize<=1232?await feeFor(executeTx):null;
const atomicFee=typeof atomicSize==='number'&&atomicSize<=1232?await feeFor(atomicTx):null;

const setupSimulation=typeof setupSize==='number'&&setupSize<=1232
  ?await simulate(setupTx,[MEMBER,vaultPda,transactionPda,proposalPda])
  :null;

// Direct cost/state simulation: top up then execute the actual Meteora inner
// instructions as signer bits, with signature verification disabled. This does
// not replace the Squads execution proof; it proves the pool instruction state/cost.
const directPoolTx=legacyTx([topUpIx,...poolTx.instructions]);
const directPoolSize=serializedSize(directPoolTx);
const directPoolSimulation=typeof directPoolSize==='number'&&directPoolSize<=1232
  ?await simulate(directPoolTx,[MEMBER,vaultPda])
  :null;

// Created-account lamports from setup simulation, if returned.
function simLamports(sim,index){
  const a=sim?.accounts?.[index];
  return a?BigInt(a.lamports):0n;
}
const simulatedMemberAfter=simLamports(setupSimulation,0);
const simulatedVaultAfter=simLamports(setupSimulation,1);
const transactionAccountRent=simLamports(setupSimulation,2);
const proposalAccountRent=simLamports(setupSimulation,3);

const knownOuterFees=BigInt(setupFee??0)+BigInt(executeFee??0);
const exactKnownUpfront=
  exactVaultTopUp+
  transactionAccountRent+
  proposalAccountRent+
  knownOuterFees;
const memberHeadroom=BigInt(memberBalance)-exactKnownUpfront;

const report={
  proof:'REVIVE_SQUADS_MAINNET_READ_ONLY_PREFLIGHT',
  capturedAt:new Date().toISOString(),
  network:'solana-mainnet-beta',
  mainnetExecutionEnabled:false,
  openingPrice:{
    mainnetStillUnset:true,
    costOnlySimulationFixtureSolPerRviv:Number(costOnlyPrice),
  },
  squads:{
    program:squads.PROGRAM_ID.toBase58(),
    multisig:MULTISIG.toBase58(),
    threshold,
    member:MEMBER.toBase58(),
    memberPermissions:permissions,
    currentTransactionIndex:transactionIndex.toString(),
    plannedTransactionIndex:nextIndex.toString(),
    transactionPda:transactionPda.toBase58(),
    proposalPda:proposalPda.toBase58(),
    vaultIndex:0,
    vault:vaultPda.toBase58(),
    ephemeralPositionNftSigner:positionNftPda.toBase58(),
    ephemeralPositionNftBump:positionNftBump,
  },
  meteora:{
    pool:pool.toBase58(),
    position:position.toBase58(),
    rvivMint:rvivMint.toBase58(),
    rvivLiquidityTokens:30_000_000,
    quoteLiquidityConfiguredSol:0,
    sdkMandatoryQuoteLamports:'1',
    baseFeeBps:75,
    dynamicFee:false,
    permanentLockPercent:100,
    poolInstructionCount:poolTx.instructions.length,
    innerMessageBytes:messageBytes.length,
  },
  funding:{
    jayJayBalanceLamports:String(memberBalance),
    jayJayBalanceSol:memberBalance/1e9,
    vaultBalanceLamports:String(vaultBalance),
    vaultBalanceSol:vaultBalance/1e9,
    vaultWsolAta:wsolAta.toBase58(),
    vaultWsolAtaExists:Boolean(wsolInfo),
    poolRentLamports:poolRentLamports.toString(),
    poolRentSol:Number(poolRentLamports)/1e9,
    exactVaultTopUpLamports:exactVaultTopUp.toString(),
    exactVaultTopUpSol:Number(exactVaultTopUp)/1e9,
    transactionAccountRentLamports:transactionAccountRent.toString(),
    proposalAccountRentLamports:proposalAccountRent.toString(),
    setupFeeLamports:setupFee,
    executeFeeLamports:executeFee,
    atomicFeeLamports:atomicFee,
    exactKnownUpfrontLamports:exactKnownUpfront.toString(),
    exactKnownUpfrontSol:Number(exactKnownUpfront)/1e9,
    jayJayHeadroomAfterKnownUpfrontLamports:memberHeadroom.toString(),
    jayJayHeadroomAfterKnownUpfrontSol:Number(memberHeadroom)/1e9,
    sufficient:memberHeadroom>=0n,
    rents,
  },
  transactionPlan:{
    atomic:{serializedBytes:atomicSize,within1232:typeof atomicSize==='number'&&atomicSize<=1232},
    setup:{serializedBytes:setupSize,within1232:typeof setupSize==='number'&&setupSize<=1232,simulationErr:setupSimulation?.err??setupSimulation?.rpcError??null,units:setupSimulation?.unitsConsumed??null},
    execute:{serializedBytes:executeSize,within1232:typeof executeSize==='number'&&executeSize<=1232},
    directPoolStateProof:{serializedBytes:directPoolSize,within1232:typeof directPoolSize==='number'&&directPoolSize<=1232,simulationErr:directPoolSimulation?.err??directPoolSimulation?.rpcError??null,units:directPoolSimulation?.unitsConsumed??null},
    preferredMinimumPath:
      typeof atomicSize==='number'&&atomicSize<=1232
        ?'ONE_OUTER_TRANSACTION_IF_ATOMIC_SIMULATION_PASSES'
        :'TWO_OUTER_TRANSACTIONS_SETUP_THEN_EXECUTE',
  },
  safety:{
    readOnly:true,
    noPrivateKeys:true,
    noSigning:true,
    noBroadcast:true,
    noSolMoved:true,
    noRvivMoved:true,
    mainnetPriceNotAuthorized:true,
  },
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/revive-squads-mainnet-preflight-readonly.json',JSON.stringify(report,null,2)+'\n');
console.log('REVIVE_SQUADS_MAINNET_PREFLIGHT=COMPLETE threshold='+threshold+' atomic_bytes='+JSON.stringify(atomicSize)+' setup_bytes='+JSON.stringify(setupSize)+' execute_bytes='+JSON.stringify(executeSize)+' direct_pool_bytes='+JSON.stringify(directPoolSize));
console.log('REVIVE_MIN_TOPUP_SOL='+report.funding.exactVaultTopUpSol);
console.log('REVIVE_SQUADS_RENT tx='+transactionAccountRent+' proposal='+proposalAccountRent+' setup_fee='+(setupFee??'NA')+' execute_fee='+(executeFee??'NA'));
console.log('REVIVE_TOTAL_KNOWN_UPFRONT_SOL='+report.funding.exactKnownUpfrontSol+' jay_headroom_sol='+report.funding.jayJayHeadroomAfterKnownUpfrontSol+' sufficient='+report.funding.sufficient);
console.log('REVIVE_SETUP_SIM_ERR='+JSON.stringify(report.transactionPlan.setup.simulationErr));
console.log('REVIVE_DIRECT_POOL_SIM_ERR='+JSON.stringify(report.transactionPlan.directPoolStateProof.simulationErr));
console.log('REVIVE_PREFERRED_PATH='+report.transactionPlan.preferredMinimumPath);

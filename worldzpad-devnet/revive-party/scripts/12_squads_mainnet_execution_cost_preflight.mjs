#!/usr/bin/env node
// REVIVE mainnet Squads v4 execution-cost preflight — READ ONLY.
//
// Purpose:
// 1) Build the exact canonical Meteora DAMM v2 existing-RVIV inner message.
// 2) Wrap that message as the next Squads v4 Vault #0 transaction.
// 3) Use one Squads ephemeral signer PDA as Meteora's position-NFT signer.
// 4) Verify JayJayTeamDev is a current Initiate/Vote/Execute member.
// 5) Calculate the real Squads transaction/proposal account rent and minimum
//    outer network-fee plan before any mainnet signing or broadcast.
// 6) Simulate the smallest setup bundle that fits in one Solana transaction.
//
// This file NEVER signs, NEVER sends and NEVER broadcasts.

import fs from 'node:fs';
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
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
const MULTISIG=new PublicKey('B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN');
const JAY=new PublicKey('Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u');
const VAULT_INDEX=0;
const MAX_TX_BYTES=1232;

const cfg=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-launch-contract.v1.json','utf8'));
const route=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-direct-damm-v2-existing-mint.v1.json','utf8'));

if(cfg.launch.publicMainnetExecutionEnabled!==false)throw new Error('SAFETY_GATE: public mainnet execution must remain false');
if(route.mainnetGates.enabled!==false)throw new Error('SAFETY_GATE: route mainnet execution must remain false');
if(Number(route.pricing.mainnet.priceSolPerRviv)!==0.000045)throw new Error('PRICE_GATE: expected owner-approved mainnet price 0.000045 SOL/RVIV');
if(Number(cfg.launch.mainnetOpeningPriceSolPerRviv)!==0.000045)throw new Error('PRICE_GATE: launch contract and route price disagree');

const connection=new Connection(RPC,'confirmed');
const genesis=await connection.getGenesisHash();
if(genesis!==MAINNET_GENESIS)throw new Error('MAINNET RPC REQUIRED genesis='+genesis);

const ms=await squads.accounts.Multisig.fromAccountAddress(connection,MULTISIG,'confirmed');
const transactionIndex=BigInt(ms.transactionIndex.toString())+1n;
const jayMember=ms.members.find(m=>m.key.equals(JAY))||null;
const jayPermissions=jayMember?{
  mask:jayMember.permissions.mask,
  initiate:squads.types.Permissions.has(jayMember.permissions,squads.types.Permission.Initiate),
  vote:squads.types.Permissions.has(jayMember.permissions,squads.types.Permission.Vote),
  execute:squads.types.Permissions.has(jayMember.permissions,squads.types.Permission.Execute),
}:null;
if(!jayMember)throw new Error('JAYJAY_MEMBER_GATE: JayJayTeamDev is not a current Squads member');
if(!(jayPermissions.initiate&&jayPermissions.vote&&jayPermissions.execute)){
  throw new Error('JAYJAY_PERMISSION_GATE: JayJayTeamDev lacks Initiate/Vote/Execute permissions');
}

const [vaultPda,vaultBump]=squads.getVaultPda({multisigPda:MULTISIG,index:VAULT_INDEX});
const expectedVault=new PublicKey(cfg.token.treasuryVault);
if(!vaultPda.equals(expectedVault))throw new Error('SQUADS_VAULT_DRIFT: derived Vault #0 != canonical REVIVE treasury');

const [transactionPda,transactionBump]=squads.getTransactionPda({
  multisigPda:MULTISIG,
  index:transactionIndex,
});
const [proposalPda]=squads.getProposalPda({multisigPda:MULTISIG,transactionIndex});
const [ephemeralPositionSigner,ephemeralSignerBump]=squads.getEphemeralSignerPda({
  transactionPda,
  ephemeralSignerIndex:0,
});

const rvivMint=new PublicKey(cfg.token.canonicalMint);
const rvivAta=getAssociatedTokenAddressSync(rvivMint,vaultPda,true,TOKEN_PROGRAM_ID);
if(rvivAta.toBase58()!==cfg.token.treasuryTokenAccount)throw new Error('RVIV_TREASURY_ATA_DRIFT');
const wsolAta=getAssociatedTokenAddressSync(NATIVE_MINT,vaultPda,true,TOKEN_PROGRAM_ID);

const [jayBalance,vaultBalance,rvivBalance,wsolInfo]=await Promise.all([
  connection.getBalance(JAY,'confirmed'),
  connection.getBalance(vaultPda,'confirmed'),
  connection.getTokenAccountBalance(rvivAta,'confirmed'),
  connection.getAccountInfo(wsolAta,'confirmed'),
]);

const launchRaw=30_000_000n*1_000_000n;
if(BigInt(rvivBalance.value.amount)<launchRaw)throw new Error('RVIV_BALANCE_GATE: less than 30M RVIV in Squads vault');

const poolRentSpecs=[
  ['meteora_pool',1112],
  ['meteora_position',408],
  ['rviv_pool_vault',165],
  ['wsol_pool_vault',165],
  ['position_nft_mint_token2022_with_meteora_metadata',465],
  ['position_nft_account_token2022',165],
];
let poolAccountRentLamports=0n;
const poolRents={};
for(const [name,bytes] of poolRentSpecs){
  const lamports=BigInt(await connection.getMinimumBalanceForRentExemption(bytes,'confirmed'));
  poolRents[name]={bytes,lamports:lamports.toString()};
  poolAccountRentLamports+=lamports;
}
let vaultWsolAtaRentLamports=0n;
if(!wsolInfo){
  vaultWsolAtaRentLamports=BigInt(await connection.getMinimumBalanceForRentExemption(165,'confirmed'));
  poolAccountRentLamports+=vaultWsolAtaRentLamports;
}
const mandatoryQuoteLamports=1n;
const vaultNativeNeed=poolAccountRentLamports+mandatoryQuoteLamports;
const vaultTopUpLamports=vaultNativeNeed>BigInt(vaultBalance)
  ? vaultNativeNeed-BigInt(vaultBalance)
  : 0n;

const cpAmm=new CpAmm(connection);
// Owner-approved REVIVE mainnet opening price.
const approvedMainnetPrice=String(route.pricing.mainnet.priceSolPerRviv);
const initSqrtPrice=getSqrtPriceFromPrice(approvedMainnetPrice,6,9);
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
  feeTimeSchedulerParam:{
    startingFeeBps:75,
    endingFeeBps:75,
    numberOfPeriod:0,
    totalDuration:0,
  },
});
if(!baseFee)throw new Error('DAMM v2 SDK rejected 75-bps fixed fee');

const {tx:createPoolTx,pool,position}=await cpAmm.createCustomPool({
  payer:vaultPda,
  creator:vaultPda,
  positionNft:ephemeralPositionSigner,
  tokenAMint:rvivMint,
  tokenBMint:NATIVE_MINT,
  tokenAAmount,
  tokenBAmount,
  sqrtMinPrice:initSqrtPrice,
  sqrtMaxPrice:MAX_SQRT_PRICE,
  liquidityDelta,
  initSqrtPrice,
  poolFees:{
    baseFee,
    compoundingFeeBps:0,
    padding:0,
    dynamicFee:null,
  },
  hasAlphaVault:false,
  activationType:ActivationType.Timestamp,
  collectFeeMode:CollectFeeMode.OnlyB,
  activationPoint:null,
  tokenAProgram:TOKEN_PROGRAM_ID,
  tokenBProgram:TOKEN_PROGRAM_ID,
  isLockLiquidity:true,
});

if(vaultTopUpLamports>0n){
  createPoolTx.instructions.unshift(SystemProgram.transfer({
    fromPubkey:JAY,
    toPubkey:vaultPda,
    lamports:Number(vaultTopUpLamports),
  }));
}

const latest=await connection.getLatestBlockhash('confirmed');
const innerTransactionMessage=new TransactionMessage({
  payerKey:vaultPda,
  recentBlockhash:latest.blockhash,
  instructions:createPoolTx.instructions,
});

const wrappedBytes=squads.utils.transactionMessageToMultisigTransactionMessageBytes({
  message:innerTransactionMessage,
  vaultPda,
});
const [wrappedMessage]=squads.types.transactionMessageBeet.deserialize(Buffer.from(wrappedBytes),0);

const vaultCreateIx=squads.instructions.vaultTransactionCreate({
  multisigPda:MULTISIG,
  transactionIndex,
  creator:JAY,
  rentPayer:JAY,
  vaultIndex:VAULT_INDEX,
  ephemeralSigners:1,
  transactionMessage:innerTransactionMessage,
  // No memo: keep the VaultTransactionCreate outer transaction below Solana's 1232-byte limit.
});
const proposalCreateIx=squads.instructions.proposalCreate({
  multisigPda:MULTISIG,
  creator:JAY,
  rentPayer:JAY,
  transactionIndex,
  isDraft:false,
});
const approveIx=squads.instructions.proposalApprove({
  multisigPda:MULTISIG,
  transactionIndex,
  member:JAY,
  // No memo: minimum-size approval path.
});
const {accountMetas,lookupTableAccounts}=await squads.utils.accountsForTransactionExecute({
  connection,
  transactionPda,
  vaultPda,
  message:wrappedMessage,
  ephemeralSignerBumps:[ephemeralSignerBump],
});
const executeIx=squads.generated.createVaultTransactionExecuteInstruction({
  multisig:MULTISIG,
  proposal:proposalPda,
  transaction:transactionPda,
  member:JAY,
  anchorRemainingAccounts:accountMetas,
});

const vaultTransactionBytes=squads.accounts.VaultTransaction.byteSize({
  multisig:MULTISIG,
  creator:JAY,
  index:transactionIndex,
  bump:transactionBump,
  vaultIndex:VAULT_INDEX,
  vaultBump,
  ephemeralSignerBumps:Uint8Array.from([ephemeralSignerBump]),
  message:wrappedMessage,
});
const proposalBytes=
  8+32+8+1+8+1+
  (4+(ms.members.length*32))+
  (4+(ms.members.length*32))+
  (4+(ms.members.length*32));
const [vaultTransactionRent,proposalRent]=await Promise.all([
  connection.getMinimumBalanceForRentExemption(vaultTransactionBytes,'confirmed'),
  connection.getMinimumBalanceForRentExemption(proposalBytes,'confirmed'),
]);
const squadsAccountRentLamports=BigInt(vaultTransactionRent)+BigInt(proposalRent);

function compileCandidate(name,instructions,alts=[]){
  try{
    const message=new TransactionMessage({
      payerKey:JAY,
      recentBlockhash:latest.blockhash,
      instructions,
    }).compileToV0Message(alts);
    const tx=new VersionedTransaction(message);
    const bytes=tx.serialize().length;
    return {name,message,tx,bytes,fits:bytes<=MAX_TX_BYTES,error:null};
  }catch(e){
    return {name,message:null,tx:null,bytes:null,fits:false,error:String(e?.message||e)};
  }
}

const atomic=compileCandidate('atomic_create_propose_approve_execute',[
  vaultCreateIx,proposalCreateIx,approveIx,executeIx,
],lookupTableAccounts);
const setup=compileCandidate('setup_create_propose_approve',[
  vaultCreateIx,proposalCreateIx,approveIx,
]);
const proposalApprove=compileCandidate('proposal_create_approve',[
  proposalCreateIx,approveIx,
]);
const createOnly=compileCandidate('vault_transaction_create',[vaultCreateIx]);
const executeOnly=compileCandidate('execute',[executeIx],lookupTableAccounts);

const candidates=[atomic,setup,proposalApprove,createOnly,executeOnly];
console.log('REVIVE_SQUADS_TX_SIZE_DIAGNOSTIC='+JSON.stringify(candidates.map(x=>({name:x.name,bytes:x.bytes,fits:x.fits,error:x.error}))));
for(const x of candidates){
  if(x.message&&x.fits){
    const fee=await connection.getFeeForMessage(x.message,'confirmed');
    x.feeLamports=fee.value;
  }else{
    x.feeLamports=null;
  }
}

let plan=null;
if(atomic.fits){
  plan={mode:'ATOMIC_1_TX',legs:[atomic]};
}else if(setup.fits&&executeOnly.fits){
  plan={mode:'SETUP_PLUS_EXECUTE_2_TX',legs:[setup,executeOnly]};
}else if(createOnly.fits&&proposalApprove.fits&&executeOnly.fits){
  plan={mode:'CREATE_PLUS_PROPOSAL_APPROVE_PLUS_EXECUTE_3_TX',legs:[createOnly,proposalApprove,executeOnly]};
}else{
  throw new Error('SQUADS_TX_SIZE_GATE: no supported minimal transaction grouping fits Solana packet limits');
}

const outerNetworkFeeLamports=plan.legs.reduce((n,x)=>n+BigInt(x.feeLamports??0),0n);
const totalJayRequiredLamports=
  vaultTopUpLamports+
  squadsAccountRentLamports+
  outerNetworkFeeLamports;
const totalJayHeadroomLamports=BigInt(jayBalance)-totalJayRequiredLamports;

let setupSimulation=null;
if(setup.fits){
  const wire=Buffer.from(setup.tx.serialize()).toString('base64');
  const response=await fetch(RPC,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
      jsonrpc:'2.0',
      id:1,
      method:'simulateTransaction',
      params:[wire,{
        encoding:'base64',
        sigVerify:false,
        replaceRecentBlockhash:true,
        commitment:'confirmed',
        accounts:{
          encoding:'base64',
          addresses:[
            JAY.toBase58(),
            transactionPda.toBase58(),
            proposalPda.toBase58(),
          ],
        },
      }],
    }),
  });
  const envelope=await response.json();
  if(!response.ok||envelope.error)throw new Error('Squads setup simulateTransaction RPC failed: '+JSON.stringify(envelope.error||response.status));
  const sim=envelope.result?.value;
  if(!sim)throw new Error('Squads setup simulation returned no value');
  setupSimulation={
    err:sim.err,
    unitsConsumed:sim.unitsConsumed??null,
    logs:sim.logs??[],
    success:sim.err==null,
    postJayLamports:sim.accounts?.[0]?.lamports??null,
    transactionAccountLamports:sim.accounts?.[1]?.lamports??null,
    proposalAccountLamports:sim.accounts?.[2]?.lamports??null,
  };
}

const report={
  proof:'REVIVE_SQUADS_MAINNET_EXECUTION_COST_PREFLIGHT',
  network:'solana-mainnet-beta',
  genesisHash:genesis,
  rpcHost:new URL(RPC).host,
  broadcast:false,
  signed:false,
  mainnetExecutionEnabled:false,
  token:{
    mint:rvivMint.toBase58(),
    vault:vaultPda.toBase58(),
    rvivAta:rvivAta.toBase58(),
    vaultRvivTokens:rvivBalance.value.uiAmountString,
    launchRvivTokens:30_000_000,
  },
  pricing:{
    mainnetOpeningPriceSolPerRviv:Number(approvedMainnetPrice),
    ownerApproved:true,
  },
  squads:{
    program:squads.PROGRAM_ID.toBase58(),
    multisig:MULTISIG.toBase58(),
    threshold:ms.threshold,
    memberCount:ms.members.length,
    jayMember:JAY.toBase58(),
    jayPermissions,
    vaultIndex:VAULT_INDEX,
    vault:vaultPda.toBase58(),
    transactionIndex:transactionIndex.toString(),
    transactionPda:transactionPda.toBase58(),
    proposalPda:proposalPda.toBase58(),
    ephemeralPositionSigner:ephemeralPositionSigner.toBase58(),
    vaultTransactionBytes,
    proposalBytes,
    vaultTransactionRentLamports:String(vaultTransactionRent),
    proposalRentLamports:String(proposalRent),
    squadsAccountRentLamports:squadsAccountRentLamports.toString(),
    squadsAccountRentSol:Number(squadsAccountRentLamports)/1e9,
  },
  pool:{
    pool:pool.toBase58(),
    position:position.toBase58(),
    feeBps:75,
    dynamicFee:false,
    permanentLockTargetPercent:100,
    initialQuoteLiquiditySol:0,
    poolAccountRentLamports:poolAccountRentLamports.toString(),
    poolAccountRentSol:Number(poolAccountRentLamports)/1e9,
    vaultWsolAtaExists:Boolean(wsolInfo),
    vaultWsolAtaRentLamports:vaultWsolAtaRentLamports.toString(),
  },
  funding:{
    jayBalanceLamports:String(jayBalance),
    jayBalanceSol:jayBalance/1e9,
    vaultBalanceLamports:String(vaultBalance),
    vaultBalanceSol:vaultBalance/1e9,
    vaultTopUpLamports:vaultTopUpLamports.toString(),
    vaultTopUpSol:Number(vaultTopUpLamports)/1e9,
    squadsAccountRentLamports:squadsAccountRentLamports.toString(),
    squadsAccountRentSol:Number(squadsAccountRentLamports)/1e9,
    outerNetworkFeeLamports:outerNetworkFeeLamports.toString(),
    outerNetworkFeeSol:Number(outerNetworkFeeLamports)/1e9,
    totalJayRequiredLamports:totalJayRequiredLamports.toString(),
    totalJayRequiredSol:Number(totalJayRequiredLamports)/1e9,
    totalJayHeadroomLamports:totalJayHeadroomLamports.toString(),
    totalJayHeadroomSol:Number(totalJayHeadroomLamports)/1e9,
    sufficient:totalJayHeadroomLamports>=0n,
  },
  transactionPlan:{
    mode:plan.mode,
    legs:plan.legs.map(x=>({
      name:x.name,
      bytes:x.bytes,
      feeLamports:x.feeLamports,
      feeSol:x.feeLamports==null?null:x.feeLamports/1e9,
    })),
    candidateSizes:candidates.map(x=>({
      name:x.name,
      bytes:x.bytes,
      fits:x.fits,
      feeLamports:x.feeLamports,
      error:x.error,
    })),
  },
  setupSimulation,
  safety:{
    noPrivateKeysRead:true,
    noSignaturesCreated:true,
    noBroadcast:true,
    noTokenMovement:true,
    mainnetPriceOwnerApproved:true,
    executionRemainsDisabled:true,
  },
};

fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync(
  'artifacts/revive-squads-mainnet-execution-cost-preflight.json',
  JSON.stringify(report,null,2)+'\n'
);
console.log(JSON.stringify(report,null,2));
console.log(
  'REVIVE_SQUADS_COST_PREFLIGHT='+
  (report.funding.sufficient?'PASS_FUNDED':'INSUFFICIENT_SOL')+
  ' plan='+plan.mode+
  ' required_sol='+report.funding.totalJayRequiredSol+
  ' balance_sol='+report.funding.jayBalanceSol+
  ' headroom_sol='+report.funding.totalJayHeadroomSol+
  ' setup_sim='+(setupSimulation?.success?'PASS':setupSimulation?'FAIL':'NOT_RUN')+
  ' broadcast=NO mainnet_price=0.000045_OWNER_APPROVED'
);
if(setupSimulation&&!setupSimulation.success)process.exitCode=2;

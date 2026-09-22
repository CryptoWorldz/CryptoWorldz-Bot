import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import BN from 'bn.js';
import { Connection, PublicKey, TransactionMessage, VersionedTransaction, SystemProgram } from '@solana/web3.js';
import { NATIVE_MINT, TOKEN_PROGRAM_ID, getMint, getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import {
  ActivationType, BaseFeeMode, CollectFeeMode, CpAmm, derivePositionNftAccount,
  getBaseFeeParams, getLiquidityDeltaFromAmountA, getSqrtPriceFromPrice, MAX_SQRT_PRICE,
} from '@meteora-ag/cp-amm-sdk';
import * as multisig from '@sqds/multisig';

const config=JSON.parse(fs.readFileSync('wldz-one-sided-launch.candidate.json','utf8'));
const RPC=process.env.SOLANA_RPC_URL||'https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const connection=new Connection(RPC,'confirmed');
const A=(x,m)=>{if(!x)throw new Error('WLDZ_BUILD_FAIL: '+m)};
const H=b=>crypto.createHash('sha256').update(b).digest('hex');
const ser=(tx)=>Buffer.from(tx.serialize()).toString('base64');

A(config.token.mint==='AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U','mint drift');
A(config.token.decimals===6&&config.token.supplyTokens===100000000,'token config drift');
A(config.launch.baseAmountTokens===15000000&&config.launch.quoteAmountSol===0,'launch amount drift');
A(config.launch.baseFeeBps===200&&config.launch.collectFeeMode==='ONLY_B_QUOTE','fee drift');

const mint=new PublicKey(config.token.mint), ms=new PublicKey(config.treasury.multisig), vault=new PublicKey(config.treasury.vault);
A(multisig.getVaultPda({multisigPda:ms,index:Number(config.treasury.vaultIndex)})[0].equals(vault),'vault derivation mismatch');
const [mi,ma,vaultSol]=await Promise.all([getMint(connection,mint,'confirmed',TOKEN_PROGRAM_ID),multisig.accounts.Multisig.fromAccountAddress(connection,ms,'confirmed'),connection.getBalance(vault,'confirmed')]);
A(mi.decimals===6&&mi.supply===100000000000000n&&mi.mintAuthority===null&&mi.freezeAuthority===null,'on-chain WLDZ invariant failed');
A(Number(ma.threshold)===1,'Squads threshold is not the authorized temporary 1-of-2 value');
const ata=await getAssociatedTokenAddress(mint,vault,true,TOKEN_PROGRAM_ID);
const ta=await getAccount(connection,ata,'confirmed',TOKEN_PROGRAM_ID);
const raw=15000000n*1000000n; A(ta.amount>=raw,'treasury lacks 15M WLDZ');

const initiators=ma.members.filter(m=>(Number(m.permissions.mask)&1)===1); A(initiators.length,'no Initiate member');
let creator=null;
if(process.env.SQUADS_CREATOR){const p=new PublicKey(process.env.SQUADS_CREATOR);creator=initiators.find(m=>m.key.equals(p))?.key;A(creator,'SQUADS_CREATOR lacks Initiate permission');}
if(!creator){const bb=await Promise.all(initiators.map(async m=>({k:m.key,b:await connection.getBalance(m.key,'confirmed')})));bb.sort((a,b)=>b.b-a.b);creator=bb[0].k;}
const creatorSol=await connection.getBalance(creator,'confirmed');

const diagIndex=14n;
const [diagBatchPda]=multisig.getTransactionPda({multisigPda:ms,index:diagIndex});
const [diagProposalPda]=multisig.getProposalPda({multisigPda:ms,transactionIndex:diagIndex});
const [diagLeg1Pda]=multisig.getBatchTransactionPda({multisigPda:ms,batchIndex:diagIndex,transactionIndex:1});
const [diagLeg2Pda]=multisig.getBatchTransactionPda({multisigPda:ms,batchIndex:diagIndex,transactionIndex:2});
const [diagBatchInfo,diagProposalInfo,diagLeg1Info,diagLeg2Info]=await Promise.all([
 connection.getAccountInfo(diagBatchPda,'confirmed'),
 connection.getAccountInfo(diagProposalPda,'confirmed'),
 connection.getAccountInfo(diagLeg1Pda,'confirmed'),
 connection.getAccountInfo(diagLeg2Pda,'confirmed')
]);
let diagProposalStatus='missing';
if(diagProposalInfo){
 const p=await multisig.accounts.Proposal.fromAccountAddress(connection,diagProposalPda,'confirmed');
 diagProposalStatus=String(p?.status?.__kind||'unknown');
}
console.log('WLDZ_DIAG_MULTISIG_TRANSACTION_INDEX='+multisig.utils.toBigInt(ma.transactionIndex));
console.log('WLDZ_DIAG_CREATOR_SOL_LAMPORTS='+creatorSol);
console.log('WLDZ_DIAG_BATCH14_EXISTS='+Boolean(diagBatchInfo));
console.log('WLDZ_DIAG_PROPOSAL14_EXISTS='+Boolean(diagProposalInfo));
console.log('WLDZ_DIAG_PROPOSAL14_STATUS='+diagProposalStatus);
console.log('WLDZ_DIAG_LEG1_EXISTS='+Boolean(diagLeg1Info));
console.log('WLDZ_DIAG_LEG2_EXISTS='+Boolean(diagLeg2Info));
console.log('WLDZ_DIAG_BATCH14_PDA='+diagBatchPda.toBase58());
console.log('WLDZ_DIAG_PROPOSAL14_PDA='+diagProposalPda.toBase58());

const batchIndex=multisig.utils.toBigInt(ma.transactionIndex)+1n;
const [batchPda]=multisig.getTransactionPda({multisigPda:ms,index:batchIndex});
const [proposalPda]=multisig.getProposalPda({multisigPda:ms,transactionIndex:batchIndex});
const [posNft]=multisig.getEphemeralSignerPda({transactionPda:batchPda,ephemeralSignerIndex:0});
const [leg1Pda]=multisig.getBatchTransactionPda({multisigPda:ms,batchIndex,transactionIndex:1});
const [leg2Pda]=multisig.getBatchTransactionPda({multisigPda:ms,batchIndex,transactionIndex:2});

const cp=new CpAmm(connection);
const init=getSqrtPriceFromPrice(String(config.launch.initPriceSolPerWldz),6,9);
const amount=new BN(raw.toString());
const liq=getLiquidityDeltaFromAmountA(amount,init,MAX_SQRT_PRICE,CollectFeeMode.OnlyB);
const baseFee=getBaseFeeParams({baseFeeMode:BaseFeeMode.FeeTimeSchedulerLinear,feeTimeSchedulerParam:{startingFeeBps:200,endingFeeBps:200,numberOfPeriod:0,totalDuration:0}});
const {tx:createPoolTx,pool,position}=await cp.createCustomPool({
 payer:vault,creator:vault,positionNft:posNft,tokenAMint:mint,tokenBMint:NATIVE_MINT,
 tokenAAmount:amount,tokenBAmount:new BN(0),sqrtMinPrice:init,sqrtMaxPrice:MAX_SQRT_PRICE,
 liquidityDelta:liq,initSqrtPrice:init,poolFees:{baseFee,compoundingFeeBps:0,padding:0,dynamicFee:null},
 hasAlphaVault:false,activationType:ActivationType.Timestamp,collectFeeMode:CollectFeeMode.OnlyB,
 activationPoint:null,tokenAProgram:TOKEN_PROGRAM_ID,tokenBProgram:TOKEN_PROGRAM_ID,isLockLiquidity:false
});
A((await connection.getAccountInfo(pool,'confirmed'))===null,'target pool already exists');
const lockTx=await cp.permanentLockPosition({owner:vault,position,positionNftAccount:derivePositionNftAccount(posNft),pool,unlockedLiquidity:liq});

const bh=(await connection.getLatestBlockhash('confirmed')).blockhash;
const poolMsg=new TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:createPoolTx.instructions});
const lockMsg=new TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:lockTx.instructions});
const poolV0=new VersionedTransaction(poolMsg.compileToV0Message());
const lockV0=new VersionedTransaction(lockMsg.compileToV0Message());
const poolBytes=Buffer.from(poolV0.serialize()),lockBytes=Buffer.from(lockV0.serialize());
A(poolBytes.length<=1232,'pool leg remains above Solana packet limit: '+poolBytes.length);
A(lockBytes.length<=1232,'lock leg above Solana packet limit: '+lockBytes.length);

const poolSim=await connection.simulateTransaction(poolV0,{sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed',accounts:{encoding:'base64',addresses:[pool.toBase58(),position.toBase58()]}});
let minTopup=null;
if(poolSim.value.err!==null){
 console.log('WLDZ_POOL_SIM_LOGS='+JSON.stringify(poolSim.value.logs??[]));
 console.log('WLDZ_POOL_PACKET_BYTES='+poolBytes.length);
 console.log('WLDZ_VAULT_SOL_LAMPORTS='+vaultSol);
 console.log('WLDZ_CREATOR='+creator.toBase58());
 console.log('WLDZ_CREATOR_SOL_LAMPORTS='+creatorSol);
 for(let add=2000000;add<=30000000;add+=1000000){
   if(creatorSol<add+1000000) break;
   const funded=new VersionedTransaction(new TransactionMessage({payerKey:creator,recentBlockhash:bh,instructions:[
     SystemProgram.transfer({fromPubkey:creator,toPubkey:vault,lamports:add}),
     ...createPoolTx.instructions
   ]}).compileToV0Message());
   if(Buffer.from(funded.serialize()).length>1232) break;
   const sim=await connection.simulateTransaction(funded,{sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'});
   if(sim.value.err===null){minTopup=add;break;}
 }
 console.log('WLDZ_MIN_TESTED_VAULT_TOPUP_LAMPORTS='+(minTopup??'NOT_FOUND_WITH_CREATOR_BALANCE'));
}


let syntheticFunding=null;
if(poolSim.value.err!==null && minTopup===null){
  const nodes=await connection.getClusterNodes();
  let rich=null;
  for(const node of nodes.slice(0,80)){
    try{
      const k=new PublicKey(node.pubkey);
      const info=await connection.getAccountInfo(k,'confirmed');
      if(info && info.owner.equals(SystemProgram.programId) && info.lamports>200000000){
        rich={key:k,lamports:info.lamports};
        break;
      }
    }catch{}
  }
  if(rich){
    const simWithTopup=async(add)=>{
      const funded=new VersionedTransaction(new TransactionMessage({payerKey:rich.key,recentBlockhash:bh,instructions:[
        SystemProgram.transfer({fromPubkey:rich.key,toPubkey:vault,lamports:add}),
        ...createPoolTx.instructions
      ]}).compileToV0Message());
      const bytes=Buffer.from(funded.serialize()).length;
      if(bytes>1232)return {ok:false,err:'PACKET_TOO_LARGE',bytes};
      const sim=await connection.simulateTransaction(funded,{sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'});
      return {ok:sim.value.err===null,err:sim.value.err,bytes,units:sim.value.unitsConsumed??null,logs:sim.value.logs??[]};
    };
    let lo=0,hi=50000000,hiResult=await simWithTopup(50000000);
    while(!hiResult.ok && hi<200000000){
      lo=hi; hi*=2; hiResult=await simWithTopup(hi);
    }
    if(hiResult.ok){
      while(hi-lo>100000){
        const mid=Math.floor((lo+hi)/200000)*100000;
        const r=await simWithTopup(mid);
        if(r.ok)hi=mid;else lo=mid;
      }
      const final=await simWithTopup(hi);
      syntheticFunding={
        simulationOnly:true,
        syntheticFunder:rich.key.toBase58(),
        syntheticFunderLamports:rich.lamports,
        minimumTopupLamportsWithin100k:hi,
        minimumTopupSolWithin0001:hi/1e9,
        recommendedVaultFundingLamports:hi+2000000,
        recommendedVaultFundingSol:(hi+2000000)/1e9,
        packetBytes:final.bytes,
        unitsConsumed:final.units,
        err:final.err,
        passed:final.ok,
        note:'Synthetic system account is used only under sigVerify=false to measure required vault SOL. Nothing is broadcast and the account is not an executable funding source.'
      };
      console.log('WLDZ_SYNTHETIC_MIN_VAULT_TOPUP_LAMPORTS='+hi);
      console.log('WLDZ_RECOMMENDED_VAULT_FUNDING_SOL='+((hi+2000000)/1e9));
    }else{
      syntheticFunding={simulationOnly:true,passed:false,error:'NO_SUCCESS_UP_TO_'+hi,err:hiResult.err};
    }
  }else{
    syntheticFunding={simulationOnly:true,passed:false,error:'NO_RICH_SYSTEM_IDENTITY_FOUND'};
  }
}

console.log('WLDZ_CURRENT_CREATOR_BALANCE_DIAGNOSTIC='+creatorSol);

const batchCreate=multisig.instructions.batchCreate({multisigPda:ms,creator,rentPayer:creator,batchIndex,vaultIndex:Number(config.treasury.vaultIndex),memo:'WORLDZ WLDZ 15M Meteora launch + permanent lock'});
const propCreate=multisig.instructions.proposalCreate({multisigPda:ms,transactionIndex:batchIndex,creator,rentPayer:creator,isDraft:true});
const addPool=multisig.instructions.batchAddTransaction({vaultIndex:Number(config.treasury.vaultIndex),multisigPda:ms,member:creator,rentPayer:creator,batchIndex,transactionIndex:1,ephemeralSigners:1,transactionMessage:poolMsg});
const addLock=multisig.instructions.batchAddTransaction({vaultIndex:Number(config.treasury.vaultIndex),multisigPda:ms,member:creator,rentPayer:creator,batchIndex,transactionIndex:2,ephemeralSigners:0,transactionMessage:lockMsg});
const activate=multisig.instructions.proposalActivate({multisigPda:ms,transactionIndex:batchIndex,member:creator});

const mk=(ixs)=>new VersionedTransaction(new TransactionMessage({payerKey:creator,recentBlockhash:bh,instructions:ixs}).compileToV0Message());
const setup=mk([batchCreate,propCreate]), add1=mk([addPool]), add2=mk([addLock]), act=mk([activate]);
for(const [n,t] of [['setup',setup],['addPool',add1],['addLock',add2],['activate',act]])A(Buffer.from(t.serialize()).length<=1232,n+' proposal setup tx too large');

const setupSim=await connection.simulateTransaction(setup,{sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed',accounts:{encoding:'base64',addresses:[batchPda.toBase58(),proposalPda.toBase58()]}});
A(setupSim.value.err===null,'Squads batch/proposal setup simulation failed: '+JSON.stringify(setupSim.value.err));

fs.mkdirSync('artifacts',{recursive:true});
const files={
 setup:'wldz-squads-01-create-batch-proposal.v0.base64.txt',
 addPool:'wldz-squads-02-add-pool-leg.v0.base64.txt',
 addLock:'wldz-squads-03-add-lock-leg.v0.base64.txt',
 activate:'wldz-squads-04-activate-proposal.v0.base64.txt',
 pool:'wldz-meteora-pool-leg.v0.base64.txt',
 lock:'wldz-meteora-lock-leg.v0.base64.txt'
};
for(const [k,f] of Object.entries(files)){const tx={setup,addPool:add1,addLock:add2,activate:act,pool:poolV0,lock:lockV0}[k];fs.writeFileSync(path.join('artifacts',f),ser(tx)+'\n');}
const report={
 status:poolSim.value.err===null?'BUILT_AND_SIMULATED_POOL_AND_PROPOSAL_SETUP':(syntheticFunding?.passed?'BUILT_NEEDS_VAULT_SOL_'+syntheticFunding.minimumTopupLamportsWithin100k+'_LAMPORTS':('BUILT_NEEDS_VAULT_SOL_'+(minTopup??'UNKNOWN'))),broadcast:false,valueMoved:false,network:'mainnet-beta',
 canonicalMint:mint.toBase58(),token:{supply:100000000,decimals:6,mintAuthority:null,freezeAuthority:null,treasuryAta:ata.toBase58(),treasuryBalanceRaw:ta.amount.toString()},
 squads:{multisig:ms.toBase58(),threshold:Number(ma.threshold),vault:vault.toBase58(),vaultSolLamports:vaultSol,creator:creator.toBase58(),creatorSolLamports:creatorSol,batchIndex:batchIndex.toString(),batchPda:batchPda.toBase58(),proposalPda:proposalPda.toBase58(),poolLegPda:leg1Pda.toBase58(),lockLegPda:leg2Pda.toBase58(),positionNftEphemeralSigner:posNft.toBase58()},
 meteora:{program:config.launch.program,pool:pool.toBase58(),position:position.toBase58(),activeWldz:15000000,configuredStartingQuoteSol:0,priceSolPerWldz:config.launch.initPriceSolPerWldz,collectFeeMode:'OnlyB',baseFeeBps:200,liquidityDelta:liq.toString(),permanentLockLegIncluded:true},
 packetSizes:{poolLeg:poolBytes.length,lockLeg:lockBytes.length,setup:Buffer.from(setup.serialize()).length,addPool:Buffer.from(add1.serialize()).length,addLock:Buffer.from(add2.serialize()).length,activate:Buffer.from(act.serialize()).length},
 serializedFiles:files,
 fingerprints:{poolMessage:H(Buffer.from(poolV0.message.serialize())),lockMessage:H(Buffer.from(lockV0.message.serialize())),setupMessage:H(Buffer.from(setup.message.serialize())),addPoolMessage:H(Buffer.from(add1.message.serialize())),addLockMessage:H(Buffer.from(add2.message.serialize())),activateMessage:H(Buffer.from(act.message.serialize()))},
 simulation:{poolCreate:{err:poolSim.value.err,slot:poolSim.context.slot,units:poolSim.value.unitsConsumed??null,logs:poolSim.value.logs??[],minimumTestedVaultTopupLamports:minTopup,syntheticFunding},proposalSetup:{err:setupSim.value.err,slot:setupSim.context.slot,units:setupSim.value.unitsConsumed??null,logs:setupSim.value.logs??[]},lockLeg:{notIndependentlySimulatableBeforePoolExists:true,reason:'Lock leg depends on pool/position state created by batch leg 1; it is generated by Meteora permanentLockPosition and included as batch leg 2.'}},
 realSignature:null,realSignatureReason:'No transaction broadcast. Authorized member signature is intentionally required to create the on-chain batch/proposal.'
};
fs.writeFileSync('artifacts/wldz-squads-meteora-build-proof.json',JSON.stringify(report,null,2)+'\n');
console.log('WLDZ_BUILD='+report.status);
console.log('WLDZ_PROPOSAL_PDA='+proposalPda);
console.log('WLDZ_BATCH_PDA='+batchPda);
console.log('WLDZ_POOL='+pool);
console.log('WLDZ_POSITION='+position);
console.log('WLDZ_POOL_SIM_SLOT='+poolSim.context.slot);
console.log('WLDZ_SETUP_SIM_SLOT='+setupSim.context.slot);
console.log('WLDZ_PROOF_FINGERPRINT='+report.fingerprints.setupMessage);
console.log('WLDZ_PACKET_SIZES='+JSON.stringify(report.packetSizes));
console.log('WLDZ_SERIALIZED_SETUP_BASE64='+ser(setup));
console.log('WLDZ_SERIALIZED_ADD_POOL_BASE64='+ser(add1));
console.log('WLDZ_SERIALIZED_ADD_LOCK_BASE64='+ser(add2));
console.log('WLDZ_SERIALIZED_ACTIVATE_BASE64='+ser(act));

const fundingCandidates=[
 ['jayjayteamdev','Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u'],
 ['auto_diamond_buy','8VZZ7j63E2ARRNho4SwqFthUjWnWK8S5BHPfmJCb4UHK'],
 ['pdcrew','DgsWus6bxAMck9eXmS7V3tVNp8n7DinPQrEVexdju94j'],
 ['next_big_coin_dev','3jA7TFbW6h8q75mWpYxkAiAntRm16z9ZRnLiZkjFCTdt'],
 ['purple_pdc','G35RixuDLj8NQJ7c8wnKF4Hc518nbYxp1cZwGL5wJTG3'],
 ['purple_diamond_crew','ABmLL6XyNZPBQ5LZpg6DoxqtzHTCUufWUNMkbFfFh53U'],
 ['limited_edition','5HiRrJRU1fyW5eXzHgvSgykBZ6PtrSVzg8A1e8eHB1u9'],
 ['solsavewxrp','5BbgurmtXVr1tohm6NTYU8pmM4n7xQVqp9DTKePN1UW9'],
 ['black_bud','5zy8uPj8cwsaFw2gdzzBhtwaSmjmZsQHxGoPWKMJaoSR'],
 ['account_c','fa35y2GdDKhdZ6uyS5mouEPQSFiHGyRuMSWp3Vz5Cob'],
 ['community_kitty','CFzJU62m9obkMKAMjSnQPVkwYrVmHJqQhySURj5MeSy']
];
const fundingBalances=[];
for(const [name,address] of fundingCandidates){
  const lamports=await connection.getBalance(new PublicKey(address),'confirmed');
  fundingBalances.push({name,address,lamports,sol:lamports/1e9});
}
fundingBalances.sort((a,b)=>b.lamports-a.lamports);
console.log('WLDZ_OWNER_CONTROLLED_FUNDING_CANDIDATES='+JSON.stringify(fundingBalances));

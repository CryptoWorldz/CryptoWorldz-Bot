import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import BN from 'bn.js';
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import {
  NATIVE_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint, getAssociatedTokenAddress, getAccount,
  createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction
} from '@solana/spl-token';
import {
  ActivationType, BaseFeeMode, CollectFeeMode, CpAmm, derivePositionNftAccount,
  getBaseFeeParams, getLiquidityDeltaFromAmountA, getSqrtPriceFromPrice, MAX_SQRT_PRICE
} from '@meteora-ag/cp-amm-sdk';
import * as multisig from '@sqds/multisig';

const launch=JSON.parse(fs.readFileSync('wldz-one-sided-launch.candidate.json','utf8'));
const alloc=JSON.parse(fs.readFileSync('wldz-allocation.master.json','utf8'));
const RPC=process.env.SOLANA_RPC_URL||'https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const connection=new Connection(RPC,'confirmed');
const A=(x,m)=>{if(!x)throw new Error('WLDZ_OWNER_LAUNCH_FAIL: '+m)};
const H=b=>crypto.createHash('sha256').update(b).digest('hex');
const ser=tx=>Buffer.from(tx.serialize()).toString('base64');

A(launch.launchAuthorized===true,'owner launch authorization not recorded');
A(launch.executionEnabled===false,'builder must not silently enable execution');
A(launch.token.mint===alloc.token.mint,'mint mismatch between launch and allocation masters');
A(alloc.invariants.allocationPercentTotal===100&&alloc.invariants.allocationTokenTotal===100000000,'allocation total drift');

const devBucket=alloc.allocation.find(x=>x.id==='jayjayteamdev');
A(devBucket&&devBucket.tokens===8000000,'dev allocation must be exactly 8M');
A(launch.launch.baseAmountTokens===15000000&&launch.launch.quoteAmountSol===0,'launch must be 15M WLDZ / 0 SOL');

const mint=new PublicKey(launch.token.mint);
const ms=new PublicKey(launch.treasury.multisig);
const vault=new PublicKey(launch.treasury.vault);
const dev=new PublicKey(devBucket.destination);
A(multisig.getVaultPda({multisigPda:ms,index:Number(launch.treasury.vaultIndex)})[0].equals(vault),'vault derivation mismatch');

const [mi,ma,vaultSol]=await Promise.all([
  getMint(connection,mint,'confirmed',TOKEN_PROGRAM_ID),
  multisig.accounts.Multisig.fromAccountAddress(connection,ms,'confirmed'),
  connection.getBalance(vault,'confirmed')
]);
A(mi.decimals===6&&mi.supply===100000000000000n&&mi.mintAuthority===null&&mi.freezeAuthority===null,'canonical WLDZ invariant failed');
A(Number(ma.threshold)===2,'live Squads threshold changed — rebuild/review before continuing');

const sourceAta=await getAssociatedTokenAddress(mint,vault,true,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
const source=await getAccount(connection,sourceAta,'confirmed',TOKEN_PROGRAM_ID);
A(source.amount>=23000000n*1000000n,'vault must contain at least 23M WLDZ for 8M dev + 15M launch');

const initiators=ma.members.filter(m=>(Number(m.permissions.mask)&1)===1);
const requested=new PublicKey(process.env.SQUADS_CREATOR||dev.toBase58());
const creator=initiators.find(m=>m.key.equals(requested))?.key;
A(creator,'JayJayTeamDev wallet is not an initiating Squads member');

const batchIndex=multisig.utils.toBigInt(ma.transactionIndex)+1n;
const [batchPda]=multisig.getTransactionPda({multisigPda:ms,index:batchIndex});
const [proposalPda]=multisig.getProposalPda({multisigPda:ms,transactionIndex:batchIndex});
const [posNft]=multisig.getEphemeralSignerPda({transactionPda:batchPda,ephemeralSignerIndex:0});
const [devLegPda]=multisig.getBatchTransactionPda({multisigPda:ms,batchIndex,transactionIndex:1});
const [poolLegPda]=multisig.getBatchTransactionPda({multisigPda:ms,batchIndex,transactionIndex:2});
const [lockLegPda]=multisig.getBatchTransactionPda({multisigPda:ms,batchIndex,transactionIndex:3});

const latest=await connection.getLatestBlockhash('confirmed');
const bh=latest.blockhash;

// LEG 1 — 8M WLDZ to JayJayTeamDev.
const devAta=await getAssociatedTokenAddress(mint,dev,false,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
const devAmount=8000000n*1000000n;
const devIxs=[
  createAssociatedTokenAccountIdempotentInstruction(vault,devAta,dev,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
  createTransferCheckedInstruction(sourceAta,mint,devAta,vault,devAmount,6,[],TOKEN_PROGRAM_ID)
];
const devMsg=new TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:devIxs});
const devV0=new VersionedTransaction(devMsg.compileToV0Message());
const devSim=await connection.simulateTransaction(devV0,{sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'});
A(devSim.value.err===null,'8M dev transfer simulation failed: '+JSON.stringify(devSim.value.err));

// LEG 2 — canonical 15M WLDZ one-sided Meteora DAMM v2 pool.
const cp=new CpAmm(connection);
const raw=15000000n*1000000n;
const init=getSqrtPriceFromPrice(String(launch.launch.initPriceSolPerWldz),6,9);
const amount=new BN(raw.toString());
const liq=getLiquidityDeltaFromAmountA(amount,init,MAX_SQRT_PRICE,CollectFeeMode.OnlyB);
const baseFee=getBaseFeeParams({
  baseFeeMode:BaseFeeMode.FeeTimeSchedulerLinear,
  feeTimeSchedulerParam:{startingFeeBps:200,endingFeeBps:200,numberOfPeriod:0,totalDuration:0}
});
const {tx:createPoolTx,pool,position}=await cp.createCustomPool({
  payer:vault,creator:vault,positionNft:posNft,
  tokenAMint:mint,tokenBMint:NATIVE_MINT,
  tokenAAmount:amount,tokenBAmount:new BN(0),
  sqrtMinPrice:init,sqrtMaxPrice:MAX_SQRT_PRICE,liquidityDelta:liq,initSqrtPrice:init,
  poolFees:{baseFee,compoundingFeeBps:0,padding:0,dynamicFee:null},
  hasAlphaVault:false,activationType:ActivationType.Timestamp,
  collectFeeMode:CollectFeeMode.OnlyB,activationPoint:null,
  tokenAProgram:TOKEN_PROGRAM_ID,tokenBProgram:TOKEN_PROGRAM_ID,isLockLiquidity:false
});
A((await connection.getAccountInfo(pool,'confirmed'))===null,'target Meteora pool already exists');
const poolMsg=new TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:createPoolTx.instructions});
const poolV0=new VersionedTransaction(poolMsg.compileToV0Message());
A(Buffer.from(poolV0.serialize()).length<=1232,'pool leg exceeds Solana packet limit');
const poolSim=await connection.simulateTransaction(poolV0,{sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'});

// LEG 3 — permanent position lock.
const lockTx=await cp.permanentLockPosition({
  owner:vault,position,positionNftAccount:derivePositionNftAccount(posNft),pool,unlockedLiquidity:liq
});
const lockMsg=new TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:lockTx.instructions});
const lockV0=new VersionedTransaction(lockMsg.compileToV0Message());
A(Buffer.from(lockV0.serialize()).length<=1232,'lock leg exceeds Solana packet limit');

// One Squads batch / one approval set for all three legs.
const batchCreate=multisig.instructions.batchCreate({
  multisigPda:ms,creator,rentPayer:creator,batchIndex,vaultIndex:Number(launch.treasury.vaultIndex),
  memo:'WORLDZ: 8M JayJayTeamDev + 15M one-sided Meteora launch + permanent LP lock'
});
const proposalCreate=multisig.instructions.proposalCreate({
  multisigPda:ms,transactionIndex:batchIndex,creator,rentPayer:creator,isDraft:true
});
const addDev=multisig.instructions.batchAddTransaction({
  vaultIndex:Number(launch.treasury.vaultIndex),multisigPda:ms,member:creator,rentPayer:creator,
  batchIndex,transactionIndex:1,ephemeralSigners:0,transactionMessage:devMsg
});
const addPool=multisig.instructions.batchAddTransaction({
  vaultIndex:Number(launch.treasury.vaultIndex),multisigPda:ms,member:creator,rentPayer:creator,
  batchIndex,transactionIndex:2,ephemeralSigners:1,transactionMessage:poolMsg
});
const addLock=multisig.instructions.batchAddTransaction({
  vaultIndex:Number(launch.treasury.vaultIndex),multisigPda:ms,member:creator,rentPayer:creator,
  batchIndex,transactionIndex:3,ephemeralSigners:0,transactionMessage:lockMsg
});
const activate=multisig.instructions.proposalActivate({multisigPda:ms,transactionIndex:batchIndex,member:creator});

const mk=ixs=>new VersionedTransaction(new TransactionMessage({payerKey:creator,recentBlockhash:bh,instructions:ixs}).compileToV0Message());
const setup=mk([batchCreate,proposalCreate]), txDev=mk([addDev]), txPool=mk([addPool]), txLock=mk([addLock]), txActivate=mk([activate]);
for(const [n,t] of [['setup',setup],['addDev',txDev],['addPool',txPool],['addLock',txLock],['activate',txActivate]]){
  A(Buffer.from(t.serialize()).length<=1232,n+' proposal transaction exceeds Solana packet limit');
}
const setupSim=await connection.simulateTransaction(setup,{sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'});
A(setupSim.value.err===null,'Squads setup simulation failed: '+JSON.stringify(setupSim.value.err));

fs.mkdirSync('artifacts',{recursive:true});
const files={
  setup:'wldz-owner-launch-01-create-batch.v0.base64.txt',
  dev:'wldz-owner-launch-02-add-dev-8m.v0.base64.txt',
  pool:'wldz-owner-launch-03-add-pool-15m.v0.base64.txt',
  lock:'wldz-owner-launch-04-add-permanent-lock.v0.base64.txt',
  activate:'wldz-owner-launch-05-activate.v0.base64.txt'
};
for(const [k,f] of Object.entries(files)){
  const tx={setup,dev:txDev,pool:txPool,lock:txLock,activate:txActivate}[k];
  fs.writeFileSync(path.join('artifacts',f),ser(tx)+'\n');
}

const proof={
  status:poolSim.value.err===null?'OWNER_AUTHORIZED_BATCH_BUILT_AND_SIMULATED':'OWNER_AUTHORIZED_BATCH_BUILT__POOL_SIM_REQUIRES_REVIEW',
  broadcast:false,valueMoved:false,network:'mainnet-beta',
  canonicalMint:mint.toBase58(),
  ownerAuthorization:launch.ownerAuthorization,
  allocation:{devWldz:8000000,launchWldz:15000000,remainingAfterExecutionWldz:Number((source.amount-23000000n*1000000n)/1000000n)},
  squads:{multisig:ms.toBase58(),vault:vault.toBase58(),liveThreshold:Number(ma.threshold),members:ma.members.length,batchIndex:batchIndex.toString(),batchPda:batchPda.toBase58(),proposalPda:proposalPda.toBase58(),devLegPda:devLegPda.toBase58(),poolLegPda:poolLegPda.toBase58(),lockLegPda:lockLegPda.toBase58()},
  devTransfer:{destination:dev.toBase58(),destinationAta:devAta.toBase58(),tokens:8000000,simulation:{passed:true,err:null,unitsConsumed:devSim.value.unitsConsumed??null}},
  meteora:{program:launch.launch.program,pool:pool.toBase58(),position:position.toBase58(),activeWldz:15000000,startingQuoteSol:0,baseFeeBps:200,collectFeeMode:'OnlyB',permanentLockIncluded:true,poolSimulation:{passed:poolSim.value.err===null,err:poolSim.value.err,logs:poolSim.value.logs??[],unitsConsumed:poolSim.value.unitsConsumed??null}},
  proposalSetupSimulation:{passed:true,err:null,unitsConsumed:setupSim.value.unitsConsumed??null},
  serializedFiles:files,
  fingerprints:{setup:H(Buffer.from(setup.message.serialize())),dev:H(Buffer.from(txDev.message.serialize())),pool:H(Buffer.from(txPool.message.serialize())),lock:H(Buffer.from(txLock.message.serialize())),activate:H(Buffer.from(txActivate.message.serialize()))},
  hardBoundary:'This builder does not bypass the live Squads threshold. JayJayTeamDev can create/approve the batch, but execution still requires the live threshold to be satisfied.'
};
fs.writeFileSync('artifacts/wldz-owner-authorized-launch-batch-proof.json',JSON.stringify(proof,null,2)+'\n');
console.log('WLDZ_OWNER_LAUNCH_BATCH='+proof.status);
console.log('WLDZ_PROPOSAL_PDA='+proposalPda.toBase58());
console.log('WLDZ_POOL='+pool.toBase58());
console.log('WLDZ_LIVE_THRESHOLD='+Number(ma.threshold));
console.log('WLDZ_BROADCAST=0');

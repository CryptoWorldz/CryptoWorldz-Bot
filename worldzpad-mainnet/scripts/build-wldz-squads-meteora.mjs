import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import BN from 'bn.js';
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
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
A(Number(ma.threshold)===2,'Squads threshold is not 2');
const ata=await getAssociatedTokenAddress(mint,vault,true,TOKEN_PROGRAM_ID);
const ta=await getAccount(connection,ata,'confirmed',TOKEN_PROGRAM_ID);
const raw=15000000n*1000000n; A(ta.amount>=raw,'treasury lacks 15M WLDZ');

const initiators=ma.members.filter(m=>(Number(m.permissions.mask)&1)===1); A(initiators.length,'no Initiate member');
let creator=null;
if(process.env.SQUADS_CREATOR){const p=new PublicKey(process.env.SQUADS_CREATOR);creator=initiators.find(m=>m.key.equals(p))?.key;A(creator,'SQUADS_CREATOR lacks Initiate permission');}
if(!creator){const bb=await Promise.all(initiators.map(async m=>({k:m.key,b:await connection.getBalance(m.key,'confirmed')})));bb.sort((a,b)=>b.b-a.b);creator=bb[0].k;}
const creatorSol=await connection.getBalance(creator,'confirmed');

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
if(poolSim.value.err!==null){console.log('WLDZ_POOL_SIM_LOGS='+JSON.stringify(poolSim.value.logs??[]));console.log('WLDZ_POOL_PACKET_BYTES='+poolBytes.length);}
A(poolSim.value.err===null,'pool-create simulation failed: '+JSON.stringify(poolSim.value.err));

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
 status:'BUILT_AND_SIMULATED_POOL_AND_PROPOSAL_SETUP',broadcast:false,valueMoved:false,network:'mainnet-beta',
 canonicalMint:mint.toBase58(),token:{supply:100000000,decimals:6,mintAuthority:null,freezeAuthority:null,treasuryAta:ata.toBase58(),treasuryBalanceRaw:ta.amount.toString()},
 squads:{multisig:ms.toBase58(),threshold:2,vault:vault.toBase58(),vaultSolLamports:vaultSol,creator:creator.toBase58(),creatorSolLamports:creatorSol,batchIndex:batchIndex.toString(),batchPda:batchPda.toBase58(),proposalPda:proposalPda.toBase58(),poolLegPda:leg1Pda.toBase58(),lockLegPda:leg2Pda.toBase58(),positionNftEphemeralSigner:posNft.toBase58()},
 meteora:{program:config.launch.program,pool:pool.toBase58(),position:position.toBase58(),activeWldz:15000000,configuredStartingQuoteSol:0,priceSolPerWldz:config.launch.initPriceSolPerWldz,collectFeeMode:'OnlyB',baseFeeBps:200,liquidityDelta:liq.toString(),permanentLockLegIncluded:true},
 packetSizes:{poolLeg:poolBytes.length,lockLeg:lockBytes.length,setup:Buffer.from(setup.serialize()).length,addPool:Buffer.from(add1.serialize()).length,addLock:Buffer.from(add2.serialize()).length,activate:Buffer.from(act.serialize()).length},
 serializedFiles:files,
 fingerprints:{poolMessage:H(Buffer.from(poolV0.message.serialize())),lockMessage:H(Buffer.from(lockV0.message.serialize())),setupMessage:H(Buffer.from(setup.message.serialize())),addPoolMessage:H(Buffer.from(add1.message.serialize())),addLockMessage:H(Buffer.from(add2.message.serialize())),activateMessage:H(Buffer.from(act.message.serialize()))},
 simulation:{poolCreate:{err:poolSim.value.err,slot:poolSim.context.slot,units:poolSim.value.unitsConsumed??null,logs:poolSim.value.logs??[]},proposalSetup:{err:setupSim.value.err,slot:setupSim.context.slot,units:setupSim.value.unitsConsumed??null,logs:setupSim.value.logs??[]},lockLeg:{notIndependentlySimulatableBeforePoolExists:true,reason:'Lock leg depends on pool/position state created by batch leg 1; it is generated by Meteora permanentLockPosition and included as batch leg 2.'}},
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

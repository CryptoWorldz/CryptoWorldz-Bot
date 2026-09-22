import BN from 'bn.js';
import {
  Connection,PublicKey,TransactionMessage,VersionedTransaction
} from '@solana/web3.js';
import {
  NATIVE_MINT,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,getAssociatedTokenAddress,getAccount,
  createAssociatedTokenAccountIdempotentInstruction,createTransferCheckedInstruction
} from '@solana/spl-token';
import {
  ActivationType,BaseFeeMode,CollectFeeMode,CpAmm,derivePositionNftAccount,
  getBaseFeeParams,getLiquidityDeltaFromAmountA,getSqrtPriceFromPrice,MAX_SQRT_PRICE
} from '@meteora-ag/cp-amm-sdk';
import * as multisig from '@sqds/multisig';

const RPC=process.env.SOLANA_RPC_URL||'https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const C=new Connection(RPC,'confirmed');
const DEV=new PublicKey('Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u');
const MINT=new PublicKey('AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U');
const MS=new PublicKey('B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN');
const VAULT=new PublicKey('n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB');
const A=(x,m)=>{if(!x)throw new Error(m)};
const size=(ixs,bh)=>Buffer.from(new VersionedTransaction(new TransactionMessage({payerKey:DEV,recentBlockhash:bh,instructions:ixs}).compileToV0Message()).serialize()).length;

const [mi,ma,vaultBal,bhObj]=await Promise.all([
  getMint(C,MINT,'confirmed',TOKEN_PROGRAM_ID),
  multisig.accounts.Multisig.fromAccountAddress(C,MS,'confirmed'),
  C.getBalance(VAULT,'confirmed'),
  C.getLatestBlockhash('confirmed')
]);
A(mi.supply===100000000000000n&&mi.decimals===6&&mi.mintAuthority===null&&mi.freezeAuthority===null,'WLDZ invariant');
A(Number(ma.threshold)===2&&ma.members.length===3,'Squads governance drift');
const sourceAta=await getAssociatedTokenAddress(MINT,VAULT,true,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
const source=await getAccount(C,sourceAta,'confirmed',TOKEN_PROGRAM_ID);
const next=multisig.utils.toBigInt(ma.transactionIndex)+1n;
const [batchPda]=multisig.getTransactionPda({multisigPda:MS,index:next});
const [proposalPda]=multisig.getProposalPda({multisigPda:MS,transactionIndex:next});
const [posNft]=multisig.getEphemeralSignerPda({transactionPda:batchPda,ephemeralSignerIndex:0});
const bh=bhObj.blockhash;

const devAta=await getAssociatedTokenAddress(MINT,DEV,false,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
const devMsg=new TransactionMessage({payerKey:VAULT,recentBlockhash:bh,instructions:[
  createAssociatedTokenAccountIdempotentInstruction(VAULT,devAta,DEV,MINT,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
  createTransferCheckedInstruction(sourceAta,MINT,devAta,VAULT,8000000n*1000000n,6,[],TOKEN_PROGRAM_ID)
]});

const cp=new CpAmm(C);
const init=getSqrtPriceFromPrice('0.000001',6,9);
const amount=new BN((15000000n*1000000n).toString());
const liq=getLiquidityDeltaFromAmountA(amount,init,MAX_SQRT_PRICE,CollectFeeMode.OnlyB);
const baseFee=getBaseFeeParams({baseFeeMode:BaseFeeMode.FeeTimeSchedulerLinear,feeTimeSchedulerParam:{startingFeeBps:200,endingFeeBps:200,numberOfPeriod:0,totalDuration:0}});
const {tx:createPoolTx,pool,position}=await cp.createCustomPool({
  payer:VAULT,creator:VAULT,positionNft:posNft,tokenAMint:MINT,tokenBMint:NATIVE_MINT,
  tokenAAmount:amount,tokenBAmount:new BN(0),sqrtMinPrice:init,sqrtMaxPrice:MAX_SQRT_PRICE,liquidityDelta:liq,initSqrtPrice:init,
  poolFees:{baseFee,compoundingFeeBps:0,padding:0,dynamicFee:null},hasAlphaVault:false,
  activationType:ActivationType.Timestamp,collectFeeMode:CollectFeeMode.OnlyB,activationPoint:null,
  tokenAProgram:TOKEN_PROGRAM_ID,tokenBProgram:TOKEN_PROGRAM_ID,isLockLiquidity:false
});
const poolMsg=new TransactionMessage({payerKey:VAULT,recentBlockhash:bh,instructions:createPoolTx.instructions});
const lockTx=await cp.permanentLockPosition({owner:VAULT,position,positionNftAccount:derivePositionNftAccount(posNft),pool,unlockedLiquidity:liq});
const lockMsg=new TransactionMessage({payerKey:VAULT,recentBlockhash:bh,instructions:lockTx.instructions});

const setup=[
  multisig.instructions.batchCreate({multisigPda:MS,creator:DEV,rentPayer:DEV,batchIndex:next,vaultIndex:0,memo:'WORLDZ: 8M creator allocation + 15M Meteora launch + permanent LP lock'}),
  multisig.instructions.proposalCreate({multisigPda:MS,transactionIndex:next,creator:DEV,rentPayer:DEV,isDraft:true})
];
const addDev=multisig.instructions.batchAddTransaction({vaultIndex:0,multisigPda:MS,member:DEV,rentPayer:DEV,batchIndex:next,transactionIndex:1,ephemeralSigners:0,transactionMessage:devMsg});
const addPool=multisig.instructions.batchAddTransaction({vaultIndex:0,multisigPda:MS,member:DEV,rentPayer:DEV,batchIndex:next,transactionIndex:2,ephemeralSigners:1,transactionMessage:poolMsg});
const addLock=multisig.instructions.batchAddTransaction({vaultIndex:0,multisigPda:MS,member:DEV,rentPayer:DEV,batchIndex:next,transactionIndex:3,ephemeralSigners:0,transactionMessage:lockMsg});
const activate=multisig.instructions.proposalActivate({multisigPda:MS,transactionIndex:next,member:DEV});
const approve=multisig.instructions.proposalApprove({multisigPda:MS,transactionIndex:next,member:DEV});

const combos={
  setup,
  setup_addDev:[...setup,addDev],
  addDev_addPool:[addDev,addPool],
  addPool_addLock:[addPool,addLock],
  activate_approve:[activate,approve],
  setup_addDev_addPool:[...setup,addDev,addPool],
  all_setup_legs:[...setup,addDev,addPool,addLock],
  all:[...setup,addDev,addPool,addLock,activate,approve]
};
const existing=[];
for(let i=1n;i<=multisig.utils.toBigInt(ma.transactionIndex);i++){
  const [bp]=multisig.getTransactionPda({multisigPda:MS,index:i});
  const [pp]=multisig.getProposalPda({multisigPda:MS,transactionIndex:i});
  const row={index:i.toString(),batchPda:bp.toBase58(),proposalPda:pp.toBase58(),batch:null,proposal:null,legs:[]};
  try{const b=await multisig.accounts.Batch.fromAccountAddress(C,bp,'confirmed');row.batch=b.pretty();}catch{}
  try{const p=await multisig.accounts.Proposal.fromAccountAddress(C,pp,'confirmed');row.proposal=p.pretty();}catch{}
  for(let leg=1;leg<=4;leg++){
    const [lp]=multisig.getBatchTransactionPda({multisigPda:MS,batchIndex:i,transactionIndex:leg});
    let exists=false;
    try{await multisig.accounts.VaultBatchTransaction.fromAccountAddress(C,lp,'confirmed');exists=true;}catch{}
    row.legs.push({leg,pda:lp.toBase58(),exists});
  }
  existing.push(row);
}
const report={currentTransactionIndex:ma.transactionIndex.toString(),existing,nextIndex:next.toString(),batchPda:batchPda.toBase58(),proposalPda:proposalPda.toBase58(),pool:pool.toBase58(),vaultSol:vaultBal/1e9,sourceWldz:Number(source.amount/1000000n),packetSizes:{}};
for(const [k,ixs] of Object.entries(combos)){
  try{report.packetSizes[k]=size(ixs,bh)}catch(e){report.packetSizes[k]='BUILD_ERROR '+e.message}
}
// Prove the current empty Draft (created by the user's earlier expired UI attempt) can be resumed safely.
const resumable=existing.slice().reverse().find(x=>x.batch?.creator===DEV.toBase58()&&x.batch?.vaultIndex===0&&x.batch?.size===0&&x.proposal?.status==='Draft');
if(resumable){
  const idx=BigInt(resumable.index);
  const resumeDev=multisig.instructions.batchAddTransaction({vaultIndex:0,multisigPda:MS,member:DEV,rentPayer:DEV,batchIndex:idx,transactionIndex:1,ephemeralSigners:0,transactionMessage:devMsg});
  const resumeTx=new VersionedTransaction(new TransactionMessage({payerKey:DEV,recentBlockhash:bh,instructions:[resumeDev]}).compileToV0Message());
  report.resumeCandidate={index:resumable.index,proposalPda:resumable.proposalPda,packetBytes:Buffer.from(resumeTx.serialize()).length};
  const sim=await C.simulateTransaction(resumeTx,{sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'});
  report.resumeCandidate.sim={err:sim.value.err,units:sim.value.unitsConsumed??null};
}
for(const key of ['setup','setup_addDev','activate_approve']){
  const ixs=combos[key]; let tx;
  try{tx=new VersionedTransaction(new TransactionMessage({payerKey:DEV,recentBlockhash:bh,instructions:ixs}).compileToV0Message())}catch{continue}
  if(Buffer.from(tx.serialize()).length<=1232){
    const sim=await C.simulateTransaction(tx,{sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'});
    report[key+'Sim']={err:sim.value.err,units:sim.value.unitsConsumed??null};
  }
}
console.log(JSON.stringify(report,null,2));

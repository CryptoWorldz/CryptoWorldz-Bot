#!/usr/bin/env node
// REVIVE Squads rent-unlock preflight — READ ONLY.
// Proves the cheapest path to set JayJayTeamDev as the Squads rent collector,
// immediately close the just-executed config transaction, reclaim eligible
// historical Squads transaction/proposal rent, and fund REVIVE without buying SOL.
// NEVER signs, sends, or broadcasts.

import fs from 'node:fs';
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from '@solana/web3.js';
import * as squads from '@sqds/multisig';

const RPC=process.env.SOLANA_MAINNET_RPC_URL?.trim()||clusterApiUrl('mainnet-beta');
const MAINNET_GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const JAY=new PublicKey('Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u');
const MULTISIG=new PublicKey('B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN');
const MAX_TX_BYTES=1232;
const REVIVE_REQUIRED_LAMPORTS=20_133_362n;

const connection=new Connection(RPC,'confirmed');
const genesis=await connection.getGenesisHash();
if(genesis!==MAINNET_GENESIS)throw new Error('MAINNET RPC REQUIRED genesis='+genesis);

const ms=await squads.accounts.Multisig.fromAccountAddress(connection,MULTISIG,'confirmed');
const currentIndex=BigInt(ms.transactionIndex.toString());
const staleIndex=BigInt(ms.staleTransactionIndex.toString());
const nextIndex=currentIndex+1n;
const member=ms.members.find(m=>m.key.equals(JAY));
if(!member)throw new Error('JayJayTeamDev is not a live Squads member');
const permissions={
  initiate:squads.types.Permissions.has(member.permissions,squads.types.Permission.Initiate),
  vote:squads.types.Permissions.has(member.permissions,squads.types.Permission.Vote),
  execute:squads.types.Permissions.has(member.permissions,squads.types.Permission.Execute),
};
if(!(permissions.initiate&&permissions.vote&&permissions.execute))throw new Error('JayJayTeamDev lacks full Squads permissions');
if(Number(ms.threshold)!==1)throw new Error('Single-member recovery path unavailable: threshold='+ms.threshold);

let configuredCollector=null;
if(ms.rentCollector){
  if(ms.rentCollector instanceof PublicKey) configuredCollector=ms.rentCollector;
  else if(ms.rentCollector?.toBase58) configuredCollector=ms.rentCollector;
  else if(Array.isArray(ms.rentCollector)&&ms.rentCollector[0]?.toBase58)configuredCollector=ms.rentCollector[0];
}
if(configuredCollector&&!configuredCollector.equals(JAY)){
  throw new Error('Existing rent collector is not JayJayTeamDev: '+configuredCollector.toBase58());
}

const jayBalance=BigInt(await connection.getBalance(JAY,'confirmed'));
const latest=await connection.getLatestBlockhash('confirmed');

const historical=[];
for(let i=1n;i<=currentIndex;i++){
  const [txPda]=squads.getTransactionPda({multisigPda:MULTISIG,index:i});
  const [proposalPda]=squads.getProposalPda({multisigPda:MULTISIG,transactionIndex:i});
  const [txInfo,proposalInfo]=await connection.getMultipleAccountsInfo([txPda,proposalPda],'confirmed');
  let txType='MISSING';
  if(txInfo){
    try{squads.accounts.VaultTransaction.fromAccountInfo(txInfo);txType='VaultTransaction';}
    catch{
      try{squads.accounts.ConfigTransaction.fromAccountInfo(txInfo);txType='ConfigTransaction';}
      catch{txType='OTHER_OR_UNDECODED';}
    }
  }
  let status=proposalInfo?'UNDECODED':'MISSING';
  if(proposalInfo){
    try{status=squads.accounts.Proposal.fromAccountInfo(proposalInfo)[0].status.__kind;}catch{}
  }
  const terminal=['Executed','Rejected','Cancelled'].includes(status);
  const stale=i<=staleIndex;
  const supported=txType==='VaultTransaction'||txType==='ConfigTransaction';
  const closeable=supported&&(terminal||stale);
  historical.push({
    index:i,
    txPda,
    proposalPda,
    txType,
    status,
    stale,
    closeable,
    lamports:BigInt((txInfo?.lamports??0)+(proposalInfo?.lamports??0)),
  });
}
const closeable=historical.filter(x=>x.closeable);
if(closeable.length===0)throw new Error('No eligible historical Squads rent found');

const [newConfigTxPda]=squads.getTransactionPda({multisigPda:MULTISIG,index:nextIndex});
const [newProposalPda]=squads.getProposalPda({multisigPda:MULTISIG,transactionIndex:nextIndex});
const action={__kind:'SetRentCollector',newRentCollector:JAY};

const configCreateIx=squads.instructions.configTransactionCreate({
  multisigPda:MULTISIG,
  transactionIndex:nextIndex,
  creator:JAY,
  rentPayer:JAY,
  actions:[action],
});
const proposalCreateIx=squads.instructions.proposalCreate({
  multisigPda:MULTISIG,
  creator:JAY,
  rentPayer:JAY,
  transactionIndex:nextIndex,
  isDraft:false,
});
const approveIx=squads.instructions.proposalApprove({
  multisigPda:MULTISIG,
  transactionIndex:nextIndex,
  member:JAY,
});
const configExecuteIx=squads.instructions.configTransactionExecute({
  multisigPda:MULTISIG,
  transactionIndex:nextIndex,
  member:JAY,
  rentPayer:JAY,
});
const closeNewConfigIx=squads.instructions.configTransactionAccountsClose({
  multisigPda:MULTISIG,
  rentCollector:JAY,
  transactionIndex:nextIndex,
});

function oldCloseIx(row){
  const factory=row.txType==='VaultTransaction'
    ?squads.instructions.vaultTransactionAccountsClose
    :squads.instructions.configTransactionAccountsClose;
  return factory({
    multisigPda:MULTISIG,
    rentCollector:JAY,
    transactionIndex:row.index,
  });
}
function buildTx(instructions){
  const tx=new Transaction({feePayer:JAY,recentBlockhash:latest.blockhash});
  tx.add(...instructions);
  return tx;
}
function sizeOf(tx){
  try{return tx.serialize({requireAllSignatures:false,verifySignatures:false}).length;}
  catch{return Infinity;}
}
async function feeOf(tx){
  const r=await connection.getFeeForMessage(tx.compileMessage(),'confirmed');
  if(r.value==null)throw new Error('Unable to calculate network fee');
  return BigInt(r.value);
}
async function simulate(tx,addresses=[]){
  const wire=tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64');
  const config={
    encoding:'base64',
    sigVerify:false,
    replaceRecentBlockhash:true,
    commitment:'confirmed',
  };
  if(addresses.length)config.accounts={encoding:'base64',addresses:addresses.map(a=>a.toBase58())};
  const resp=await fetch(RPC,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method:'simulateTransaction',params:[wire,config]}),
  });
  const env=await resp.json();
  if(env.error)return {rpcError:env.error};
  return env.result?.value??null;
}

// First transaction MUST establish the collector and clean up its own temporary
// config/proposal accounts. Pack as many historical closes into it as possible.
const mandatory=[configCreateIx,proposalCreateIx,approveIx,configExecuteIx,closeNewConfigIx];
let firstRows=[];
for(const row of closeable){
  const candidate=[...mandatory,...firstRows.map(oldCloseIx),oldCloseIx(row)];
  const tx=buildTx(candidate);
  if(sizeOf(tx)<=MAX_TX_BYTES)firstRows.push(row);
  else break;
}
const firstTx=buildTx([...mandatory,...firstRows.map(oldCloseIx)]);
const firstBytes=sizeOf(firstTx);
if(firstBytes>MAX_TX_BYTES)throw new Error('Rent-collector setup transaction exceeds Solana packet limit');
const firstFee=await feeOf(firstTx);
const firstSimulation=await simulate(firstTx,[JAY,MULTISIG,newConfigTxPda,newProposalPda]);
if(firstSimulation?.rpcError||firstSimulation?.err){
  throw new Error('RENT_UNLOCK_SIMULATION_FAILED '+JSON.stringify(firstSimulation?.rpcError||firstSimulation?.err));
}

const remaining=closeable.slice(firstRows.length);
const batches=[];
let current=[];
for(const row of remaining){
  const candidate=[...current,row];
  const tx=buildTx(candidate.map(oldCloseIx));
  if(sizeOf(tx)<=MAX_TX_BYTES)current=candidate;
  else{
    if(current.length)batches.push(current);
    current=[row];
  }
}
if(current.length)batches.push(current);

const batchPlans=[];
for(const rows of batches){
  const tx=buildTx(rows.map(oldCloseIx));
  batchPlans.push({
    rows,
    bytes:sizeOf(tx),
    fee:await feeOf(tx),
  });
}

const grossHistorical=closeable.reduce((a,x)=>a+x.lamports,0n);
const firstGross=firstRows.reduce((a,x)=>a+x.lamports,0n);
const remainingGross=remaining.reduce((a,x)=>a+x.lamports,0n);
const totalFees=firstFee+batchPlans.reduce((a,b)=>a+b.fee,0n);
const projectedNet=grossHistorical-totalFees;
const projectedJay= jayBalance+projectedNet;
const projectedLaunchHeadroom=projectedJay-REVIVE_REQUIRED_LAMPORTS;
const simulatedPostJay=firstSimulation.accounts?.[0]?.lamports==null
  ?null
  :BigInt(firstSimulation.accounts[0].lamports);
const simulatedFirstInstructionDelta=simulatedPostJay==null
  ?null
  :simulatedPostJay-jayBalance;
const simulatedFirstAfterFee=simulatedPostJay==null
  ?null
  :simulatedPostJay-firstFee;

const report={
  proof:'REVIVE_SQUADS_RENT_UNLOCK_PREFLIGHT_READ_ONLY',
  capturedAt:new Date().toISOString(),
  network:'solana-mainnet-beta',
  genesisHash:genesis,
  multisig:{
    address:MULTISIG.toBase58(),
    threshold:Number(ms.threshold),
    memberCount:ms.members.length,
    jayMember:JAY.toBase58(),
    permissions,
    currentTransactionIndex:currentIndex.toString(),
    staleTransactionIndex:staleIndex.toString(),
    plannedConfigTransactionIndex:nextIndex.toString(),
    currentRentCollector:configuredCollector?.toBase58()??null,
    plannedRentCollector:JAY.toBase58(),
  },
  historical:{
    eligibleCount:closeable.length,
    eligibleIndices:closeable.map(x=>x.index.toString()),
    eligibleAccounts:closeable.map(x=>({
      index:x.index.toString(),
      type:x.txType,
      status:x.status,
      stale:x.stale,
      rentLamports:x.lamports.toString(),
      rentSol:Number(x.lamports)/1e9,
    })),
    grossLamports:grossHistorical.toString(),
    grossSol:Number(grossHistorical)/1e9,
  },
  firstTransaction:{
    bytes:firstBytes,
    feeLamports:firstFee.toString(),
    feeSol:Number(firstFee)/1e9,
    closesNewConfigTransaction:true,
    historicalIndices:firstRows.map(x=>x.index.toString()),
    historicalGrossLamports:firstGross.toString(),
    historicalGrossSol:Number(firstGross)/1e9,
    simulationErr:firstSimulation.err??null,
    simulationUnits:firstSimulation.unitsConsumed??null,
    simulatedPostJayLamports:simulatedPostJay?.toString()??null,
    simulatedInstructionDeltaLamports:simulatedFirstInstructionDelta?.toString()??null,
    simulatedPostJayAfterNetworkFeeLamports:simulatedFirstAfterFee?.toString()??null,
  },
  remainingBatches:batchPlans.map(b=>({
    indices:b.rows.map(x=>x.index.toString()),
    bytes:b.bytes,
    feeLamports:b.fee.toString(),
    feeSol:Number(b.fee)/1e9,
    grossLamports:b.rows.reduce((a,x)=>a+x.lamports,0n).toString(),
  })),
  projection:{
    currentJayLamports:jayBalance.toString(),
    currentJaySol:Number(jayBalance)/1e9,
    remainingHistoricalGrossLamports:remainingGross.toString(),
    totalNetworkFeesLamports:totalFees.toString(),
    totalNetworkFeesSol:Number(totalFees)/1e9,
    netRecoveredLamports:projectedNet.toString(),
    netRecoveredSol:Number(projectedNet)/1e9,
    projectedJayLamports:projectedJay.toString(),
    projectedJaySol:Number(projectedJay)/1e9,
    reviveKnownUpfrontLamports:REVIVE_REQUIRED_LAMPORTS.toString(),
    reviveKnownUpfrontSol:Number(REVIVE_REQUIRED_LAMPORTS)/1e9,
    projectedLaunchHeadroomLamports:projectedLaunchHeadroom.toString(),
    projectedLaunchHeadroomSol:Number(projectedLaunchHeadroom)/1e9,
    fundsRevive:projectedLaunchHeadroom>=0n,
  },
  safety:{
    readOnly:true,
    noPrivateKeys:true,
    noSigning:true,
    noBroadcast:true,
    noSolMoved:true,
    noRvivMoved:true,
  },
};

fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/revive-squads-rent-unlock-preflight-readonly.json',JSON.stringify(report,null,2)+'\n');
console.log('REVIVE_RENT_UNLOCK_PREFLIGHT=PASS first_bytes='+firstBytes+' first_fee_sol='+(Number(firstFee)/1e9)+' first_closes='+firstRows.map(x=>x.index).join(',')+' first_sim_err='+JSON.stringify(firstSimulation.err));
console.log('REVIVE_RENT_UNLOCK_ELIGIBLE count='+closeable.length+' indices='+closeable.map(x=>x.index).join(',')+' gross_sol='+(Number(grossHistorical)/1e9));
console.log('REVIVE_RENT_UNLOCK_NET_SOL='+report.projection.netRecoveredSol+' projected_jay_sol='+report.projection.projectedJaySol+' revive_headroom_sol='+report.projection.projectedLaunchHeadroomSol+' funds_revive='+report.projection.fundsRevive);
for(const b of report.remainingBatches)console.log('REVIVE_RENT_UNLOCK_BATCH indices='+b.indices.join(',')+' bytes='+b.bytes+' fee_sol='+b.feeSol);

#!/usr/bin/env node
// REVIVE Squads historical rent-recovery audit — READ ONLY.
// Finds old VaultTransaction/Proposal accounts, identifies reclaimable rent,
// and simulates close instructions. NEVER signs or broadcasts.

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
const MEMBER=new PublicKey('Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u');
const MULTISIG=new PublicKey('B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN');

const connection=new Connection(RPC,'confirmed');
const genesis=await connection.getGenesisHash();
if(genesis!==MAINNET_GENESIS)throw new Error('MAINNET RPC REQUIRED genesis='+genesis);

const ms=await squads.accounts.Multisig.fromAccountAddress(connection,MULTISIG,'confirmed');
const currentIndex=BigInt(ms.transactionIndex.toString());
const staleIndex=BigInt(ms.staleTransactionIndex.toString());

let rentCollector=null;
if(ms.rentCollector){
  if(ms.rentCollector instanceof PublicKey) rentCollector=ms.rentCollector;
  else if(Array.isArray(ms.rentCollector) && ms.rentCollector[0] instanceof PublicKey) rentCollector=ms.rentCollector[0];
  else if(ms.rentCollector?.toBase58) rentCollector=ms.rentCollector;
}
const rentCollectorConfigured=Boolean(rentCollector);
if(!rentCollector){
  console.log('REVIVE_RENT_RECOVERY_CURRENTLY_DISABLED multisig_rent_collector=NONE; continuing read-only historical rent scan');
}

const rows=[];
const closeableIxs=[];
for(let i=1n;i<=currentIndex;i++){
  const [txPda]=squads.getTransactionPda({multisigPda:MULTISIG,index:i});
  const [proposalPda]=squads.getProposalPda({multisigPda:MULTISIG,transactionIndex:i});
  const [txInfo,propInfo]=await connection.getMultipleAccountsInfo([txPda,proposalPda],'confirmed');

  let txDecoded=null, propDecoded=null;
  if(txInfo){
    try{txDecoded=squads.accounts.VaultTransaction.fromAccountInfo(txInfo)[0];}catch{}
  }
  if(propInfo){
    try{propDecoded=squads.accounts.Proposal.fromAccountInfo(propInfo)[0];}catch{}
  }

  const txIsVault=Boolean(txDecoded);
  const status=propDecoded?.status?.__kind??(propInfo?'UNDECODED':'MISSING');
  const isStale=i<=staleIndex;
  const terminal=['Executed','Rejected','Cancelled'].includes(status);
  const closeByRule=txIsVault && (
    terminal ||
    ((!propInfo || ['Draft','Active'].includes(status)) && isStale)
  );

  let sim=null, simulationPass=false, closeFeeLamports=null;
  if(closeByRule && rentCollectorConfigured){
    const ix=squads.instructions.vaultTransactionAccountsClose({
      multisigPda:MULTISIG,
      rentCollector,
      transactionIndex:i,
    });
    const latest=await connection.getLatestBlockhash('confirmed');
    const tx=new Transaction({feePayer:MEMBER,recentBlockhash:latest.blockhash}).add(ix);
    const fee=await connection.getFeeForMessage(tx.compileMessage(),'confirmed');
    closeFeeLamports=fee.value;
    const wire=tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64');
    const resp=await fetch(RPC,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:Number(i),method:'simulateTransaction',params:[wire,{
        encoding:'base64',sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'
      }]}),
    });
    const env=await resp.json();
    sim=env.error??env.result?.value?.err??null;
    simulationPass=!env.error && env.result?.value?.err==null;
    if(simulationPass)closeableIxs.push({index:i,ix,lamports:(txInfo?.lamports??0)+(propInfo?.lamports??0)});
  }

  rows.push({
    index:i.toString(),
    transactionPda:txPda.toBase58(),
    transactionExists:Boolean(txInfo),
    transactionType:txIsVault?'VaultTransaction':(txInfo?'OTHER_OR_UNDECODED':'MISSING'),
    transactionLamports:txInfo?.lamports??0,
    proposalPda:proposalPda.toBase58(),
    proposalExists:Boolean(propInfo),
    proposalStatus:status,
    proposalLamports:propInfo?.lamports??0,
    totalRentLamports:(txInfo?.lamports??0)+(propInfo?.lamports??0),
    stale:isStale,
    closeByStaticRule:closeByRule,
    closeSimulationPass:simulationPass,
    closeSimulationErr:sim,
    singleCloseFeeLamports:closeFeeLamports,
  });
}

// Try packing all passing close instructions into minimum number of <=1232-byte legacy txs.
const latest=await connection.getLatestBlockhash('confirmed');
const batches=[];
let current=[];
for(const item of closeableIxs){
  const candidate=[...current,item];
  const tx=new Transaction({feePayer:MEMBER,recentBlockhash:latest.blockhash});
  tx.add(...candidate.map(x=>x.ix));
  let fits=false,size=null;
  try{
    size=tx.serialize({requireAllSignatures:false,verifySignatures:false}).length;
    fits=size<=1232;
  }catch{}
  if(fits){
    current=candidate;
  }else{
    if(current.length)batches.push(current);
    current=[item];
  }
}
if(current.length)batches.push(current);

const batchPlans=[];
for(const batch of batches){
  const tx=new Transaction({feePayer:MEMBER,recentBlockhash:latest.blockhash});
  tx.add(...batch.map(x=>x.ix));
  const size=tx.serialize({requireAllSignatures:false,verifySignatures:false}).length;
  const feeReply=await connection.getFeeForMessage(tx.compileMessage(),'confirmed');
  const fee=feeReply.value??0;
  const wire=tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64');
  const resp=await fetch(RPC,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:1000+batchPlans.length,method:'simulateTransaction',params:[wire,{
      encoding:'base64',sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'
    }]}),
  });
  const env=await resp.json();
  const err=env.error??env.result?.value?.err??null;
  batchPlans.push({
    indices:batch.map(x=>x.index.toString()),
    serializedBytes:size,
    feeLamports:fee,
    grossRecoveredLamports:batch.reduce((a,x)=>a+BigInt(x.lamports),0n).toString(),
    netRecoveredLamports:(batch.reduce((a,x)=>a+BigInt(x.lamports),0n)-BigInt(fee)).toString(),
    simulationPass:!env.error&&env.result?.value?.err==null,
    simulationErr:err,
  });
}

const staticCloseableRows=rows.filter(x=>x.closeByStaticRule);
const potentialGross=staticCloseableRows.reduce((a,x)=>a+BigInt(x.totalRentLamports),0n);
const gross=closeableIxs.reduce((a,x)=>a+BigInt(x.lamports),0n);
const fees=batchPlans.reduce((a,x)=>a+BigInt(x.feeLamports),0n);
const net=gross-fees;
const shortfall=3_056_961n;

const report={
  proof:'REVIVE_SQUADS_HISTORICAL_RENT_RECOVERY_READ_ONLY',
  capturedAt:new Date().toISOString(),
  network:'solana-mainnet-beta',
  multisig:MULTISIG.toBase58(),
  currentTransactionIndex:currentIndex.toString(),
  staleTransactionIndex:staleIndex.toString(),
  rentCollector:rentCollector?.toBase58()??null,
  rentCollectorConfigured,
  rentCollectorIsJayJayTeamDev:Boolean(rentCollector?.equals(MEMBER)),
  historical:rows,
  recovery:{
    staticCloseableCount:staticCloseableRows.length,
    staticCloseableIndices:staticCloseableRows.map(x=>x.index),
    potentialGrossIfRentCollectorConfiguredLamports:potentialGross.toString(),
    potentialGrossIfRentCollectorConfiguredSol:Number(potentialGross)/1e9,
    potentialCoversReviveShortfall:potentialGross>=shortfall,
    closeableCount:closeableIxs.length,
    closeableIndices:closeableIxs.map(x=>x.index.toString()),
    grossRecoveredLamports:gross.toString(),
    grossRecoveredSol:Number(gross)/1e9,
    batchCount:batchPlans.length,
    batchPlans,
    totalFeesLamports:fees.toString(),
    netRecoveredLamports:net.toString(),
    netRecoveredSol:Number(net)/1e9,
    currentReviveShortfallLamports:shortfall.toString(),
    coversReviveShortfall:net>=shortfall,
  },
  safety:{readOnly:true,noSigning:true,noBroadcast:true,noSolMoved:true,noRvivMoved:true},
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/revive-squads-rent-recovery-readonly.json',JSON.stringify(report,null,2)+'\n');

console.log('REVIVE_RENT_COLLECTOR='+(report.rentCollector??'NONE')+' configured='+report.rentCollectorConfigured+' is_jay='+report.rentCollectorIsJayJayTeamDev);
console.log('REVIVE_OLD_TX current='+currentIndex+' stale='+staleIndex+' static_closeable='+report.recovery.staticCloseableCount+' indices='+report.recovery.staticCloseableIndices.join(','));
console.log('REVIVE_RENT_POTENTIAL if_collector_configured_sol='+report.recovery.potentialGrossIfRentCollectorConfiguredSol+' covers_shortfall='+report.recovery.potentialCoversReviveShortfall);
for(const row of rows){
 if(row.transactionExists||row.proposalExists) console.log('REVIVE_OLD_ACCOUNT index='+row.index+' type='+row.transactionType+' status='+row.proposalStatus+' rent_sol='+((row.totalRentLamports)/1e9).toFixed(9)+' close_sim='+row.closeSimulationPass);
}
console.log('REVIVE_RENT_RECOVERY gross_sol='+report.recovery.grossRecoveredSol+' fees_sol='+(Number(fees)/1e9)+' net_sol='+report.recovery.netRecoveredSol+' batches='+batchPlans.length+' covers_shortfall='+report.recovery.coversReviveShortfall);
for(const b of batchPlans) console.log('REVIVE_RENT_BATCH indices='+b.indices.join(',')+' bytes='+b.serializedBytes+' net_sol='+(Number(BigInt(b.netRecoveredLamports))/1e9)+' sim='+b.simulationPass);

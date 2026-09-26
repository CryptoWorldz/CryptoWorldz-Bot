#!/usr/bin/env node
// Rebuild just before the owner signs. READ ONLY: never signs or submits.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Connection,PublicKey,Transaction,clusterApiUrl} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,getAssociatedTokenAddressSync,createAssociatedTokenAccountIdempotentInstruction} from '@solana/spl-token';

const rpc=process.env.SOLANA_MAINNET_RPC_URL?.trim()||clusterApiUrl('mainnet-beta');
const connection=new Connection(rpc,'confirmed');
if(await connection.getGenesisHash()!=='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d')throw Error('MAINNET_REQUIRED');
const root='../../worldzpad-mainnet/revive/';
const contract=JSON.parse(fs.readFileSync(root+'revive-launch-contract.v1.json'));
const dev=JSON.parse(fs.readFileSync(root+'revive-six-dev-distribution.v1.json'));
const policy=JSON.parse(fs.readFileSync(root+'revive-low-cost-distribution-review.v1.json'));
const owner=new PublicKey(policy.ownerSigner),mint=new PublicKey(contract.token.canonicalMint);
if(dev.mint!==mint.toBase58()||dev.recipientCount!==7||dev.recipients.length!==7||
   !dev.recipients.some(x=>x.wallet===owner.toBase58())||
   dev.recipients.some(x=>x.amountRaw!=='4285714285714')||
   policy.ownerApprovalForDevAtas.rentCeilingLamports!==4465320)throw Error('APPROVED_DEV_ALLOCATION_GATE');
const mintInfo=await connection.getAccountInfo(mint,'confirmed');
if(!mintInfo?.owner.equals(TOKEN_PROGRAM_ID))throw Error('CANONICAL_MINT_OWNER_GATE');
const rows=dev.recipients.map(x=>({label:x.label,wallet:x.wallet,ata:getAssociatedTokenAddressSync(mint,new PublicKey(x.wallet),true,TOKEN_PROGRAM_ID).toBase58()}));
const accounts=await connection.getMultipleAccountsInfo(rows.map(x=>new PublicKey(x.ata)),'confirmed');
const absent=rows.filter((_,i)=>!accounts[i]);
if(absent.length!==3)throw Error('EXPECTED_THREE_MISSING_ATAS_RECHECK_REQUIRED: '+absent.length);
const expectedMissing=new Set(['G35RixuDLj8NQJ7c8wnKF4Hc518nbYxp1cZwGL5wJTG3','5BbgurmtXVr1tohm6NTYU8pmM4n7xQVqp9DTKePN1UW9',owner.toBase58()]);
if(absent.some(x=>!expectedMissing.has(x.wallet)))throw Error('MISSING_DESTINATION_CHANGED');
const [rent,balance,latest]=await Promise.all([
  connection.getMinimumBalanceForRentExemption(165,'confirmed'),
  connection.getBalance(owner,'confirmed'),
  connection.getLatestBlockhash('confirmed')
]);
if(rent*3>policy.ownerApprovalForDevAtas.rentCeilingLamports)throw Error('OWNER_RENT_APPROVAL_EXCEEDED');
const tx=new Transaction({feePayer:owner,recentBlockhash:latest.blockhash});
for(const row of absent)tx.add(createAssociatedTokenAccountIdempotentInstruction(
  owner,new PublicKey(row.ata),new PublicKey(row.wallet),mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID
));
const serialized=tx.serialize({requireAllSignatures:false,verifySignatures:false});
if(serialized.length>1232)throw Error('TRANSACTION_SIZE_EXCEEDED');
const fee=await connection.getFeeForMessage(tx.compileMessage(),'confirmed');
if(fee.value===null||balance<rent*3+fee.value)throw Error('INSUFFICIENT_FEE_WALLET_SOL');
const sim=await connection.simulateTransaction(tx,undefined,false);
if(sim.value.err)throw Error('ATA_SIMULATION_FAILED: '+JSON.stringify(sim.value.err));
const proof={status:'UNSIGNED_ATAS_ONLY_REBUILD_BEFORE_SIGNING',network:'solana-mainnet-beta',mint:mint.toBase58(),feePayer:owner.toBase58(),
  accountsToCreate:absent,recipientCount:3,rentLamports:rent*3,networkFeeLamports:fee.value,
  exactTotalLamports:rent*3+fee.value,feePayerBalanceLamports:balance,
  lastValidBlockHeight:latest.lastValidBlockHeight,blockhash:latest.blockhash,
  serializedSize:serialized.length,unsignedTransactionSha256:crypto.createHash('sha256').update(serialized).digest('hex'),
  unsignedTransactionBase64:serialized.toString('base64'),
  simulation:{error:null,unitsConsumed:sim.value.unitsConsumed},
  instructions:'Exactly three idempotent Associated Token Account creations; zero RVIV transfers, no Squads authority change.',
  safety:{signed:false,submitted:false,tokenTransfers:false}};
console.log(JSON.stringify(proof,null,2));

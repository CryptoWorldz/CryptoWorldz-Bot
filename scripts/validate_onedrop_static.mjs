import crypto from 'node:crypto';
import {PublicKey,SystemProgram,Transaction,TransactionInstruction,TransactionMessage} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,getAssociatedTokenAddressSync,createAssociatedTokenAccountIdempotentInstruction,createTransferCheckedInstruction} from '@solana/spl-token';
import * as squads from '@sqds/multisig';
import {Buffer} from 'buffer';
import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync('launchpad.cryptoworldz.xyz/onedrop/revive-manifest.v1.json','utf8'));
const owner=new PublicKey(manifest.authority.owner),mint=new PublicKey(manifest.token.mint),multisig=new PublicKey(manifest.authority.squadsMultisig),vault=new PublicKey(manifest.authority.squadsVault),sourceAta=new PublicKey(manifest.authority.squadsVaultRvivAta);
const JITO=new PublicKey(manifest.distributor.programId),version=BigInt(manifest.distributor.versionU64);
const u64=v=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(v));return b};
const i64=v=>{const b=Buffer.alloc(8);b.writeBigInt64LE(BigInt(v));return b};
const discriminator=n=>crypto.createHash('sha256').update('global:'+n).digest().subarray(0,8);
const total=manifest.recipients.reduce((s,r)=>s+BigInt(r.amountRaw),0n);
if(total!==BigInt(manifest.distributor.maxTotalClaimRaw))throw new Error('manifest claim sum mismatch');
if(new Set(manifest.recipients.map(x=>x.wallet)).size!==manifest.recipients.length)throw new Error('duplicate claimant');
if(manifest.recipients.length!==219)throw new Error('unexpected claimant count');

const [distributor]=PublicKey.findProgramAddressSync([Buffer.from('MerkleDistributor'),mint.toBuffer(),u64(version)],JITO);
const tokenVault=getAssociatedTokenAddressSync(mint,distributor,true,TOKEN_PROGRAM_ID);
const ownerAta=getAssociatedTokenAddressSync(mint,owner,false,TOKEN_PROGRAM_ID);
const impact=manifest.buckets.find(x=>x.name==='ONEWORLDZ_IMPACT'),impactOwner=new PublicKey(impact.destination),impactAta=getAssociatedTokenAddressSync(mint,impactOwner,true,TOKEN_PROGRAM_ID);
const root=Buffer.alloc(32,7),now=2_000_000_000n;
const distData=Buffer.concat([discriminator('new_distributor'),u64(version),root,u64(total),u64(manifest.recipients.length),i64(now),i64(now+3600n),i64(now+3600n+315360000n)]);
const distIx=new TransactionInstruction({programId:JITO,data:distData,keys:[
 {pubkey:distributor,isSigner:false,isWritable:true},{pubkey:ownerAta,isSigner:false,isWritable:true},{pubkey:mint,isSigner:false,isWritable:false},{pubkey:tokenVault,isSigner:false,isWritable:true},{pubkey:owner,isSigner:true,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false},{pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false}
]});
const blockhash='11111111111111111111111111111111';
const inner=new TransactionMessage({payerKey:vault,recentBlockhash:blockhash,instructions:[
 createTransferCheckedInstruction(sourceAta,mint,tokenVault,vault,total,manifest.token.decimals,[],TOKEN_PROGRAM_ID),
 createTransferCheckedInstruction(sourceAta,mint,impactAta,vault,BigInt(impact.raw),manifest.token.decimals,[],TOKEN_PROGRAM_ID)
]});
const wrappedBytes=squads.utils.transactionMessageToMultisigTransactionMessageBytes({message:inner,vaultPda:vault});
const [wrappedMessage]=squads.types.transactionMessageBeet.deserialize(Buffer.from(wrappedBytes));
const transactionIndex=999n,[transactionPda]=squads.getTransactionPda({multisigPda:multisig,index:transactionIndex}),[proposalPda]=squads.getProposalPda({multisigPda:multisig,transactionIndex});
const createIx=squads.instructions.vaultTransactionCreate({multisigPda:multisig,transactionIndex,creator:owner,rentPayer:owner,vaultIndex:0,ephemeralSigners:0,transactionMessage:inner,memo:'Worldz OneDrop REVIVE: Dev + Legacy claims and OneWorldz Impact'});
const proposalIx=squads.instructions.proposalCreate({multisigPda:multisig,transactionIndex,creator:owner,rentPayer:owner,isDraft:false});
const approveIx=squads.instructions.proposalApprove({multisigPda:multisig,transactionIndex,member:owner,memo:'Approve exact REVIVE OneDrop distribution'});
const metas=wrappedMessage.accountKeys.map((key,i)=>({pubkey:key,isWritable:squads.utils.isStaticWritableIndex(wrappedMessage,i),isSigner:squads.utils.isSignerIndex(wrappedMessage,i)&&!key.equals(vault)}));
const executeIx=squads.generated.createVaultTransactionExecuteInstruction({multisig,proposal:proposalPda,transaction:transactionPda,member:owner,anchorRemainingAccounts:metas},squads.PROGRAM_ID);
const tx=new Transaction({feePayer:owner,recentBlockhash:blockhash}).add(
 createAssociatedTokenAccountIdempotentInstruction(owner,ownerAta,owner,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
 createAssociatedTokenAccountIdempotentInstruction(owner,impactAta,impactOwner,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
 distIx,createIx,proposalIx,approveIx,executeIx
);
const size=tx.serialize({requireAllSignatures:false,verifySignatures:false}).length;
console.log('WORLDZ_ONEDROP_STATIC claimant_count='+manifest.recipients.length+' claim_raw='+total+' one_tx_worst_case_bytes='+size);
if(size>1232)throw new Error('one transaction exceeds Solana packet limit: '+size);

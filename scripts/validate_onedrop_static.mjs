import crypto from 'node:crypto';
import {PublicKey,SystemProgram,Transaction,TransactionInstruction,TransactionMessage} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,getAssociatedTokenAddressSync,createAssociatedTokenAccountIdempotentInstruction,createTransferCheckedInstruction} from '@solana/spl-token';
import * as squads from '@sqds/multisig';
import {Buffer} from 'buffer';
import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync('launchpad.cryptoworldz.xyz/onedrop/revive-manifest.v1.json','utf8'));
const owner=new PublicKey(manifest.authority.owner),mint=new PublicKey(manifest.token.mint),multisig=new PublicKey(manifest.authority.squadsMultisig),vault=new PublicKey(manifest.authority.squadsVault),sourceAta=new PublicKey(manifest.authority.squadsVaultRvivAta);
const JITO=new PublicKey(manifest.distributor.programId),version=BigInt(manifest.distributor.versionU64);
if(manifest.authority.requiredApprovals!==3||manifest.authority.memberCount!==5)throw new Error('REVIVE OneDrop governance must be 3-of-5');
const derivedSourceAta=getAssociatedTokenAddressSync(mint,vault,true,TOKEN_PROGRAM_ID);
if(!derivedSourceAta.equals(sourceAta))throw new Error('canonical Squads RVIV source ATA mismatch');

const u64=v=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(v));return b};
const i64=v=>{const b=Buffer.alloc(8);b.writeBigInt64LE(BigInt(v));return b};
const discriminator=n=>crypto.createHash('sha256').update('global:'+n).digest().subarray(0,8);
const totals=manifest.recipients.reduce((a,r)=>{
  const unlocked=BigInt(r.amountUnlockedRaw??r.amountRaw),locked=BigInt(r.amountLockedRaw??0);
  if(unlocked+locked!==BigInt(r.amountRaw))throw new Error('recipient component mismatch '+r.wallet);
  a.unlocked+=unlocked;a.locked+=locked;a.total+=unlocked+locked;return a;
},{unlocked:0n,locked:0n,total:0n});
if(totals.total!==BigInt(manifest.distributor.maxTotalClaimRaw))throw new Error('manifest claim sum mismatch');
if(totals.unlocked!==BigInt(manifest.distributor.amountUnlockedRaw))throw new Error('manifest unlocked sum mismatch');
if(totals.locked!==BigInt(manifest.distributor.amountLockedRaw))throw new Error('manifest locked sum mismatch');
if(totals.unlocked!==19999999999950n||totals.locked!==29999999999998n)throw new Error('REVIVE Legacy/Dev split drift');
if(new Set(manifest.recipients.map(x=>x.wallet)).size!==manifest.recipients.length)throw new Error('duplicate claimant');
if(manifest.recipients.length!==219)throw new Error('unexpected claimant count');
if(manifest.recipients.filter(x=>x.buckets.includes('DEV')).length!==7)throw new Error('unexpected Dev claimant count');
if(manifest.recipients.filter(x=>x.buckets.includes('LEGACY_REVIVAL')).length!==214)throw new Error('unexpected Legacy claimant count');

const [distributor]=PublicKey.findProgramAddressSync([Buffer.from('MerkleDistributor'),mint.toBuffer(),u64(version)],JITO);
const tokenVault=getAssociatedTokenAddressSync(mint,distributor,true,TOKEN_PROGRAM_ID);
const ownerAta=getAssociatedTokenAddressSync(mint,owner,false,TOKEN_PROGRAM_ID);
const impact=manifest.buckets.find(x=>x.name==='WORLDZ_IMPACT');
if(!impact)throw new Error('WORLDZ_IMPACT bucket missing');
const impactOwner=new PublicKey(impact.destination),impactAta=getAssociatedTokenAddressSync(mint,impactOwner,true,TOKEN_PROGRAM_ID);
const root=Buffer.alloc(32,7),now=2_000_000_000n,vesting=365n*86400n;
const distData=Buffer.concat([discriminator('new_distributor'),u64(version),root,u64(totals.total),u64(manifest.recipients.length),i64(now),i64(now+vesting),i64(now+vesting+315360000n)]);
const distIx=new TransactionInstruction({programId:JITO,data:distData,keys:[
 {pubkey:distributor,isSigner:false,isWritable:true},{pubkey:ownerAta,isSigner:false,isWritable:true},{pubkey:mint,isSigner:false,isWritable:false},{pubkey:tokenVault,isSigner:false,isWritable:true},{pubkey:owner,isSigner:true,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false},{pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false}
]});

const blockhash='11111111111111111111111111111111';
const inner=new TransactionMessage({payerKey:vault,recentBlockhash:blockhash,instructions:[
 createTransferCheckedInstruction(sourceAta,mint,tokenVault,vault,totals.total,manifest.token.decimals,[],TOKEN_PROGRAM_ID),
 createTransferCheckedInstruction(sourceAta,mint,impactAta,vault,BigInt(impact.raw),manifest.token.decimals,[],TOKEN_PROGRAM_ID)
]});
const wrappedBytes=squads.utils.transactionMessageToMultisigTransactionMessageBytes({message:inner,vaultPda:vault});
const [wrappedMessage]=squads.types.transactionMessageBeet.deserialize(Buffer.from(wrappedBytes));
const transactionIndex=999n,[transactionPda]=squads.getTransactionPda({multisigPda:multisig,index:transactionIndex}),[proposalPda]=squads.getProposalPda({multisigPda:multisig,transactionIndex});
const createIx=squads.instructions.vaultTransactionCreate({multisigPda:multisig,transactionIndex,creator:owner,rentPayer:owner,vaultIndex:0,ephemeralSigners:0,transactionMessage:inner,memo:'Worldz OneDrop REVIVE: 12-month Dev vesting + Legacy claims + Worldz Impact'});
const proposalIx=squads.instructions.proposalCreate({multisigPda:multisig,transactionIndex,creator:owner,rentPayer:owner,isDraft:false});
const approveIx=squads.instructions.proposalApprove({multisigPda:multisig,transactionIndex,member:owner,memo:'JayJayTeamDev approval 1/3 — exact REVIVE OneDrop distribution'});
const metas=wrappedMessage.accountKeys.map((key,i)=>({pubkey:key,isWritable:squads.utils.isStaticWritableIndex(wrappedMessage,i),isSigner:squads.utils.isSignerIndex(wrappedMessage,i)&&!key.equals(vault)}));
const executeIx=squads.generated.createVaultTransactionExecuteInstruction({multisig,proposal:proposalPda,transaction:transactionPda,member:owner,anchorRemainingAccounts:metas},squads.PROGRAM_ID);

const setupTx=new Transaction({feePayer:owner,recentBlockhash:blockhash}).add(
 createAssociatedTokenAccountIdempotentInstruction(owner,ownerAta,owner,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
 createAssociatedTokenAccountIdempotentInstruction(owner,impactAta,impactOwner,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
 distIx,createIx,proposalIx,approveIx
);
const executeTx=new Transaction({feePayer:owner,recentBlockhash:blockhash}).add(executeIx);
const setupSize=setupTx.serialize({requireAllSignatures:false,verifySignatures:false}).length;
const executeSize=executeTx.serialize({requireAllSignatures:false,verifySignatures:false}).length;
console.log('WORLDZ_ONEDROP_STATIC claimant_count='+manifest.recipients.length+' total_raw='+totals.total+' unlocked_raw='+totals.unlocked+' locked_raw='+totals.locked+' setup_bytes='+setupSize+' execute_bytes='+executeSize+' governance=3of5');
if(setupSize>1232)throw new Error('setup transaction exceeds Solana packet limit: '+setupSize);
if(executeSize>1232)throw new Error('execution transaction exceeds Solana packet limit: '+executeSize);

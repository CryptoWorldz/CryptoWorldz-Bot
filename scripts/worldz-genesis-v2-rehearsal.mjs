import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Connection,Keypair,LAMPORTS_PER_SOL,PublicKey,Transaction,sendAndConfirmTransaction} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID,createInitializeMintInstruction,createMintToInstruction,createAssociatedTokenAccountInstruction,getAssociatedTokenAddressSync,getAccount,getMint,MINT_SIZE,createSetAuthorityInstruction,AuthorityType} from '@solana/spl-token';
const manifest=JSON.parse(readFileSync(new URL('../config/worldz-genesis-v2.json',import.meta.url),'utf8'));
assert.equal(manifest.allocations.length,11);
assert.equal(manifest.allocations.reduce((n,a)=>n+BigInt(a.tokens),0n),100000000n);
assert.equal(manifest.execution.mintEnabled,false);
assert.equal(manifest.execution.transactionBroadcastEnabled,false);
const conn=new Connection('https://api.devnet.solana.com','confirmed');
const payer=Keypair.generate(),mint=Keypair.generate(),owners=manifest.allocations.map(()=>Keypair.generate());
console.log('Devnet-only ephemeral payer:',payer.publicKey.toBase58());
let funded=false;
for(let attempt=0;attempt<6;attempt++){
 try{const sig=await conn.requestAirdrop(payer.publicKey,Math.floor(([1,0.5,0.25,1,0.5,0.25][attempt])*LAMPORTS_PER_SOL));await conn.confirmTransaction(sig,'confirmed');funded=true;break;}catch(e){console.log('Devnet faucet attempt',attempt+1,'failed:',String(e).slice(0,160));await new Promise(r=>setTimeout(r,5000));}
}
if(!funded)throw Error('Devnet faucet unavailable; no mint executed');
const rent=await conn.getMinimumBalanceForRentExemption(MINT_SIZE);
const create=new Transaction().add(
 (await import('@solana/web3.js')).SystemProgram.createAccount({fromPubkey:payer.publicKey,newAccountPubkey:mint.publicKey,space:MINT_SIZE,lamports:rent,programId:TOKEN_PROGRAM_ID}),
 createInitializeMintInstruction(mint.publicKey,6,payer.publicKey,payer.publicKey));
await sendAndConfirmTransaction(conn,create,[payer,mint],{commitment:'confirmed'});
const addresses=[];
for(let i=0;i<11;i++){
 const owner=owners[i].publicKey;
 const ata=getAssociatedTokenAddressSync(mint.publicKey,owner);
 const units=BigInt(manifest.allocations[i].tokens)*1000000n;
 const tx=new Transaction().add(createAssociatedTokenAccountInstruction(payer.publicKey,ata,owner,mint.publicKey),createMintToInstruction(mint.publicKey,ata,payer.publicKey,units));
 const signature=await sendAndConfirmTransaction(conn,tx,[payer],{commitment:'confirmed'});
 const account=await getAccount(conn,ata,'confirmed');
 assert.equal(account.amount,units);
 addresses.push({key:manifest.allocations[i].key,owner:owner.toBase58(),tokenAccount:ata.toBase58(),tokens:manifest.allocations[i].tokens,signature});
 console.log('PASS allocation',manifest.allocations[i].key,manifest.allocations[i].tokens,'signature',signature);
}
const revoke=new Transaction().add(createSetAuthorityInstruction(mint.publicKey,payer.publicKey,AuthorityType.MintTokens,null),createSetAuthorityInstruction(mint.publicKey,payer.publicKey,AuthorityType.FreezeAccount,null));
const revokeSig=await sendAndConfirmTransaction(conn,revoke,[payer],{commitment:'confirmed'});
const state=await getMint(conn,mint.publicKey,'confirmed');
assert.equal(state.supply,100000000n*1000000n);
assert.equal(state.decimals,6);
assert.equal(state.mintAuthority,null);
assert.equal(state.freezeAuthority,null);
console.log('PASS mint:',mint.publicKey.toBase58(),'supply:',state.supply.toString(),'authority revoke:',revokeSig);
console.log('RESULT_JSON='+JSON.stringify({network:'devnet',mint:mint.publicKey.toBase58(),supply:state.supply.toString(),decimals:state.decimals,mintAuthority:null,freezeAuthority:null,allocations:addresses,revokeSig}));

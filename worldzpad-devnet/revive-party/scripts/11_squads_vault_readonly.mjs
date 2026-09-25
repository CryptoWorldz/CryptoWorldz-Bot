#!/usr/bin/env node
// REVIVE Squads v4 vault verification — READ ONLY.
import fs from 'node:fs';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { NATIVE_MINT, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';

const RPC=process.env.SOLANA_MAINNET_RPC_URL?.trim()||clusterApiUrl('mainnet-beta');
const MAINNET_GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const SQUADS_PROGRAM=new PublicKey('SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf');
const MULTISIG=new PublicKey('B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN');
const EXPECTED_VAULT=new PublicKey('n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB');
const FEE_PAYER=new PublicKey('Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u');

const cfg=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-launch-contract.v1.json','utf8'));
const rvivMint=new PublicKey(cfg.token.canonicalMint);

function u64le(x){const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(x));return b;}
const [vaultPda,vaultBump]=PublicKey.findProgramAddressSync(
  [Buffer.from('multisig'),MULTISIG.toBuffer(),Buffer.from('vault'),Buffer.from([0])],
  SQUADS_PROGRAM
);

const c=new Connection(RPC,'confirmed');
const genesis=await c.getGenesisHash();
if(genesis!==MAINNET_GENESIS)throw new Error('MAINNET RPC REQUIRED genesis='+genesis);

const [multisigInfo,vaultInfo,feePayerLamports]=await Promise.all([
  c.getAccountInfo(MULTISIG,'confirmed'),
  c.getAccountInfo(vaultPda,'confirmed'),
  c.getBalance(FEE_PAYER,'confirmed'),
]);
if(!multisigInfo)throw new Error('Squads multisig account not found');
if(!multisigInfo.owner.equals(SQUADS_PROGRAM))throw new Error('Multisig not owned by Squads v4 program');
if(!vaultPda.equals(EXPECTED_VAULT))throw new Error('Vault #0 derivation does not match canonical treasury');

const d=multisigInfo.data;
if(d.length<94)throw new Error('Squads multisig account too short');
const threshold=d.readUInt16LE(72);
const timeLock=d.readUInt32LE(74);
const transactionIndex=d.readBigUInt64LE(78);
const staleTransactionIndex=d.readBigUInt64LE(86);
const nextTransactionIndex=transactionIndex+1n;

const [transactionPda,transactionBump]=PublicKey.findProgramAddressSync(
  [Buffer.from('multisig'),MULTISIG.toBuffer(),Buffer.from('transaction'),u64le(nextTransactionIndex)],
  SQUADS_PROGRAM
);
const [ephemeralSignerPda,ephemeralBump]=PublicKey.findProgramAddressSync(
  [Buffer.from('multisig'),transactionPda.toBuffer(),Buffer.from('ephemeral_signer'),Buffer.from([0])],
  SQUADS_PROGRAM
);

const rvivAta=getAssociatedTokenAddressSync(rvivMint,vaultPda,true,TOKEN_PROGRAM_ID);
const wsolAta=getAssociatedTokenAddressSync(NATIVE_MINT,vaultPda,true,TOKEN_PROGRAM_ID);
const [rvivBal,wsolInfo]=await Promise.all([
  c.getTokenAccountBalance(rvivAta,'confirmed'),
  c.getAccountInfo(wsolAta,'confirmed'),
]);

const report={
 proof:'REVIVE_SQUADS_VAULT_READ_ONLY',
 network:'solana-mainnet-beta',
 squads:{
   program:SQUADS_PROGRAM.toBase58(),
   multisig:MULTISIG.toBase58(),
   multisigAccountOwner:multisigInfo.owner.toBase58(),
   threshold,
   timeLockSeconds:timeLock,
   transactionIndex:transactionIndex.toString(),
   staleTransactionIndex:staleTransactionIndex.toString(),
   nextTransactionIndex:nextTransactionIndex.toString(),
   vaultIndex:0,
   vault:vaultPda.toBase58(),
   vaultBump,
   matchesCanonicalTreasury:vaultPda.equals(EXPECTED_VAULT),
   nextTransactionPda:transactionPda.toBase58(),
   nextTransactionBump:transactionBump,
   ephemeralPositionNftSignerPda:ephemeralSignerPda.toBase58(),
   ephemeralSignerBump:ephemeralBump,
 },
 balances:{
   jayJayTeamDev:FEE_PAYER.toBase58(),
   jayJayLamports:feePayerLamports,
   jayJaySol:feePayerLamports/1e9,
   vaultLamports:vaultInfo?.lamports??0,
   vaultSol:(vaultInfo?.lamports??0)/1e9,
   rvivAta:rvivAta.toBase58(),
   rvivTokens:rvivBal.value.uiAmountString,
   wsolAta:wsolAta.toBase58(),
   wsolAtaExists:Boolean(wsolInfo),
 },
 safety:{readOnly:true,signs:false,broadcasts:false,movesSol:false,movesRviv:false}
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/revive-squads-vault-readonly.json',JSON.stringify(report,null,2)+'\n');
console.log('REVIVE_SQUADS_VAULT=PASS vault='+report.squads.vault+' threshold='+threshold+' tx_index='+transactionIndex+' next='+nextTransactionIndex+' rviv='+report.balances.rvivTokens+' vault_sol='+report.balances.vaultSol+' jay_sol='+report.balances.jayJaySol+' wsol_ata='+(report.balances.wsolAtaExists?'EXISTS':'MISSING'));
console.log('REVIVE_SQUADS_EPHEMERAL_POSITION_SIGNER='+report.squads.ephemeralPositionNftSignerPda);

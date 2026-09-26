#!/usr/bin/env node
// RVIV legacy 216 transfer preflight. READ ONLY: no keys, signatures or sends.
import fs from 'node:fs';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';

const rpc=process.env.SOLANA_MAINNET_RPC_URL?.trim()||clusterApiUrl('mainnet-beta');
const conn=new Connection(rpc,'confirmed');
const genesis=await conn.getGenesisHash();
if(genesis!=='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d')throw Error('MAINNET_RPC_REQUIRED');
const manifest=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-legacy-216-distribution.v1.json'));
const cfg=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-launch-contract.v1.json'));
const dev=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-six-dev-distribution.v1.json'));
const mint=new PublicKey(manifest.mint);
const vault=new PublicKey(cfg.token.treasuryVault);
const payer=new PublicKey('Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u');
if(manifest.mint!==cfg.token.canonicalMint||manifest.recipientCount!==216||
 manifest.recipients.length!==216||new Set(manifest.recipients.map(x=>x.wallet)).size!==216||
 manifest.recipients.reduce((a,x)=>a+BigInt(x.amountRaw),0n)!==20_000_000_000_000n)throw Error('MANIFEST_INVALID');
const vaultAta=getAssociatedTokenAddressSync(mint,vault,true,TOKEN_PROGRAM_ID);
if(vaultAta.toBase58()!==cfg.token.treasuryTokenAccount)throw Error('VAULT_ATA_DRIFT');
const [vaultTokens,payerSol,vaultSol,ataRent]=await Promise.all([
 conn.getTokenAccountBalance(vaultAta,'confirmed'),conn.getBalance(payer,'confirmed'),
 conn.getBalance(vault,'confirmed'),conn.getMinimumBalanceForRentExemption(165,'confirmed')
]);
const atas=manifest.recipients.map(x=>getAssociatedTokenAddressSync(mint,new PublicKey(x.wallet),true,TOKEN_PROGRAM_ID));
let existing=0,missing=0;
for(let offset=0;offset<atas.length;offset+=64){
  const batch=atas.slice(offset,offset+64);
  let info;
  for(let attempt=0;attempt<3;attempt++){
    try { info=await conn.getMultipleAccountsInfo(batch,'confirmed'); break; }
    catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,1200*(attempt+1)));}
  }
  for(const item of info){if(item)existing++;else missing++;}
}
const rent=BigInt(missing)*BigInt(ataRent);
const extraDestinations=[
 ...dev.recipients.map(x=>({role:'SIX_DEV',wallet:x.wallet})),
 ...cfg.teamVesting.knownTeamWallets.map(x=>({role:'TEAM',wallet:x.address})),
 {role:'DEV_CITY_STAGING',wallet:cfg.devCity.stagingWallet},
 {role:'ONEWORLDZ_STAGING',wallet:cfg.charityImpact.stagingWallet},
];
const extraAtas=extraDestinations.map(x=>getAssociatedTokenAddressSync(mint,new PublicKey(x.wallet),true,TOKEN_PROGRAM_ID));
let extraInfo;
for(let attempt=0;attempt<3;attempt++){
  try{extraInfo=await conn.getMultipleAccountsInfo(extraAtas,'confirmed');break;}
  catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,1200*(attempt+1)));}
}
const extraTokenAccounts=extraDestinations.map((x,i)=>({...x,exists:!!extraInfo[i]}));
const result={proof:'REVIVE_LEGACY_216_DISTRIBUTION_READONLY_PREFLIGHT',observedAt:new Date().toISOString(),
 genesis,mint:mint.toBase58(),snapshotBatch:manifest.snapshotBatch,recipients:216,
 totalRaw:manifest.totalRaw,vault:vault.toBase58(),vaultTokenAccount:vaultAta.toBase58(),
 vaultRvivRaw:vaultTokens.value.amount,vaultSolLamports:vaultSol,
 feePayer:payer.toBase58(),feePayerSolLamports:payerSol,
 recipientAtasExisting:existing,recipientAtasMissing:missing,
 extraTokenAccounts,
 extraMissingAtaRentLamports:(BigInt(extraTokenAccounts.filter(x=>!x.exists).length)*BigInt(ataRent)).toString(),
 ataRentLamportsEach:ataRent,missingAtaRentLamports:rent.toString(),
 enoughRviv:BigInt(vaultTokens.value.amount)>=20_000_000_000_000n,
 payerCoversAtaRentOnly:BigInt(payerSol)>=rent,
 remainingCosts:'Squads proposal rent, transaction fees and any ATA costs paid by the vault need separate exact simulation.',
 safety:{signed:false,broadcast:false,transfers:false}};
console.log(JSON.stringify(result,null,2));
if(!result.enoughRviv)process.exitCode=2;

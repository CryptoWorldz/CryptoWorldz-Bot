import fs from 'node:fs';
import crypto from 'node:crypto';
import {PublicKey} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID,getAssociatedTokenAddressSync} from '@solana/spl-token';
// Run from worldzpad-devnet/revive-party. Offline review only: no signing or sending.
const m=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-legacy-216-distribution.v1.json'));
const c=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-launch-contract.v1.json'));
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
if(m.mint!==c.token.canonicalMint||m.recipientCount!==216||m.recipients.length!==216||new Set(m.recipients.map(x=>x.wallet)).size!==216||m.recipients.reduce((n,x)=>n+BigInt(x.amountRaw),0n)!==20_000_000_000_000n)throw Error('LEDGER_GATE_FAILED');
if(m.payoutExclusionsPendingRecalculation?.length||m.recipients.some(x=>x.payoutStatus==='EXCLUDED_PENDING_RECALCULATION'))throw Error('EXCLUDED_ENTITLEMENTS_REQUIRE_RECONCILIATION');
const mint=new PublicKey(m.mint);
const rows=m.recipients.map((x,i)=>({ordinal:i+1,wallet:x.wallet,tokenAccount:getAssociatedTokenAddressSync(mint,new PublicKey(x.wallet),true,TOKEN_PROGRAM_ID).toBase58(),amountRaw:x.amountRaw}));
const batches=[];
for(let i=0;i<rows.length;i+=4){const recipients=rows.slice(i,i+4);batches.push({index:batches.length+1,recipients,amountRaw:recipients.reduce((n,x)=>n+BigInt(x.amountRaw),0n).toString(),reviewHash:sha(recipients),status:'DRAFT_NOT_SIGNABLE'});}
const out={version:'REVIVE-LEGACY-216-REVIEW-2026-09-26-A',status:'DRAFT_NOT_SIGNABLE',sourceManifestSha256:sha(m),mint:m.mint,sourceVault:c.token.treasuryVault,snapshotBatch:m.snapshotBatch,recipientCount:216,totalRaw:m.totalRaw,batchCount:batches.length,batches};
fs.writeFileSync('../../worldzpad-mainnet/revive/revive-legacy-216-review-batches.v1.json',JSON.stringify(out,null,2)+'\n');
console.log('REVIEW_BATCHES=PASS count='+batches.length+' recipients=216 totalRaw='+m.totalRaw);

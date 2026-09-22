const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const file=path.join(__dirname,'..','launchpad.cryptoworldz.xyz','wldz','proposal.js');
const source=fs.readFileSync(file,'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','launchpad.cryptoworldz.xyz','wldz','index.html'),'utf8');

test('WLDZ proposal route has valid JavaScript syntax',()=>{
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('WLDZ proposal route derives proposal state live instead of shipping a fixed batch payload',()=>{
  assert.match(source,/Multisig\.fromAccountAddress/);
  assert.match(source,/transactionIndex\)\+1n/);
  assert.match(source,/getTransactionPda/);
  assert.match(source,/getProposalPda/);
  assert.match(source,/getEphemeralSignerPda/);
  assert.doesNotMatch(source,/const\s+PAYLOAD\s*=/);
  assert.doesNotMatch(source,/batchIndex\s*:\s*11/);
});

test('WLDZ proposal route resumes only the recorded batch and refuses duplicates',()=>{
  assert.match(source,/RESUME_KEY/);
  assert.match(source,/Batch\.fromAccountAddress/);
  assert.match(source,/Proposal\.fromAccountAddress/);
  assert.match(source,/status\?\.__kind/);
  assert.match(source,/kind==='active'/);
  assert.match(source,/No duplicate proposal was created/);
});

test('WLDZ proposal route stops after any confirmed on-chain failure',()=>{
  assert.match(source,/confirmation\.value\.err!==null/);
  assert.match(source,/failed on-chain/);
  assert.match(source,/WLDZ proposal stopped safely/);
});

test('WLDZ launch invariants remain locked in the browser route',()=>{
  assert.match(source,/15000000/);
  assert.match(source,/baseFeeBps===200/);
  assert.match(source,/quoteAmountSol===0/);
  assert.match(source,/permanentLock===true/);
  assert.match(source,/mintAuthority===null&&mintInfo\.freezeAuthority===null/);
});

test('WLDZ route exposes an explicit mobile-capable wallet connect path',()=>{
  assert.match(html,/<button class="wallet-mini" id="connect-wallet"[^>]*>Connect Wallet<\/button>/);
  assert.match(html,/Connect Wallet/);
  assert.match(source,/@wallet-standard\/app@1\.1\.0/);
  assert.match(source,/jupiter-mobile\.js/);
  assert.match(source,/Jupiter Mobile/);
  assert.match(source,/signVersionedTransaction/);
  assert.doesNotMatch(source,/Wallet unavailable\. Open this page in the same wallet browser/);
});


test('WLDZ proposal route recovers safely from stale or expired blockhashes',()=>{
  assert.match(source,/PUBLIC_RPC='https:\/\/api\.mainnet-beta\.solana\.com'/);
  assert.match(source,/getSignatureStatuses/);
  assert.match(source,/searchTransactionHistory:true/);
  assert.match(source,/freshestTransactionConnection/);
  assert.match(source,/freshBlockhash/);
  assert.match(source,/lastValidBlockHeight-height>=100/);
  assert.match(source,/heightAfterSigning<35/);
  assert.match(source,/blockhash not found/);
  assert.match(source,/maxRetries:10/);
  assert.match(source,/No automatic third attempt/);
  assert.match(html,/proposal\.js\?v=20260923-wldz-resume14-v4/);
});


test('WLDZ proposal status uses the generated status __kind and can resume a funded draft',()=>{
  assert.match(source,/proposal\?\.status\?\.__kind/);
  assert.match(source,/kind==='draft'/);
  assert.match(source,/kind==='active'/);
  assert.doesNotMatch(source,/sqds\.types\.isProposalStatusDraft/);
  assert.match(html,/proposal\.js\?v=20260923-wldz-resume14-v4/);
});

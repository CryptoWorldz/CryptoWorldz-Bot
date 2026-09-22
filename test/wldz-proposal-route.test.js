const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const file=path.join(__dirname,'..','launchpad.cryptoworldz.xyz','wldz','proposal.js');
const source=fs.readFileSync(file,'utf8');

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
  assert.match(source,/isProposalStatusDraft/);
  assert.match(source,/isProposalStatusActive/);
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
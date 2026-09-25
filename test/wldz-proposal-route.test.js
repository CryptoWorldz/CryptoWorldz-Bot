const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.join(__dirname,'..');
const proposalFile=path.join(root,'launchpad.cryptoworldz.xyz','wldz','proposal.js');
const source=fs.readFileSync(proposalFile,'utf8');
const html=fs.readFileSync(path.join(root,'launchpad.cryptoworldz.xyz','wldz','index.html'),'utf8');
const live=JSON.parse(fs.readFileSync(path.join(root,'launchpad.cryptoworldz.xyz','wldz','launch-config.json'),'utf8'));

test('archived WLDZ proposal route retains valid JavaScript syntax',()=>{
  const result=spawnSync(process.execPath,['--check',proposalFile],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('archived proposal route derives state live instead of shipping a fixed batch payload',()=>{
  assert.match(source,/Multisig\.fromAccountAddress/);
  assert.match(source,/transactionIndex\)\+1n/);
  assert.match(source,/getTransactionPda/);
  assert.match(source,/getProposalPda/);
  assert.doesNotMatch(source,/const\s+PAYLOAD\s*=/);
});

test('archived proposal route retains duplicate and on-chain failure guards',()=>{
  assert.match(source,/RESUME_KEY/);
  assert.match(source,/No duplicate proposal was created/);
  assert.match(source,/confirmation\.value\.err!==null/);
  assert.match(source,/WLDZ proposal stopped safely/);
  assert.match(source,/getSignatureStatuses/);
  assert.match(source,/searchTransactionHistory:true/);
});

test('archived route retains the locked launch invariants',()=>{
  assert.match(source,/15000000/);
  assert.match(source,/baseFeeBps===200/);
  assert.match(source,/quoteAmountSol===0/);
  assert.match(source,/permanentLock===true/);
  assert.match(source,/mintAuthority===null&&mintInfo\.freezeAuthority===null/);
});

test('archived route retains mobile wallet compatibility but is no longer public execution UI',()=>{
  assert.match(source,/@wallet-standard\/app@1\.1\.0/);
  assert.match(source,/jupiter-mobile\.js/);
  assert.match(source,/Jupiter Mobile/);
  assert.match(source,/signVersionedTransaction/);
  assert.doesNotMatch(html,/id="create-proposal"/);
  assert.doesNotMatch(html,/proposal\.js/);
  assert.doesNotMatch(html,/Connect WLDZ Squads Proposal/);
});

test('public WLDZ page exposes the executed canonical pool state',()=>{
  assert.match(html,/SOLANA MAINNET • LIVE/);
  assert.match(html,/Canonical WORLDZ \(WLDZ\) is live on Solana/);
  assert.match(html,/GCFKk1H5Z8EfxFuAvDEXTHn8b28deUA7HxVRsipjfPiJ/);
  assert.match(html,/100% of the launch LP position is permanently locked/);
  assert.equal(live.status.startsWith('LIVE__'),true);
  assert.equal(live.token.mint,'AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U');
  assert.equal(live.launch.poolAddress,'GCFKk1H5Z8EfxFuAvDEXTHn8b28deUA7HxVRsipjfPiJ');
  assert.equal(live.launch.baseAmountTokens,15000000);
  assert.equal(live.launch.permanentLock,true);
  assert.equal(live.launch.permanentLockPercent,100);
  assert.equal(live.execution.launchExecuted,true);
  assert.equal(live.execution.broadcasted,true);
  assert.equal(live.execution.duplicateExecutionDisabled,true);
  assert.equal(live.execution.publicCreatorGate,false);
});

test('public WLDZ page links the current market discovery surfaces',()=>{
  assert.match(html,/jup\.ag\/tokens\/AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U/);
  assert.match(html,/phantom\.com\/tokens\/solana\/AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U/);
  assert.match(html,/geckoterminal\.com\/solana\/pools\/GCFKk1H5Z8EfxFuAvDEXTHn8b28deUA7HxVRsipjfPiJ/);
  assert.match(html,/birdeye\.so\/solana\/token\/AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U/);
  assert.match(html,/dexscreener\.com\/solana\/GCFKk1H5Z8EfxFuAvDEXTHn8b28deUA7HxVRsipjfPiJ/);
});

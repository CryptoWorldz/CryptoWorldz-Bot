const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'launchpad.cryptoworldz.xyz','wldz','index.html'),'utf8');
const live=JSON.parse(fs.readFileSync(path.join(root,'launchpad.cryptoworldz.xyz','wldz','launch-config.json'),'utf8'));
const supply=JSON.parse(fs.readFileSync(path.join(root,'launchpad.cryptoworldz.xyz','wldz','circulating-supply.json'),'utf8'));

test('public WLDZ page exposes the executed canonical pool state',()=>{
  assert.match(html,/SOLANA MAINNET • LIVE/);
  assert.match(html,/Canonical WORLDZ \(WLDZ\) is live on Solana/);
  assert.match(html,/GCFKk1H5Z8EfxFuAvDEXTHn8b28deUA7HxVRsipjfPiJ/);
  assert.match(html,/100% of the launch LP position is permanently locked/);
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

test('WLDZ supply disclosure matches current listing methodology',()=>{
  assert.equal(supply.circulatingSupply,15000000);
  assert.equal(supply.totalSupply,99999951.002722);
  assert.equal(supply.maxSupply,100000000);
});

test('public WLDZ page links current market discovery surfaces',()=>{
  assert.match(html,/jup\.ag\/tokens\/AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U/);
  assert.match(html,/phantom\.com\/tokens\/solana\/AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U/);
  assert.match(html,/geckoterminal\.com\/solana\/pools\/GCFKk1H5Z8EfxFuAvDEXTHn8b28deUA7HxVRsipjfPiJ/);
  assert.match(html,/birdeye\.so\/solana\/token\/AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U/);
  assert.match(html,/dexscreener\.com\/solana\/GCFKk1H5Z8EfxFuAvDEXTHn8b28deUA7HxVRsipjfPiJ/);
});

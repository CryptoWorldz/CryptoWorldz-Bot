const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const adapter=json('worldzpad-omnichain/adapters/xrpl/xrpl.v1.json');
const platform=json('launchpad.cryptoworldz.xyz/platform-config.json');
const html=read('launchpad.cryptoworldz.xyz/xrpl/index.html');
const app=read('launchpad.cryptoworldz.xyz/xrpl/app.js');
const intel=read('launchpad.cryptoworldz.xyz/xrpl-intelligence.php');
const txStatus=read('launchpad.cryptoworldz.xyz/xrpl-transaction-status.php');
const gateway=read('xrpworldz.xyz/index.html');

test('XRPWorldz stays testnet gated while adding native CLOB and AMM depth',()=>{
  assert.equal(adapter.mainnetExecutionEnabled,false);
  assert.equal(platform.xrplNative.mainnetExecution,false);
  assert.equal(platform.xrplNative.testnetExecution,true);
  assert.equal(platform.xrplNative.nativeDepthStatus,'AMM_CLOB_ISSUER_PROOF_INTEGRATED');
  assert.equal(adapter.market.nativeCLOB,true);
  assert.equal(adapter.market.nativeAMM,true);
  assert.deepEqual(platform.xrplNative.marketRoutes,['AMM','CLOB','BOTH']);
});

test('MPT stays research gated until market parity and separate proof',()=>{
  assert.match(adapter.token.mpt,/RESEARCH_GATED/);
  assert.equal(adapter.token.standardDecision.mptCurrentLaunchMarketParityAssumed,false);
  assert.match(html,/MPT RESEARCH LANE/);
  assert.match(intel,/MPTokensV2/);
  assert.match(intel,/MPT is not presented as market-parity/);
});

test('XRPWorldz uses native OfferCreate and AMMCreate instead of flattening XRPL',()=>{
  assert.match(app,/TransactionType:'AMMCreate'/);
  assert.match(app,/TransactionType:'OfferCreate'/);
  assert.match(app,/TakerGets:\{currency:v\.currency,issuer:v\.issuer,value:v\.clobToken\}/);
  assert.match(app,/TakerPays:drops\(total\)/);
  assert.match(html,/AMM \+ CLOB, with launch prices aligned/);
});

test('hybrid launch preflight rejects grossly misaligned AMM and CLOB prices',()=>{
  assert.match(app,/d>10/);
  assert.match(app,/differs from the AMM implied ratio by more than 10%/);
});

test('XRPL transaction hashes are never displayed as immediate confirmation',()=>{
  assert.match(app,/SUBMITTED/);
  assert.match(app,/waitForFinal/);
  assert.doesNotMatch(app,/label\+' ✅'/);
  assert.match(txStatus,/validated=true and meta\.TransactionResult=tesSUCCESS/);
  assert.match(txStatus,/\$validated&&\$txResult==='tesSUCCESS'/);
});

test('blackhole mode is irreversible and requires evidence, not button-click trust',()=>{
  assert.equal(adapter.issuerControl.modes.BLACKHOLED_FIXED_SUPPLY.irreversible,true);
  assert.deepEqual(adapter.issuerControl.modes.BLACKHOLED_FIXED_SUPPLY.proofRequirements,[
    'master key disabled','regular key is known blackhole address','no signer list','no delegate entries'
  ]);
  assert.match(app,/BLACKHOLE_ACCOUNT='rrrrrrrrrrrrrrrrrrrrrhoLvTp'/);
  assert.match(app,/i\.signerListCount===0 && i\.delegateCount===0/);
  assert.match(intel,/blackholeVerified/);
  assert.match(html,/The button press itself is not proof/);
});

test('TokenEscrow remains amendment-gated',()=>{
  assert.equal(adapter.escrow.issuerFlagValue,17);
  assert.match(app,/TokenEscrow\?\.enabled!==true/);
  assert.match(app,/SetFlag:17/);
  assert.match(intel,/TokenEscrow/);
});

test('native intelligence keeps issuer, AMM and order book evidence separate',()=>{
  assert.match(intel,/account_info/);
  assert.match(intel,/account_objects/);
  assert.match(intel,/gateway_balances/);
  assert.match(intel,/account_lines/);
  assert.match(intel,/amm_info/);
  assert.match(intel,/book_offers/);
  assert.match(intel,/does not collapse them into a fake safety score/);
});

test('XRPWorldz public gateway no longer uses retired public brand navigation',()=>{
  assert.doesNotMatch(gateway,/oneworldz\.com/i);
  assert.match(gateway,/Issue \+ CLOB \+ AMM \+ Proof/);
  assert.match(gateway,/DonateWorldz/);
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const fees=json('worldzpad-omnichain/chain-native-fee-builder.v1.json');
const invest=json('worldzpad-omnichain/investment-centre.v1.json');
const reserve=json('worldzpad-omnichain/schemas/worldz-reserve-proof.v1.json');
const platform=json('launchpad.cryptoworldz.xyz/platform-config.json');
const launch=read('launchpad.cryptoworldz.xyz/index.html');
const launchJs=read('launchpad.cryptoworldz.xyz/app.js');
const xrpl=read('launchpad.cryptoworldz.xyz/xrpl/index.html');
const xrplJs=read('launchpad.cryptoworldz.xyz/xrpl/app.js');
const investHtml=read('launchpad.cryptoworldz.xyz/invest/index.html');
const investJs=read('launchpad.cryptoworldz.xyz/invest/app.js');
const economics=read('launchpad.cryptoworldz.xyz/economics/index.html');
const revenue=read('launchpad.cryptoworldz.xyz/revenue/index.html');
const maxJs=read('public/miniapp/max.js');

test('Worldz Fair Fee Builder defaults to 1 percent and refuses high public project fees',()=>{
  assert.equal(fees.defaultPercent,1);
  assert.equal(fees.publicMaximumPercent,3);
  assert.equal(fees.preferredIncrementPercent,0.25);
  assert.equal(fees.sixToTenPercentProfilesOffered,false);
  assert.equal(platform.feePolicy.projectTradingFeeDefaultPercent,1);
  assert.equal(platform.feePolicy.projectTradingFeeMaxPercent,3);
  assert.equal(platform.feePolicy.stepPercent,0.25);
  assert.equal(platform.feePolicy.sixToTenPercentProjectTradingFeesOffered,false);
  assert.match(launch,/WORLDZ DEFAULT • MAX 3\.00%/);
});

test('Fee Flow 3/5/8 contribution is explicitly not a trader fee',()=>{
  assert.match(economics,/not 3% \/ 5% \/ 8% trader fees/i);
  assert.match(revenue,/not 3% \/ 5% \/ 8% of every trade/i);
});

test('Solana keeps route-specific proof instead of forcing the generic default',()=>{
  assert.equal(fees.chains.solana.creatorExperience.defaultPercent,1);
  assert.equal(fees.chains.solana.routeOverrides.worldzCurve.currentReviewedDevnetFeePercent,2);
  assert.equal(fees.chains.solana.routeOverrides.worldzCurve.creatorChoiceTemporarilyLocked,true);
  assert.equal(fees.chains.solana.routeOverrides.worldzCurvePro.stepPercent,0.25);
});

test('XRPWorldz uses a simple 0.25-step UI inside XRPL native one-percent maximum',()=>{
  assert.equal(fees.chains.xrpl.amm.nativeMaximumPercent,1);
  assert.deepEqual(fees.chains.xrpl.amm.publicChoicesPercent,[0.25,0.5,0.75,1]);
  assert.equal(fees.chains.xrpl.clob.projectTradingFeeSlider,false);
  assert.match(xrpl,/id="amm-fee" type="number" min="\.25" max="1" step="\.25" value="1"/);
  assert.match(xrplJs,/AMM fee must use 0\.25% increments/);
});

test('Sui exposes real venue tiers rather than inventing quarter-point tiers',()=>{
  assert.deepEqual(fees.chains.sui.cetusCLMM.worldzExposedTiersPercent,[0.25,0.4,0.6,0.8,1,2]);
  assert.ok(fees.chains.sui.cetusCLMM.worldzExposedTiersPercent.every(x=>x<=3));
  assert.equal(fees.chains.sui.deepBook.projectTradingFeeSlider,false);
});

test('EVM-family Worldz project fee profile is one-percent default, quarter-step, max three',()=>{
  for(const chain of ['ethereum','base','bnb','hyperevm','robinhood']){
    const x=fees.chains[chain].creatorExperience;
    assert.equal(x.defaultPercent,1,chain);
    assert.equal(x.maxPercent,3,chain);
    assert.equal(x.stepPercent,0.25,chain);
  }
});

test('Command Centre fee simulator cannot drift above the public cap',()=>{
  assert.match(maxJs,/max="3" step="0\.25" value="1"/);
  assert.doesNotMatch(maxJs,/max="4" step="0\.25" value="2"/);
});

test('Worldz Investment Centre is read-only, local-first and does not promise returns',()=>{
  assert.equal(invest.status,'READ_ONLY_PORTFOLIO_RESEARCH_BETA');
  assert.equal(invest.portfolioPrivacy.serverStorageDefault,false);
  assert.equal(invest.portfolioPrivacy.browserLocalOnly,true);
  assert.equal(invest.futureExecution.enabled,false);
  assert.equal(invest.investmentGuardrails.guaranteedReturns,false);
  assert.equal(platform.investmentCentre.executionEnabled,false);
  assert.equal(platform.investmentCentre.guaranteeOfReturns,false);
  assert.match(investHtml,/Portfolio Lab/);
  assert.match(investHtml,/WORLDZ THESIS LAB/);
  assert.match(investJs,/localStorage/);
  assert.match(investJs,/what would prove it wrong/i);
});

test('Investment research separates thesis from evidence and corrects XRP escrow modelling',()=>{
  assert.equal(invest.researchStandard.factVsThesisSeparated,true);
  assert.equal(invest.researchStandard.opposingEvidenceFieldRequiredForSavedThesis,true);
  assert.match(invest.xrpResearch.escrowRule,/not describe the scheduled escrow release as one billion XRP automatically flooding the market/i);
  assert.equal(invest.xrpResearch.pricePrediction,false);
});

test('1-to-1 wrapped asset labels require reserve and redemption proof',()=>{
  assert.equal(reserve.properties.rule.const,'A 1:1 label requires independently attributable reserve amount, issued supply, redemption evidence and control/reconciliation evidence. Branding or an issuer statement alone is not enough.');
  const wxrp=platform.verifiedQuoteAssets.find(x=>x.id==='wXRP');
  assert.equal(wxrp.identityStatus,'VERIFIED_ASSET_IDENTITY');
  assert.match(wxrp.reserveProofStatus,/INDEPENDENT_RESERVE_RECONCILIATION_PENDING/);
});

test('launch builder collection bindings are valid and fee manifests carry the builder contract',()=>{
  assert.doesNotMatch(launchJs,/\$\('#launch-recipes \.choice'\)\.forEach/);
  assert.doesNotMatch(launchJs,/\$\('\.next-step'\)\.forEach/);
  assert.doesNotMatch(launchJs,/\$\$\$\('/);
  assert.match(launchJs,/\$\$\('#launch-recipes \.choice'\)\.forEach/);
  assert.match(launchJs,/builder:'WORLDZ-CHAIN-NATIVE-FEE-BUILDER-V1'/);
  assert.match(launchJs,/Project fee increment/);
});

test('mainnet execution remains fail-closed across the new product contracts',()=>{
  assert.equal(platform.publicMainnetCreatorLaunchesEnabled,false);
  for(const chain of Object.values(fees.chains))assert.notEqual(chain.mainnet,true);
});

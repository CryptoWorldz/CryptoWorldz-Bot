import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRexTokenIntelligence } from '../worldzpad-omnichain/sdk/rex-token-intelligence.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const recipes=json('worldzpad-omnichain/launch-recipes.v1.json');
const platform=json('launchpad.cryptoworldz.xyz/platform-config.json');
const launchHtml=read('launchpad.cryptoworldz.xyz/index.html');
const launchJs=read('launchpad.cryptoworldz.xyz/app.js');
const trustHtml=read('launchpad.cryptoworldz.xyz/trust/index.html');
const trustJs=read('launchpad.cryptoworldz.xyz/trust/app.js');
const txHelp=read('launchpad.cryptoworldz.xyz/transaction-help/index.html');

test('all non-custom Launch Recipes sum to 100 and stay inside genesis limits',()=>{
  for(const r of recipes.recipes.filter(x=>x.allocations)){
    const a=r.allocations;
    assert.equal(Object.values(a).reduce((s,x)=>s+x,0),100,r.id);
    assert.ok(a.creatorTeam<=15,r.id+' creator');
    assert.ok(a.liquidity>=25&&a.liquidity<=60,r.id+' liquidity');
    assert.ok(a.communityPublic>=20,r.id+' community');
    assert.ok(a.treasuryReserve<=15,r.id+' treasury');
  }
});

test('platform exposes recipes and proof intelligence without enabling mainnet',()=>{
  assert.equal(platform.launchRecipes.version,'WORLDZ-LAUNCH-RECIPES-V1');
  assert.equal(platform.intelligenceStack.rexTokenIntelligence.overallSafetyScore,false);
  assert.equal(platform.publicMainnetCreatorLaunchesEnabled,false);
});

test('launch builder recipes are functional and Beginner/Pro selector regression is repaired',()=>{
  assert.match(launchHtml,/id="launch-recipes"/);
  assert.match(launchJs,/function applyLaunchRecipe\(id\)/);
  assert.match(launchJs,/launchRecipe:selectedRecipe/);
  assert.equal(/(^|[^$])\$\('\.wizard-step'\)\.forEach/m.test(launchJs),false);
  assert.equal(/(^|[^$])\$\('\.experience-choice'\)\.forEach/m.test(launchJs),false);
  assert.match(launchJs,/\$\$\('\.wizard-step'\)\.forEach/);
});

test('REX returns evidence signals and never a fake overall safety score',()=>{
  const out=buildRexTokenIntelligence({
    chain:'solana',tokenId:'ExampleMint',checkedAt:'2026-10-02T00:00:00.000Z',
    evidence:{mintAuthorityActive:false,freezeAuthorityActive:false,top10HolderPercent:61,maliciousLinks:true}
  });
  assert.equal(out.overallSafetyRating,null);
  assert.equal(out.signals.find(x=>x.id==='HOLDER_CONCENTRATION').status,'REVIEW_REQUIRED');
  assert.equal(out.signals.find(x=>x.id==='MALICIOUS_LINKS').status,'BLOCK');
  assert.match(out.rule,/never converts them into an unsupported overall SAFE score/);
});

test('Trust Orbit exposes REX and creator history as evidence, not guarantees',()=>{
  assert.match(trustHtml,/REX SecureGuard/);
  assert.match(trustHtml,/Creator History Evidence/);
  assert.match(trustJs,/buildRexSignals/);
  assert.match(trustJs,/Creator-selling history is not inferred/);
});

test('transaction support refuses to turn supplied context into confirmation',()=>{
  assert.match(txHelp,/manually supplied context never upgrades a transaction to WorldzProof CONFIRMED/);
  assert.match(txHelp,/Do not label it successful yet/);
  assert.match(txHelp,/Never send a seed phrase, private key, recovery phrase or wallet password/);
});

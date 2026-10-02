const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'worldzpad-omnichain/research-led-product-policy.v1.json'), 'utf8'));
const omni = JSON.parse(fs.readFileSync(path.join(root, 'worldzpad-omnichain/worldz-omnichain.v1.json'), 'utf8'));

test('research standard keeps the four evidence questions', () => {
  assert.deepEqual(policy.researchStandard.requiredQuestions, [
    'WHAT_DID_THEY_BUILD',
    'WHAT_DID_THEIR_USERS_WISH_THEY_BUILT',
    'WHAT_DOES_THE_BLOCKCHAIN_PROVE',
    'WHAT_OPPORTUNITY_DID_THEY_LEAVE_BEHIND'
  ]);
});

test('chain culture is preserved instead of flattened', () => {
  for (const key of ['solana','xrpl','bitcoin','ethereumAndEvm','sui','hyperliquid']) {
    assert.ok(Array.isArray(policy.chainCultureRule[key]) && policy.chainCultureRule[key].length > 0, key);
  }
  assert.equal(policy.chainCultureRule.statement.startsWith('Connected, not erased.'), true);
});

test('success requires chain confirmation', () => {
  assert.equal(policy.experience.successRequiresChainConfirmation, true);
  assert.equal(policy.launchUX.noFalseMainnetClaims, true);
});

test('gambling-style launch models stay prohibited', () => {
  for (const item of ['JACKPOT','LOTTERY','POWERBALL']) assert.ok(policy.prohibitedProductModels.includes(item));
});

test('omnichain config points at research-led product policy', () => {
  assert.equal(omni.policyPaths.researchLedProduct, 'worldzpad-omnichain/research-led-product-policy.v1.json');
});

const launchHtml = fs.readFileSync(path.join(root, 'launchpad.cryptoworldz.xyz/index.html'), 'utf8');
const launchJs = fs.readFileSync(path.join(root, 'launchpad.cryptoworldz.xyz/app.js'), 'utf8');

test('launchpad ships Beginner and Pro experience entry', () => {
  assert.match(launchHtml, /id="experience-mode"/);
  assert.match(launchHtml, /NEW TO CRYPTO/);
  assert.match(launchHtml, /I KNOW CRYPTO/);
  assert.match(launchJs, /function setExperienceMode\(mode\)/);
});

test('launchpad preserves XRP-native guidance', () => {
  assert.match(launchJs, /XRPWorldz: native XRPL DEX, AMM, issuer controls/);
  assert.match(launchJs, /Submitted is not confirmed/);
});

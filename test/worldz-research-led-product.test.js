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

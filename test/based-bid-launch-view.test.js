const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'public/miniapp/based-bid-launch-view.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/miniapp/index.html'), 'utf8');

test('Mini App loads the Based.bid Ultimate launch packet view', () => {
  assert.ok(html.includes('/miniapp/based-bid-launch-view.js?v=1.0.0'));
  assert.ok(script.includes('/api/mini/auto/ultimate'));
  assert.ok(script.includes('Based.bid Launch Packet'));
});

test('launch view presents conservative launch and fee history settings', () => {
  for (const required of [
    'Meteora v5',
    'History rule:',
    '1.00% initial',
    '0.75% after 100 completed trades',
    '0.50% after 500 completed trades',
    'Programmatic Based.bid launch API is not verified',
  ]) assert.ok(script.includes(required), `missing launch-view safety text: ${required}`);
});

test('launch view keeps final Based.bid execution and signing external', () => {
  assert.ok(script.includes('cannot auto-launch or auto-sign'));
  assert.ok(script.includes('Final execution remains in the external Based.bid/wallet flow'));
});
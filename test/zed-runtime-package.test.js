const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { completeManifest } = require('../.github/complete-zed-runtime-manifest.cjs');
const { loadConfig } = require('../src/config');

test('release includes transitive local JSON dependencies omitted by the old upload list', () => {
  const root = path.join(__dirname, '..');
  const entries = fs.readdirSync(path.join(root, 'src'), { recursive: true })
    .filter(file => file.endsWith('.js')).map(file => 'src/' + file);
  const files = completeManifest(root, entries);
  for (const required of [
    'config/worldz-votes/global-public-voice.v1.json',
    'worldzpad-mainnet/payments/worldzpay-checkout.v1.json',
    'worldzpad-mainnet/payments/worldzpay-providers.v1.json',
    'worldzpad-mainnet/payments/worldzpay-treasury.v1.json',
    'launchpad.cryptoworldz.xyz/worldz-app/core/treasury-profiles.json'
  ]) assert.ok(files.includes(required), required);
  assert.ok(!files.some(file => file.endsWith('.env')));
});

test('missing local dependency stops packaging before upload', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zed-manifest-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'index.js'), 'require("./missing.json");');
  assert.throws(() => completeManifest(root, ['index.js']), /Cannot find module/);
});

test('runtime accepts the same server credential aliases as deployment', () => {
  for (const alias of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_SECRET_KEY']) {
    const config = loadConfig({ BOT_TOKEN: 'test-token', SUPABASE_SERVICE_ROLE_KEY: ' ', [alias]: ' server-test-key ' });
    assert.equal(config.supabaseApiKey, 'server-test-key');
    assert.equal(config.usingServiceRole, true);
  }
  assert.equal(loadConfig({ BOT_TOKEN: 'test-token' }).usingServiceRole, false);
});

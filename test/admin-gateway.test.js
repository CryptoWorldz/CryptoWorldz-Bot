const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'public/miniapp/admin-gateway.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/miniapp/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/miniapp/admin-gateway.css'), 'utf8');

test('Admin Centre exposes exactly five memorable gateway sections', () => {
  for (const id of ['ultimate', 'operations', 'raaiiidds', 'team', 'points']) {
    assert.match(script, new RegExp(`id: '${id}'`));
  }
  assert.equal((script.match(/id: '(ultimate|operations|raaiiidds|team|points)'/g) || []).length, 5);
});

test('Admin gateway preserves existing operational controls by grouping instead of replacing them', () => {
  for (const existingId of ['auto-owner-panel', 'mission-create', 'points-rule', 'executive-admin-panel', 'admin-team', 'admin-permission', 'admin-submissions']) {
    assert.ok(script.includes(existingId), `missing preserved control mapping: ${existingId}`);
  }
  assert.ok(script.includes("worldzcast-root"));
  assert.ok(!script.includes('.remove()'), 'gateway must not delete existing admin controls');
});

test('Admin gateway assets are loaded from the Mini App shell', () => {
  assert.ok(html.includes('/miniapp/admin-gateway.css?v=1.0.0'));
  assert.ok(html.includes('/miniapp/admin-gateway.js?v=1.0.0'));
  assert.ok(css.includes('.admin-gateway-nav'));
  assert.ok(css.includes('.admin-gateway-empty'));
});
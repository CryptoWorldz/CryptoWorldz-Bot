const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveTeamRole } = require('../src/profile-role');

test('shows Grace Controller separately from Legend rank', async () => {
  const repository = {
    getAdminAccess: async () => ({ authorized: true, role: 'grace_manager', permissions: ['grace.view'] })
  };
  const role = await resolveTeamRole({
    telegramId: 5457233387,
    repository,
    config: { adminTelegramIds: new Set(), ownerTelegramId: '8029135300' },
    supabase: null
  });
  assert.deepEqual(role, {
    title: 'Grace Controller',
    responsibility: 'Social Communications & Engagement'
  });
});

test('shows permanent owner role', async () => {
  const repository = {
    getAdminAccess: async () => ({ authorized: true, role: 'owner', permissions: [] })
  };
  const role = await resolveTeamRole({
    telegramId: 8029135300,
    repository,
    config: { adminTelegramIds: new Set(), ownerTelegramId: '8029135300' },
    supabase: null
  });
  assert.equal(role.title, 'Permanent Owner');
});

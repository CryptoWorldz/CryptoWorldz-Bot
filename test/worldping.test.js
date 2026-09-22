const test = require("node:test");
const assert = require("node:assert/strict");
const { commercialConfig, isGroup } = require("../src/worldping");

test("WorldPing uses the locked SOL commercial pricing", () => {
  const config = commercialConfig({});
  assert.equal(config.rentSol, 0.3);
  assert.equal(config.rentToOwnSol, 0.5);
  assert.equal(config.rentToOwnMonths, 12);
  assert.equal(config.ownSol, 4.5);
  assert.equal(config.wallet, "Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u");
});

test("WorldPing is limited to Telegram groups", () => {
  assert.equal(isGroup({ chat: { type: "supergroup" } }), true);
  assert.equal(isGroup({ chat: { type: "group" } }), true);
  assert.equal(isGroup({ chat: { type: "private" } }), false);
});

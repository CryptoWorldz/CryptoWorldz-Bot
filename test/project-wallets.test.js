const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PURPOSES,
  formatAud,
  parseInvestmentFunding
} = require("../src/project-wallets");

test("four separate project wallet purposes remain fixed", () => {
  assert.deepEqual(PURPOSES, ["dev", "investment", "treasury", "rewards"]);
});

test("investment funding parser accepts an AUD allocation, USDC amount and Solana signature", () => {
  const signature = "5".repeat(64);
  assert.deepEqual(parseInvestmentFunding(`40 | 26.15 | ${signature}`), {
    ok: true,
    audCents: 4000,
    usdc: 26.15,
    signature
  });
  assert.equal(parseInvestmentFunding(`200 | 140 | ${signature}`).ok, true);
  assert.equal(parseInvestmentFunding(`201 | 140 | ${signature}`).ok, false);
  assert.equal(parseInvestmentFunding("40 | 26.15 | bad").ok, false);
});

test("AUD values are formatted for owner funding controls", () => {
  assert.equal(formatAud(10000), "AUD $100.00");
  assert.equal(formatAud(20000), "AUD $200.00");
});

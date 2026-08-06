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
  assert.equal(parseInvestmentFunding(`101 | 70 | ${signature}`).ok, false);
  assert.equal(parseInvestmentFunding("40 | 26.15 | bad").ok, false);
});

test("AUD values are formatted for the owner funding plan", () => {
  assert.equal(formatAud(10000), "AUD $100.00");
});

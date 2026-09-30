const test = require("node:test");
const assert = require("node:assert/strict");
const { bestPair, parseScanTarget, scanWarnings } = require("../src/worldzscan");

test("WorldzScan parses default Solana and explicit chains", () => {
  assert.deepEqual(parseScanTarget("ABC"), { chain: "solana", address: "ABC" });
  assert.deepEqual(parseScanTarget("base 0x123"), { chain: "base", address: "0x123" });
  assert.deepEqual(parseScanTarget("ethereum:0xabc"), { chain: "ethereum", address: "0xabc" });
});

test("WorldzScan selects the deepest observed DEX pair", () => {
  const pair = bestPair([{ liquidity:{usd:10} },{ liquidity:{usd:500} },{ liquidity:{usd:100} }]);
  assert.equal(pair.liquidity.usd, 500);
});

test("WorldzScan authority evidence is described as indicators", () => {
  const rows = scanWarnings({
    chain:"solana",
    mint:{ mintAuthority:null, freezeAuthority:"AUTH", largestObservedTokenAccountPercent:25 },
    pair:{ liquidity:{usd:500} }
  });
  assert.ok(rows.some((row) => row.includes("Mint authority absent")));
  assert.ok(rows.some((row) => row.includes("Freeze authority")));
  assert.ok(rows.some((row) => row.includes("Largest observed token account")));
  assert.ok(rows.some((row) => row.includes("under $1,000")));
});

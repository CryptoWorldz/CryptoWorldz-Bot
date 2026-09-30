const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeMarketEvent, timingSafeEqualText } = require("../src/market-alerts");

test("market ingest normalizes a real provider event shape", () => {
  const event = normalizeMarketEvent({
    provider:"indexer",
    event_key:"tx-1",
    chain:"solana",
    token_address:"MINT",
    token_symbol:"wldz",
    side:"buy",
    usd_value:1500,
    wallet_address:"WALLET",
    tx_signature:"SIG",
    observed_at:"2026-10-01T00:00:00Z"
  });
  assert.equal(event.side, "buy");
  assert.equal(event.tokenSymbol, "WLDZ");
  assert.equal(event.usdValue, 1500);
});

test("market ingest rejects unsupported event types", () => {
  assert.equal(normalizeMarketEvent({ event_key:"x", chain:"solana", token_address:"MINT", side:"fake_buy" }), null);
});

test("shared-secret comparison requires an exact non-empty match", () => {
  assert.equal(timingSafeEqualText("abc","abc"), true);
  assert.equal(timingSafeEqualText("abc","abd"), false);
  assert.equal(timingSafeEqualText("",""), false);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { mapFullscopeBuyCandidates } = require("../src/auto/fullscope-candidates");
const MINT = "2DqyvXv7Bf2GdJjZ7QiY3Gm6hjx8Hf5tABcDEFaTpbn";
const token = (symbol, changes = {}) => ({chain_key:"solana",symbol,contract_address:MINT,status:"live",enabled:true,...changes});
const allow = [{network:"solana",token_mint:MINT,status:"allowlisted"}];

test("approved Solana token is only a read-only candidate", () => {
  const result=mapFullscopeBuyCandidates([token("WORLDZ")],allow);
  assert.equal(result[0].eligible_for_owner_dca,true);
  assert.deepEqual(result[0].reasons,[]);
});
test("retired WLDZ and RVIV are blocked even if database says live and allowlisted",()=>{
  for (const symbol of ["WLDZ","RVIV"]) {
    const result=mapFullscopeBuyCandidates([token(symbol)],allow);
    assert.equal(result[0].eligible_for_owner_dca,false);
    assert.ok(result[0].reasons.includes("retired_legacy_symbol"));
  }
});
test("unknown, disabled and cross-chain tokens cannot be auto-approved",()=>{
  const rows=mapFullscopeBuyCandidates([token("WORLDZ"),token("XRP",{chain_key:"xrpl"}),token("OLD",{enabled:false}),token("MISSING",{contract_address:""})],[]);
  assert.ok(rows.every(row=>!row.eligible_for_owner_dca));
  assert.ok(rows[0].reasons.includes("not_owner_allowlisted"));
  assert.ok(rows[1].reasons.includes("unsupported_auto_chain"));
  assert.ok(rows[2].reasons.includes("not_live_and_enabled"));
  assert.ok(rows[3].reasons.includes("missing_or_invalid_mint"));
});

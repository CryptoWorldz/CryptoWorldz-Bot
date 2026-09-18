const test = require("node:test");
const assert = require("node:assert/strict");
const { solanaPayUri, verifySolanaContribution } = require("../src/solana");

const signature = "5".repeat(88);
const recipient = "CFzJU62m9obkMKAMjSnQPVkwYrVmHJqQhySURj5MeSy";

test("Solana Pay links contain the recipient, asset and amount", () => {
  const sol = solanaPayUri({ recipient, asset: "SOL", amount: 0.25, usdcMint: "mint" });
  const usdc = solanaPayUri({ recipient, asset: "USDC", amount: 10, usdcMint: "mint" });
  assert.match(sol, /^solana:CFz/); assert.match(sol, /amount=0.25/); assert.doesNotMatch(sol, /spl-token/);
  assert.match(usdc, /amount=10/); assert.match(usdc, /spl-token=mint/);
});

test("finalized SOL verification calculates only the configured recipient increase", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ result: { slot: 123, blockTime: 10, meta: { err: null, preBalances: [1000000000, 0], postBalances: [899995000, 100000000] }, transaction: { message: { accountKeys: [{ pubkey: "sender", signer: true }, { pubkey: recipient, signer: false }] } } } }) });
  const result = await verifySolanaContribution({ signature, asset: "SOL", recipient, rpcUrl: "https://rpc.example", usdcMint: "mint", fetchImpl });
  assert.equal(result.amount, 0.1); assert.equal(result.slot, 123); assert.equal(result.sender, "sender");
});

test("verification rejects a transaction that did not pay the Kitty", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ result: { slot: 1, meta: { err: null, preBalances: [1], postBalances: [1] }, transaction: { message: { accountKeys: [recipient] } } } }) });
  await assert.rejects(() => verifySolanaContribution({ signature, asset: "SOL", recipient, rpcUrl: "x", usdcMint: "mint", fetchImpl }), /no_matching_transfer/);
});

const SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

function accountKey(value) {
  return typeof value === "string" ? value : value && (value.pubkey || value.toString());
}

function tokenAmount(balance) {
  return Number(balance && balance.uiTokenAmount && balance.uiTokenAmount.uiAmountString) || 0;
}

async function verifySolanaContribution({ signature, asset, recipient, rpcUrl, usdcMint, fetchImpl = fetch }) {
  if (!SIGNATURE_PATTERN.test(String(signature || ""))) throw new Error("invalid_signature");
  if (!['SOL', 'USDC'].includes(asset)) throw new Error("invalid_asset");
  const response = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction", params: [signature, { commitment: "finalized", encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }] })
  });
  if (!response.ok) throw new Error("rpc_unavailable");
  const payload = await response.json();
  const transaction = payload && payload.result;
  if (!transaction || transaction.meta && transaction.meta.err) throw new Error("transaction_not_confirmed");
  const keys = transaction.transaction.message.accountKeys.map(accountKey);
  let amount = 0;
  if (asset === "SOL") {
    const index = keys.indexOf(recipient);
    if (index < 0) throw new Error("wrong_recipient");
    amount = ((transaction.meta.postBalances[index] || 0) - (transaction.meta.preBalances[index] || 0)) / 1e9;
  } else {
    const before = (transaction.meta.preTokenBalances || []).filter((item) => item.mint === usdcMint && item.owner === recipient).reduce((sum, item) => sum + tokenAmount(item), 0);
    const after = (transaction.meta.postTokenBalances || []).filter((item) => item.mint === usdcMint && item.owner === recipient).reduce((sum, item) => sum + tokenAmount(item), 0);
    amount = after - before;
  }
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("no_matching_transfer");
  const sender = accountKey((transaction.transaction.message.accountKeys || []).find((key) => key && typeof key === "object" && key.signer)) || keys[0] || null;
  return { signature, asset, amount, recipient, sender, slot: transaction.slot, blockTime: transaction.blockTime || null };
}

function solanaPayUri({ recipient, asset, amount, usdcMint, label = "CryptoWorldz Community Kitty" }) {
  const params = new URLSearchParams({ label, message: `CryptoWorldz ${asset} Community Kitty contribution` });
  if (amount) params.set("amount", String(amount));
  if (asset === "USDC") params.set("spl-token", usdcMint);
  return `solana:${recipient}?${params}`;
}

module.exports = { SIGNATURE_PATTERN, solanaPayUri, verifySolanaContribution };

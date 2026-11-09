// WORLDZ Wallet ↔ AUTO: read-only public-address readiness bridge.
// No signing, order creation, wallet linking, token approvals, or execution.
(function () {
  "use strict";
  const ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  function status(ownerDca = {}) {
    const wallet = window.WorldzWalletConnect;
    const session = wallet && typeof wallet.loadSession === "function" ? wallet.loadSession() : null;
    const connections = Array.isArray(session?.walletConnections) ? session.walletConnections : [];
    const solana = connections.filter(item => item.chain === "solana" && ADDRESS.test(String(item.publicAddress || "")));
    const expected = String(ownerDca.wallet_address || "").trim();
    const matching = solana.find(item => item.publicAddress === expected);
    const locked = ownerDca.enabled !== true || ownerDca.execution_enabled !== true ||
      ownerDca.paused !== false || ownerDca.emergency_stop !== false;
    return Object.freeze({
      schema: "WORLDZ-WALLET-AUTO-READONLY-V1",
      connectedSolanaWallets: solana.map(item => ({ publicAddress: item.publicAddress, provider: item.provider || "unknown" })),
      ownerWalletMatch: Boolean(expected && matching),
      autoLocked: locked,
      signingAvailable: false,
      canExecuteBuy: false,
      ownerApprovalRequired: true,
      note: "Public wallet connection is not transaction signing or AUTO execution authorization."
    });
  }
  window.WorldzWalletAutoBridge = Object.freeze({ status });
})();

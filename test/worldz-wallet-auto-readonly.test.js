const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "../launchpad.cryptoworldz.xyz/worldz-app");
const bridgeCode = fs.readFileSync(path.join(root, "wallet-auto-bridge.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const MINT = "2DqyvXv7Bf2GdJjZ7QiY3Gm6hjx8Hf5tABcDEFaTpbn";
function bridge(connections) {
  const window = { WorldzWalletConnect: { loadSession: () => ({walletConnections: connections}) } };
  vm.runInNewContext(bridgeCode, {window});
  return window.WorldzWalletAutoBridge;
}
test("Wallet bridge never grants signing or trading even on address match", () => {
  const api=bridge([{chain:"solana",publicAddress:MINT,provider:"Phantom"}]);
  const state=api.status({wallet_address:MINT,enabled:true,execution_enabled:true,paused:false,emergency_stop:false});
  assert.equal(state.ownerWalletMatch,true);
  assert.equal(state.canExecuteBuy,false);
  assert.equal(state.signingAvailable,false);
  assert.equal(state.ownerApprovalRequired,true);
});
test("Wallet bridge defaults to locked and rejects unrecognized public addresses", () => {
  const state=bridge([{chain:"solana",publicAddress:"bad"}]).status();
  assert.equal(state.autoLocked,true);
  assert.equal(state.connectedSolanaWallets.length,0);
  assert.equal(state.ownerWalletMatch,false);
});
test("WorldzApp loads bridge before app and renders readiness in existing wallet panel",()=>{
  assert.match(html,/id="wallet-auto-readiness"/);
  assert.ok(html.indexOf("wallet-auto-bridge.js") < html.indexOf("/worldz-app/app.js"));
  assert.match(app,/renderWalletAutoReadiness\(\)/);
  assert.match(app,/AUTO trading remains unlinked and locked/);
});

(() => {
  const telegram = window.Telegram && window.Telegram.WebApp;
  const initData = telegram ? telegram.initData : "";
  const byId = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
  const shorten = (value) => value && value.length > 20 ? `${value.slice(0, 8)}…${value.slice(-8)}` : value;
  const icon = (purpose) => ({ dev: "🛠️", treasury: "🏦", rewards: "🎁" })[purpose] || "👛";

  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
    if (!response.ok) {
      const error = new Error(payload.error || "request_failed");
      error.code = payload.error || "request_failed";
      throw error;
    }
    return payload;
  }

  function notify(message) {
    if (telegram && telegram.showAlert) telegram.showAlert(message);
    else window.alert(message);
  }

  function impactPanel() {
    return `
      <div class="section-title contribution-heading"><h2>💜 Help People First</h2></div>
      <article class="panel profile-impact-card">
        <small>FEATURED GOFUNDME</small>
        <h3>Help Reagan Feed 60 Orphaned Children in Uganda</h3>
        <p>Food, medical care, rent, hygiene, education and safer mattresses for children in Reagan's care.</p>
        <a class="button impact-donate" href="https://gofund.me/65129e58a" target="_blank" rel="noopener">Donate securely on GoFundMe</a>
      </article>`;
  }

  function walletCard(wallet) {
    const active = wallet.status === "active" && wallet.public_address;
    if (!active) {
      return `<article class="panel project-wallet-card pending-wallet">
        <small>${escapeHtml(wallet.wallet_type === "multisig" ? "MULTISIG SETUP" : "OWNER WALLET SETUP")}</small>
        <h3>${icon(wallet.purpose)} ${escapeHtml(wallet.label)}</h3>
        <p>${escapeHtml(wallet.notes || wallet.control_policy)}</p>
        <div class="wallet-pending">Address setup pending</div>
      </article>`;
    }

    const assets = Array.isArray(wallet.accepted_assets) ? wallet.accepted_assets : ["USDC", "SOL"];
    return `<article class="panel project-wallet-card" data-purpose="${escapeHtml(wallet.purpose)}">
      <small>${escapeHtml(wallet.wallet_type === "multisig" ? "COMMUNITY MULTISIG" : "OWNER-CONTROLLED WALLET")}</small>
      <h3>${icon(wallet.purpose)} ${escapeHtml(wallet.label)}</h3>
      <p>${escapeHtml(wallet.notes || wallet.control_policy)}</p>
      <div class="kitty-address"><span>Public Solana Address</span><code title="${escapeHtml(wallet.public_address)}">${escapeHtml(shorten(wallet.public_address))}</code></div>
      <label>Contribution Asset
        <select class="project-wallet-asset">${assets.map((asset) => `<option>${escapeHtml(asset)}</option>`).join("")}</select>
      </label>
      <label>Contribution Amount
        <input class="project-wallet-amount" inputmode="decimal" type="number" min="0" step="any" placeholder="Optional amount">
      </label>
      <img class="payment-qr project-wallet-qr-image" alt="Contribution payment QR" hidden>
      <button class="button project-wallet-qr" type="button">Generate Secure QR</button>
      <button class="button secondary project-wallet-copy" type="button" data-address="${escapeHtml(wallet.public_address)}">Copy Address</button>
      <label>Transaction Signature
        <input class="project-wallet-signature" placeholder="Paste signature after sending">
      </label>
      <button class="button secondary project-wallet-claim" type="button">Verify Contribution</button>
    </article>`;
  }

  async function renderWallets() {
    const impact = byId("profile-impact");
    const target = byId("profile-contributions");
    if (!impact || !target) return;
    impact.innerHTML = impactPanel();
    target.innerHTML = `<div class="panel loading"><div class="orb"></div><p>Loading contribution wallets…</p></div>`;
    try {
      const payload = await request("/api/mini/project-wallets");
      const wallets = (payload.wallets || []).filter((wallet) => wallet.contribution_enabled);
      target.innerHTML = `
        <div class="section-title contribution-heading"><h2>🌍 Choose Your Contribution</h2></div>
        <div class="panel contribution-intro">
          <p>Support the Treasury, Reward Wallet or Dev & Launch Wallet. Contributions are voluntary and do not earn Legend Points.</p>
          <p>USDC is preferred for stable accounting. SOL is also available where shown.</p>
        </div>
        ${wallets.length ? wallets.map(walletCard).join("") : `<div class="panel empty">Contribution wallets are being prepared.</div>`}
        <div class="panel security"><p>⚠️ Zed only displays public addresses and verifies public transactions. Never enter a seed phrase or private key.</p></div>`;
    } catch (error) {
      target.innerHTML = `<div class="panel empty">Contribution wallets could not be loaded securely.</div>`;
    }
  }

  document.addEventListener("click", async (event) => {
    const card = event.target.closest(".project-wallet-card");
    if (!card) return;
    const purpose = card.dataset.purpose;
    if (!purpose) return;
    const asset = card.querySelector(".project-wallet-asset")?.value || "USDC";
    const amount = card.querySelector(".project-wallet-amount")?.value || "";

    if (event.target.closest(".project-wallet-copy")) {
      const address = event.target.closest(".project-wallet-copy").dataset.address;
      try {
        await navigator.clipboard.writeText(address);
        notify("Public wallet address copied.");
      } catch {
        notify(address);
      }
      return;
    }

    if (event.target.closest(".project-wallet-qr")) {
      try {
        const query = new URLSearchParams({ asset });
        if (amount) query.set("amount", amount);
        const response = await fetch(`/api/mini/project-wallets/${encodeURIComponent(purpose)}/qr?${query}`, {
          headers: { "X-Telegram-Init-Data": initData }
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "qr_failed");
        }
        const image = card.querySelector(".project-wallet-qr-image");
        image.src = URL.createObjectURL(await response.blob());
        image.hidden = false;
      } catch (error) {
        notify(error.message === "wallet_setup_pending" ? "This wallet address is still being prepared." : "Secure QR generation failed.");
      }
      return;
    }

    if (event.target.closest(".project-wallet-claim")) {
      const signature = card.querySelector(".project-wallet-signature")?.value.trim() || "";
      if (!signature) return notify("Paste the Solana transaction signature first.");
      try {
        const payload = await request(`/api/mini/project-wallets/${encodeURIComponent(purpose)}/claim`, {
          method: "POST",
          body: JSON.stringify({ asset, signature })
        });
        notify(`Contribution verified: ${payload.contribution.amount} ${payload.contribution.asset}. Thank you 💜`);
        card.querySelector(".project-wallet-signature").value = "";
      } catch (error) {
        const messages = {
          transaction_already_claimed: "That transaction has already been verified.",
          registration_required: "Register with Zed before verifying a contribution.",
          wrong_recipient: "That transaction was not sent to this wallet.",
          transaction_not_confirmed: "That transaction is not finalized yet."
        };
        notify(messages[error.code] || "Contribution verification failed. Check the asset and transaction signature.");
      }
    }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderWallets);
  else renderWallets();
})();

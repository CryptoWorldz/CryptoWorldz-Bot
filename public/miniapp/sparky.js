(() => {
  "use strict";
  const PROFILE = Object.freeze({
    id: "sparky",
    displayName: "SPARKY™",
    title: "WORLDZ DUDE",
    role: "Command Centre QA + Troubleshooting Helper",
    avatar: "/miniapp/assets/dipshit-worldz-dude.svg",
    authority: Object.freeze({
      walletSigning: false,
      treasury: false,
      governanceExecution: false,
      mainnetBroadcast: false
    })
  });

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  function render() {
    const root = document.getElementById("sparky-worldz-dude");
    if (!root || root.dataset.ready === "1") return;
    root.dataset.ready = "1";
    root.innerHTML = `<article class="panel sparky-card">
      <style>
        .sparky-card{display:grid;grid-template-columns:92px 1fr;gap:16px;align-items:center;overflow:hidden}
        .sparky-card img{width:92px;height:92px;border-radius:24px;object-fit:cover;border:1px solid rgba(122,226,255,.7);box-shadow:0 0 24px rgba(22,141,255,.28)}
        .sparky-card h3{margin:.12rem 0;font-size:1.35rem}.sparky-card p{margin:.3rem 0}
        .sparky-card .sparky-badge{display:inline-flex;padding:4px 9px;border-radius:999px;border:1px solid rgba(122,226,255,.42);font-size:11px;font-weight:900;letter-spacing:.08em}
        .sparky-card .sparky-safety{grid-column:1/-1;margin-top:2px;padding:10px 12px;border-radius:12px;background:rgba(17,80,154,.16);font-size:12px}
        .sparky-card .sparky-check{grid-column:1/-1}.sparky-card .sparky-output{grid-column:1/-1;margin:0;white-space:pre-wrap}
        .sparky-quick{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:8px}.sparky-quick .button{margin:0}
        .sparky-start{grid-column:1/-1;padding:12px;border-radius:14px;background:linear-gradient(135deg,rgba(54,162,255,.18),rgba(156,77,255,.18));border:1px solid rgba(122,226,255,.28)}
        .sparky-start b{display:block;margin-bottom:5px}.sparky-start small{color:var(--muted)}
        @media(max-width:480px){.sparky-card{grid-template-columns:72px 1fr}.sparky-card img{width:72px;height:72px;border-radius:19px}.sparky-quick{grid-template-columns:1fr}}
      </style>
      <img src="${PROFILE.avatar}" alt="Blue WORLDZ DUDE profile for SPARKY">
      <div><span class="sparky-badge">SYSTEM DUDE • NO SIGNING AUTHORITY</span><h3>🔵 ${escapeHtml(PROFILE.displayName)} — ${escapeHtml(PROFILE.title)}</h3><p>${escapeHtml(PROFILE.role)}</p><small>Find the dumb little problems before they become expensive big ones.</small></div>
      <div class="sparky-start"><b>😵‍💫 LOST? START HERE.</b><small>You only need Profile → Wallet → Raid to get going. Sparky can explain anything else in plain English.</small></div>
      <div class="sparky-quick">
        <button class="button" type="button" data-open="profile">🏆 MY PROFILE</button>
        <button class="button" type="button" data-open="raids">🤠 RAID NOW</button>
        <a class="button secondary" href="https://launchpad.cryptoworldz.xyz/" target="_blank" rel="noopener">🚀 WORLDZLAUNCH</a>
        <button class="button secondary sparky-ask" type="button">💙 ASK SPARKY</button>
      </div>
      <div class="sparky-safety">Guide + QA helper only • no wallet signing • no treasury control • no governance execution • no mainnet broadcast.</div>
      <button class="button secondary sparky-check" type="button">🧪 Run System Check</button>
      <pre class="sparky-output hidden" aria-live="polite"></pre>
    </article>`;

    const askButton = root.querySelector(".sparky-ask");
    askButton?.addEventListener("click", () => {
      const url = "https://t.me/SparkyBossBot?start=guide_command";
      if (window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(url);
      else window.open(url, "_blank", "noopener");
    });

    const button = root.querySelector(".sparky-check");
    const output = root.querySelector(".sparky-output");
    button.addEventListener("click", () => {
      const telegram = Boolean(window.Telegram?.WebApp?.initData);
      const checks = [
        ["Mini App DOM", true],
        ["Browser online", navigator.onLine],
        ["Telegram session", telegram],
        ["Secure HTTPS", location.protocol === "https:"],
        ["Wallet signing authority", PROFILE.authority.walletSigning],
        ["Treasury authority", PROFILE.authority.treasury]
      ];
      output.classList.remove("hidden");
      output.textContent = checks.map(([name, ok]) => {
        if (name.includes("authority")) return `✅ ${name}: NONE (correct)`;
        return `${ok ? "✅" : "⚠️"} ${name}: ${ok ? "OK" : "CHECK"}`;
      }).join("\n") + `\n🕒 ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}`;
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, { once: true });
  else render();
})();

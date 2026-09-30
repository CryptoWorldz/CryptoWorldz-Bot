(() => {
  const tg = window.Telegram && window.Telegram.WebApp;
  const root = () => document.getElementById("community-suite-root");

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[char]));
  }

  function chatId() {
    const value = tg?.initDataUnsafe?.chat?.id;
    return Number.isSafeInteger(Number(value)) ? Number(value) : null;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      cache: "no-store",
      ...options,
      headers: {
        "content-type": "application/json",
        "x-telegram-init-data": tg?.initData || "",
        ...(options.headers || {})
      }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  }

  function packageName(value) {
    return value === "operations" ? "Operations Bot" :
      value === "ai" ? "Custom AI Community Bot" :
      value === "full" ? "Full 2-Bot Suite" : "Not selected";
  }

  function planName(value) {
    return value === "trial" ? "Starter Trial" :
      value === "rent" ? "Rent" :
      value === "rent_to_own" ? "Rent-to-Own" :
      value === "own" ? "Own" : "Not active";
  }

  function moduleCards(data) {
    return (data.modules || []).map((item) => `
      <article class="panel">
        <div class="form-row">
          <div>
            <p class="eyebrow">MODULE</p>
            <h3>${escapeHtml(item.module_key.replace(/_/g, " "))}</h3>
          </div>
          <button class="button ${item.enabled ? "" : "secondary"} suite-module-toggle"
            data-module="${escapeHtml(item.module_key)}"
            data-enabled="${item.enabled ? "1" : "0"}">
            ${item.enabled ? "✅ ON" : "⬜ OFF"}
          </button>
        </div>
      </article>
    `).join("");
  }

  function render(data) {
    const node = root();
    if (!node) return;
    const group = data.group || {};
    const brand = data.branding || {};
    const licence = data.licence || {};
    const counts = data.counts || {};
    node.innerHTML = `
      <article class="panel">
        <p class="eyebrow">WORLDZ FULLBUILD™ COMMUNITY SUITE</p>
        <h3>${escapeHtml(group.display_name || "Customer Community")}</h3>
        <p>${escapeHtml(packageName(licence.product_package || group.product_package))} • ${escapeHtml(planName(licence.plan))}</p>
        <p>Brand: ${escapeHtml(brand.mode || "worldz_theme")} • ${escapeHtml(brand.theme_key || "purple_galaxy")}</p>
        <p>Language: ${escapeHtml(group.language_code || "en")} • Network: ${escapeHtml(group.network_key || "standalone")}</p>
        <p>LaunchPad: ${escapeHtml(group.launchpad_project_slug || "not linked")}</p>
      </article>

      <section class="stats-grid">
        <article><span>📥</span><strong>${Number(counts.open_tickets || 0)}</strong><small>Open Tickets</small></article>
        <article><span>👛</span><strong>${Number(counts.watched_wallets || 0)}</strong><small>Wallet Watches</small></article>
        <article><span>🐋</span><strong>${Number(counts.market_alerts || 0)}</strong><small>Market Alerts</small></article>
        <article><span>📅</span><strong>${Number(counts.upcoming_events || 0)}</strong><small>Upcoming Events</small></article>
      </section>

      <article class="panel security">
        <b>Emergency Control</b>
        <p>Lockdown pauses optional campaign, market, giveaway and automation modules while REX, ALICE and Inbox remain available.</p>
        <button id="suite-lockdown" class="button ${group.emergency_lockdown ? "" : "secondary"}"
          data-enabled="${group.emergency_lockdown ? "1" : "0"}">
          ${group.emergency_lockdown ? "🚨 LOCKDOWN ON — TAP TO RELEASE" : "✅ Lockdown Off — Tap to Lock"}
        </button>
      </article>

      <div class="section-title"><h2>🧩 Modules</h2></div>
      <div id="suite-modules">${moduleCards(data)}</div>
    `;
  }

  async function load() {
    const node = root();
    if (!node) return;
    const id = chatId();
    if (!id) {
      node.innerHTML = '<article class="panel security"><b>Open from a customer group</b><p>The Community Suite control panel needs Telegram group context. Open Command Centre from the group, or use /suite and /modules in Telegram.</p></article>';
      return;
    }
    node.innerHTML = '<article class="panel loading"><div class="orb"></div><p>Opening Community Suite…</p></article>';
    try {
      render(await api(`/api/mini/community-suite?chat_id=${encodeURIComponent(id)}`));
    } catch (error) {
      node.innerHTML = `<article class="panel security"><b>Community Suite unavailable</b><p>${escapeHtml(error.message)}</p><p>Group admin access is required.</p></article>`;
    }
  }

  document.addEventListener("click", async (event) => {
    const toggle = event.target.closest(".suite-module-toggle");
    if (toggle) {
      const id = chatId();
      if (!id) return;
      toggle.disabled = true;
      try {
        await api("/api/mini/community-suite/module", {
          method:"POST",
          body:JSON.stringify({
            chat_id:id,
            module_key:toggle.dataset.module,
            enabled:toggle.dataset.enabled !== "1"
          })
        });
        await load();
      } catch (error) {
        if (tg?.showAlert) tg.showAlert(`Module update failed: ${error.message}`);
      } finally {
        toggle.disabled = false;
      }
      return;
    }

    const lockdown = event.target.closest("#suite-lockdown");
    if (lockdown) {
      const id = chatId();
      if (!id) return;
      lockdown.disabled = true;
      try {
        await api("/api/mini/community-suite/lockdown", {
          method:"POST",
          body:JSON.stringify({ chat_id:id, enabled:lockdown.dataset.enabled !== "1" })
        });
        await load();
      } catch (error) {
        if (tg?.showAlert) tg.showAlert(`Lockdown update failed: ${error.message}`);
      } finally {
        lockdown.disabled = false;
      }
    }
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest('[data-open="community-suite"]')) setTimeout(load, 0);
  });

  window.WorldzCommunitySuite = { load };
})();
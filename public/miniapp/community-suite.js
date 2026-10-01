(() => {
  const tg = window.Telegram && window.Telegram.WebApp;
  const root = () => document.getElementById("community-suite-root");
  const REX_BRAND_IMAGE = window.REXSECURE_BRAND_IMAGE || {};
  const AI_PRESETS = [
    ["no5","No.5","Smart Operator"],
    ["dipshit","DipShit","Cheeky Troubleshooter"],
    ["alice","ALICE","Support + Organisation"],
    ["rex","REXSECURE™","Security for Your Community"],
    ["grace","G.R.A.C.E.","Communications + Campaigns"],
    ["max","MAX","Knowledge + Learning"],
    ["custom","Custom Build","Your Name + Personality + Purpose"]
  ];

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
      value === "ai" ? "AI Community Bot — Auto Pick / Custom" :
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
    const ai = data.ai_profile || { preset_key:"no5", display_name:"No.5", role_label:"Smart Community Operator", personality:"Fast, practical and capability-aware", purpose:"Route the community to the right installed tool." };
    const capabilityRows = (data.ai_capabilities?.capabilities || []).map((item) => {
      const mark = ["enabled","runtime_available"].includes(item.state) ? "✅" : item.state === "disabled_in_group" ? "⬜" : item.state === "configured_but_unlicensed" ? "🔒" : "ℹ️";
      const command = [...(item.member_commands || []), ...(item.admin_commands || [])][0] || "";
      return `<div><b>${mark} ${escapeHtml(item.label)}</b><small>${escapeHtml(item.state)}${command ? " • " + escapeHtml(command) : ""}</small></div>`;
    }).join("");
    const presetButtons = AI_PRESETS.map(([key,name,role]) => `<button class="button ${ai.preset_key === key ? "" : "secondary"} suite-ai-preset" data-preset="${key}">${ai.preset_key === key ? "✅ " : ""}${escapeHtml(name)}<br><small>${escapeHtml(role)}</small></button>`).join("");
    const rexBrandCard = ai.preset_key === "rex" ? `
      <section style="display:grid;grid-template-columns:minmax(110px,180px) 1fr;gap:14px;align-items:center;margin:14px 0;padding:12px;border:1px solid rgba(139,92,246,.35);border-radius:18px;background:linear-gradient(135deg,rgba(28,20,55,.94),rgba(8,18,35,.92))">
        <img src="${escapeHtml(REX_BRAND_IMAGE.dataUrl || "")}" alt="REXSECURE — Security for Your Community" style="width:100%;max-width:180px;border-radius:14px;display:block">
        <div>
          <p class="eyebrow">🛡 REXSECURE™</p>
          <h3 style="margin:.2rem 0">Security for Your Community</h3>
          <p>Professional community security with number-match entry checks, anti-flood protection, link guarding and identity warnings.</p>
          <details>
            <summary><b>👋 Welcome preset</b></summary>
            <p>Welcome to the community.<br><b>REXSECURE™ is now active.</b><br><br>Please respect the rules, look after each other, and enjoy the group.<br><br><b>Security for Your Community.</b></p>
          </details>
        </div>
      </section>
    ` : "";
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

      <article class="panel">
        <p class="eyebrow">🤖 AI AUTO PICK + CUSTOM BUILD</p>
        <h3>${escapeHtml(ai.display_name || "Community AI")}</h3>
        <p><b>${escapeHtml(ai.role_label || "Community Assistant")}</b></p>
        <p>${escapeHtml(ai.personality || "")}</p>
        <p><small>Purpose: ${escapeHtml(ai.purpose || "Not set")}</small></p>
        ${rexBrandCard}
        <div class="form-row" style="flex-wrap:wrap;gap:8px">${presetButtons}</div>
        <details style="margin-top:14px">
          <summary><b>🧠 Live Capability Map</b></summary>
          <div class="stats-grid" style="margin-top:10px">${capabilityRows || "<p>No live capability state yet.</p>"}</div>
        </details>
        <details style="margin-top:14px" ${ai.preset_key === "custom" ? "open" : ""}>
          <summary><b>🛠 Custom — Build Your Own</b></summary>
          <div style="display:grid;gap:8px;margin-top:10px">
            <label>Name<input id="suite-ai-name" maxlength="64" value="${escapeHtml(ai.preset_key === "custom" ? ai.display_name || "" : "")}" placeholder="Community AI name"></label>
            <label>Personality<textarea id="suite-ai-personality" maxlength="700" placeholder="How should it speak and behave?">${escapeHtml(ai.preset_key === "custom" ? ai.personality || "" : "")}</textarea></label>
            <label>Purpose<textarea id="suite-ai-purpose" maxlength="1200" placeholder="What is this AI responsible for?">${escapeHtml(ai.preset_key === "custom" ? ai.purpose || "" : "")}</textarea></label>
            <button id="suite-ai-custom-save" class="button">💾 Save Custom Build</button>
          </div>
        </details>
      </article>

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
    const preset = event.target.closest(".suite-ai-preset");
    if (preset) {
      const id = chatId();
      if (!id) return;
      preset.disabled = true;
      try {
        await api("/api/mini/community-suite/ai/preset", {
          method:"POST",
          body:JSON.stringify({ chat_id:id, preset_key:preset.dataset.preset })
        });
        await load();
      } catch (error) {
        if (tg?.showAlert) tg.showAlert(`AI preset update failed: ${error.message}`);
      } finally {
        preset.disabled = false;
      }
      return;
    }

    const customSave = event.target.closest("#suite-ai-custom-save");
    if (customSave) {
      const id = chatId();
      if (!id) return;
      const display_name = document.getElementById("suite-ai-name")?.value?.trim() || "";
      const personality = document.getElementById("suite-ai-personality")?.value?.trim() || "";
      const purpose = document.getElementById("suite-ai-purpose")?.value?.trim() || "";
      if (!display_name || !personality || !purpose) {
        if (tg?.showAlert) tg.showAlert("Custom Build needs a name, personality and purpose.");
        return;
      }
      customSave.disabled = true;
      try {
        await api("/api/mini/community-suite/ai/custom", {
          method:"POST",
          body:JSON.stringify({ chat_id:id, display_name, personality, purpose })
        });
        await load();
      } catch (error) {
        if (tg?.showAlert) tg.showAlert(`Custom AI update failed: ${error.message}`);
      } finally {
        customSave.disabled = false;
      }
      return;
    }

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
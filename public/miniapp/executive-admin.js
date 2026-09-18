(() => {
  const tg = window.Telegram && window.Telegram.WebApp;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "content-type": "application/json",
        "x-telegram-init-data": tg ? tg.initData : "",
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
    return { response, payload };
  }

  function notice(message) {
    if (tg && tg.showAlert) tg.showAlert(message);
    else window.alert(message);
  }

  function roleLabel(role) {
    return String(role || "admin").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function teamMarkup(payload) {
    const ownerId = String(payload.owner_telegram_id || "");
    const rows = (payload.team || []).map((member) => {
      const isOwner = member.permanent_owner || String(member.telegram_id) === ownerId;
      const executive = member.executive && member.executive.status === "active" ? member.executive : null;
      const title = isOwner
        ? "Permanent Owner"
        : executive
          ? `${executive.executive_title} • ${executive.responsibility}`
          : `${roleLabel(member.role)} • ${member.status}`;
      const name = isOwner ? "JayJayTeamDev" : executive ? executive.display_name : `Telegram ${member.telegram_id}`;
      return `<div class="profile-row"><span><b>${escapeHtml(name)}</b><small style="display:block;color:var(--muted);margin-top:4px">${escapeHtml(title)}</small></span><strong>${escapeHtml(String(member.telegram_id))}</strong></div>`;
    }).join("");
    return rows || `<div class="panel empty">No Admin Team records found.</div>`;
  }

  function createPanel(payload) {
    const authority = payload.authority || {};
    const roles = payload.allowed_scoped_roles || [];
    const panel = document.createElement("section");
    panel.id = "executive-admin-panel";
    panel.className = "panel";
    panel.innerHTML = `<div class="section-title"><h2>🛡️ Executive Leadership</h2></div>
      <div class="panel security"><b>${authority.owner ? "Permanent Owner Control" : "Executive Leader Control"}</b><p>JayJayTeamDev remains permanent owner. Executive Leaders may appoint and disable scoped Admin roles. Only the owner may appoint or remove Executive Leaders.</p></div>
      <div id="executive-team-list" class="panel"><h3>CryptoWorldz Lead Setup</h3>${teamMarkup(payload)}</div>
      <form id="scoped-admin-form" class="panel">
        <h3>Add or Update Scoped Admin</h3>
        <input name="telegram_id" inputmode="numeric" placeholder="Telegram ID" required>
        <div class="form-row">
          <select name="role">${roles.map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(roleLabel(role))}</option>`).join("")}</select>
          <select name="status"><option value="active">Active</option><option value="disabled">Disabled</option></select>
        </div>
        <button class="button" type="submit">Save Scoped Admin</button>
        <small>Executives cannot alter the permanent owner or another Executive Leader.</small>
      </form>
      ${authority.owner ? `<form id="appoint-executive-form" class="panel">
        <h3>Appoint Executive Leader</h3>
        <input name="telegram_id" inputmode="numeric" placeholder="Telegram ID" required>
        <input name="display_name" placeholder="Name, e.g. Remedy" required>
        <input name="responsibility" placeholder="Responsibility, e.g. Treasury Lead" required>
        <button class="button" type="submit">Appoint Executive Leader</button>
      </form>` : ""}`;
    return panel;
  }

  async function refresh(panel) {
    const { response, payload } = await request("/api/mini/executive/status");
    if (response.status === 401 || response.status === 403) {
      panel?.remove();
      return;
    }
    if (!response.ok) {
      if (panel) panel.innerHTML = `<div class="panel security"><b>Executive controls unavailable</b><p>${escapeHtml(payload.error || "The Executive service could not be loaded.")}</p></div>`;
      return;
    }

    const replacement = createPanel(payload);
    if (panel) panel.replaceWith(replacement);
    else document.querySelector("#admin-panel")?.appendChild(replacement);
    bind(replacement);

    const oldTeamForm = document.querySelector("#admin-team");
    if (oldTeamForm) oldTeamForm.style.display = "none";
  }

  function bind(panel) {
    panel.querySelector("#scoped-admin-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.currentTarget).entries());
      const { response, payload } = await request("/api/mini/executive/scoped-admin", {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!response.ok) return notice(payload.error || "Scoped Admin update failed.");
      notice("Scoped Admin saved.");
      await refresh(panel);
    });

    panel.querySelector("#appoint-executive-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.currentTarget).entries());
      const { response, payload } = await request("/api/mini/executive/appoint", {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!response.ok) return notice(payload.error || "Executive appointment failed.");
      notice("Executive Leader appointed.");
      await refresh(panel);
    });
  }

  async function attach() {
    if (!tg || !tg.initData || document.querySelector("#executive-admin-panel")) return;
    const adminPanel = document.querySelector("#admin-panel");
    if (!adminPanel || !adminPanel.children.length) return;
    await refresh(null);
  }

  const observer = new MutationObserver(() => attach());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", attach);
  setTimeout(attach, 1200);
})();

(() => {
  const telegram = window.Telegram && window.Telegram.WebApp;
  const initData = telegram ? telegram.initData : "";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  async function request(path) {
    const response = await fetch(path, { headers: { "X-Telegram-Init-Data": initData } });
    const payload = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
    if (!response.ok) throw new Error(payload.error || "request_failed");
    return payload;
  }

  function titleOf(item) {
    return item.legend_status_definitions && item.legend_status_definitions.title
      ? item.legend_status_definitions.title
      : item.status_code;
  }

  function render(payload) {
    const root = document.getElementById("profile-legend-v8");
    if (!root) return false;
    const awards = payload.member && Array.isArray(payload.member.awards) ? payload.member.awards : [];
    const applications = payload.member && Array.isArray(payload.member.applications) ? payload.member.applications : [];
    const definitions = Array.isArray(payload.definitions) ? payload.definitions : [];
    const planned = definitions.filter((item) => item.recognition_type === "holding_recognition");
    const budget = payload.budget || {};

    root.innerHTML = `
      <div class="section-title legend-v8-heading"><h2>🌟 Legend Recognition</h2></div>
      <section class="panel legend-v8-panel">
        <span class="legend-v8-badge">MODEL-348 V8</span>
        <h3>Earned Status</h3>
        <div class="legend-v8-grid">
          ${awards.length ? awards.map((item) => `<div class="legend-v8-item"><strong>🏆 ${escapeHtml(titleOf(item))}</strong><small>${Number(item.awarded_points) || 0} LP • ${escapeHtml(item.status)}</small></div>`).join("") : '<div class="legend-v8-item"><strong>No earned status yet</strong><small>Complete verified work, Raaiiidds and genuine community growth.</small></div>'}
        </div>
        <h3>Applications</h3>
        <div class="legend-v8-grid">
          ${applications.length ? applications.map((item) => `<div class="legend-v8-item"><strong>📋 #${escapeHtml(item.id)} ${escapeHtml(titleOf(item))}</strong><small>${escapeHtml(item.status)}</small></div>`).join("") : '<div class="legend-v8-item"><strong>No applications yet</strong><small>Use /uniquelegend in Zed when eligible.</small></div>'}
        </div>
        <div class="legend-v8-budget"><b>Weekly active rewards:</b> ${Number(budget.active_used) || 0}/${Number(budget.active_weekly_points_cap) || 3500} LP<br><b>Protected reserve:</b> ${budget.reserve_enabled ? "Open" : "Locked"}</div>
      </section>
      <div class="section-title legend-v8-heading"><h2>🌍 Planned Recognition</h2></div>
      <section class="panel legend-v8-panel">
        <p>These opt-in public-wallet recognitions award no Legend Points or payouts and remain inactive until official-token pricing, legal review and fair verification are complete.</p>
        <div class="legend-v8-grid">
          ${planned.map((item) => `<div class="legend-v8-item legend-v8-planned"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></div>`).join("") || '<div class="legend-v8-item">No planned recognition definitions.</div>'}
        </div>
      </section>`;
    return true;
  }

  async function mount() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const root = document.getElementById("profile-legend-v8");
      if (root) {
        try { render(await request("/api/mini/legend-v8/status")); }
        catch { root.innerHTML = '<div class="panel empty">Legend recognition is temporarily unavailable.</div>'; }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();

(() => {
  const telegram = window.Telegram && window.Telegram.WebApp;
  const initData = telegram ? telegram.initData : "";
  let currentDraft = null;
  let latestStatus = null;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  function notify(message) {
    if (telegram && telegram.showAlert) telegram.showAlert(message);
    else window.alert(message);
  }

  async function request(path, options = {}) {
    const headers = { "X-Telegram-Init-Data": initData, ...(options.headers || {}) };
    if (!options.raw) headers["Content-Type"] = "application/json";
    const response = await fetch(path, { ...options, headers });
    const payload = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
    if (!response.ok) {
      const error = new Error(payload.error || "request_failed");
      error.code = payload.error || "request_failed";
      throw error;
    }
    return payload;
  }

  function targetRows(targets) {
    if (!targets.length) return '<div class="worldzcast-target">No destinations enabled yet.</div>';
    return targets.slice(0, 12).map((target) => `<div class="worldzcast-target"><b>${escapeHtml(target.title)}</b>${target.topic_label ? ` • ${escapeHtml(target.topic_label)}` : ""}<br><small>${escapeHtml(target.project_slug)} • ${escapeHtml(target.chat_type)}</small></div>`).join("");
  }

  function historyRows(posts) {
    if (!posts.length) return '<div class="worldzcast-history-item">No WorldzCasts recorded yet.</div>';
    return posts.slice(0, 5).map((post) => `<div class="worldzcast-history-item"><b>${escapeHtml(String(post.status || "draft").toUpperCase())}</b> • ${Number(post.sent_count) || 0}/${Number(post.target_count) || 0} sent${Number(post.failed_count) ? ` • ${Number(post.failed_count)} failed` : ""}<br><small>${escapeHtml((post.body || "Image post").slice(0, 90))}</small></div>`).join("");
  }

  function draftPanel() {
    if (!currentDraft) return "";
    return `<div class="worldzcast-draft" id="worldzcast-active-draft"><b>📡 Draft ready</b><p>${escapeHtml((currentDraft.body || "Image post").slice(0, 350))}</p><small>ID: ${escapeHtml(currentDraft.id)} • Targets: ${Number(currentDraft.target_count) || Number(latestStatus?.targets?.length) || 0}</small><div class="worldzcast-actions"><button class="button" id="worldzcast-confirm" type="button">Confirm & Send</button><button class="button secondary" id="worldzcast-cancel" type="button">Cancel</button></div></div>`;
  }

  function renderPanel(status) {
    latestStatus = status;
    const root = document.getElementById("worldzcast-root");
    if (!root) return false;
    let panel = document.getElementById("worldzcast-panel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "worldzcast-panel";
      panel.className = "panel worldzcast-panel";
      root.appendChild(panel);
    }
    panel.innerHTML = `<span class="worldzcast-badge">WORLDZCAST™</span><h3>📡 One Post Across CryptoWorldz</h3><p>Create one message with an optional image and send it to every owner-approved CryptoWorldz group, channel or topic after confirmation.</p><p class="worldzcast-status">Active destinations: ${status.targets.length}</p><div class="worldzcast-targets">${targetRows(status.targets)}</div>${status.owner ? '<p><small>Owner setup: run <b>/worldzcaston</b> inside each approved destination. Use <b>/worldzcastoff</b> to remove one.</small></p>' : ""}<form id="worldzcast-form" class="worldzcast-form"><label>Message<textarea name="body" maxlength="8000" required placeholder="Write the Zed, Auto, G.R.A.C.E, rewards or community announcement here..."></textarea></label><label>Optional image<input name="image" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="button" type="submit">Create WorldzCast Draft</button></form>${draftPanel()}<div class="worldzcast-history"><b>Recent WorldzCasts</b>${historyRows(status.posts || [])}</div><div class="panel security"><p>Nothing is sent without confirmation. WorldzCast posts only to approved groups, channels and topics—not member DMs.</p></div>`;
    return true;
  }

  async function loadStatus() {
    try {
      const status = await request("/api/mini/worldzcast/status");
      renderPanel(status);
      return true;
    } catch (error) {
      return false;
    }
  }

  async function uploadImage(draftId, file) {
    const response = await fetch(`/api/mini/worldzcast/drafts/${encodeURIComponent(draftId)}/image`, {
      method: "POST",
      headers: {
        "X-Telegram-Init-Data": initData,
        "Content-Type": file.type || "image/jpeg"
      },
      body: file
    });
    const payload = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
    if (!response.ok) {
      const error = new Error(payload.error || "worldzcast_image_failed");
      error.code = payload.error || "worldzcast_image_failed";
      throw error;
    }
    return payload;
  }

  document.addEventListener("submit", async (event) => {
    if (event.target.id !== "worldzcast-form") return;
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("button[type=submit]");
    const body = String(new FormData(form).get("body") || "").trim();
    const image = form.elements.image.files && form.elements.image.files[0];
    if (!body) return notify("Add the WorldzCast message first.");
    if (image && image.size > 8 * 1024 * 1024) return notify("The image must be 8 MB or smaller.");
    button.disabled = true;
    button.textContent = "Preparing Draft…";
    try {
      const created = await request("/api/mini/worldzcast/drafts", {
        method: "POST",
        body: JSON.stringify({ body })
      });
      currentDraft = created.draft;
      if (image) {
        const uploaded = await uploadImage(currentDraft.id, image);
        currentDraft = uploaded.draft;
      }
      currentDraft.target_count = created.target_count;
      form.reset();
      renderPanel(latestStatus);
      notify(`WorldzCast draft ready for ${created.target_count} destination${created.target_count === 1 ? "" : "s"}.`);
    } catch (error) {
      const messages = {
        draft_rate_limited: "Too many drafts. Wait one minute.",
        image_too_large: "The image is too large.",
        worldzcast_image_failed: "The image could not be attached securely."
      };
      notify(messages[error.code] || "WorldzCast draft creation failed.");
      if (currentDraft) renderPanel(latestStatus);
    } finally {
      button.disabled = false;
      button.textContent = "Create WorldzCast Draft";
    }
  });

  document.addEventListener("click", async (event) => {
    if (!currentDraft) return;
    if (event.target.id === "worldzcast-confirm") {
      const button = event.target;
      button.disabled = true;
      button.textContent = "Sending…";
      try {
        const payload = await request(`/api/mini/worldzcast/drafts/${encodeURIComponent(currentDraft.id)}/confirm`, { method: "POST", body: "{}" });
        notify(`WorldzCast complete: ${payload.result.sent_count} sent, ${payload.result.failed_count} failed.`);
        currentDraft = null;
        await loadStatus();
      } catch (error) {
        const messages = {
          no_worldzcast_targets: "No approved destinations are enabled.",
          send_rate_limited: "The WorldzCast sending limit has been reached.",
          draft_not_found: "This draft expired or was already processed."
        };
        notify(messages[error.code] || "WorldzCast could not be sent.");
        button.disabled = false;
        button.textContent = "Confirm & Send";
      }
    }
    if (event.target.id === "worldzcast-cancel") {
      try {
        await request(`/api/mini/worldzcast/drafts/${encodeURIComponent(currentDraft.id)}/cancel`, { method: "POST", body: "{}" });
        currentDraft = null;
        await loadStatus();
        notify("WorldzCast draft cancelled.");
      } catch {
        notify("WorldzCast draft could not be cancelled.");
      }
    }
  });

  async function mount() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (document.getElementById("worldzcast-root") && await loadStatus()) return;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();

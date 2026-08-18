(() => {
  const telegram = window.Telegram && window.Telegram.WebApp;
  const $ = (id) => document.getElementById(id);
  const escape = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
  const experience = { bootstrap: null, referral: null, draft: { title: "", body: "", image_path: "", image_url: "" }, chat: [] };
  const REAGAN = "https://donateworldz.com/reagan-children/";
  const HEROES = "https://oneworldz.com/heroes/";
  const LEARN = "https://learn.oneworldz.com/";
  const PDC = "https://purplediamondcrew.com/";

  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": telegram?.initData || "", ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || "request_failed");
    return payload;
  }
  function notify(message) { if (telegram?.showAlert) telegram.showAlert(message); else window.alert(message); }
  function openScreen(id) {
    if (typeof showScreen === "function") return showScreen(id);
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function setHash(id) { history.replaceState(null, "", `#${id}`); openScreen(id); }
  function patchImpact() {
    const full = $("impact-list");
    if (full) full.innerHTML = `<article class="panel impact-card"><div class="impact-visual" aria-hidden="true"><span>💜</span><b>FEATURED IMPACT MISSION</b></div><div class="impact-body"><div class="impact-badge">DIRECT ONEWORLDZ PATHWAY</div><h3>Help Reagan & Children in Uganda</h3><p class="impact-organization">Action Spreads Smiles • Mayuge, Uganda</p><p>Food, medical care, rent, hygiene, education, mattresses and safer support are kept on the dedicated DonateWorldz purpose page.</p><div class="impact-needs"><span>🍲 Food</span><span>🩺 Medical</span><span>🏠 Shelter</span><span>📚 Education</span></div><a class="button impact-donate" href="${REAGAN}" target="_blank" rel="noopener">Open Reagan & Children on DonateWorldz</a><small>ZED never requests payment credentials and Legend Points are not purchased by donations.</small></div></article>`;
    const home = $("home-impact");
    if (home) home.innerHTML = `<div class="section-title"><h2>💜 Featured Impact</h2></div><article class="panel impact-card"><div class="impact-body"><div class="impact-badge">HELP ON THE GROUND</div><h3>Reagan & Children</h3><p>Open the dedicated DonateWorldz pathway for current support information.</p><a class="button" href="${REAGAN}" target="_blank" rel="noopener">Open DonateWorldz</a></div></article>`;
  }

  function launchpad() {
    const root = $("experience-launchpad");
    if (!root) return;
    root.innerHTML = `<section class="panel experience-launchpad"><p class="eyebrow">ONE MISSION • MANY WAYS TO ACT</p><h2>What do you want to do?</h2><div class="experience-grid">
      <button class="experience-tile" data-exp-open="zed-guide"><span>🤖</span><b>Ask ZED</b><small>Guided Command Centre</small></button>
      <button class="experience-tile" data-exp-open="missions"><span>🚀</span><b>Missions</b><small>Complete a Raaiiidd</small></button>
      <button class="experience-tile" data-exp-open="create"><span>🎨</span><b>Create</b><small>Post + artwork + review</small></button>
      <a class="experience-tile" href="${PDC}" target="_blank" rel="noopener"><span>🧤</span><b>On the Ground</b><small>Practical action</small></a>
      <button class="experience-tile" data-exp-open="heroes"><span>🦸</span><b>Heroes</b><small>Already helping?</small></button>
      <a class="experience-tile" href="${LEARN}" target="_blank" rel="noopener"><span>📚</span><b>Learn</b><small>Skills and knowledge</small></a>
    </div></section>`;
  }

  function progressStep(done, label, pendingLabel = "Pending") {
    return `<div class="progress-step ${done ? "done" : "pending"}">${done ? "✅" : "⏳"} ${escape(label)}${done ? "" : ` • ${escape(pendingLabel)}`}</div>`;
  }
  async function loadReferral() {
    const root = $("referral-progress");
    if (!root) return;
    try {
      const data = await request("/api/mini/referral-progress");
      experience.referral = data;
      const referralDone = data.referral_recognised;
      const qualified = data.inbound?.status === "qualified";
      root.innerHTML = `<section class="panel referral-progress"><p class="eyebrow">LEGEND JOURNEY</p><h3>${referralDone ? "Your referral is recognised" : "Your OneWorldz journey"}</h3><div class="progress-steps">
        ${progressStep(referralDone, "Shill Link recognised", "Direct join")}
        ${progressStep(data.registration_complete, "Legend registered")}
        ${progressStep(data.first_raaiiidd_complete, "First verified Raaiiidd")}
        ${progressStep(qualified || data.shill_boost_awarded, data.shill_boost_awarded ? "Shill Boost awarded" : "Referral qualification")}
      </div>${data.inbound?.qualifies_at && !qualified ? `<p><small>Qualification check: ${escape(new Date(data.inbound.qualifies_at).toLocaleString())}. Points remain pending until the anti-abuse rules pass.</small></p>` : ""}</section>`;
    } catch { root.innerHTML = ""; }
  }

  function zedMessage(role, text) { return `<div class="zed-msg ${role}">${escape(text)}</div>`; }
  function renderZed() {
    const root = $("zed-guide-root");
    if (!root) return;
    root.innerHTML = `<section class="panel zed-guide"><p class="eyebrow">AUTHENTICATED PARTICIPANT GUIDE</p><h3>ZED knows this signed-in Command Centre session.</h3><div class="zed-quick"><button data-zed-quick="missions">My Missions</button><button data-zed-quick="profile">My Profile</button><button data-zed-quick="referrals">My Referral</button><button data-zed-quick="create">Create Raaiiidd</button><button data-zed-quick="heroes">Heroes</button></div><div id="zed-thread" class="zed-thread">${zedMessage("assistant", "I can guide your missions, profile, referral progress, Creator flow and Hero evidence. Human Admins still control approvals.")}${experience.chat.map((m) => zedMessage(m.role, m.content)).join("")}</div><form id="zed-form" class="zed-form"><textarea name="message" maxlength="1200" placeholder="Ask ZED…" required></textarea><button class="button" type="submit">Send to ZED</button></form></section>`;
    const thread = $("zed-thread"); if (thread) thread.scrollTop = thread.scrollHeight;
  }
  function localZed(action) {
    if (action === "missions") { setHash("missions"); return; }
    if (action === "profile") { setHash("profile"); return; }
    if (action === "create") { setHash("create"); return; }
    if (action === "heroes") { setHash("heroes"); return; }
    if (action === "referrals") {
      const ref = experience.referral;
      experience.chat.push({ role: "assistant", content: ref?.referral_recognised ? `Your referral is recorded as ${ref.inbound.status}. Registration: ${ref.registration_complete ? "complete" : "pending"}. First verified Raaiiidd: ${ref.first_raaiiidd_complete ? "complete" : "pending"}.` : "No inbound Shill Link is recorded for this account. You can still participate normally." });
      renderZed();
    }
  }

  function renderCreator() {
    const root = $("creator-root"); if (!root) return;
    const d = experience.draft;
    root.innerHTML = `<section class="panel creator-form"><p class="eyebrow">ZED RAAIIIDD CREATOR</p><h3>Idea → Post → Artwork → Preview → Human Review</h3><p>Nothing generated here auto-publishes. Admin approval is required.</p><label>Your idea<textarea id="creator-idea" maxlength="1200" placeholder="Tell ZED what you want the World to see…"></textarea></label><div class="creator-actions"><button class="button" id="creator-draft" type="button">ZED Draft Post</button><button class="button secondary" id="creator-image" type="button">Create Artwork</button></div></section><section class="panel creator-preview"><p class="eyebrow">PREVIEW</p><label>Title<input id="creator-title" maxlength="90" value="${escape(d.title)}"></label><label>Post<textarea id="creator-body" maxlength="1800">${escape(d.body)}</textarea></label>${d.image_url ? `<img id="creator-preview-image" src="${escape(d.image_url)}" alt="Generated Raaiiidd draft artwork for Admin review">` : `<img id="creator-preview-image" hidden alt="Generated Raaiiidd draft artwork">`}<label>Published HTTPS post link — optional now<input id="creator-target" type="url" placeholder="https://x.com/... after it is published"></label><label>Proposed mission points<input id="creator-reward" type="number" min="0" max="100" value="10"></label><button class="button" id="creator-submit" type="button">Submit to Admin Review</button><small>Generated artwork and copy stay review-only until a human Admin approves them. A mission is activated only against a real HTTPS destination.</small></section><div id="creator-history"></div>`;
    loadCreatorHistory();
  }
  async function loadCreatorHistory() {
    const root = $("creator-history"); if (!root) return;
    try {
      const data = await request("/api/mini/creator/mine");
      root.innerHTML = data.requests.length ? `<section class="panel"><h3>Your Creator Requests</h3>${data.requests.slice(0,8).map((r) => `<div class="profile-row"><span>#${r.id} ${escape(r.grace_posts?.title || "Raaiiidd")}</span><b>${escape(r.status)}${r.mission_id ? ` • Mission #${r.mission_id}` : ""}</b></div>`).join("")}</section>` : "";
    } catch { root.innerHTML = ""; }
  }

  function renderHeroes() {
    const root = $("heroes-root"); if (!root) return;
    const name = experience.bootstrap?.profile?.first_name || experience.bootstrap?.telegram_user?.first_name || "";
    root.innerHTML = `<section class="panel"><span class="hero-mark">ALREADY HELPING?</span><h3>Real work deserves a real evidence path.</h3><p>If you were helping people before OneWorldz, submit evidence. We do not pretend your work started here. Human review decides public recognition.</p><form id="hero-form" class="hero-evidence"><label>Name<input name="display_name" maxlength="120" value="${escape(name)}" required></label><label>What have you actually been doing?<textarea name="story" maxlength="3000" minlength="20" required placeholder="Describe the real activity, where it happened and who it helped."></textarea></label><label>Public evidence link<input name="evidence_url" type="url" required placeholder="https://..."></label><button class="button" type="submit">Submit Hero Evidence</button></form><a class="button secondary" href="${HEROES}" target="_blank" rel="noopener">Open OneWorldz Heroes</a></section><div id="hero-history"></div>`;
    loadHeroHistory();
  }
  async function loadHeroHistory() {
    const root = $("hero-history"); if (!root) return;
    try {
      const data = await request("/api/mini/heroes/mine");
      root.innerHTML = data.applications.length ? `<section class="panel"><h3>Your Hero Reviews</h3>${data.applications.map((a) => `<div class="profile-row"><span>#${a.id} ${escape(a.display_name)}</span><b>${escape(a.status)}</b></div>`).join("")}</section>` : "";
    } catch { root.innerHTML = ""; }
  }

  async function renderAdminReview() {
    const root = $("admin-review-root"); if (!root) return;
    if (!experience.bootstrap?.admin) { root.innerHTML = `<div class="panel empty">Admin review access required.</div>`; return; }
    root.innerHTML = `<div class="panel loading"><div class="orb"></div><p>Loading review queues…</p></div>`;
    try {
      const [creator, heroes, missions] = await Promise.all([request("/api/mini/admin/creator"), request("/api/mini/admin/heroes"), request("/api/mini/admin/submissions")]);
      const creatorCards = creator.requests.map((r) => `<article class="panel review-card"><span class="hero-mark">RAAIIIDD CREATOR</span><h3>#${r.id} ${escape(r.grace_posts?.title || "Draft")}</h3><p>${escape(r.grace_posts?.body || "")}</p>${r.image_url ? `<img src="${escape(r.image_url)}" alt="Creator artwork awaiting review">` : ""}<p><small>Creator ${r.creator_telegram_id} • proposed ${r.desired_reward_points} LP</small></p><div class="review-actions"><button class="button" data-creator-approve="${r.id}">Approve</button><button class="button secondary" data-creator-reject="${r.id}">Reject</button></div></article>`).join("");
      const heroCards = heroes.applications.map((a) => `<article class="panel review-card"><span class="hero-mark">REAL-WORLD HERO</span><h3>#${a.id} ${escape(a.display_name)}</h3><p>${escape(a.story)}</p><a class="button secondary" href="${escape(a.evidence_url)}" target="_blank" rel="noopener">Open Evidence</a><div class="review-actions"><button class="button" data-hero-approve="${a.id}">Approve</button><button class="button secondary" data-hero-reject="${a.id}">Reject</button></div></article>`).join("");
      const missionCards = missions.submissions.map((m) => `<article class="panel review-card"><span class="hero-mark">MISSION EVIDENCE</span><h3>Submission #${m.id}</h3><p>Mission #${m.mission_id} • ${escape(m.users?.username ? `@${m.users.username}` : m.users?.first_name || m.telegram_id)}</p><p>${escape(m.proof_url || m.completion_text || "DONE")}</p><div class="review-actions"><button class="button approve-submission" data-id="${m.id}">Approve</button><button class="button secondary reject-submission" data-id="${m.id}">Reject</button></div></article>`).join("");
      root.innerHTML = `<section class="panel"><p class="eyebrow">STEPPER / ADMIN HUMAN REVIEW</p><h3>${creator.requests.length + heroes.applications.length + missions.submissions.length} waiting</h3><p>Nothing in these queues is auto-approved.</p></section>${creatorCards || ""}${heroCards || ""}${missionCards || ""}${creatorCards || heroCards || missionCards ? "" : `<div class="panel empty">No pending reviews.</div>`}`;
    } catch (error) { root.innerHTML = `<div class="panel empty">Review queue unavailable: ${escape(error.message)}</div>`; }
  }

  async function bootstrapExperience() {
    try {
      experience.bootstrap = await request("/api/mini/bootstrap");
      launchpad();
      patchImpact();
      renderZed();
      renderCreator();
      renderHeroes();
      await loadReferral();
      if (experience.bootstrap.admin) {
        const adminPanel = $("admin-panel");
        if (adminPanel && !$("experience-review-button")) adminPanel.insertAdjacentHTML("afterbegin", `<button id="experience-review-button" class="button" type="button" data-exp-open="admin-review">✅ Open Human Review Queue</button>`);
      }
      const requested = location.hash.replace(/^#/, "");
      if (["home","missions","zed-guide","create","heroes","profile","community","admin-review"].includes(requested)) openScreen(requested);
    } catch (error) { console.warn("Participant experience bootstrap unavailable", error.message); }
  }

  document.addEventListener("click", async (event) => {
    const enter = event.target.closest("#enter-command-centre");
    if (enter) { $("splashback")?.setAttribute("aria-hidden", "true"); return; }
    const open = event.target.closest("[data-exp-open]");
    if (open) { setHash(open.dataset.expOpen); if (open.dataset.expOpen === "admin-review") renderAdminReview(); return; }
    const quick = event.target.closest("[data-zed-quick]");
    if (quick) { localZed(quick.dataset.zedQuick); return; }
    if (event.target.closest("#creator-draft")) {
      const idea = $("creator-idea").value.trim(); if (idea.length < 10) return notify("Tell ZED a little more about the Raaiiidd first.");
      try { const data = await request("/api/mini/creator/draft", { method: "POST", body: JSON.stringify({ idea }) }); experience.draft.title = data.draft.title; experience.draft.body = data.draft.body; renderCreator(); notify("✅ ZED drafted the post. Edit anything before review."); } catch (e) { notify(`Draft failed: ${e.message}`); }
      return;
    }
    if (event.target.closest("#creator-image")) {
      const idea = $("creator-idea").value.trim(); if (idea.length < 10) return notify("Tell ZED what the artwork should communicate first.");
      try { notify("Creating approved-theme artwork…"); const data = await request("/api/mini/creator/image", { method: "POST", body: JSON.stringify({ idea }) }); experience.draft.image_path = data.image_path; experience.draft.image_url = data.image_url; renderCreator(); notify("✅ Artwork created for preview and Admin review."); } catch (e) { notify(`Artwork failed: ${e.message}`); }
      return;
    }
    if (event.target.closest("#creator-submit")) {
      try {
        const payload = { title: $("creator-title").value, body: $("creator-body").value, image_path: experience.draft.image_path, target_url: $("creator-target").value, reward_points: $("creator-reward").value };
        const data = await request("/api/mini/creator/submit", { method: "POST", body: JSON.stringify(payload) });
        experience.draft = { title: "", body: "", image_path: "", image_url: "" }; renderCreator(); notify(`✅ Request #${data.request.id} sent to human Admin review.`);
      } catch (e) { notify(`Submission failed: ${e.message}`); }
      return;
    }
    const creatorApprove = event.target.closest("[data-creator-approve]");
    if (creatorApprove) { try { const r = await request(`/api/mini/admin/creator/${creatorApprove.dataset.creatorApprove}/approve`, { method: "POST", body: "{}" }); notify(r.mission ? `✅ Approved and Mission #${r.mission.id} activated.` : "✅ Creative approved. Add the real published HTTPS link to activate its mission."); await renderAdminReview(); } catch (e) { notify(`Approval failed: ${e.message}`); } return; }
    const creatorReject = event.target.closest("[data-creator-reject]");
    if (creatorReject) { const reason = prompt("Why is this Raaiiidd not approved?"); if (!reason) return; try { await request(`/api/mini/admin/creator/${creatorReject.dataset.creatorReject}/reject`, { method: "POST", body: JSON.stringify({ reason }) }); notify("✅ Rejection recorded."); await renderAdminReview(); } catch (e) { notify(`Rejection failed: ${e.message}`); } return; }
    const heroApprove = event.target.closest("[data-hero-approve]");
    if (heroApprove) { const summary = prompt("Public Hero summary — keep it factual") || ""; try { await request(`/api/mini/admin/heroes/${heroApprove.dataset.heroApprove}/approve`, { method: "POST", body: JSON.stringify({ summary }) }); notify("✅ Hero recognition approved."); await renderAdminReview(); } catch (e) { notify(`Hero approval failed: ${e.message}`); } return; }
    const heroReject = event.target.closest("[data-hero-reject]");
    if (heroReject) { const reason = prompt("What evidence or change is needed?"); if (!reason) return; try { await request(`/api/mini/admin/heroes/${heroReject.dataset.heroReject}/reject`, { method: "POST", body: JSON.stringify({ reason }) }); notify("✅ Hero review recorded."); await renderAdminReview(); } catch (e) { notify(`Hero review failed: ${e.message}`); } }
  });

  document.addEventListener("submit", async (event) => {
    if (event.target.id === "zed-form") {
      event.preventDefault(); const input = event.target.elements.message; const message = input.value.trim(); if (!message) return;
      experience.chat.push({ role: "user", content: message }); input.value = ""; renderZed();
      try { const result = await request("/api/mini/zed/chat", { method: "POST", body: JSON.stringify({ message, history: experience.chat.slice(-5, -1) }) }); experience.chat.push({ role: "assistant", content: result.text }); } catch (e) { experience.chat.push({ role: "assistant", content: `I couldn't complete that request right now. You can still open Missions, Creator, Heroes or Profile directly. (${e.message})` }); }
      renderZed(); return;
    }
    if (event.target.id === "hero-form") {
      event.preventDefault(); const form = new FormData(event.target); const payload = Object.fromEntries(form);
      try { const result = await request("/api/mini/heroes/apply", { method: "POST", body: JSON.stringify(payload) }); event.target.reset(); notify(`✅ Hero evidence application #${result.application.id} sent for human review.`); loadHeroHistory(); } catch (e) { notify(`Hero evidence not submitted: ${e.message}`); }
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    $("enter-command-centre")?.addEventListener("click", () => $("splashback")?.setAttribute("aria-hidden", "true"));
    const observer = new MutationObserver(() => { if (!$("content")?.classList.contains("hidden")) { patchImpact(); observer.disconnect(); } });
    if ($("content")) observer.observe($("content"), { attributes: true, attributeFilter: ["class"] });
    const wait = setInterval(() => {
      if (telegram?.initData && !$("content")?.classList.contains("hidden")) { clearInterval(wait); bootstrapExperience(); }
    }, 150);
    setTimeout(() => clearInterval(wait), 15000);
  });
})();

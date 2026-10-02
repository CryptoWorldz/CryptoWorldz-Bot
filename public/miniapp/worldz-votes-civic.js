(() => {
  const root = document.getElementById("worldz-civic-votes-root");
  if (!root) return;

  const escapeHtml = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const topicLabels = {
    "food-and-hunger": "Food & hunger",
    "preventable-disease": "Preventable disease",
    "essential-healthcare-and-medicines": "Essential healthcare & medicines",
    "clean-water-and-sanitation": "Clean water & sanitation",
    "safe-shelter-and-housing": "Safe shelter & housing",
    "education-and-opportunity": "Education & opportunity",
    "public-money-and-resource-priorities": "Public/community resource priorities",
    "other-public-concern": "Other public concern"
  };

  const rules = [
    ["Worldwide by default", "The non-binding Public Voice layer has no country or territory allowlist. Australia is one legal profile, not the boundary of Worldz."],
    ["Equal voice", "No extra civic weight for location, nationality, race or ethnicity, wealth, token holdings or social status."],
    ["Age-inclusive Public Voice", "General concerns can include children and young people with age-appropriate privacy and safety safeguards. Official/binding eligibility remains jurisdiction-specific."],
    ["1 eligible person = 1 vote", "Where a ballot uses verified eligibility, each eligible person receives equal ballot weight."],
    ["Equal exposure", "Every candidate or option gets the same ballot space and presentation rules."],
    ["No paid ballot advantage", "Money cannot buy ranking, boosted placement or extra voting power."],
    ["Clear before you vote", "Method, dates, eligibility, sources, count rules and tie rules are published first."],
    ["Private choices", "Worldz targets identity/vote separation and never publishes individual ballots."],
    ["Transparent count", "Results include method, totals, audit status and corrections."],
    ["People decide", "Worldz provides the voting surface; Worldz does not endorse the political choice."]
  ];

  const humanNeeds = [
    "Food & hunger",
    "Preventable disease",
    "Essential healthcare & medicines",
    "Clean water & sanitation",
    "Safe shelter & housing",
    "Education & opportunity",
    "Public/community resource priorities"
  ];

  root.innerHTML = `
    <article class="panel worldz-civic-hero">
      <p class="eyebrow">WORLDWIDE • FAIR • CALM • ORGANISED • TRANSPARENT • SAFE</p>
      <h3>Worldz Global Public Voice 🌐</h3>
      <p><b>Your voice. Your preferences. Equal treatment. Transparent count.</b></p>
      <p>From Uganda and communities across Africa to Indonesia, the Philippines, Greenland, Iceland, Mexico, Austria, Belgium, France, Hong Kong, China, India, Australia and everywhere else: the general non-binding Public Voice layer is worldwide.</p>
      <div class="worldz-civic-status"><b>Current build state:</b> worldwide non-binding Public Voice with moderated concern intake. Submissions enter human review; automatic publication and binding/official voting remain locked.</div>
    </article>
    <div class="worldz-civic-grid">
      ${rules.map(([title,body]) => `<article class="panel"><h3>${title}</h3><p>${body}</p></article>`).join("")}
    </div>
    <article class="panel">
      <p class="eyebrow">WORLDZ HUMAN-NEEDS MISSION</p>
      <h3>No child or adult should be lost to hunger or denied available preventable care because money stood in the way.</h3>
      <p>Worldz Public Voice can document and aggregate concerns about:</p>
      <p><b>${humanNeeds.join(" • ")}</b></p>
      <p>People can document where they believe public and community resources should go. These are non-binding public priorities: Worldz does not claim authority over government budgets and civic results never execute Worldz treasury actions.</p>
    </article>
    <article class="panel">
      <p class="eyebrow">PUBLIC RESOURCE PRIORITIES</p>
      <div id="worldz-civic-priority-topics"><p>Loading worldwide priority categories…</p></div>
    </article>
    <article class="panel">
      <p class="eyebrow">HAVE YOUR SAY — WORLDWIDE</p>
      <h3>Submit a public concern for human review</h3>
      <p>This is a non-binding Public Voice submission. It is <b>not</b> an official election vote, government budget decision, or Worldz treasury instruction.</p>
      <p><b>Privacy:</b> do not include your name, phone, email, wallet address, exact home address, race/ethnicity or other private identity details. Children and young people should not include their school, contact details or exact location.</p>
      <form id="worldz-civic-concern-form">
        <p>
          <label>Topic<br>
            <select name="topic" required>
              ${Object.entries(topicLabels).map(([value,label]) => `<option value="${value}">${label}</option>`).join("")}
            </select>
          </label>
        </p>
        <p>
          <label>Location scope<br>
            <select name="location_scope" required>
              <option value="global">Global</option>
              <option value="country">Country</option>
              <option value="territory">Territory</option>
              <option value="region">Region</option>
              <option value="local">Local</option>
            </select>
          </label>
        </p>
        <p><label>Place label<br><input name="place_label" maxlength="120" value="Worldwide" required></label></p>
        <p><label>Country / territory code (optional)<br><input name="country_or_territory_code" maxlength="12" placeholder="UG, ID, PH, MX, IN…"></label></p>
        <p><label>Language code (optional)<br><input name="language_code" maxlength="20" placeholder="en, fr, id, sw…"></label></p>
        <p><label>Concern title<br><input name="title" minlength="5" maxlength="160" required></label></p>
        <p><label>Concern / proposal<br><textarea name="summary" minlength="20" maxlength="3000" rows="7" required></textarea></label></p>
        <p><label>Supporting source links (optional, one per line, maximum 5)<br><textarea name="sources" rows="3" placeholder="https://…"></textarea></label></p>
        <p><label><input type="checkbox" name="privacy_acknowledged" required> I have not included private identity/contact information.</label></p>
        <p><label><input type="checkbox" name="review_acknowledged" required> I understand this enters human review and is not published automatically.</label></p>
        <button type="submit">Submit Concern for Review</button>
      </form>
      <div id="worldz-civic-concern-submit-result" class="worldz-civic-status" hidden></div>
    </article>
    <article class="panel">
      <p class="eyebrow">WORLDWIDE PUBLIC CONCERN REGISTER</p>
      <p>Only human-reviewed concerns marked <b>published</b> appear here. Submitting a concern never publishes it automatically.</p>
      <div id="worldz-civic-concerns"><p>Loading published concerns…</p></div>
    </article>
    <article class="panel">
      <p class="eyebrow">BALLOT LIFECYCLE</p>
      <p><b>Draft → Sources → Legal Review → Public Preview → Open → Closed → Counted → Audited → Archived</b></p>
      <p>No administrator can silently turn a community poll into a legally binding election.</p>
    </article>
    <article class="panel security">
      <b>Political neutrality</b>
      <p>Worldz can show proposals, candidates, evidence, counterarguments, public concerns and results. It does not tell people which political choice to make.</p>
    </article>
  `;

  const concernForm = document.getElementById("worldz-civic-concern-form");
  const concernSubmitResult = document.getElementById("worldz-civic-concern-submit-result");

  concernForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = concernForm.querySelector('button[type="submit"]');
    const form = new FormData(concernForm);
    const sources = String(form.get("sources") || "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 6);

    const payload = {
      topic: form.get("topic"),
      location_scope: form.get("location_scope"),
      place_label: form.get("place_label"),
      country_or_territory_code: form.get("country_or_territory_code"),
      language_code: form.get("language_code"),
      title: form.get("title"),
      summary: form.get("summary"),
      sources,
      privacy_acknowledged: form.get("privacy_acknowledged") === "on",
      review_acknowledged: form.get("review_acknowledged") === "on"
    };

    submitButton.disabled = true;
    concernSubmitResult.hidden = false;
    concernSubmitResult.textContent = "Submitting for human review…";

    try {
      const response = await fetch("/api/worldz-votes/civic/concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const invalid = Array.isArray(result.invalid) ? ` (${result.invalid.join(", ")})` : "";
        throw new Error(`${result.message || result.error || "Submission failed"}${invalid}`);
      }

      concernSubmitResult.innerHTML =
        `<b>Received for human review.</b><br>Reference: ${escapeHtml(result.publicId || "")}<br>Not published yet • Non-binding • No treasury action`;
      concernForm.reset();
      concernForm.elements.place_label.value = "Worldwide";
    } catch (error) {
      concernSubmitResult.textContent = error?.message || "Submission failed. Please try again later.";
    } finally {
      submitButton.disabled = false;
    }
  });

  async function loadPublicVoice() {
    const priorityRoot = document.getElementById("worldz-civic-priority-topics");
    const concernRoot = document.getElementById("worldz-civic-concerns");

    try {
      const [priorityResponse, concernResponse] = await Promise.all([
        fetch("/api/worldz-votes/civic/priorities", { headers: { Accept: "application/json" } }),
        fetch("/api/worldz-votes/civic/concerns?limit=25", { headers: { Accept: "application/json" } })
      ]);

      if (priorityResponse.ok) {
        const payload = await priorityResponse.json();
        const topics = Array.isArray(payload.topics) ? payload.topics : [];
        priorityRoot.innerHTML = topics.length
          ? `<div class="worldz-civic-grid">${topics.map((topic) => `<article class="panel"><h3>${escapeHtml(topicLabels[topic] || topic)}</h3><p>Non-binding worldwide public priority category.</p></article>`).join("")}</div><p><small>${escapeHtml(payload.statement || "")}</small></p>`
          : "<p>No public priority categories are available yet.</p>";
      } else {
        priorityRoot.innerHTML = "<p>Priority categories are temporarily unavailable.</p>";
      }

      if (concernResponse.ok) {
        const payload = await concernResponse.json();
        const concerns = Array.isArray(payload.concerns) ? payload.concerns : [];
        concernRoot.innerHTML = concerns.length
          ? `<div class="worldz-civic-grid">${concerns.map((concern) => {
              const place = escapeHtml(concern.place_label || "Worldwide");
              const topic = escapeHtml(topicLabels[concern.topic] || concern.topic || "Public concern");
              const title = escapeHtml(concern.title || "Public concern");
              const summary = escapeHtml(concern.summary || "");
              const language = concern.language_code ? ` • ${escapeHtml(concern.language_code)}` : "";
              return `<article class="panel"><p class="eyebrow">${place} • ${topic}${language}</p><h3>${title}</h3><p>${summary}</p></article>`;
            }).join("")}</div>`
          : "<p>No concerns have been published yet. New submissions remain private until human review approves publication.</p>";
      } else {
        concernRoot.innerHTML = "<p>The public concern database is not active on this deployment yet.</p>";
      }
    } catch (_error) {
      priorityRoot.innerHTML = "<p>Priority categories are temporarily unavailable.</p>";
      concernRoot.innerHTML = "<p>The public concern register is temporarily unavailable.</p>";
    }
  }

  loadPublicVoice();
})();

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
      <div class="worldz-civic-status"><b>Current build state:</b> worldwide non-binding Public Voice with a read-only concern register. Public submissions and binding/official voting remain locked behind safety, privacy, legal and audit gates.</div>
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
      <p class="eyebrow">WORLDWIDE PUBLIC CONCERN REGISTER</p>
      <p>Published concerns are readable worldwide. Public submissions remain OFF until moderation, privacy, abuse-prevention and age-safety gates pass.</p>
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
          : "<p>No concerns have been published yet. The registry is read-only until the public submission safety gates are complete.</p>";
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

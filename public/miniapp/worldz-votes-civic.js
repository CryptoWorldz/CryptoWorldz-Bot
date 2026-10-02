(() => {
  const root = document.getElementById("worldz-civic-votes-root");
  if (!root) return;

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
      <div class="worldz-civic-status"><b>Current build state:</b> worldwide non-binding civic foundation. Binding/official election use remains locked behind jurisdiction law, identity, privacy and independent audit gates.</div>
    </article>
    <div class="worldz-civic-grid">
      ${rules.map(([title,body]) => `<article class="panel"><h3>${title}</h3><p>${body}</p></article>`).join("")}
    </div>
    <article class="panel">
      <p class="eyebrow">WORLDZ HUMAN-NEEDS MISSION</p>
      <h3>No child or adult should be lost to hunger or denied available preventable care because money stood in the way.</h3>
      <p>Worldz Public Voice can document and aggregate concerns about:</p>
      <p><b>${humanNeeds.join(" • ")}</b></p>
      <p>People can document where they believe public and community resources should go. Worldz does not claim authority over government budgets and civic results never execute Worldz treasury actions.</p>
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
})();

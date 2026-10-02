(() => {
  const root = document.getElementById("worldz-civic-votes-root");
  if (!root) return;

  const rules = [
    ["1 person = 1 vote", "Eligibility must be verified without giving extra weight to wealth, tokens or status."],
    ["Equal exposure", "Every candidate or option gets the same ballot space and presentation rules."],
    ["No paid ballot advantage", "Money cannot buy ranking, boosted placement or extra voting power."],
    ["Clear before you vote", "Method, dates, eligibility, sources, count rules and tie rules are published first."],
    ["Private choices", "Worldz targets identity/vote separation and never publishes individual ballots."],
    ["Transparent count", "Results include method, totals, audit status and corrections."],
    ["Law first", "Jurisdiction rules are versioned by date. Current law applies until lawfully changed."],
    ["People decide", "Worldz provides the voting surface; Worldz does not endorse the political choice."]
  ];

  root.innerHTML = `
    <article class="panel worldz-civic-hero">
      <p class="eyebrow">FAIR • CALM • ORGANISED • TRANSPARENT • SAFE</p>
      <h3>Worldz Civic Public Voice</h3>
      <p><b>Your vote. Your preferences. Equal treatment. Transparent count.</b></p>
      <p>This layer is designed for neutral public consultation and civic participation. It is separate from token popularity voting and separate from WorldzGovern™.</p>
      <div class="worldz-civic-status"><b>Current build state:</b> non-binding civic foundation. Binding/official election use remains locked behind legal, identity, privacy and independent audit gates.</div>
    </article>
    <div class="worldz-civic-grid">
      ${rules.map(([title,body]) => `<article class="panel"><h3>${title}</h3><p>${body}</p></article>`).join("")}
    </div>
    <article class="panel">
      <p class="eyebrow">BALLOT LIFECYCLE</p>
      <p><b>Draft → Sources → Legal Review → Public Preview → Open → Closed → Counted → Audited → Archived</b></p>
      <p>No administrator can silently turn a community poll into a legally binding election.</p>
    </article>
    <article class="panel security">
      <b>Political neutrality</b>
      <p>Worldz can show proposals, candidates, evidence, counterarguments and public results. It does not tell people which political choice to make.</p>
    </article>
  `;
})();

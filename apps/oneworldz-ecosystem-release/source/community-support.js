(() => {
  const grid = document.querySelector("#community-support-grid");
  if (!grid) return;

  // The 35 verified Community Support destinations are embedded directly in the
  // generated HTML and are the authoritative public registry for this page.
  // Do not make an optional cross-origin API request here: OneWorldz deliberately
  // keeps a restrictive Content Security Policy, and the static registry already
  // guarantees that an API outage cannot blank or degrade this page.
  const cards = [...grid.querySelectorAll(".community-support-card")];
  const count = document.querySelector("#community-support-count");
  if (count && cards.length === 35) count.textContent = "35 / 35 verified links available";
})();

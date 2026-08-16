(() => {
  const API = "https://cryptobotz.cryptoworldz.xyz/api/oneworldz-community-support";
  const grid = document.querySelector("#community-support-grid");
  const count = document.querySelector("#community-support-count");
  const resolved = document.querySelector("#community-support-resolved");
  if (!grid) return;

  function safeText(value) { return String(value || "").trim(); }
  function categoryLabel(value) {
    return safeText(value).replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()) || "Community Support";
  }
  function buildCard(row) {
    const article = document.createElement("article");
    article.className = "community-support-card";
    article.dataset.displayOrder = String(row.display_order);
    const number = document.createElement("span");
    number.className = "number";
    number.textContent = String(row.display_order).padStart(2, "0");
    const title = document.createElement("h2");
    title.textContent = safeText(row.display_name) || "Verified Community Support Link";
    const copy = document.createElement("p");
    copy.textContent = row.metadata_status === "resolved"
      ? "Verified Facebook support destination from the OneWorldz Community Impact registry."
      : "Verified Facebook support destination. The saved link is preserved while public-name metadata remains unverified.";
    const meta = document.createElement("div");
    meta.className = "meta";
    const category = document.createElement("span");
    category.textContent = categoryLabel(row.category);
    const status = document.createElement("span");
    status.textContent = row.metadata_status === "resolved" ? "Name verified" : "Verified link";
    meta.append(category, status);
    const link = document.createElement("a");
    link.href = row.facebook_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open Original Facebook Link";
    article.append(number, title, copy, meta, link);
    return article;
  }

  async function refreshFromLiveRegistry() {
    try {
      const response = await fetch(API, { cache: "no-store", headers: { accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok || payload.count !== 35 || !Array.isArray(payload.profiles)) return;
      const profiles = [...payload.profiles].sort((a, b) => Number(a.display_order) - Number(b.display_order));
      if (profiles.length !== 35 || new Set(profiles.map((row) => Number(row.display_order))).size !== 35) return;
      grid.replaceChildren(...profiles.map(buildCard));
      if (count) count.textContent = "35 / 35 verified links live-synced";
      const resolvedCount = profiles.filter((row) => row.metadata_status === "resolved").length;
      if (resolved) resolved.textContent = `${resolvedCount} public names independently resolved • ${35 - resolvedCount} controlled neutral labels`;
    } catch {
      // The 35 verified links are already embedded in the HTML. A live API outage must never blank the page.
    }
  }

  refreshFromLiveRegistry();
})();

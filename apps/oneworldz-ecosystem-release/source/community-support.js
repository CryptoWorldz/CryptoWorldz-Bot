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

  async function load() {
    try {
      const response = await fetch(API, { cache: "no-store", headers: { accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok || payload.count !== 35 || !Array.isArray(payload.profiles)) throw new Error(payload.error || "registry_incomplete");
      const profiles = [...payload.profiles].sort((a, b) => Number(a.display_order) - Number(b.display_order));
      if (profiles.length !== 35 || new Set(profiles.map((row) => Number(row.display_order))).size !== 35) throw new Error("registry_incomplete");
      grid.replaceChildren(...profiles.map(buildCard));
      if (count) count.textContent = "35 / 35 verified links loaded";
      const resolvedCount = profiles.filter((row) => row.metadata_status === "resolved").length;
      if (resolved) resolved.textContent = `${resolvedCount} public names independently resolved • ${35 - resolvedCount} controlled neutral labels`;
    } catch {
      grid.innerHTML = '<div class="community-support-error"><strong>Community Support registry is temporarily unavailable.</strong><br>The page will not invent missing profiles, names or links. Please try again shortly.</div>';
      if (count) count.textContent = "Registry proof unavailable";
      if (resolved) resolved.textContent = "No invented replacements";
    }
  }

  load();
})();

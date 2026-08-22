(() => {
  const grid = document.querySelector("#community-support-grid");
  if (!grid) return;

  const cards = [...grid.querySelectorAll("[data-display-order]")];
  const count = document.querySelector("#community-support-count");
  const resolved = document.querySelector("#community-support-resolved");
  if (count && cards.length === 35) count.textContent = "35 / 35 verified Facebook destinations available";

  const endpoint = "https://cryptobotz.cryptoworldz.xyz/api/oneworldz-community-support";
  const cleanText = (value, max = 220) => String(value || "").trim().slice(0, max);

  function applyProfile(profile) {
    const order = Number(profile?.display_order);
    if (!Number.isInteger(order)) return false;
    const card = grid.querySelector(`[data-display-order="${order}"]`);
    if (!card) return false;
    const link = card.querySelector("a[href]");
    if (link && profile.facebook_url) link.href = profile.facebook_url;

    const state = card.querySelector(".community-preview-state");
    if (profile.preview_status !== "verified" || !profile.preview) {
      card.dataset.previewStatus = cleanText(profile.preview_status || "pending", 30);
      if (state) state.textContent = profile.preview_status === "restricted" ? "Facebook preview restricted" : "Preview pending verification";
      return false;
    }

    const preview = profile.preview;
    const title = cleanText(preview.title || profile.display_name, 140);
    const description = cleanText(preview.description, 280);
    const imageUrl = String(preview.image_url || "").trim();
    const heading = card.querySelector("h2");
    const copy = card.querySelector(".community-preview-description") || card.querySelector("p");
    if (heading && title) heading.textContent = title;
    if (copy && description) copy.textContent = description;
    if (state) state.textContent = "Facebook preview verified";
    card.dataset.previewStatus = "verified";

    if (/^https:\/\//i.test(imageUrl) && !card.querySelector(".facebook-preview-image")) {
      const wrap = document.createElement("span");
      wrap.className = "facebook-preview-image";
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = title ? `${title} Facebook preview` : "Verified Facebook preview";
      image.loading = "lazy";
      image.decoding = "async";
      wrap.appendChild(image);
      card.insertBefore(wrap, card.firstChild);
    }
    return true;
  }

  fetch(endpoint, { headers: { Accept: "application/json" }, mode: "cors", credentials: "omit" })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
    .then((payload) => {
      if (!payload?.ok || !Array.isArray(payload.profiles) || payload.profiles.length !== 35) throw new Error("registry_incomplete");
      let verified = 0;
      for (const profile of payload.profiles) if (applyProfile(profile)) verified += 1;
      if (resolved) resolved.textContent = `${verified} verified Facebook previews • ${35 - verified} exact-link fallbacks`;
    })
    .catch(() => {
      if (resolved) resolved.textContent = "Exact Facebook links preserved • live previews temporarily unavailable";
    });
})();

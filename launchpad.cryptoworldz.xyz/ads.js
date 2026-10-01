(() => {
  const API = "https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-launchpad-ads";

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" ? url.toString() : "";
    } catch {
      return "";
    }
  }

  function adCard(ad) {
    const link = document.createElement("a");
    link.className = "worldz-ad-card";
    link.target = "_blank";
    link.rel = "noopener sponsored";
    link.href = safeUrl(ad.target_url) || "/advertise/";

    const media = document.createElement("div");
    media.className = "worldz-ad-media";
    const imageUrl = safeUrl(ad.banner_url);
    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = String(ad.project_name || "Sponsored project").slice(0, 120);
      img.loading = "lazy";
      media.appendChild(img);
    }

    const copy = document.createElement("div");
    copy.className = "worldz-ad-copy";
    const flag = document.createElement("span");
    flag.className = "worldz-ad-label";
    flag.textContent = "SPONSORED";

    const title = document.createElement("strong");
    title.textContent = String(ad.project_name || "Sponsored project").slice(0, 80);

    const meta = document.createElement("small");
    meta.textContent = [ad.token_symbol ? "$" + String(ad.token_symbol).replace(/^\$/,"") : "", ad.chain || ""].filter(Boolean).join(" • ") || "WorldzLaunchPad Spotlight";

    copy.append(flag, title, meta);
    link.append(media, copy);
    return link;
  }

  async function renderSlot(root) {
    const slot = root.dataset.worldzAdSlot || "home_spotlight";
    root.classList.add("worldz-ad-shell");

    const head = document.createElement("div");
    head.className = "worldz-ad-head";
    const label = document.createElement("span");
    label.textContent = "WORLDZ SPOTLIGHT";
    const advertise = document.createElement("a");
    advertise.href = "/advertise/";
    advertise.textContent = "Advertise from A$5/day →";
    head.append(label, advertise);

    const grid = document.createElement("div");
    grid.className = "worldz-ad-grid";
    root.replaceChildren(head, grid);

    try {
      const response = await fetch(API + "?slot=" + encodeURIComponent(slot), { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || payload.ok !== true) throw new Error("ad feed unavailable");
      const ads = Array.isArray(payload.ads) ? payload.ads : [];
      if (!ads.length) {
        const empty = document.createElement("a");
        empty.className = "worldz-ad-empty";
        empty.href = "/advertise/";
        empty.innerHTML = "<b>Your project could be here.</b><span>Subdued sponsored spots • A$5/day • A$22/week</span>";
        grid.appendChild(empty);
        return;
      }
      ads.forEach((ad) => grid.appendChild(adCard(ad)));
    } catch {
      const empty = document.createElement("a");
      empty.className = "worldz-ad-empty";
      empty.href = "/advertise/";
      empty.innerHTML = "<b>Worldz Spotlight</b><span>Low-cost sponsored placements • human reviewed</span>";
      grid.appendChild(empty);
    }
  }

  document.querySelectorAll("[data-worldz-ad-slot]").forEach(renderSlot);
})();
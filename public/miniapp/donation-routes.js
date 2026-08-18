(() => {
  const routes = Object.freeze({
    reagan: "https://donateworldz.com/reagan-children/",
    community: "https://donateworldz.com/community-impact/",
    davis: "https://donateworldz.com/davis-family/",
    jayjay: "https://donateworldz.com/jayjayteamdev/",
    hub: "https://donateworldz.com/",
    tiktok: "https://www.tiktok.com/@actionspreadsmilesorg",
    youtube: "https://youtube.com/@action_spread_smiles"
  });

  const title = "Help Reagan Feed 60 Orphaned Children in Uganda";
  const organization = "Action Spreads Smile's Orphanage • Mayuge, Uganda";
  const description = "Immediate help for food, medical care, rent, hygiene, education and safer mattresses for children in Reagan's care.";

  function impactMarkup(compact = false) {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(routes.reagan)}&text=${encodeURIComponent(title)}`;
    return `<article class="panel impact-card"><div class="impact-visual" aria-hidden="true"><span>💜</span><b>FEATURED IMPACT MISSION</b></div><div class="impact-body"><div class="impact-badge">URGENT SUPPORT NEEDED</div><h3>${title}</h3><p class="impact-organization">${organization}</p><p>${description}</p><div class="impact-needs"><span>🍲 Food</span><span>🩺 Medical</span><span>🏠 Rent</span><span>🛏️ Mattresses</span></div>${compact ? `<button class="button" data-open="impact" type="button">Open Impact Mission</button>` : `<a class="button impact-donate" href="${routes.reagan}" target="_blank" rel="noopener">Open Reagan &amp; Children on DonateWorldz</a><a class="button secondary" href="${shareUrl}" target="_blank" rel="noopener">Share Campaign</a><div class="impact-socials"><a href="${routes.tiktok}" target="_blank" rel="noopener">TikTok</a><a href="${routes.youtube}" target="_blank" rel="noopener">YouTube</a></div><div class="impact-socials"><a href="${routes.community}" target="_blank" rel="noopener">Community Impact</a><a href="${routes.davis}" target="_blank" rel="noopener">Davis Family</a></div><div class="impact-socials"><a href="${routes.jayjay}" target="_blank" rel="noopener">Support JayJayTeamDev</a><a href="${routes.hub}" target="_blank" rel="noopener">All DonateWorldz</a></div><small>Donations continue through the dedicated OneWorldz DonateWorldz pages. Zed never sees payment details and does not award Legend Points based on donation amounts.</small>`}</div></article>`;
  }

  function patchImpact() {
    try {
      impactCard = impactMarkup;
    } catch {
      // DOM replacement remains the fail-safe if the global binding is unavailable.
    }

    const home = document.getElementById("home-impact");
    if (home && !home.dataset.donateworldzPatched) {
      home.innerHTML = `<div class="section-title"><h2>💜 Featured Impact</h2></div>${impactMarkup(true)}`;
      home.dataset.donateworldzPatched = "true";
    }

    const impact = document.getElementById("impact-list");
    if (impact && !impact.dataset.donateworldzPatched) {
      impact.innerHTML = impactMarkup(false);
      impact.dataset.donateworldzPatched = "true";
    }
  }

  const observer = new MutationObserver(() => {
    observer.disconnect();
    patchImpact();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", patchImpact, { once: true });
  else patchImpact();
  setTimeout(patchImpact, 0);
  setTimeout(patchImpact, 500);
  setTimeout(patchImpact, 1500);
})();

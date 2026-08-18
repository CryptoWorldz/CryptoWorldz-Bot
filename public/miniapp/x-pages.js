(() => {
  const X_PAGES = Object.freeze([
    { name: "JayJayTeamDev", handle: "@JayJayTeamDev", url: "https://x.com/JayJayTeamDev", status: "CONNECTED" },
    { name: "OneWorldz", handle: "@OneWorldzX", url: "https://x.com/OneWorldzX", status: "CONNECTED" },
    { name: "CryptoWorldz", handle: "@CryptoWorldzX", url: "https://x.com/CryptoWorldzX", status: "CONNECTED" },
    { name: "SolWorld", handle: "@SolWorldX", url: "https://x.com/SolWorldX", status: "CONNECTED" },
    { name: "ImpactBased", handle: "@ImpactBased", url: "https://x.com/ImpactBased", status: "CONNECTED" },
    { name: "Robin Hood Law", handle: "@RobinHoodLawX", url: "https://x.com/RobinHoodLawX", status: "CONNECTED" },
    { name: "Global Impact Alliance", handle: "@GIA_Token", url: "https://x.com/GIA_Token", status: "CONNECTED" },
    { name: "Next Big Coin", handle: "@BigCoinNext", url: "https://x.com/BigCoinNext", status: "CONNECTED" },
    { name: "RecoverYourDebt", handle: "@RecoverYourDebt", url: "https://x.com/RecoverYourDebt", status: "CONNECTED" },
    { name: "Uganda Unite", handle: "@UgandaUniteX", url: "https://x.com/UgandaUniteX", status: "VERIFY" },
    { name: "Black Bud / SolBud", handle: "@BlackBudToken", url: "https://x.com/BlackBudToken", status: "VERIFY" },
    { name: "MUSKMAN / SolMars", handle: "@MuskManMars", url: "https://x.com/MuskManMars", status: "VERIFY" }
  ]);

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);

  function directoryMarkup() {
    const connected = X_PAGES.filter((page) => page.status === "CONNECTED").length;
    const verify = X_PAGES.length - connected;
    return `<section class="panel x-pages-directory" id="x-pages-directory">
      <div class="section-title"><h2>𝕏 OneWorldz X Network</h2></div>
      <p><strong>${connected} connected/current</strong> • ${verify} known project handles marked VERIFY.</p>
      <div class="links x-page-links">
        ${X_PAGES.map((page) => `<a class="link x-page-link" href="${escapeHtml(page.url)}" target="_blank" rel="noopener noreferrer"><span><strong>${escapeHtml(page.name)}</strong><small>${escapeHtml(page.handle)}</small></span><b>${escapeHtml(page.status)}</b></a>`).join("")}
      </div>
      <small>Legacy @CharityBased is represented by the current ImpactBased identity and is not counted twice. VERIFY means the handle exists in the project registry but still requires account-level confirmation before it is labelled connected.</small>
    </section>`;
  }

  function patchXDirectory() {
    const community = document.getElementById("community-links");
    if (!community) return;
    let directory = document.getElementById("x-pages-directory");
    if (!directory) {
      community.insertAdjacentHTML("afterend", directoryMarkup());
      directory = document.getElementById("x-pages-directory");
    }
    if (directory) directory.dataset.xPagesReady = "true";
  }

  const observer = new MutationObserver(() => patchXDirectory());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", patchXDirectory, { once: true });
  else patchXDirectory();
  setTimeout(patchXDirectory, 0);
  setTimeout(patchXDirectory, 500);
  setTimeout(patchXDirectory, 1500);
})();

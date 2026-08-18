(() => {
  const X_PAGES = Object.freeze([
    { name: "Purple Diamond Crew", handle: "@PDCrew", url: "https://x.com/PDCrew", status: "CONFIRMED" },
    { name: "Limited Edition", handle: "@LimitedTo10M", url: "https://x.com/LimitedTo10M", status: "CONFIRMED" },
    { name: "The Next Big Coin!", handle: "@BigCoinNext", url: "https://x.com/BigCoinNext", status: "CONFIRMED" },
    { name: "ImpactBased", handle: "@ImpactBased", url: "https://x.com/ImpactBased", status: "CONFIRMED" },
    { name: "Black Bud / SolBud", handle: "@BlackBudToken", url: "https://x.com/BlackBudToken", status: "CONFIRMED" },
    { name: "MUSKMAN / SolMars", handle: "@MuskManMars", url: "https://x.com/MuskManMars", status: "CONFIRMED" },
    { name: "CryptoWorldz", handle: "@CryptoWorldzX", url: "https://x.com/CryptoWorldzX", status: "CONFIRMED" },
    { name: "XrpWorldz", handle: "@XrpWorldz", url: "https://x.com/XrpWorldz", status: "CONFIRMED" },
    { name: "OneWorldz", handle: "@OneWorldzX", url: "https://x.com/OneWorldzX", status: "CONFIRMED" },
    { name: "JayJayTeamDev", handle: "@JayJayTeamDev", url: "https://x.com/JayJayTeamDev", status: "KNOWN" },
    { name: "SolWorld / SolWorldz", handle: "@SolWorldX", url: "https://x.com/SolWorldX", status: "KNOWN" },
    { name: "Robin Hood Law", handle: "@RobinHoodLawX", url: "https://x.com/RobinHoodLawX", status: "KNOWN" },
    { name: "RecoverYourDebt", handle: "@RecoverYourDebt", url: "https://x.com/RecoverYourDebt", status: "KNOWN" },
    { name: "Uganda Unite", handle: "@UgandaUniteX", url: "https://x.com/UgandaUniteX", status: "SUSPENDED" },
    { name: "Global Impact Alliance", handle: "@gia_token", url: "https://x.com/gia_token", status: "KNOWN" }
  ]);

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);

  function directoryMarkup() {
    const confirmed = X_PAGES.filter((page) => page.status === "CONFIRMED").length;
    const suspended = X_PAGES.filter((page) => page.status === "SUSPENDED").length;
    const known = X_PAGES.filter((page) => page.status === "KNOWN").length;
    return `<section class="panel x-pages-directory" id="x-pages-directory">
      <div class="section-title"><h2>𝕏 OneWorldz X Network</h2></div>
      <p><strong>${X_PAGES.length} known X pages</strong> • ${confirmed} confirmed • ${known} known • ${suspended} suspended.</p>
      <div class="links x-page-links">
        ${X_PAGES.map((page) => `<a class="link x-page-link" href="${escapeHtml(page.url)}" target="_blank" rel="noopener noreferrer"><span><strong>${escapeHtml(page.name)}</strong><small>${escapeHtml(page.handle)}</small></span><b>${escapeHtml(page.status)}</b></a>`).join("")}
      </div>
      <small>CONFIRMED means directly evidenced from the signed-in X account selector. KNOWN means already recorded in the OneWorldz/CryptoWorldz project records. SUSPENDED means the account is retained for historical/project identity but must not be treated as an active X destination. Legacy @CharityBased is represented by the current @ImpactBased identity and is not counted twice.</small>
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
(() => {
  const CORRECT_GOFUNDME = 'https://www.gofundme.com/u/jayjayteamdev';
  const OLD_GOFUNDME = 'https://www.gofundme.com/u/cryptouniverse';

  function repairGoFundMeLinks(root = document) {
    root.querySelectorAll?.('a[href]').forEach((anchor) => {
      if (anchor.href === OLD_GOFUNDME || anchor.getAttribute('href') === OLD_GOFUNDME) {
        anchor.href = CORRECT_GOFUNDME;
      }
    });
  }

  repairGoFundMeLinks();
  const observer = new MutationObserver(() => repairGoFundMeLinks());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', () => repairGoFundMeLinks(), { once: true });
})();

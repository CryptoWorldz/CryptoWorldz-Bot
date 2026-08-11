(() => {
  const FUND_PAGE = 'https://oneworldz.com/gofundme/';
  const FUNDRAISER = 'https://gofund.me/933219353';
  const PROFILE = 'https://www.gofundme.com/u/jayjayteamdev';

  function install() {
    const nav = document.querySelector('#main-nav');
    if (nav && !nav.querySelector('[data-worldz-donation-link]')) {
      const link = document.createElement('a');
      link.href = FUND_PAGE;
      link.dataset.worldzDonationLink = 'true';
      link.textContent = 'Support Children';
      link.title = 'OneWorldz Community Survival Fund';
      nav.append(link);
    }

    const footer = document.querySelector('.site-footer');
    if (footer && !footer.querySelector('[data-worldz-gofundme-links]')) {
      const row = document.createElement('p');
      row.dataset.worldzGofundmeLinks = 'true';
      row.className = 'footer-note';
      row.innerHTML = `<a href="${FUND_PAGE}">Community Survival Fund</a> · <a href="${FUNDRAISER}" target="_blank" rel="noopener noreferrer">Donate / Share</a> · <a href="${PROFILE}" target="_blank" rel="noopener noreferrer">JayJayTeamDev GoFundMe</a>`;
      footer.append(row);
    }
  }

  install();
  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', install, { once: true });
})();

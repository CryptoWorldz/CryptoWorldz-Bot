(() => {
  const host = location.hostname.replace(/^www\./, '').toLowerCase();
  const params = new URLSearchParams(location.search);
  const isOneWorldz = host === 'oneworldz.com' || params.get('site') === 'oneworldz' || params.get('mode') === 'mission';
  if (!isOneWorldz) return;

  const REAGAN_IMAGE = './assets/images/website-core/action-creates-smiles/action-creates-smiles-reagan-kids.webp';

  function addReaganHero() {
    const network = document.querySelector('#oneworldz-heroes .ow-hero-network');
    if (!network || network.querySelector('[data-oneworldz-hero="reagan-kauja"]')) return false;

    const card = document.createElement('article');
    card.className = 'ow-hero-card ow-hero-card-featured';
    card.dataset.oneworldzHero = 'reagan-kauja';
    card.innerHTML = `
      <img src="${REAGAN_IMAGE}" alt="Reagan Kauja with children supported through Action Spreads Smiles in Uganda" loading="lazy" decoding="async">
      <span>Uganda • Action Spreads Smiles</span>
      <h3>Reagan Kauja</h3>
      <p>Founder and community leader helping children through food, shelter, education, medical support and practical care.</p>
      <strong>OneWorldz Hero Feature</strong>`;
    network.prepend(card);

    if (!document.querySelector('#oneworldz-reagan-hero-style')) {
      const style = document.createElement('style');
      style.id = 'oneworldz-reagan-hero-style';
      style.textContent = `
        .ow-hero-card-featured{grid-column:span 2;padding:0;overflow:hidden;background:linear-gradient(150deg,rgba(116,37,194,.22),rgba(255,255,255,.03));}
        .ow-hero-card-featured::before{display:none!important}
        .ow-hero-card-featured img{display:block;width:100%;height:auto!important;max-height:460px;object-fit:contain!important;object-position:center;background:#08020f;border-bottom:1px solid rgba(204,149,255,.27)}
        .ow-hero-card-featured span,.ow-hero-card-featured h3,.ow-hero-card-featured p,.ow-hero-card-featured strong{margin-left:22px;margin-right:22px}
        .ow-hero-card-featured span{margin-top:18px}
        .ow-hero-card-featured strong{margin-bottom:22px}
        @media(max-width:760px){.ow-hero-card-featured{flex:0 0 min(88vw,380px);grid-column:auto}.ow-hero-card-featured img{max-height:none}}
      `;
      document.head.appendChild(style);
    }
    return true;
  }

  if (addReaganHero()) return;
  const observer = new MutationObserver(() => {
    if (addReaganHero()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 8000);
})();

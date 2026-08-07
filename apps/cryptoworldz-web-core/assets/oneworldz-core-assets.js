(() => {
  const host = location.hostname.replace(/^www\./, '').toLowerCase();
  const params = new URLSearchParams(location.search);
  const isOneWorldz = host === 'oneworldz.com' || params.get('site') === 'oneworldz' || params.get('mode') === 'mission';
  if (!isOneWorldz) return;

  const VERSION = '2026-08-07.1';
  const ROOT = './assets/images/website-core';
  const ASSETS = {
    hero: `${ROOT}/oneworldz/oneworldz-one-vision-one-future.webp`,
    worldz: `${ROOT}/blockchain/blockchain-worldz-multichain-directory.webp`,
    hopeChest: `${ROOT}/purple-diamond-crew/hope-chest-by-firelight.webp`,
    reagan: `${ROOT}/action-creates-smiles/action-creates-smiles-reagan-kids.webp`,
    kidsBunk: `${ROOT}/action-creates-smiles/kids-cartoon-bunk-bed.webp`,
    kindness: `${ROOT}/action-creates-smiles/kids-cartoon-kindness-changes-everything.webp`
  };

  function image(src, alt, className) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.className = className;
    return img;
  }

  function installStyles() {
    if (document.querySelector('#oneworldz-core-assets-style')) return;
    const style = document.createElement('style');
    style.id = 'oneworldz-core-assets-style';
    style.textContent = `
      .ow-core-story-image,.ow-core-worldz-art{display:block;width:100%;height:auto;border-radius:22px;border:1px solid rgba(191,123,255,.42);box-shadow:0 22px 60px rgba(9,2,22,.38);object-fit:cover}
      .ow-core-story-image{max-height:420px;margin:0 0 1.25rem}
      .ow-core-worldz-art{max-height:560px;margin:1.4rem auto 1.8rem}
      #purple-diamond-crew.ow-core-hope-section{position:relative;isolation:isolate;overflow:hidden;background-image:linear-gradient(90deg,rgba(8,3,20,.94),rgba(14,5,31,.76),rgba(8,3,20,.93)),var(--ow-hope-chest);background-size:cover;background-position:center}
      #purple-diamond-crew.ow-core-hope-section::before{content:'';position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 50% 48%,rgba(157,74,255,.18),transparent 52%)}
      #purple-diamond-crew.ow-core-hope-section>*{position:relative;z-index:1}
      .ow-impact-gallery.ow-core-impact-gallery{align-items:stretch}
      .ow-impact-gallery.ow-core-impact-gallery>img{width:min(100%,520px);height:100%;min-height:360px;object-fit:cover;border-radius:24px}
      @media (max-width:760px){.ow-core-story-image{max-height:330px}.ow-core-worldz-art{max-height:360px}.ow-impact-gallery.ow-core-impact-gallery>img{min-height:260px}}
    `;
    document.head.appendChild(style);
  }

  function apply() {
    const app = document.querySelector('#app');
    const hero = document.querySelector('.ow-hero-art img');
    const actionPanel = document.querySelector('#action-creates-smiles .ow-story-purple');
    const reaganPanel = document.querySelector('#action-spreads-smiles');
    const pdc = document.querySelector('#purple-diamond-crew');
    const worldz = document.querySelector('#worldz');
    const impact = document.querySelector('#impact');
    if (!app || !hero || !actionPanel || !reaganPanel || !pdc || !worldz || !impact) return false;
    if (app.dataset.coreAssets === VERSION) return true;

    installStyles();

    hero.src = ASSETS.hero;
    hero.alt = 'OneWorldz — One Vision, a connected world built around people and shared purpose';
    hero.width = 1024;
    hero.height = 1024;

    if (!actionPanel.querySelector('[data-core-art="kindness"]')) {
      const art = image(ASSETS.kindness, 'Action Creates Smiles — kindness changes everything cartoon artwork featuring children', 'ow-core-story-image');
      art.dataset.coreArt = 'kindness';
      actionPanel.prepend(art);
    }

    if (!reaganPanel.querySelector('[data-core-art="reagan"]')) {
      const art = image(ASSETS.reagan, 'Reagan with the children supported through Action Creates Smiles in Uganda', 'ow-core-story-image');
      art.dataset.coreArt = 'reagan';
      reaganPanel.prepend(art);
    }

    pdc.classList.add('ow-core-hope-section');
    pdc.style.setProperty('--ow-hope-chest', `url("${ASSETS.hopeChest}")`);

    if (!worldz.querySelector('[data-core-art="worldz"]')) {
      const art = image(ASSETS.worldz, 'CryptoWorldz multi-chain Worldz directory artwork connecting the blockchain ecosystem', 'ow-core-worldz-art');
      art.dataset.coreArt = 'worldz';
      worldz.querySelector('.ow-section-heading')?.after(art);
    }

    const impactImage = impact.querySelector('img');
    if (impactImage) {
      impactImage.src = ASSETS.kidsBunk;
      impactImage.alt = 'Latest OneWorldz cartoon recreation showing joyful children and practical support';
      impactImage.width = 1024;
      impactImage.height = 1024;
    }
    impact.classList.add('ow-core-impact-gallery');

    app.dataset.coreAssets = VERSION;
    return true;
  }

  if (apply()) return;
  const observer = new MutationObserver(() => {
    if (apply()) observer.disconnect();
  });
  const app = document.querySelector('#app');
  if (app) observer.observe(app, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 6000);
})();

(() => {
  const host = location.hostname.replace(/^www\./, '').toLowerCase();
  const params = new URLSearchParams(location.search);
  const isOneWorldz = host === 'oneworldz.com' || params.get('site') === 'oneworldz' || params.get('mode') === 'mission';
  if (!isOneWorldz) return;

  const VERSION = '2026-08-09.1';
  const ROOT = './assets/images/website-core';
  const GOFUNDME_PROFILE = 'https://www.gofundme.com/u/jayjayteamdev';
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
    img.setAttribute('draggable', 'false');
    return img;
  }

  function installStyles() {
    if (document.querySelector('#oneworldz-core-assets-style')) return;
    const style = document.createElement('style');
    style.id = 'oneworldz-core-assets-style';
    style.textContent = `
      .ow-hero-art{display:grid;place-items:center;min-width:0}
      .ow-hero-art img,.ow-core-story-image,.ow-core-worldz-art,.ow-core-gallery img,.ow-impact-gallery.ow-core-impact-gallery>img{
        display:block;width:100%;max-width:100%;height:auto!important;min-height:0!important;aspect-ratio:auto!important;
        object-fit:contain!important;object-position:center!important;border-radius:22px;border:1px solid rgba(191,123,255,.42);
        box-shadow:0 22px 60px rgba(9,2,22,.38);background:linear-gradient(145deg,rgba(16,5,34,.92),rgba(4,2,12,.96));
      }
      .ow-hero-art img{max-height:none!important}
      .ow-core-story-image{margin:0 0 1.25rem}
      .ow-core-worldz-art{margin:1.4rem auto 1.8rem}
      .ow-core-gallery-section{margin-top:20px;padding:clamp(24px,4vw,50px);border:1px solid rgba(188,140,242,.25);border-radius:28px;background:radial-gradient(circle at 50% 0,rgba(143,49,229,.14),transparent 38%),rgba(14,5,27,.9)}
      .ow-core-gallery-heading{text-align:center;max-width:900px;margin:0 auto 24px}
      .ow-core-gallery-heading h2{margin:.4rem 0 .75rem;font:750 clamp(1.6rem,4vw,3.2rem)/1.05 Orbitron,sans-serif}
      .ow-core-gallery-heading p{margin:0;color:#c8b8d8;line-height:1.55}
      .ow-core-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}
      .ow-core-gallery figure{margin:0;padding:10px;border:1px solid rgba(192,139,244,.22);border-radius:20px;background:rgba(255,255,255,.025)}
      .ow-core-gallery figcaption{padding:10px 6px 4px;color:#d8c8e8;font-weight:700;text-align:center}
      #purple-diamond-crew.ow-core-hope-section{position:relative;isolation:isolate;overflow:hidden;background-image:linear-gradient(90deg,rgba(8,3,20,.94),rgba(14,5,31,.76),rgba(8,3,20,.93)),var(--ow-hope-chest);background-size:cover;background-position:center}
      #purple-diamond-crew.ow-core-hope-section::before{content:'';position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 50% 48%,rgba(157,74,255,.18),transparent 52%)}
      #purple-diamond-crew.ow-core-hope-section>*{position:relative;z-index:1}
      .ow-impact-gallery.ow-core-impact-gallery{align-items:start!important}
      .ow-impact-gallery.ow-core-impact-gallery>img{width:100%!important;max-width:520px!important;margin-inline:auto!important}
      @media (max-width:900px){.ow-core-gallery{grid-template-columns:1fr 1fr}}
      @media (max-width:760px){
        .ow-core-gallery{grid-template-columns:1fr}.ow-core-gallery-section{padding:22px 14px;border-radius:22px}
        .ow-hero-art img,.ow-core-story-image,.ow-core-worldz-art,.ow-core-gallery img,.ow-impact-gallery.ow-core-impact-gallery>img{border-radius:16px}
      }
    `;
    document.head.appendChild(style);
  }

  function renameActionSpreadsSmiles(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      node.nodeValue = node.nodeValue
        .replaceAll('Action Creates Smiles', 'Action Spreads Smiles')
        .replaceAll('ACTION CREATES SMILES', 'ACTION SPREADS SMILES');
    });
  }

  function fixFundraiserLinks(root) {
    root.querySelectorAll('a[href*="gofundme.com/u/cryptouniverse"]').forEach((link) => {
      link.href = GOFUNDME_PROFILE;
    });
  }

  function buildActionGallery(afterNode) {
    if (document.querySelector('[data-core-gallery="action-spreads-smiles"]')) return;
    const section = document.createElement('section');
    section.className = 'ow-core-gallery-section';
    section.dataset.coreGallery = 'action-spreads-smiles';
    section.innerHTML = `
      <header class="ow-core-gallery-heading">
        <p class="eyebrow">ACTION SPREADS SMILES • UGANDA</p>
        <h2>Real care. Real children. Real reasons to keep helping.</h2>
        <p>These approved Action Spreads Smiles images stay together as a dedicated humanitarian feature set across OneWorldz.</p>
      </header>
      <div class="ow-core-gallery"></div>
    `;
    const gallery = section.querySelector('.ow-core-gallery');
    const items = [
      [ASSETS.reagan, 'Reagan and children supported through Action Spreads Smiles in Uganda', 'Reagan & the children'],
      [ASSETS.kindness, 'Children featured in the OneWorldz kindness changes everything campaign artwork', 'Kindness changes everything'],
      [ASSETS.kidsBunk, 'Joyful children shown in the OneWorldz Action Spreads Smiles support artwork', 'A safer, happier future']
    ];
    items.forEach(([src, alt, caption]) => {
      const figure = document.createElement('figure');
      figure.append(image(src, alt, ''));
      const figcaption = document.createElement('figcaption');
      figcaption.textContent = caption;
      figure.append(figcaption);
      gallery.append(figure);
    });
    afterNode.insertAdjacentElement('afterend', section);
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
    renameActionSpreadsSmiles(app);
    fixFundraiserLinks(app);

    hero.src = ASSETS.hero;
    hero.alt = 'OneWorldz — One Vision, helping the people who help people';
    hero.removeAttribute('width');
    hero.removeAttribute('height');

    if (!actionPanel.querySelector('[data-core-art="kindness"]')) {
      const art = image(ASSETS.kindness, 'Action Spreads Smiles — kindness changes everything artwork featuring children', 'ow-core-story-image');
      art.dataset.coreArt = 'kindness';
      actionPanel.prepend(art);
    }

    if (!reaganPanel.querySelector('[data-core-art="reagan"]')) {
      const art = image(ASSETS.reagan, 'Reagan with the children supported through Action Spreads Smiles in Uganda', 'ow-core-story-image');
      art.dataset.coreArt = 'reagan';
      reaganPanel.prepend(art);
    }

    buildActionGallery(reaganPanel.closest('.ow-split-section') || reaganPanel);

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
      impactImage.alt = 'OneWorldz humanitarian feature artwork showing joyful children and practical support';
      impactImage.removeAttribute('width');
      impactImage.removeAttribute('height');
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
  window.setTimeout(() => observer.disconnect(), 8000);
})();

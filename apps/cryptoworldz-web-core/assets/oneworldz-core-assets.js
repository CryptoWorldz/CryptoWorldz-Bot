(() => {
  const host = location.hostname.replace(/^www\./, '').toLowerCase();
  const params = new URLSearchParams(location.search);
  const isOneWorldz = host === 'oneworldz.com' || params.get('site') === 'oneworldz' || params.get('mode') === 'mission';
  if (!isOneWorldz) return;

  const VERSION = '2026-08-09.launch1';
  const ROOT = './assets/images/website-core';
  const ASSETS = {
    hero: `${ROOT}/oneworldz/oneworldz-one-vision-one-future.webp`,
    worldz: `${ROOT}/blockchain/blockchain-worldz-multichain-directory.webp`,
    hopeChest: `${ROOT}/purple-diamond-crew/hope-chest-1927-approved.jpg`,
    reagan: `${ROOT}/action-creates-smiles/action-creates-smiles-reagan-kids.webp`,
    kidsBunk: `${ROOT}/action-creates-smiles/kids-cartoon-bunk-bed.webp`,
    kindness: `${ROOT}/action-creates-smiles/kids-cartoon-kindness-changes-everything.webp`
  };

  const HEROES = [
    ['Just Knate', 'Reno • USA', 'Street support, food, care and practical help for vulnerable people.'],
    ['Sam Weidenhofer', 'Australia', 'Helping everyday people who struggle and deserve a hand.'],
    ['Dylan Thiry', 'Global', 'Building hope and stronger futures through hands-on community action.'],
    ['Victor The Good Boss', 'USA', 'Recovery, hope and healing — helping people move from the streets into support.'],
    ['Bi Phakathi', 'Global', 'Compassion in action, feeding the hungry and lifting communities.'],
    ['MDMotivator', 'USA • Global', 'Kindness, connection and mental-health awareness across communities.'],
    ['Wandera Michael', 'Uganda', 'Supporting food, education, health and brighter futures for children.']
  ];

  const DESTINATIONS = ['Sydney', 'Rome', 'London', 'Egypt', 'New York', 'Reno', 'Uganda'];

  function image(src, alt, className, eager = false) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.className = className;
    return img;
  }

  function installStyles() {
    if (document.querySelector('#oneworldz-core-assets-style')) return;
    const style = document.createElement('style');
    style.id = 'oneworldz-core-assets-style';
    style.textContent = `
      .ow-hero-art{overflow:hidden;border-radius:24px;background:#09030f;display:grid;place-items:center}
      .ow-hero-art img{display:block;width:100%!important;height:auto!important;max-height:none!important;object-fit:contain!important;object-position:center!important;aspect-ratio:auto!important}
      .ow-core-story-image,.ow-core-worldz-art{display:block;width:100%;height:auto!important;border-radius:22px;border:1px solid rgba(191,123,255,.42);box-shadow:0 22px 60px rgba(9,2,22,.38);object-fit:contain!important;object-position:center;background:#09030f}
      .ow-core-story-image{max-height:680px;margin:0 0 1.25rem}
      .ow-core-worldz-art{max-height:780px;margin:1.4rem auto 1.8rem}
      .ow-feature-shell{margin-top:20px;padding:clamp(24px,5vw,58px);border:1px solid rgba(190,136,248,.28);border-radius:28px;background:radial-gradient(circle at 50% 0,rgba(120,42,210,.18),transparent 42%),rgba(12,4,23,.92);box-shadow:0 22px 70px rgba(0,0,0,.35)}
      .ow-feature-head{max-width:920px;margin:0 auto 28px;text-align:center}
      .ow-feature-head .eyebrow{color:#d6a6ff;letter-spacing:.13em}
      .ow-feature-head h2{margin:8px 0 12px;font:800 clamp(1.7rem,4vw,3.3rem)/1.05 Orbitron,sans-serif;letter-spacing:-.035em}
      .ow-feature-head p{margin:0;color:#c6b6d8;line-height:1.55}
      .ow-hero-network{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
      .ow-hero-card{min-height:230px;padding:22px;border:1px solid rgba(204,149,255,.27);border-radius:20px;background:linear-gradient(150deg,rgba(116,37,194,.18),rgba(255,255,255,.025));display:flex;flex-direction:column}
      .ow-hero-card::before{content:'💜';font-size:1.8rem;margin-bottom:18px;filter:drop-shadow(0 0 14px rgba(188,84,255,.6))}
      .ow-hero-card span{color:#d7a6ff;font:700 .65rem Orbitron,sans-serif;letter-spacing:.1em;text-transform:uppercase}
      .ow-hero-card h3{margin:8px 0 8px;font:750 1.05rem Orbitron,sans-serif}
      .ow-hero-card p{margin:0;color:#b7a7c7;line-height:1.45;font-size:.92rem}
      .ow-hero-card strong{margin-top:auto;padding-top:18px;color:#f1c96d;font-size:.8rem}
      .ow-hero-card-featured{grid-column:span 2;padding:0;overflow:hidden;background:linear-gradient(150deg,rgba(116,37,194,.22),rgba(255,255,255,.03))}
      .ow-hero-card-featured::before{display:none!important}
      .ow-hero-card-featured img{display:block;width:100%;height:auto!important;max-height:460px;object-fit:contain!important;object-position:center;background:#08020f;border-bottom:1px solid rgba(204,149,255,.27)}
      .ow-hero-card-featured span,.ow-hero-card-featured h3,.ow-hero-card-featured p,.ow-hero-card-featured strong{margin-left:22px;margin-right:22px}
      .ow-hero-card-featured span{margin-top:18px}.ow-hero-card-featured strong{margin-bottom:22px}
      .ow-destination-frame{position:relative;overflow:hidden;border:1px solid rgba(206,157,255,.34);border-radius:24px;background:#08020f}
      .ow-destination-frame img{display:block;width:100%;height:auto!important;max-height:820px;object-fit:contain!important;object-position:center}
      .ow-destination-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:20px}
      .ow-destination-tags span{padding:9px 14px;border:1px solid rgba(198,136,255,.34);border-radius:999px;background:rgba(121,42,193,.13);color:#ead8f6;font-weight:700}
      .ow-smiles-gallery{display:grid;grid-template-columns:1.25fr .8fr .8fr;gap:14px;align-items:start}
      .ow-smiles-gallery figure{margin:0;overflow:hidden;border-radius:22px;border:1px solid rgba(201,146,255,.28);background:#08020f;box-shadow:0 18px 50px rgba(0,0,0,.32)}
      .ow-smiles-gallery img{display:block;width:100%;height:auto!important;object-fit:contain!important;object-position:center;background:#08020f}
      .ow-smiles-gallery figcaption{padding:13px 15px;color:#cbb9d9;font-size:.86rem;line-height:1.4}
      .ow-smiles-gallery .ow-smiles-main{grid-row:span 2}
      #purple-diamond-crew.ow-core-hope-section{position:relative;isolation:isolate;overflow:hidden;background-image:linear-gradient(90deg,rgba(8,3,20,.88),rgba(14,5,31,.58),rgba(8,3,20,.88)),var(--ow-hope-chest);background-size:cover;background-position:center}
      #purple-diamond-crew.ow-core-hope-section::before{content:'';position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 50% 48%,rgba(157,74,255,.16),transparent 52%)}
      #purple-diamond-crew.ow-core-hope-section>*{position:relative;z-index:1}
      .ow-impact-gallery.ow-core-impact-gallery{align-items:stretch}
      .ow-impact-gallery.ow-core-impact-gallery>img{width:min(100%,520px);height:auto!important;min-height:0!important;max-height:680px;object-fit:contain!important;object-position:center;border-radius:24px;background:#08020f}
      @media(max-width:1120px){.ow-hero-network{grid-template-columns:repeat(2,minmax(0,1fr))}.ow-smiles-gallery{grid-template-columns:1fr 1fr}.ow-smiles-gallery .ow-smiles-main{grid-column:1/-1;grid-row:auto}}
      @media(max-width:760px){.ow-core-story-image,.ow-core-worldz-art{max-height:none}.ow-feature-shell{padding:24px 16px;border-radius:22px}.ow-hero-network{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;gap:12px}.ow-hero-card{flex:0 0 min(82vw,330px);scroll-snap-align:start}.ow-hero-card-featured{flex:0 0 min(88vw,380px);grid-column:auto}.ow-hero-card-featured img{max-height:none}.ow-smiles-gallery{grid-template-columns:1fr}.ow-destination-frame img,.ow-smiles-gallery img,.ow-hero-art img{width:100%!important;height:auto!important;object-fit:contain!important}.ow-impact-gallery.ow-core-impact-gallery>img{width:100%;max-height:none}}
    `;
    document.head.appendChild(style);
  }

  function renameSmiles() {
    document.querySelectorAll('#app .eyebrow,#app h1,#app h2,#app h3,#app p').forEach(el => {
      if (el.children.length) return;
      el.textContent = el.textContent
        .replaceAll('ACTION CREATES SMILES', 'ACTION SPREADS SMILES')
        .replaceAll('Action Creates Smiles', 'Action Spreads Smiles');
    });
  }

  function buildHeroNetwork() {
    if (document.querySelector('#oneworldz-heroes')) return;
    const worldz = document.querySelector('#worldz');
    if (!worldz) return;
    const section = document.createElement('section');
    section.className = 'ow-feature-shell';
    section.id = 'oneworldz-heroes';
    section.innerHTML = `
      <header class="ow-feature-head"><p class="eyebrow">ONEWORLDZ HEROES</p><h2>Helping the People Who Help People.</h2><p>OneWorldz shines a light on people already doing the work — feeding, supporting, rebuilding, encouraging and creating real change.</p></header>
      <div class="ow-hero-network">
        <article class="ow-hero-card ow-hero-card-featured" data-oneworldz-hero="reagan-kauja"><img src="${ASSETS.reagan}" alt="Reagan Kauja with children supported through Action Spreads Smiles in Uganda" loading="lazy" decoding="async"><span>Uganda • Action Spreads Smiles</span><h3>Reagan Kauja</h3><p>Founder and community leader helping children through food, shelter, education, medical support and practical care.</p><strong>OneWorldz Hero Feature</strong></article>
        ${HEROES.map(([name, place, copy]) => `<article class="ow-hero-card"><span>${place}</span><h3>${name}</h3><p>${copy}</p><strong>OneWorldz Hero Feature</strong></article>`).join('')}
      </div>`;
    worldz.before(section);
  }

  function buildDestinations() {
    if (document.querySelector('#oneworldz-destinations')) return;
    const heroes = document.querySelector('#oneworldz-heroes');
    if (!heroes) return;
    const section = document.createElement('section');
    section.className = 'ow-feature-shell';
    section.id = 'oneworldz-destinations';
    section.innerHTML = `<header class="ow-feature-head"><p class="eyebrow">DESTINATIONS OF HOPE</p><h2>Everywhere Can Be Somewhere We Help.</h2><p>From iconic world cities to communities far from the spotlight, kindness has no border.</p></header><div class="ow-destination-frame"><img src="${ASSETS.worldz}" alt="OneWorldz global destinations and connected communities" loading="lazy" decoding="async"></div><div class="ow-destination-tags">${DESTINATIONS.map(place => `<span>${place}</span>`).join('')}</div>`;
    heroes.after(section);
  }

  function buildSmilesGallery() {
    if (document.querySelector('#action-spreads-smiles-gallery')) return;
    const reaganPanel = document.querySelector('#action-spreads-smiles');
    if (!reaganPanel) return;
    const section = document.createElement('section');
    section.className = 'ow-feature-shell';
    section.id = 'action-spreads-smiles-gallery';
    section.innerHTML = `<header class="ow-feature-head"><p class="eyebrow">ACTION SPREADS SMILES • UGANDA</p><h2>Food. Shelter. Water. Education. Medical Care. Community.</h2><p>The Action Spreads Smiles feature is kept together as its own humanitarian story inside OneWorldz, with Reagan and the children clearly identified.</p></header><div class="ow-smiles-gallery"><figure class="ow-smiles-main"><img src="${ASSETS.reagan}" alt="Reagan with children supported through Action Spreads Smiles in Uganda" loading="lazy" decoding="async"><figcaption>Reagan and the children — the main Action Spreads Smiles feature.</figcaption></figure><figure><img src="${ASSETS.kindness}" alt="Action Spreads Smiles kindness artwork featuring children" loading="lazy" decoding="async"><figcaption>Kindness changes everything.</figcaption></figure><figure><img src="${ASSETS.kidsBunk}" alt="Joyful children in the Action Spreads Smiles visual story" loading="lazy" decoding="async"><figcaption>Children, safety and brighter futures.</figcaption></figure></div>`;
    reaganPanel.after(section);
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
    renameSmiles();

    hero.src = ASSETS.hero;
    hero.alt = 'OneWorldz — One Vision, helping the people who help people';
    hero.removeAttribute('width'); hero.removeAttribute('height'); hero.loading = 'eager'; hero.decoding = 'async';

    if (!actionPanel.querySelector('[data-core-art="kindness"]')) { const art = image(ASSETS.kindness, 'Action Spreads Smiles — kindness changes everything artwork featuring children', 'ow-core-story-image'); art.dataset.coreArt = 'kindness'; actionPanel.prepend(art); }
    if (!reaganPanel.querySelector('[data-core-art="reagan"]')) { const art = image(ASSETS.reagan, 'Reagan Kauja with the children supported through Action Spreads Smiles in Uganda', 'ow-core-story-image'); art.dataset.coreArt = 'reagan'; reaganPanel.prepend(art); }

    pdc.classList.add('ow-core-hope-section');
    pdc.style.setProperty('--ow-hope-chest', `url("${ASSETS.hopeChest}")`);

    if (!worldz.querySelector('[data-core-art="worldz"]')) { const art = image(ASSETS.worldz, 'OneWorldz and CryptoWorldz connected Worldz directory artwork', 'ow-core-worldz-art'); art.dataset.coreArt = 'worldz'; worldz.querySelector('.ow-section-heading')?.after(art); }

    const impactImage = impact.querySelector('img');
    if (impactImage) { impactImage.src = ASSETS.kidsBunk; impactImage.alt = 'OneWorldz humanitarian artwork showing joyful children and practical support'; impactImage.removeAttribute('width'); impactImage.removeAttribute('height'); }
    impact.classList.add('ow-core-impact-gallery');

    buildHeroNetwork(); buildDestinations(); buildSmilesGallery(); renameSmiles();

    document.querySelectorAll('img').forEach(img => {
      if (img.closest('.ow-hero-art,.ow-feature-shell,.ow-core-impact-gallery') || img.classList.contains('ow-core-story-image') || img.classList.contains('ow-core-worldz-art')) {
        img.style.height = 'auto'; img.style.objectFit = 'contain'; img.style.objectPosition = 'center';
      }
    });

    app.dataset.coreAssets = VERSION;
    return true;
  }

  if (apply()) return;
  const observer = new MutationObserver(() => { if (apply()) observer.disconnect(); });
  const app = document.querySelector('#app');
  if (app) observer.observe(app, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 8000);
})();

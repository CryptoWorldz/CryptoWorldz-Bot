(() => {
  const host = location.hostname.replace(/^www\./, '').toLowerCase();
  const pathName = location.pathname.replace(/\/+$/, '').toLowerCase();
  const params = new URLSearchParams(location.search);

  const hostMap = {
    'cryptoworldz.xyz': 'cryptoworldz',
    'cryptobotz.cryptoworldz.xyz': 'cryptoworldz',
    'oneworldz.com': 'oneworldz',
    'purplediamondcrew.com': 'purplediamondcrew',
    'solworldz.xyz': 'solworldz',
    'ethworldz.xyz': 'ethworldz',
    'baseworldz.xyz': 'baseworldz',
    'bnbworldz.xyz': 'bnbworldz',
    'xrpworldz.xyz': 'xrpworldz',
    'suiworldz.xyz': 'suiworldz',
    'hyperworldz.xyz': 'hyperworldz',
    'robinworldz.xyz': 'robinworldz',
    'bitcoinworldz.xyz': 'bitworldz',
    'bitworldz.xyz': 'bitworldz',
    'impactbased.oneworldz.com': 'impactbased',
    'law.oneworldz.com': 'robinhoodlaw',
    'learn.oneworldz.com': 'learnworldz'
  };

  const previewMap = {
    '/purple-diamond-crew': 'purplediamondcrew',
    '/worldz/oneworldz': 'oneworldz',
    '/worldz/cryptoworldz': 'cryptoworldz',
    '/worldz/solworldz': 'solworldz',
    '/worldz/ethworldz': 'ethworldz',
    '/worldz/baseworldz': 'baseworldz',
    '/worldz/bnbworldz': 'bnbworldz',
    '/worldz/xrpworldz': 'xrpworldz',
    '/worldz/suiworldz': 'suiworldz',
    '/worldz/hyperworldz': 'hyperworldz',
    '/worldz/robinworldz': 'robinworldz',
    '/worldz/bitcoinworldz': 'bitworldz',
    '/worldz/bitworldz': 'bitworldz',
    '/worldz/impactbased': 'impactbased',
    '/worldz/law': 'robinhoodlaw',
    '/worldz/learn': 'learnworldz'
  };

  const imageMap = {
    cryptoworldz: 'assets/worldz-master/cryptoworldz/command-centre-five.png',
    oneworldz: 'assets/worldz-master/oneworldz/oneworldz-master.png',
    purplediamondcrew: 'assets/worldz-master/purple-diamond-crew/action-team.png',
    solworldz: 'assets/worldz-master/blockchains/solworldz.png',
    ethworldz: 'assets/worldz-master/blockchains/ethworldz.png',
    baseworldz: 'assets/worldz-master/blockchains/baseworldz.png',
    bnbworldz: 'assets/worldz-master/blockchains/bnbworldz.png',
    xrpworldz: 'assets/worldz-master/blockchains/xrpworldz.png',
    suiworldz: 'assets/worldz-master/blockchains/suiworldz.png',
    hyperworldz: 'assets/worldz-master/blockchains/hyperworldz.png',
    robinworldz: 'assets/worldz-master/blockchains/robinworldz.png',
    bitworldz: 'assets/worldz-master/blockchains/bitworldz.png',
    impactbased: 'assets/worldz-master/cryptoworldz/impactbased.png',
    robinhoodlaw: 'assets/worldz-master/tokens/robin-hood-law.png',
    learnworldz: 'assets/worldz-master/oneworldz/oneworldz-gpt.png'
  };

  function activeKey() {
    const raw = String(params.get('world') || params.get('site') || '').toLowerCase();
    const aliases = { bitcoinworldz: 'bitworldz', impact: 'impactbased', law: 'robinhoodlaw', learn: 'learnworldz', pdc: 'purplediamondcrew' };
    const requested = aliases[raw] || raw;
    if (requested && imageMap[requested]) return requested;
    if (previewMap[pathName]) return previewMap[pathName];
    if (params.get('mode') === 'impact') return 'impactbased';
    if (params.get('mode') === 'law') return 'robinhoodlaw';
    if (params.get('mode') === 'learn') return 'learnworldz';
    return hostMap[host] || 'cryptoworldz';
  }

  function assetUrl(rel) {
    return new URL(rel, `${location.origin}/`).href;
  }

  function applyMasterImage() {
    const key = activeKey();
    const rel = imageMap[key];
    if (!rel) return;

    const existing = document.querySelector('.worldz-official-art');
    if (existing && !existing.dataset.masterReplaced) {
      const figure = document.createElement('figure');
      figure.className = 'worldz-official-art worldz-master-art';
      figure.dataset.masterReplaced = 'true';
      figure.innerHTML = `<img src="${assetUrl(rel)}" alt="Official ${key} master artwork" decoding="async" fetchpriority="high" />`;
      existing.replaceWith(figure);
    }

    const hero = document.querySelector('#app .ow-hero, #app .pdc-hero, #app .hero, #app .compact-hero, #app .mission-hero');
    if (!hero || hero.querySelector('.worldz-master-hero')) return;

    if (key === 'oneworldz' || key === 'purplediamondcrew') {
      const figure = document.createElement('figure');
      figure.className = 'worldz-master-hero';
      figure.innerHTML = `<img src="${assetUrl(rel)}" alt="Official ${key} master artwork" decoding="async" fetchpriority="high" />`;
      hero.appendChild(figure);
    }
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applyMasterImage();
    });
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  schedule();
})();

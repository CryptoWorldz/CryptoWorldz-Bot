(() => {
  const LOCAL_MEDIA = {
    mission: '/assets/media/pdc-mission-board.webp',
    chest: '/assets/media/pdc-hope-chest.webp',
    crest: '/assets/media/pdc-crest.webp'
  };

  function applyVerifiedBackground(stage, source, label) {
    if (!stage) return;
    const probe = new Image();
    probe.decoding = 'async';
    probe.onload = () => {
      if (probe.naturalWidth < 300 || probe.naturalHeight < 200) {
        stage.dataset.masterLoaded = 'false';
        return;
      }
      stage.style.backgroundImage = `linear-gradient(180deg,rgba(7,3,12,.05),rgba(7,3,12,.8)),url("${source}")`;
      stage.dataset.masterLoaded = 'true';
      if (label) stage.setAttribute('aria-label', label);
    };
    probe.onerror = () => { stage.dataset.masterLoaded = 'false'; };
    probe.src = `${source}?v=approved-20260808`;
  }

  document.querySelectorAll('img.token-logo[data-optional-logo]').forEach((img) => {
    const reveal = () => { img.dataset.loaded = 'true'; };
    const remove = () => img.remove();
    if (img.complete) {
      if (img.naturalWidth > 0) reveal(); else remove();
    } else {
      img.addEventListener('load', reveal, { once: true });
      img.addEventListener('error', remove, { once: true });
    }
  });

  const archive = document.querySelector('details[data-mobile-collapse]');
  if (archive) {
    const mq = window.matchMedia('(max-width:620px)');
    const setArchiveState = (mobile) => {
      if (mobile) archive.removeAttribute('open');
      else archive.setAttribute('open', '');
    };
    setArchiveState(mq.matches);
    mq.addEventListener?.('change', (event) => setArchiveState(event.matches));
  }

  applyVerifiedBackground(
    document.querySelector('.hero .art'),
    LOCAL_MEDIA.mission,
    'Purple Diamond Crew approved mission board artwork'
  );

  applyVerifiedBackground(
    document.querySelector('[data-hope-chest-master]'),
    LOCAL_MEDIA.chest,
    'OneWorldz Hope Chest preserving treasured legacy tokens'
  );

  const brand = document.querySelector('.brand .diamond');
  if (brand) {
    const crest = new Image();
    crest.alt = '';
    crest.decoding = 'async';
    crest.onload = () => {
      if (crest.naturalWidth < 200 || crest.naturalHeight < 200) return;
      brand.style.background = `url("${LOCAL_MEDIA.crest}?v=approved-20260808") center/cover no-repeat`;
      brand.dataset.masterLoaded = 'true';
      const fallback = brand.querySelector('span');
      if (fallback) fallback.style.opacity = '0';
    };
    crest.src = `${LOCAL_MEDIA.crest}?v=approved-20260808`;
  }
})();

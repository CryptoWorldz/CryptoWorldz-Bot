(() => {
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
})();

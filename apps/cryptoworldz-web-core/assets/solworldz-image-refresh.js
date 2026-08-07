(() => {
  const hostname = location.hostname.replace(/^www\./, '').toLowerCase();
  if (hostname !== 'solworldz.xyz') return;

  const VERSION = '20260808-img2';
  const imagePath = '/assets/images/';

  function versionUrl(value, retry = false) {
    if (!value) return value;
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin || !url.pathname.includes(imagePath)) return value;
      url.searchParams.set('swimg', VERSION);
      if (retry) url.searchParams.set('retry', '1');
      return url.href;
    } catch {
      return value;
    }
  }

  function refreshImage(img) {
    if (!(img instanceof HTMLImageElement) || img.dataset.swImageRefresh === VERSION) return;
    img.dataset.swImageRefresh = VERSION;
    const source = img.getAttribute('src');
    if (source) img.setAttribute('src', versionUrl(source));
    img.addEventListener('error', () => {
      if (img.dataset.swImageRetry === VERSION) return;
      img.dataset.swImageRetry = VERSION;
      const current = img.getAttribute('src');
      if (current) img.setAttribute('src', versionUrl(current, true));
    });
  }

  function refreshSource(source) {
    if (!(source instanceof HTMLSourceElement) || source.dataset.swImageRefresh === VERSION) return;
    source.dataset.swImageRefresh = VERSION;
    const srcset = source.getAttribute('srcset');
    if (!srcset) return;
    const rewritten = srcset
      .split(',')
      .map(part => {
        const bits = part.trim().split(/\s+/);
        bits[0] = versionUrl(bits[0]);
        return bits.join(' ');
      })
      .join(', ');
    source.setAttribute('srcset', rewritten);
  }

  function scan(root) {
    if (root instanceof HTMLImageElement) refreshImage(root);
    if (root instanceof HTMLSourceElement) refreshSource(root);
    if (!(root instanceof Element || root instanceof Document)) return;
    root.querySelectorAll('img').forEach(refreshImage);
    root.querySelectorAll('source[srcset]').forEach(refreshSource);
  }

  scan(document);
  new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (node instanceof Element) scan(node);
      });
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();

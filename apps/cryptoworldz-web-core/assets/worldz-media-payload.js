(() => {
  const VERSION = '2026-08-09-media-payload-2';
  const MANIFEST_URL = `/assets/media-payload/manifest.json?v=${VERSION}`;
  const cache = new Map();
  let manifestPromise;

  function manifest() {
    if (!manifestPromise) {
      manifestPromise = fetch(MANIFEST_URL, { cache: 'no-store' })
        .then(response => {
          if (!response.ok) throw new Error(`media manifest ${response.status}`);
          return response.json();
        })
        .then(data => data && data.assets ? data.assets : {})
        .catch(() => ({}));
    }
    return manifestPromise;
  }

  function localPath(value) {
    if (!value || value.startsWith('data:') || value.startsWith('blob:')) return null;
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin) return null;
      return url.pathname;
    } catch {
      return null;
    }
  }

  function decodes(dataUrl) {
    return new Promise(resolve => {
      const probe = new Image();
      let settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      probe.onload = () => finish(probe.naturalWidth > 0 && probe.naturalHeight > 0);
      probe.onerror = () => finish(false);
      probe.src = dataUrl;
      setTimeout(() => finish(false), 8000);
    });
  }

  async function resolve(value) {
    const key = localPath(value);
    if (!key) return null;
    if (cache.has(key)) return cache.get(key);

    const assets = await manifest();
    const entry = assets[key];
    if (!entry || !Array.isArray(entry.parts) || !entry.parts.length || !entry.mime) return null;

    const promise = Promise.all(entry.parts.map(part => fetch(`${part}?v=${VERSION}`, { cache: 'no-store' }).then(response => {
      if (!response.ok) throw new Error(`${part} ${response.status}`);
      return response.text();
    })))
      .then(async parts => {
        const dataUrl = `data:${entry.mime};base64,${parts.join('').replace(/\s+/g, '')}`;
        return await decodes(dataUrl) ? dataUrl : null;
      })
      .catch(() => null);

    cache.set(key, promise);
    return promise;
  }

  function firstCandidate(srcset) {
    if (!srcset) return null;
    const first = srcset.split(',')[0].trim();
    return first ? first.split(/\s+/)[0] : null;
  }

  async function hydrateImage(img) {
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.worldzPayload === VERSION) return;
    img.dataset.worldzPayload = VERSION;
    const original = img.getAttribute('src');
    const dataUrl = await resolve(original);
    if (dataUrl) img.setAttribute('src', dataUrl);
  }

  async function hydratePicture(picture) {
    if (!(picture instanceof HTMLPictureElement)) return;
    if (picture.dataset.worldzPayload === VERSION) return;
    picture.dataset.worldzPayload = VERSION;

    const img = picture.querySelector('img');
    if (!img) return;

    let selected = null;
    for (const source of picture.querySelectorAll('source[srcset]')) {
      const media = source.getAttribute('media');
      if (!media || matchMedia(media).matches) {
        selected = firstCandidate(source.getAttribute('srcset'));
        if (selected) break;
      }
    }
    selected ||= img.getAttribute('src');
    const dataUrl = await resolve(selected);
    if (!dataUrl) {
      await hydrateImage(img);
      return;
    }

    picture.querySelectorAll('source[srcset]').forEach(source => source.removeAttribute('srcset'));
    img.dataset.worldzPayload = VERSION;
    img.setAttribute('src', dataUrl);
  }

  function scan(root = document) {
    if (root instanceof HTMLPictureElement) hydratePicture(root);
    if (root instanceof HTMLImageElement && !root.closest('picture')) hydrateImage(root);
    if (!(root instanceof Element || root instanceof Document)) return;
    root.querySelectorAll('picture').forEach(hydratePicture);
    root.querySelectorAll('img:not(picture img)').forEach(hydrateImage);
  }

  window.WorldzMediaPayload = { resolve, scan, version: VERSION };
  scan(document);

  new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (node instanceof Element) scan(node);
      });
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();

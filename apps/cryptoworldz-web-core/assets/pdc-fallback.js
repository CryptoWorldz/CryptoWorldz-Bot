(() => {
  const params = new URLSearchParams(location.search);
  const requested = params.get('site') === 'pdc' || window.__WORLDZ_FALLBACK_SITE__ === 'purplediamondcrew';
  if (!requested) return;

  const gate = "if (hostname !== 'purplediamondcrew.com') return;";
  const replacement = "if (hostname !== 'purplediamondcrew.com' && new URLSearchParams(location.search).get('site') !== 'pdc' && window.__WORLDZ_FALLBACK_SITE__ !== 'purplediamondcrew') return;";

  async function load(relativePath) {
    const response = await fetch(new URL(relativePath, import.meta.url), { cache: 'no-store' });
    if (!response.ok) throw new Error(`${relativePath} could not be loaded (${response.status})`);
    const source = (await response.text()).replace(gate, replacement);
    const script = document.createElement('script');
    script.dataset.pdcFallback = relativePath;
    script.textContent = source;
    document.head.appendChild(script);
  }

  load('./pdc-site.js')
    .then(() => load('./pdc-asset.js'))
    .catch((error) => {
      console.error('Purple Diamond Crew fallback failed to load', error);
      const app = document.querySelector('#app');
      if (app) app.innerHTML = '<section class="error-panel"><h1>Purple Diamond Crew</h1><p>The fallback package could not be loaded. Please try again shortly.</p></section>';
    });
})();

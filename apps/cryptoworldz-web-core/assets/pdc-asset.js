(() => {
  const hostname = location.hostname.replace(/^www\./, '').toLowerCase();
  if (hostname !== 'purplediamondcrew.com') return;

  const config = window.CRYPTOWORLDZ_CONFIG;
  const app = document.querySelector('#app');
  if (!config || !app) return;

  let hopeChestAsset = null;

  async function loadHopeChestAsset() {
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/site_assets?select=data_uri,alt_text&slug=eq.pdc-hope-chest&is_public=eq.true&limit=1`,
      {
        headers: {
          apikey: config.supabasePublishableKey,
          Authorization: `Bearer ${config.supabasePublishableKey}`,
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) throw new Error(`Hope Chest asset could not be loaded (${response.status})`);
    const rows = await response.json();
    const asset = rows[0];
    if (!asset?.data_uri?.startsWith('data:image/jpeg;base64,')) {
      throw new Error('Hope Chest asset failed its image-data validation');
    }
    return asset;
  }

  function applyHopeChestAsset() {
    const section = app.querySelector('.hope-chest-page');
    if (!section || !hopeChestAsset) return false;

    section.style.backgroundImage = [
      'linear-gradient(180deg, rgba(7, 3, 12, .18), rgba(7, 3, 12, .87))',
      `url("${hopeChestAsset.data_uri}")`
    ].join(', ');
    section.setAttribute(
      'aria-label',
      hopeChestAsset.alt_text || 'OneWorldz Hope Chest preserving treasured legacy tokens'
    );
    const data = section.dataset;
    data.hopeChestAsset = 'verified';
    return true;
  }

  const observer = new MutationObserver(() => applyHopeChestAsset());
  observer.observe(app, { childList: true, subtree: true });

  loadHopeChestAsset()
    .then((asset) => {
      hopeChestAsset = asset;
      applyHopeChestAsset();
    })
    .catch((error) => {
      console.error('OneWorldz Hope Chest background failed to load', error);
    });
})();
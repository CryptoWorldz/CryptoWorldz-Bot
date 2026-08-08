(() => {
  const SUPABASE_URL = 'https://hknymhhyqldtzmplzuzh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_3ognbqSCTAcAnLHOeKZp8A_IgriwUJV';

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

  const stage = document.querySelector('[data-hope-chest-master]');
  if (!stage) return;

  fetch(`${SUPABASE_URL}/rest/v1/site_assets?select=data_uri,alt_text&slug=eq.pdc-hope-chest&is_public=eq.true&limit=1`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json'
    }
  })
    .then((response) => {
      if (!response.ok) throw new Error(`Hope Chest HTTP ${response.status}`);
      return response.json();
    })
    .then((rows) => {
      const asset = rows[0];
      if (!asset?.data_uri?.startsWith('data:image/jpeg;base64,') || asset.data_uri.length < 10000) {
        throw new Error('Hope Chest master failed validation');
      }
      stage.style.backgroundImage = `linear-gradient(180deg,rgba(7,3,12,.05),rgba(7,3,12,.8)),url("${asset.data_uri}")`;
      stage.dataset.masterLoaded = 'true';
      stage.setAttribute('aria-label', asset.alt_text || 'OneWorldz Hope Chest preserving treasured legacy tokens');
    })
    .catch(() => {
      stage.dataset.masterLoaded = 'false';
    });
})();

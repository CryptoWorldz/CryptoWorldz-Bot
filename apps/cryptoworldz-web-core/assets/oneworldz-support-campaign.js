(() => {
  const hostname = location.hostname.replace(/^www\./, '').toLowerCase();
  const params = new URLSearchParams(location.search);
  const isOneWorldz = hostname === 'oneworldz.com' || document.body.dataset.worldzMode === 'mission' || params.get('mode') === 'mission';
  if (!isOneWorldz) return;

  const PARTS = [
    './assets/campaign/areas-support/00.b64',
    './assets/campaign/areas-support/01.b64',
    './assets/campaign/areas-support/02.b64',
    './assets/campaign/areas-support/03.b64'
  ];

  async function loadApprovedSupportImage(img) {
    try {
      const parts = await Promise.all(PARTS.map(async (url) => {
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`asset ${response.status}`);
        return (await response.text()).trim();
      }));
      img.src = `data:image/avif;base64,${parts.join('')}`;
      img.dataset.assetReady = 'true';
    } catch (error) {
      console.error('OneWorldz support image failed to load', error);
      img.closest('.ow-support-visual')?.classList.add('ow-support-visual--failed');
    }
  }

  function ensureMeta() {
    document.title = 'OneWorldz — One Vision | Helping the People Who Help People';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = 'OneWorldz connects people, projects and communities around food, clean water, education, medical care and stronger communities.';
  }

  function mount() {
    const app = document.querySelector('#app');
    if (!app || !app.querySelector('.ow-hero')) return false;
    if (document.querySelector('#support')) return true;

    ensureMeta();

    const section = document.createElement('section');
    section.id = 'support';
    section.className = 'wx-panel ow-support-panel';
    section.innerHTML = `
      <div class="ow-support-copy">
        <span class="wx-kicker">AREAS OF SUPPORT</span>
        <h2>Food • Water • Education • Medical Care • Community</h2>
        <p>OneWorldz focuses practical support where it can make a direct human difference — helping people and communities meet essential needs and build stronger futures.</p>
        <div class="ow-support-links">
          <a class="wx-btn wx-btn-primary" href="/donate/">Support the Mission</a>
          <a class="wx-btn" href="/help/">Ways to Help</a>
        </div>
      </div>
      <div class="ow-support-visual">
        <img class="ow-support-image" alt="OneWorldz Areas of Support — food, clean water, education, medical care and community" width="768" height="768" loading="lazy" decoding="async" />
      </div>
    `;

    const action = app.querySelector('#action');
    if (action) action.before(section);
    else app.appendChild(section);

    const nav = app.querySelector('.ow-nav-links');
    if (nav && !nav.querySelector('a[href="#support"]')) {
      const link = document.createElement('a');
      link.href = '#support';
      link.textContent = 'Support';
      nav.appendChild(link);
    }

    const img = section.querySelector('.ow-support-image');
    loadApprovedSupportImage(img);
    return true;
  }

  const style = document.createElement('style');
  style.textContent = `
    .ow-support-panel{display:grid;grid-template-columns:minmax(0,.82fr) minmax(360px,1.18fr);gap:clamp(22px,4vw,52px);align-items:center;padding:clamp(28px,5vw,64px);overflow:hidden}
    .ow-support-copy h2{margin:8px 0 14px;font-size:clamp(2rem,4vw,4rem);line-height:1.02;letter-spacing:-.04em}
    .ow-support-copy p{max-width:700px;color:var(--wx-muted);font-size:clamp(1rem,1.45vw,1.14rem);line-height:1.7}
    .ow-support-links{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}
    .ow-support-visual{width:100%;max-width:768px;justify-self:end;border-radius:24px;overflow:hidden;border:1px solid rgba(196,181,253,.22);box-shadow:0 28px 80px rgba(5,6,20,.42),0 0 55px rgba(124,58,237,.12);background:#070b1b;aspect-ratio:1/1}
    .ow-support-image{display:block;width:100%;height:100%;object-fit:cover}
    .ow-support-visual--failed{display:none}
    @media (max-width:860px){.ow-support-panel{grid-template-columns:1fr;padding:24px}.ow-support-visual{justify-self:center;max-width:680px;border-radius:20px}.ow-support-copy{text-align:left}}
    @media (max-width:560px){.ow-support-panel{padding:18px;gap:18px}.ow-support-copy h2{font-size:clamp(1.85rem,10vw,2.8rem)}.ow-support-links .wx-btn{flex:1;min-width:145px;text-align:center}.ow-support-visual{border-radius:16px}}
  `;
  document.head.appendChild(style);

  if (!mount()) {
    const observer = new MutationObserver(() => {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }
})();

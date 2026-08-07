(() => {
  const host = location.hostname.replace(/^www\./, '').toLowerCase();
  if (host !== 'purplediamondcrew.com') return;

  const nav = document.querySelector('#main-nav');
  const HQ = 'https://t.me/CryptoWorldzHQ';
  const BOT = 'https://t.me/CryptoWorldzBot';
  const SMILES = 'https://gofund.me/actioncreatesmiles';

  function ensureNav() {
    if (!nav) return;
    const wanted = [
      ['Help the People', '?page=help'],
      ['Token Feature', '?page=tokens'],
      ['Visit ImpactBased', 'https://impactbased.oneworldz.com'],
      ['Visit OneWorldz', 'https://oneworldz.com'],
      ['Zed HQ', HQ]
    ];
    for (const [label, href] of wanted) {
      if ([...nav.querySelectorAll('a')].some(a => a.textContent.trim() === label)) continue;
      const a = document.createElement('a');
      a.textContent = label;
      a.href = href;
      if (href.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      nav.appendChild(a);
    }
  }

  function normalizeLinks() {
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href.includes('t.me/CryptoWorldzRaaiiiddTeam') || href.includes('cryptobotz.cryptoworldz.xyz')) {
        a.href = href.includes('cryptobotz') ? BOT : HQ;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      if (href.includes('gofund.me/65129e58a')) {
        a.href = SMILES;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
    });
  }

  const apply = () => { ensureNav(); normalizeLinks(); };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 9000);
})();

(() => {
  const host = location.hostname.replace(/^www\./, '').toLowerCase();
  if (host !== 'cryptoworldz.xyz' && new URLSearchParams(location.search).get('world') !== 'cryptoworldz') return;
  const ROOT = './assets/images/website-core';
  const heroParts = [1,2,3].map(n => `${ROOT}/cryptoworldz/payload/hero.part${String(n).padStart(2,'0')}.b64`);
  const chainArt = `${ROOT}/blockchain/blockchain-worldz-multichain-directory.webp`;
  const loadHero = async () => {
    const chunks = await Promise.all(heroParts.map(p => fetch(p).then(r => { if (!r.ok) throw new Error(p); return r.text(); })));
    return `data:image/webp;base64,${chunks.join('')}`;
  };
  const style = document.createElement('style');
  style.textContent = `.cw-library-art{display:block;width:min(100%,1040px);height:auto;margin:22px auto;border-radius:22px;border:1px solid rgba(189,103,255,.5);box-shadow:0 22px 64px rgba(38,5,70,.5);background:#09020f}.cw-library-art--hero{max-height:520px;object-fit:cover}.cw-library-art--chain{max-height:620px;object-fit:contain;background:rgba(8,2,18,.92)}@media(max-width:720px){.cw-library-art{border-radius:15px;margin:15px auto}.cw-library-art--hero{max-height:360px}}`;
  document.head.appendChild(style);
  async function apply(){
    const app=document.querySelector('#app');
    const hero=document.querySelector('.hero.compact-hero') || document.querySelector('.hero');
    const system=document.querySelector('.worldz-system-section');
    if(!app||!hero) return false;
    if(app.dataset.cwLibraryArt==='2026-08-07.2') return true;
    const heroSrc=await loadHero();
    if(!hero.querySelector('[data-cw-library="hero"]')){
      const img=document.createElement('img'); img.src=heroSrc; img.alt='CryptoWorldz — We Need You, latest multi-chain CryptoWorldz artwork'; img.className='cw-library-art cw-library-art--hero'; img.dataset.cwLibrary='hero';
      (hero.querySelector('.trust-strip')||hero.lastElementChild)?.after(img);
    }
    if(system && !system.querySelector('[data-cw-library="chains"]')){
      const img=document.createElement('img'); img.src=chainArt; img.alt='CryptoWorldz blockchain Worldz multi-chain ecosystem artwork'; img.className='cw-library-art cw-library-art--chain'; img.dataset.cwLibrary='chains';
      (system.querySelector('.worldz-system-heading')||system.firstElementChild)?.after(img);
    }
    app.dataset.cwLibraryArt='2026-08-07.2'; return true;
  }
  const run=()=>apply().catch(console.error);
  run(); const o=new MutationObserver(run); const app=document.querySelector('#app'); if(app)o.observe(app,{childList:true,subtree:true}); setTimeout(()=>o.disconnect(),7000);
})();

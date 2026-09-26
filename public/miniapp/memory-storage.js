(() => {
  'use strict';

  const tgMemory = window.Telegram && window.Telegram.WebApp;
  const WORLDZ_KEY_PREFIXES = [
    'worldz', 'cryptoworldz', 'zed', 'max', 'fullscope', 'worldzlaunchpad', 'cw:'
  ];
  const WORLDZ_CACHE_MARKERS = [
    'worldz', 'cryptoworldz', 'miniapp', 'zed', 'fullscope', 'launchpad'
  ];

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[character]));

  function notify(message) {
    if (tgMemory && typeof tgMemory.showAlert === 'function') tgMemory.showAlert(message);
    else window.alert(message);
  }

  function bytesForStorage(storage) {
    let total = 0;
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i) || '';
      const value = storage.getItem(key) || '';
      total += (key.length + value.length) * 2;
    }
    return total;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B','KB','MB','GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
  }

  function isWorldzKey(key) {
    const normalized = String(key || '').toLowerCase();
    return WORLDZ_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  }

  function isWorldzCache(name) {
    const normalized = String(name || '').toLowerCase();
    return WORLDZ_CACHE_MARKERS.some((marker) => normalized.includes(marker));
  }

  async function scanStorage() {
    const localKeys = [];
    const sessionKeys = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) localKeys.push(localStorage.key(i));
    } catch {}
    try {
      for (let i = 0; i < sessionStorage.length; i += 1) sessionKeys.push(sessionStorage.key(i));
    } catch {}

    let cacheNames = [];
    if ('caches' in window) {
      try { cacheNames = await caches.keys(); } catch {}
    }

    return {
      localCount: localKeys.filter(isWorldzKey).length,
      localBytes: (() => { try { return bytesForStorage(localStorage); } catch { return 0; } })(),
      sessionCount: sessionKeys.length,
      sessionBytes: (() => { try { return bytesForStorage(sessionStorage); } catch { return 0; } })(),
      cacheNames,
      worldzCaches: cacheNames.filter(isWorldzCache)
    };
  }

  async function clearSession() {
    try { sessionStorage.clear(); return true; } catch { return false; }
  }

  async function clearWorldzLocal() {
    let removed = 0;
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
      keys.filter(isWorldzKey).forEach((key) => {
        localStorage.removeItem(key);
        removed += 1;
      });
    } catch {}
    return removed;
  }

  async function clearWorldzCaches() {
    if (!('caches' in window)) return 0;
    let removed = 0;
    try {
      const names = await caches.keys();
      for (const name of names) {
        if (!isWorldzCache(name)) continue;
        if (await caches.delete(name)) removed += 1;
      }
    } catch {}
    return removed;
  }

  function renderHomeCard() {
    const root = $('#memory-home-card');
    if (!root) return;
    root.innerHTML = `<article class="panel memory-home-card">
      <p class="eyebrow">🧹 WORLDZ MEMORY & STORAGE CENTRE™</p>
      <h3>Know what can be cleared — and what cannot.</h3>
      <p>Clean Worldz device cache and temporary data without pretending that server records, blockchain history or external AI memory disappeared.</p>
      <button class="button secondary" type="button" data-open="memory-storage">Open Memory & Storage Centre</button>
    </article>`;
  }

  async function renderCentre() {
    const root = $('#memory-storage-root');
    if (!root) return;
    const scan = await scanStorage();
    root.innerHTML = `
      <article class="panel memory-overview">
        <p class="eyebrow">WORLDZFULLBUILD™ DATA CONTROL</p>
        <h3>Worldz Memory & Storage Centre™</h3>
        <p>One place to understand and clean the data Worldz is actually allowed to control.</p>
        <div class="memory-grid">
          <div><small>Worldz local keys</small><strong>${scan.localCount}</strong><span>Browser/device preferences</span></div>
          <div><small>Local storage size</small><strong>${formatBytes(scan.localBytes)}</strong><span>Approximate current origin total</span></div>
          <div><small>Session items</small><strong>${scan.sessionCount}</strong><span>${formatBytes(scan.sessionBytes)} temporary</span></div>
          <div><small>Worldz caches</small><strong>${scan.worldzCaches.length}</strong><span>App/browser cache packages</span></div>
        </div>
        <button class="button secondary" type="button" data-memory-action="refresh">Refresh Storage Scan</button>
      </article>

      <article class="panel">
        <h3>📱 Device / MiniApp storage</h3>
        <p>These controls affect only data stored locally by this browser or MiniApp. They do not move funds and do not change wallet or token ownership.</p>
        <button class="button secondary" type="button" data-memory-action="session">Clear Temporary Session</button>
        <button class="button secondary" type="button" data-memory-action="cache">Clear Worldz App Cache</button>
        <button class="button secondary" type="button" data-memory-action="local">Clear Worldz Local Preferences</button>
        <button class="button memory-danger" type="button" data-memory-action="all">Clear All Worldz Device Data</button>
      </article>

      <article class="panel memory-boundary">
        <h3>☁️ Worldz account / server data</h3>
        <p>Local cleanup does <b>not</b> delete registered profiles, mission history, approved records, contribution proofs, governance records or other server-managed Worldz data.</p>
        <p>Server deletion must use a dedicated authenticated account-data workflow when that workflow exists.</p>
      </article>

      <article class="panel memory-boundary">
        <h3>⛓️ On-chain records</h3>
        <p>Blockchain transactions, token mints, locks, vesting proofs and other confirmed on-chain history are not browser cache. Worldz must never label them “deleted” when they remain on-chain.</p>
      </article>

      <article class="panel memory-boundary">
        <h3>🧠 ChatGPT / OpenAI memory</h3>
        <p>ChatGPT memory is separate from Worldz. Worldz cannot clear or change it.</p>
        <p>In ChatGPT use <b>Settings → Personalization → Memory summary → Manage</b>. For full removal, the original chats/files containing the information may also need to be deleted.</p>
      </article>

      <article class="panel security">
        <b>Safety boundary</b>
        <p>No seed phrase, private key or wallet signature is required for storage cleanup.</p>
      </article>
    `;
  }

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-memory-action]');
    if (!button) return;
    const action = button.dataset.memoryAction;

    if (action === 'refresh') {
      await renderCentre();
      return;
    }

    if (action === 'session') {
      const ok = await clearSession();
      notify(ok ? '✅ Temporary Worldz session data cleared.' : 'Storage cleanup was not available in this browser.');
      await renderCentre();
      return;
    }

    if (action === 'cache') {
      const removed = await clearWorldzCaches();
      notify(`✅ Worldz app cache cleanup complete. ${removed} cache package${removed === 1 ? '' : 's'} removed.`);
      await renderCentre();
      return;
    }

    if (action === 'local') {
      const removed = await clearWorldzLocal();
      notify(`✅ Worldz local preference cleanup complete. ${removed} key${removed === 1 ? '' : 's'} removed.`);
      await renderCentre();
      return;
    }

    if (action === 'all') {
      const approved = window.confirm('Clear Worldz local preferences, temporary session data and Worldz app caches on this device? Server and on-chain records will remain.');
      if (!approved) return;
      const [localRemoved, cacheRemoved] = await Promise.all([clearWorldzLocal(), clearWorldzCaches()]);
      await clearSession();
      notify(`✅ Worldz device cleanup complete. Local keys removed: ${localRemoved}. Cache packages removed: ${cacheRemoved}.`);
      await renderCentre();
    }
  });

  renderHomeCard();
  renderCentre();
})();
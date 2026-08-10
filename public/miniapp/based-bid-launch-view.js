(() => {
  const tg = window.Telegram && window.Telegram.WebApp;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const formatBps = (value) => `${(Number(value || 0) / 100).toFixed(Number(value || 0) % 100 ? 2 : 0)}%`;
  let loading = false;

  async function loadPolicy() {
    if (!tg || !tg.initData || loading) return;
    const launchButton = document.querySelector('[data-ultimate-view="launch"].active');
    const holder = document.querySelector('#ultimate-view');
    if (!launchButton || !holder || holder.querySelector('#based-bid-launch-packet')) return;
    loading = true;
    try {
      const response = await fetch('/api/mini/auto/ultimate', {
        headers: {
          'content-type': 'application/json',
          'x-telegram-init-data': tg.initData
        }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ultimate?.launchPolicy) return;
      const packet = payload.ultimate.launchPolicy;
      const platform = packet.platform || {};
      const fee = packet.feeBuilder || {};
      const stage = packet.feeStage || {};
      const settings = packet.launchSettings || {};
      const readiness = packet.compliance?.readiness || {};
      const blockers = readiness.blockers || [];
      const proceeds = fee.proceedsAllocationBps || {};
      const panel = document.createElement('section');
      panel.id = 'based-bid-launch-packet';
      panel.className = 'panel';
      panel.innerHTML = `<h3>🧩 Based.bid Launch Packet</h3>
        <div class="ultimate-grid">
          <div class="ultimate-card"><small>Chain / Model</small><strong>${escapeHtml(settings.chain || platform.chain || 'SOL')} • LBP</strong></div>
          <div class="ultimate-card"><small>DEX</small><strong>${escapeHtml(settings.dex || platform.dex || 'Meteora v5')} • ${formatBps(settings.dexFeeBps)}</strong></div>
          <div class="ultimate-card"><small>Starting MC</small><strong>$${Number(settings.startingMarketCapUsd || 0).toLocaleString('en-AU')}</strong></div>
          <div class="ultimate-card"><small>Launch Plan</small><strong>${escapeHtml(String(settings.launchPlan || 'based').toUpperCase())} • ${Number(platform.launchPlanCostSol || 0)} SOL</strong></div>
          <div class="ultimate-card"><small>Creator Fee Stage</small><strong>${escapeHtml(String(stage.stage || 'initial').toUpperCase())} • ${formatBps(stage.creatorFeeBps)}</strong></div>
          <div class="ultimate-card"><small>Launch Ready</small><strong>${readiness.ready ? 'YES' : 'NO • GATED'}</strong></div>
        </div>
        <p><strong>Fee routing:</strong> Charity ${formatBps(proceeds.charity)} • LP ${formatBps(proceeds.liquidity)} • Dev ${formatBps(proceeds.dev)} • Team ${formatBps(proceeds.team)} • Buyback/Burn Reserve ${formatBps(proceeds.buyback_burn_reserve)}.</p>
        <p><strong>History rule:</strong> 1.00% initial → 0.75% after 100 completed trades with healthy liquidity → 0.50% after 500 completed trades with healthy liquidity.</p>
        <div class="ultimate-note ultimate-danger"><strong>Launch blockers:</strong> ${blockers.length ? blockers.map((item) => escapeHtml(item.replaceAll('_', ' '))).join(' • ') : 'None'}.</div>
        <div class="ultimate-note">Programmatic Based.bid launch API is not verified, so Ultimate prepares the launch packet but cannot auto-launch or auto-sign. Final execution remains in the external Based.bid/wallet flow after all gates pass.</div>`;
      holder.appendChild(panel);
    } finally {
      loading = false;
    }
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-ultimate-view="launch"]')) setTimeout(loadPolicy, 40);
  });
  const observer = new MutationObserver(() => {
    if (document.querySelector('[data-ultimate-view="launch"].active')) queueMicrotask(loadPolicy);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
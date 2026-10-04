(() => {
  const tg = window.Telegram && window.Telegram.WebApp;
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const short = (v) => v && v.length > 22 ? `${v.slice(0,9)}…${v.slice(-8)}` : (v || '—');

  async function api(path) {
    const response = await fetch(path, {
      headers: { 'x-telegram-init-data': tg ? tg.initData : '', 'accept': 'application/json' },
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({ ok:false, error:'invalid_response' }));
    return { response, payload };
  }

  function formatTokenAmount(raw, decimals) {
    if (raw == null || decimals == null) return raw == null ? '—' : String(raw);
    try {
      const n = BigInt(String(raw));
      const d = BigInt(10) ** BigInt(Number(decimals));
      const whole = n / d;
      const fraction = String(n % d).padStart(Number(decimals), '0').replace(/0+$/, '').slice(0, 8);
      return fraction ? `${whole}.${fraction}` : String(whole);
    } catch { return String(raw); }
  }

  function homeCard() {
    const holder = document.querySelector('#auto-public-home-card');
    if (!holder) return;
    holder.innerHTML = `<article class="panel">
      <p class="eyebrow">🤖 AUTO MARKET PLANNER™ • EVERY DAY</p>
      <h3>Your money. Your wallet. Live market evidence before you spend.</h3>
      <p>AUTO planning is for JayJayTeamDev and every Worldz user — not just Treasury. Treasury is optional and never assumed.</p>
      <button class="button" type="button" data-open="auto-public">Open AUTO Market Planner</button>
    </article>`;
  }

  function mount() {
    homeCard();
    const root = document.querySelector('#auto-public-root');
    if (!root || root.dataset.ready === '1') return;
    root.dataset.ready = '1';
    root.innerHTML = `<article class="panel">
      <p class="eyebrow">PERSONAL WALLET FIRST • READ ONLY</p>
      <h3>Check the market before one cent moves.</h3>
      <p>Enter a public wallet, token mint and budget. AUTO asks Jupiter for a live buy quote and reads Worldz market intelligence. It cannot sign or spend.</p>
      <form id="auto-public-quote-form">
        <label>Public Solana wallet<input name="wallet_address" autocomplete="off" placeholder="Your public wallet address" required></label>
        <label>Token mint<input name="token_mint" autocomplete="off" placeholder="Token mint / CA" required></label>
        <div class="form-row">
          <label>Budget<input name="amount" type="number" min="0.000001" step="any" value="0.01" required></label>
          <label>Pay with<select name="currency"><option value="SOL">SOL</option><option value="USDC">USDC</option></select></label>
        </div>
        <input type="hidden" name="funding_source" value="USER_PERSONAL_WALLET">
        <button class="button" type="submit">Get Live Buy Quote</button>
      </form>
      <div id="auto-public-result" class="ultimate-note">No quote requested yet.</div>
    </article>
    <article class="panel security">
      <b>LP / HYBRID truth gate</b>
      <p>AUTO will not invent an LP recommendation. BUY analysis can use a live Jupiter quote now. LP and BUY+LP optimisation stay fail-closed until the live Meteora DAMM v2 deposit-quote adapter verifies the exact pool, reserves and required token pair.</p>
    </article>
    <article class="panel">
      <h3>Funding rule</h3>
      <p><b>Default:</b> your own wallet and your own budget. For JayJayTeamDev, personal contributions stay labelled <b>JayJayTeamDev personal funds</b>. A Treasury wallet is only used when the authorised owner intentionally selects it.</p>
      <p>No seed phrase • no private key • no automatic signing • no hidden Treasury assumption.</p>
    </article>`;

    root.querySelector('#auto-public-quote-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const result = root.querySelector('#auto-public-result');
      result.textContent = 'Checking live market route…';
      const params = new URLSearchParams({
        wallet_address: String(form.get('wallet_address') || '').trim(),
        token_mint: String(form.get('token_mint') || '').trim(),
        amount: String(form.get('amount') || '').trim(),
        currency: String(form.get('currency') || 'SOL'),
        funding_source: 'USER_PERSONAL_WALLET'
      });
      try {
        const { response, payload } = await api('/api/mini/auto/public/quote?' + params.toString());
        if (!response.ok || !payload.ok) {
          result.innerHTML = `<b>NO VERIFIED BUY QUOTE</b><p>${esc(payload.error || 'route unavailable')}</p><p>No transaction attempted.</p>`;
          return;
        }
        const quote = payload.quote || {};
        const intel = payload.intelligence || {};
        const liquidity = intel.liquidity || {};
        const decimals = intel.onchain?.decimals;
        const observed = liquidity.aggregateObservedDexLiquidityUsd;
        const deepest = liquidity.deepestPair?.liquidityUsd;
        result.innerHTML = `<b>LIVE BUY QUOTE • READ ONLY</b>
          <div class="profile-row"><span>Funding</span><b>YOUR PERSONAL WALLET</b></div>
          <div class="profile-row"><span>Provider</span><b>${esc(payload.provider || 'Jupiter')}</b></div>
          <div class="profile-row"><span>Input</span><b>${esc(form.get('amount'))} ${esc(form.get('currency'))}</b></div>
          <div class="profile-row"><span>Expected token output</span><b>${esc(formatTokenAmount(quote.outAmount, decimals))}</b></div>
          <div class="profile-row"><span>Provider price-impact field</span><b>${esc(quote.priceImpactPct ?? 'Not returned')}</b></div>
          <div class="profile-row"><span>Observed DEX liquidity</span><b>${observed == null ? 'Not returned' : '$' + Number(observed).toLocaleString('en-AU',{maximumFractionDigits:2})}</b></div>
          <div class="profile-row"><span>Deepest observed pair</span><b>${deepest == null ? 'Not returned' : '$' + Number(deepest).toLocaleString('en-AU',{maximumFractionDigits:2})}</b></div>
          <div class="profile-row"><span>Router</span><b>${esc(quote.router || quote.swapType || 'Provider selected')}</b></div>
          <p><small>Quote snapshot: ${esc(payload.checkedAt || '')}. Re-quote immediately before any future wallet signature because routes and prices change.</small></p>
          <p><b>No transaction was submitted.</b></p>`;
      } catch (error) {
        result.innerHTML = `<b>QUOTE CHECK FAILED</b><p>${esc(error.message || error)}</p><p>No transaction attempted.</p>`;
      }
    });
  }

  window.addEventListener('worldz:miniapp-ready', mount);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  setTimeout(mount, 500);
})();
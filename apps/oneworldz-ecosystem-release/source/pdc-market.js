(() => {
  const cards = [...document.querySelectorAll('.pdc-token-card[data-token-address]')];
  const status = document.querySelector('.pdc-dex-status');
  if (!cards.length) return;

  const addresses = cards.map((card) => card.dataset.tokenAddress).filter(Boolean);
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 6 });
  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

  function safePairUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'dexscreener.com' ? url.href : null;
    } catch { return null; }
  }

  function safeSwapUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && (url.hostname === 'jup.ag' || url.hostname === 'www.jup.ag') ? url.href : null;
    } catch { return null; }
  }

  function bestPairFor(address, pairs) {
    return pairs
      .filter((pair) => pair?.chainId === 'solana' && (pair?.baseToken?.address === address || pair?.quoteToken?.address === address))
      .sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0] || null;
  }

  function render(card, pair) {
    const market = card.querySelector('.pdc-market');
    const dexLink = card.querySelector('[data-dex-link]');
    const swapLink = card.querySelector('[data-swap-link]');
    if (!market || !dexLink || !swapLink) return;

    if (!pair) {
      market.dataset.state = 'none';
      market.innerHTML = '<small>DEX Screener</small><strong>No active pair found</strong><span>Legacy record remains independently verifiable on Solscan. Purchase route is hidden.</span>';
      dexLink.hidden = true;
      swapLink.hidden = true;
      return;
    }

    const price = Number(pair.priceUsd);
    const liquidity = Number(pair?.liquidity?.usd || 0);
    const volume = Number(pair?.volume?.h24 || 0);
    const change = Number(pair?.priceChange?.h24);
    const pairUrl = safePairUrl(pair.url);
    const swapUrl = safeSwapUrl(swapLink.href);
    market.dataset.state = 'live';
    market.innerHTML = `<small>DEX Screener • Live pair data</small><strong class="pdc-market-number">${Number.isFinite(price) ? money.format(price) : 'Price unavailable'}</strong><span>Liquidity ${Number.isFinite(liquidity) ? '$' + compact.format(liquidity) : '—'} • 24h volume ${Number.isFinite(volume) ? '$' + compact.format(volume) : '—'}${Number.isFinite(change) ? ` • 24h ${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : ''}</span>`;
    if (pairUrl) {
      dexLink.href = pairUrl;
      dexLink.hidden = false;
    } else {
      dexLink.hidden = true;
    }
    swapLink.hidden = !swapUrl;
  }

  async function load() {
    try {
      if (status) { status.textContent = 'Loading DEX Screener market data…'; status.dataset.state = 'loading'; }
      const response = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${addresses.join(',')}`, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`DEX Screener ${response.status}`);
      const pairs = await response.json();
      if (!Array.isArray(pairs)) throw new Error('Unexpected DEX Screener response');
      for (const card of cards) render(card, bestPairFor(card.dataset.tokenAddress, pairs));
      if (status) { status.textContent = 'DEX Screener market view loaded — active pairs expose external Buy / Swap routes'; status.dataset.state = 'ready'; }
    } catch {
      for (const card of cards) render(card, null);
      if (status) { status.textContent = 'Live market data unavailable — Solscan history remains available and purchase routes stay hidden'; status.dataset.state = 'error'; }
    }
  }

  load();
})();

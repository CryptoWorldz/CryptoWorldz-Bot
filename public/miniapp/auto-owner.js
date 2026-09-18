(() => {
  const tg = window.Telegram && window.Telegram.WebApp;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const shortAddress = (value) => value && value.length > 22 ? `${value.slice(0, 9)}…${value.slice(-8)}` : (value || 'Setup pending');
  const formatBps = (value) => `${(Number(value || 0) / 100).toFixed(Number(value || 0) % 100 ? 2 : 0)}%`;

  async function autoApi(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        'content-type': 'application/json',
        'x-telegram-init-data': tg ? tg.initData : '',
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({ ok: false, error: 'invalid_response' }));
    return { response, payload };
  }

  function notice(message) {
    if (tg && tg.showAlert) tg.showAlert(message);
    else window.alert(message);
  }

  function localDateTime(value) {
    if (!value) return 'Not scheduled';
    return new Date(value).toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function createPanel() {
    const wrapper = document.createElement('section');
    wrapper.id = 'auto-owner-panel';
    wrapper.className = 'panel ultimate-owner';
    wrapper.innerHTML = `<div class="ultimate-owner-head"><p class="eyebrow">OWNER CONTROL • UPDATE ULTIMATE™ 🥏</p><h2>Command Centre Ultimate™</h2><p>Auto, Treasury, approvals and launch planning in one clean control surface.</p></div>
      <div id="auto-owner-status" class="panel loading"><div class="orb"></div><p>Opening Ultimate controls…</p></div>`;
    return wrapper;
  }

  function autoSafetyMarkup(payload) {
    const status = payload.status || {};
    const dca = payload.dca || {};
    return `<div class="ultimate-pulse">
      <div><small>Auto</small><strong>${escapeHtml(String(status.mode || 'safe_locked').replaceAll('_', ' ').toUpperCase())}</strong></div>
      <div><small>Execution</small><strong>${dca.execution_enabled ? 'OWNER ENABLED' : 'LOCKED'}</strong></div>
      <div><small>Executor</small><strong>${dca.signer_ready && dca.api_ready ? 'READY' : 'PENDING'}</strong></div>
      <div><small>Emergency Stop</small><strong>${dca.emergency_stop ? 'ACTIVE' : 'CLEAR'}</strong></div>
    </div>`;
  }

  function scheduleMarkup(schedule) {
    const status = String(schedule.status || 'draft').toLowerCase();
    const next = schedule.next_run_at ? localDateTime(schedule.next_run_at) : 'Not scheduled';
    const action = status === 'draft' ? 'start' : status === 'active' ? 'pause' : status === 'paused' ? 'resume' : '';
    return `<article class="ultimate-wallet">
      <div class="wallet-meta"><strong>${escapeHtml(String(schedule.status || 'draft').toUpperCase())}</strong><span>${Number(schedule.completed_buys) || 0}/${Number(schedule.order_count) || 0}</span></div>
      <code>${escapeHtml(shortAddress(schedule.token_mint))}</code>
      <p>${escapeHtml(schedule.amount_per_buy)} ${escapeHtml(schedule.input_currency)} every ${Number(schedule.interval_minutes) || 0} min • Next ${escapeHtml(next)}</p>
      ${schedule.last_error ? `<small>${escapeHtml(schedule.last_error)}</small>` : ''}
      ${action ? `<button class="button secondary dca-action" data-id="${escapeHtml(schedule.id)}" data-action="${action}">${action[0].toUpperCase() + action.slice(1)}</button>` : ''}
      ${['draft', 'active', 'paused'].includes(status) ? `<button class="button secondary dca-action" data-id="${escapeHtml(schedule.id)}" data-action="cancel">Cancel</button>` : ''}
    </article>`;
  }

  function providerChips(providers = {}) {
    const order = ['westpac', 'coinbase', 'squads', 'jupiter', 'stripe'];
    return order.filter((name) => providers[name]).map((name) => {
      const provider = providers[name];
      const label = name === 'squads' ? 'MULTISIG' : name.toUpperCase();
      return `<span class="ultimate-chip pending">${escapeHtml(label)} • ${provider.external_authorization_required ? 'EXTERNAL AUTH' : 'READY'}</span>`;
    }).join('');
  }

  function renderPlan(model) {
    const ultimate = model.ultimate;
    return `<section class="panel">
      <h3>📅 Weekday Funding Planner</h3>
      <div class="ultimate-grid">
        <div class="ultimate-card"><small>Next Window</small><strong>${escapeHtml(localDateTime(ultimate.nextFunding?.scheduledAt))}</strong></div>
        <div class="ultimate-card"><small>Schedule</small><strong>Mon–Fri • 6:30pm Sydney</strong></div>
        <div class="ultimate-card"><small>Approval</small><strong>2 of 3</strong></div>
        <div class="ultimate-card"><small>Execution</small><strong>${ultimate.executionEnabled ? 'ENABLED' : 'LOCKED'}</strong></div>
      </div>
      <p>Preferred route: <strong>Westpac → Coinbase Australia → USDC → MultiSig Wallet Pro™ → approved allocation → Jupiter.</strong></p>
      <div>${providerChips(ultimate.providers)}</div>
      <div class="ultimate-note ultimate-danger">Planner automation may prepare a funding cycle, but it cannot store bank passwords, approve a Coinbase send, sign a wallet transaction or bypass 2-of-3 approval.</div>
    </section>`;
  }

  function walletForPurpose(wallets, purpose) {
    return wallets.find((wallet) => wallet.purpose === purpose) || {};
  }

  function walletMarkup(wallets, ultimate) {
    const items = [
      { purpose: 'treasury', key: 'treasury', label: 'Treasury Reserve', icon: '🏦' },
      { purpose: 'dev', key: 'dev_grace_operations', label: 'Dev + Grace Operations', icon: '🛠️' },
      { purpose: 'rewards', key: 'rewards', label: 'Rewards', icon: '🎁' },
      { purpose: 'investment', key: 'owner_diamond_buy', label: 'Owner Diamond Buy™', icon: '💎' }
    ];
    return items.map((item) => {
      const wallet = walletForPurpose(wallets, item.purpose);
      const active = wallet.status === 'active' && wallet.public_address;
      return `<article class="ultimate-wallet">
        <div class="wallet-meta"><strong>${item.icon} ${escapeHtml(item.label)}</strong><span>${formatBps(ultimate.allocationsBps?.[item.key])} • ${active ? 'ACTIVE' : 'SETUP PENDING'}</span></div>
        <code title="${escapeHtml(wallet.public_address || '')}">${escapeHtml(shortAddress(wallet.public_address))}</code>
        <small>${escapeHtml(wallet.control_policy || 'Public-address-only control')}</small>
      </article>`;
    }).join('');
  }

  function renderTreasury(model) {
    return `<section class="panel">
      <h3>🏦 Four-Purpose Treasury</h3>
      <p>One funding plan, four clearly separated purposes. Zed stores public addresses and audit records only.</p>
      ${walletMarkup(model.wallets, model.ultimate)}
      <div class="ultimate-note">Current allocation: 35% Treasury • 25% Dev + Grace • 20% Rewards • 20% Owner Diamond Buy™.</div>
    </section>`;
  }

  function renderDiamondBuy(model) {
    const dca = model.dca || {};
    const limits = dca.limits || {};
    const schedules = model.schedules || [];
    return `<section class="panel">
      <h3>💎 Owner Diamond Buy™</h3>
      <div class="ultimate-grid">
        <div class="ultimate-card"><small>DCA</small><strong>${dca.execution_enabled ? 'ENABLED' : 'LOCKED'}</strong></div>
        <div class="ultimate-card"><small>Wallet</small><strong>${escapeHtml(shortAddress(dca.wallet_address))}</strong></div>
        <div class="ultimate-card"><small>Schedules</small><strong>${Number(dca.active_schedules) || 0} active</strong></div>
        <div class="ultimate-card"><small>Emergency</small><strong>${dca.emergency_stop ? 'STOPPED' : 'CLEAR'}</strong></div>
      </div>
      <div class="ultimate-note ultimate-danger">Buy-only DCA. No automatic selling, artificial volume, wallet rotation or hidden signing.</div>
    </section>
    <details class="ultimate-detail"><summary>Public Investment Wallet</summary><form id="auto-dca-wallet-form">
      <input name="wallet_address" value="${escapeHtml(dca.wallet_address || '')}" placeholder="Public Solana wallet address" required>
      <button class="button secondary" type="submit">Save Public Wallet</button>
      <small>Never enter a seed phrase or private key.</small>
    </form></details>
    <details class="ultimate-detail"><summary>Safety Limits</summary><form id="auto-dca-limits-form">
      <div class="form-row"><input name="max_order_amount" type="number" min="0" step="any" value="${Number(limits.maxOrderAmount) || 0}" placeholder="Maximum each buy"><input name="max_daily_amount" type="number" min="0" step="any" value="${Number(limits.maxDailyAmount) || 0}" placeholder="Daily cap"></div>
      <div class="form-row"><input name="max_weekly_amount" type="number" min="0" step="any" value="${Number(limits.maxWeeklyAmount) || 0}" placeholder="Weekly cap"><input name="max_monthly_amount" type="number" min="0" step="any" value="${Number(limits.maxMonthlyAmount) || 0}" placeholder="Monthly cap"></div>
      <div class="form-row"><input name="min_interval_minutes" type="number" min="15" value="${Number(limits.minIntervalMinutes) || 60}" placeholder="Minimum interval"><input name="max_slippage_bps" type="number" min="1" value="${Number(limits.maxSlippageBps) || 300}" placeholder="Max slippage bps"></div>
      <input name="max_price_impact_bps" type="number" min="1" value="${Number(limits.maxPriceImpactBps) || 500}" placeholder="Max price impact bps">
      <button class="button secondary" type="submit">Save Limits</button>
    </form></details>
    <details class="ultimate-detail"><summary>Create Buy Draft</summary><form id="auto-dca-form">
      <input name="token_mint" placeholder="Allowlisted token mint" required>
      <div class="form-row"><input name="amount_per_buy" type="number" min="0" step="any" placeholder="Amount each buy" required><select name="currency"><option>USDC</option><option>SOL</option></select></div>
      <div class="form-row"><input name="order_count" type="number" min="1" max="10000" value="10" required><input name="interval_minutes" type="number" min="15" value="60" required></div>
      <div class="form-row"><input name="slippage_bps" type="number" min="1" value="150" placeholder="Slippage bps" required><input name="max_price_impact_bps" type="number" min="1" value="300" placeholder="Max impact bps" required></div>
      <button class="button" type="submit">Create DCA Draft</button>
    </form></details>
    <details class="ultimate-detail"><summary>Schedules (${schedules.length})</summary><div>${schedules.map(scheduleMarkup).join('') || '<p>No schedules yet.</p>'}</div></details>
    <div class="ultimate-safety-actions"><button id="auto-dca-enable" class="button" type="button">Enable DCA</button><button id="auto-dca-disable" class="button secondary" type="button">Disable DCA</button></div>`;
  }

  function renderMultisig(model) {
    const ultimate = model.ultimate;
    const signers = ultimate.signers || [];
    return `<section class="panel">
      <h3>🔐 MultiSig Wallet Pro™</h3>
      <div class="ultimate-grid">
        <div class="ultimate-card"><small>Threshold</small><strong>${Number(ultimate.multisig?.threshold) || 2} of ${Number(ultimate.multisig?.signers) || 3}</strong></div>
        <div class="ultimate-card"><small>Owner</small><strong>${escapeHtml(ultimate.multisig?.immutableOwner || 'JayJayTeamDev')} • PERMANENT</strong></div>
      </div>
      ${signers.map((signer) => `<div class="profile-row"><span>${signer.role === 'owner' ? '👑' : '✅'} ${escapeHtml(signer.handle)}</span><b>${escapeHtml(signer.role.toUpperCase())}${signer.immutable ? ' • LOCKED' : ''}</b></div>`).join('')}
      <div class="ultimate-note">Sensitive changes require the permanent Owner plus another signer. Signing remains external; Zed never holds the signing keys.</div>
      <span class="ultimate-chip pending">SQUADS / EXTERNAL MULTISIG CONNECTION PENDING</span>
    </section>`;
  }

  function renderLaunch(model) {
    const ultimate = model.ultimate;
    const fee = ultimate.tokenFeePolicy || {};
    const proceeds = fee.proceedsAllocationBps || {};
    const launch = ultimate.launch || {};
    return `<section class="panel">
      <h3>🚀 Ultimate Launch Engine</h3>
      <div class="ultimate-grid">
        <div class="ultimate-card"><small>First Concept</small><strong>${escapeHtml(launch.concept || 'OneWorldz Kindness')} • ${escapeHtml(launch.ticker || '$KIND')}</strong></div>
        <div class="ultimate-card"><small>Status</small><strong>${escapeHtml(String(launch.status || 'legal_review').replaceAll('_', ' ').toUpperCase())}</strong></div>
        <div class="ultimate-card"><small>Creator Fee</small><strong>${formatBps(fee.initialCreatorFeeBps)} → ${formatBps(fee.matureCreatorFeeBps)}</strong></div>
        <div class="ultimate-card"><small>Hard Fee Cap</small><strong>${formatBps(fee.hardCreatorFeeCapBps)}</strong></div>
      </div>
      <p><strong>Fee proceeds:</strong> Charity ${formatBps(proceeds.charity)} • Liquidity ${formatBps(proceeds.liquidity)} • Dev ${formatBps(proceeds.dev)} • Team ${formatBps(proceeds.team)} • Buyback/Burn Reserve ${formatBps(proceeds.buyback_burn_reserve)}.</p>
      <div class="ultimate-note ultimate-danger">Based.bid launch execution is not enabled yet. Legal review, disclosures, wallet registration and 2-of-3 approval remain mandatory. Buyback/burn cannot be price- or volume-triggered automatically.</div>
      <a class="button secondary" href="${escapeHtml(ultimate.publicUrl)}" target="_blank" rel="noopener">Open Ultimate Public Blueprint</a>
    </section>`;
  }

  function renderView(name, model) {
    if (name === 'treasury') return renderTreasury(model);
    if (name === 'diamond') return renderDiamondBuy(model);
    if (name === 'multisig') return renderMultisig(model);
    if (name === 'launch') return renderLaunch(model);
    return renderPlan(model);
  }

  function bindDiamondControls(panel) {
    panel.querySelector('#auto-dca-wallet-form')?.addEventListener('submit', saveWallet);
    panel.querySelector('#auto-dca-limits-form')?.addEventListener('submit', saveLimits);
    panel.querySelector('#auto-dca-form')?.addEventListener('submit', createSchedule);
    panel.querySelector('#auto-dca-enable')?.addEventListener('click', () => control('/api/mini/auto/dca/enable', 'Auto DCA enabled.'));
    panel.querySelector('#auto-dca-disable')?.addEventListener('click', () => control('/api/mini/auto/dca/disable', 'Auto DCA disabled.'));
    panel.querySelectorAll('.dca-action').forEach((button) => button.addEventListener('click', () => scheduleAction(button.dataset.id, button.dataset.action)));
  }

  function activateGateway(panel, model, name) {
    panel.querySelectorAll('.ultimate-gateway button').forEach((button) => button.classList.toggle('active', button.dataset.ultimateView === name));
    const holder = panel.querySelector('#ultimate-view');
    holder.innerHTML = renderView(name, model);
    if (name === 'diamond') bindDiamondControls(panel);
  }

  async function loadPanel(panel) {
    const statusHolder = panel.querySelector('#auto-owner-status');
    const { response, payload } = await autoApi('/api/mini/auto/status');
    if (response.status === 403 || response.status === 401) {
      panel.remove();
      return;
    }
    if (!response.ok) {
      statusHolder.className = 'panel security';
      statusHolder.innerHTML = `<b>AUTO SERVICE NOT CONNECTED</b><p>The separate Auto service or private bridge is not configured.</p>`;
      return;
    }

    const owner = Boolean(payload.access && payload.access.owner);
    if (!owner) {
      statusHolder.className = 'panel';
      statusHolder.innerHTML = `${autoSafetyMarkup(payload)}<div class="ultimate-note">Executive safety view. Treasury, Diamond Buy™, multisig and launch controls remain Owner-only.</div><div class="ultimate-safety-actions"><button id="auto-pause" class="button secondary" type="button">Pause Auto</button><button id="auto-emergency" class="button" type="button">Emergency Stop</button></div>`;
      panel.querySelector('#auto-pause').addEventListener('click', () => control('/api/mini/auto/pause', 'Auto paused.'));
      panel.querySelector('#auto-emergency').addEventListener('click', () => control('/api/mini/auto/emergency-stop', 'Auto emergency stop confirmed.'));
      return;
    }

    const [ultimateResult, walletResult, dcaResult] = await Promise.all([
      autoApi('/api/mini/auto/ultimate'),
      autoApi('/api/mini/project-wallets'),
      autoApi('/api/mini/auto/dca')
    ]);

    if (!ultimateResult.response.ok) {
      statusHolder.className = 'panel security';
      statusHolder.innerHTML = `<b>ULTIMATE STATUS BRIDGE NOT READY</b><p>${escapeHtml(ultimateResult.payload.error || 'Ultimate controls are not available yet.')}</p>`;
      return;
    }

    const ultimate = ultimateResult.payload.ultimate || {};
    const dcaPayload = dcaResult.response.ok ? dcaResult.payload : {};
    const dca = dcaPayload.dca || payload.dca || {};
    const model = {
      auto: payload,
      ultimate,
      wallets: walletResult.response.ok ? (walletResult.payload.wallets || []) : [],
      dca,
      schedules: dcaPayload.schedules || []
    };

    statusHolder.className = '';
    statusHolder.innerHTML = `${autoSafetyMarkup(payload)}
      <div class="ultimate-pulse">
        <div><small>Owner</small><strong>JayJayTeamDev • PERMANENT</strong></div>
        <div><small>Next Funding</small><strong>${escapeHtml(localDateTime(ultimate.nextFunding?.scheduledAt))}</strong></div>
        <div><small>Approval</small><strong>2 OF 3</strong></div>
        <div><small>Ultimate Execution</small><strong>${ultimate.executionEnabled ? 'ENABLED' : 'LOCKED'}</strong></div>
      </div>
      <nav class="ultimate-gateway" aria-label="Ultimate owner controls">
        <button class="button active" type="button" data-ultimate-view="plan">📅 PLAN</button>
        <button class="button secondary" type="button" data-ultimate-view="treasury">🏦 TREASURY</button>
        <button class="button secondary" type="button" data-ultimate-view="diamond">💎 DIAMOND BUY</button>
        <button class="button secondary" type="button" data-ultimate-view="multisig">🔐 MULTISIG</button>
        <button class="button secondary" type="button" data-ultimate-view="launch">🚀 LAUNCH</button>
      </nav>
      <div id="ultimate-view" class="ultimate-view"></div>
      <div class="ultimate-safety-actions"><button id="auto-pause" class="button secondary" type="button">Pause Auto</button><button id="auto-emergency" class="button" type="button">Emergency Stop</button></div>`;

    panel.querySelectorAll('[data-ultimate-view]').forEach((button) => button.addEventListener('click', () => activateGateway(panel, model, button.dataset.ultimateView)));
    panel.querySelector('#auto-pause').addEventListener('click', () => control('/api/mini/auto/pause', 'Auto paused.'));
    panel.querySelector('#auto-emergency').addEventListener('click', () => control('/api/mini/auto/emergency-stop', 'Auto emergency stop confirmed.'));
    activateGateway(panel, model, 'plan');
  }

  async function control(path, successMessage) {
    const { response, payload } = await autoApi(path, { method: 'POST', body: '{}' });
    if (!response.ok) return notice(payload.error || 'Auto control failed.');
    notice(successMessage);
    refresh();
  }

  async function saveWallet(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const { response, payload } = await autoApi('/api/mini/auto/dca/wallet', { method: 'POST', body: JSON.stringify(body) });
    if (!response.ok) return notice(payload.error || 'Wallet address was not accepted.');
    notice('Public Diamond Buy wallet recorded. Signing remains external.');
    refresh();
  }

  async function saveLimits(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const { response, payload } = await autoApi('/api/mini/auto/dca/limits', { method: 'POST', body: JSON.stringify(body) });
    if (!response.ok) return notice(payload.error || 'DCA limits were not saved.');
    notice('Diamond Buy safety limits saved. Execution remains locked until activation checks pass.');
    refresh();
  }

  async function createSchedule(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const { response, payload } = await autoApi('/api/mini/auto/dca/schedules', { method: 'POST', body: JSON.stringify(body) });
    if (!response.ok) return notice((payload.errors || [payload.error || 'DCA validation failed.']).join('\n'));
    notice(`Diamond Buy draft created.\n${payload.schedule.amount_per_buy} ${payload.schedule.input_currency} × ${payload.schedule.order_count}`);
    refresh();
  }

  async function scheduleAction(id, action) {
    const { response, payload } = await autoApi(`/api/mini/auto/dca/schedules/${encodeURIComponent(id)}/${encodeURIComponent(action)}`, { method: 'POST', body: '{}' });
    if (!response.ok) return notice(payload.error || `DCA ${action} failed.`);
    notice(`Diamond Buy schedule ${action} confirmed.`);
    refresh();
  }

  function refresh() {
    const panel = document.querySelector('#auto-owner-panel');
    if (!panel) return;
    panel.innerHTML = `<div class="ultimate-owner-head"><p class="eyebrow">OWNER CONTROL • UPDATE ULTIMATE™ 🥏</p><h2>Command Centre Ultimate™</h2><p>Auto, Treasury, approvals and launch planning in one clean control surface.</p></div><div id="auto-owner-status" class="panel loading"><div class="orb"></div><p>Refreshing Ultimate…</p></div>`;
    loadPanel(panel);
  }

  async function attach() {
    if (!tg || !tg.initData || document.querySelector('#auto-owner-panel')) return;
    const adminPanel = document.querySelector('#admin-panel');
    if (!adminPanel) return;
    const panel = createPanel();
    adminPanel.prepend(panel);
    await loadPanel(panel);
  }

  const observer = new MutationObserver(() => attach());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', attach);
  setTimeout(attach, 1200);
})();
(() => {
  const tg = window.Telegram && window.Telegram.WebApp;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

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

  function statusMarkup(payload) {
    const status = payload.status || {};
    const dca = payload.dca || {};
    return `<div class="profile-row"><span>Safety mode</span><b>${escapeHtml(String(status.mode || 'safe_locked').toUpperCase())}</b></div>
      <div class="profile-row"><span>DCA execution</span><b>${dca.execution_enabled ? 'ENABLED' : 'ACTIVATION PENDING'}</b></div>
      <div class="profile-row"><span>DCA wallet</span><b>${escapeHtml(dca.wallet_address || 'Not attached')}</b></div>
      <div class="profile-row"><span>Secure executor</span><b>${dca.signer_ready ? 'READY' : 'NOT CONFIGURED'}</b></div>
      <div class="profile-row"><span>Executor API</span><b>${dca.api_ready ? 'READY' : 'NOT CONFIGURED'}</b></div>
      <div class="profile-row"><span>Wallet verified</span><b>${dca.wallet_matches_signer ? 'YES' : 'NO'}</b></div>
      <div class="profile-row"><span>Active schedules</span><b>${Number(dca.active_schedules) || 0}</b></div>
      <div class="profile-row"><span>Emergency stop</span><b>${dca.emergency_stop ? 'ACTIVE' : 'CLEAR'}</b></div>`;
  }

  function scheduleMarkup(schedule) {
    const status = String(schedule.status || 'draft').toLowerCase();
    const next = schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString('en-AU') : 'Not scheduled';
    const buttons = status === 'draft'
      ? `<button class="button secondary dca-action" data-id="${escapeHtml(schedule.id)}" data-action="start">Start</button>`
      : status === 'active'
        ? `<button class="button secondary dca-action" data-id="${escapeHtml(schedule.id)}" data-action="pause">Pause</button>`
        : status === 'paused'
          ? `<button class="button secondary dca-action" data-id="${escapeHtml(schedule.id)}" data-action="resume">Resume</button>`
          : '';
    const cancel = ['draft', 'active', 'paused'].includes(status)
      ? `<button class="button secondary dca-action" data-id="${escapeHtml(schedule.id)}" data-action="cancel">Cancel</button>`
      : '';
    return `<article class="panel review-card">
      <h3>${escapeHtml(String(schedule.status || '').toUpperCase())}</h3>
      <div class="profile-row"><span>Token</span><b>${escapeHtml(schedule.token_mint)}</b></div>
      <div class="profile-row"><span>Buy</span><b>${escapeHtml(schedule.amount_per_buy)} ${escapeHtml(schedule.input_currency)}</b></div>
      <div class="profile-row"><span>Progress</span><b>${Number(schedule.completed_buys) || 0}/${Number(schedule.order_count) || 0}</b></div>
      <div class="profile-row"><span>Interval</span><b>${Number(schedule.interval_minutes) || 0} minutes</b></div>
      <div class="profile-row"><span>Next buy</span><b>${escapeHtml(next)}</b></div>
      ${schedule.last_signature ? `<small>Last transaction: ${escapeHtml(schedule.last_signature)}</small>` : ''}
      ${schedule.last_error ? `<small>Paused error: ${escapeHtml(schedule.last_error)}</small>` : ''}
      <div class="form-row">${buttons}${cancel}</div>
    </article>`;
  }

  function createPanel() {
    const wrapper = document.createElement('section');
    wrapper.id = 'auto-owner-panel';
    wrapper.className = 'panel';
    wrapper.innerHTML = `<div class="section-title"><h2>🤖 Auto DCA</h2></div>
      <div id="auto-owner-status" class="panel loading"><div class="orb"></div><p>Opening owner DCA controls…</p></div>`;
    return wrapper;
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
    statusHolder.className = 'panel';
    statusHolder.innerHTML = `${statusMarkup(payload)}<div class="panel security"><b>${owner ? 'Permanent Owner Control' : 'Executive Safety Control'}</b><p>${owner ? 'DCA schedules are buy-only, allowlisted, budget-capped and controlled only by you.' : 'You may view status, pause and trigger the emergency stop. DCA controls remain owner-only.'}</p></div><div class="form-row">
      <button id="auto-pause" class="button secondary" type="button">Pause Auto</button>
      <button id="auto-emergency" class="button" type="button">Emergency Stop</button>
    </div>`;
    panel.querySelector('#auto-pause').addEventListener('click', () => control('/api/mini/auto/pause', 'Auto paused.'));
    panel.querySelector('#auto-emergency').addEventListener('click', () => control('/api/mini/auto/emergency-stop', 'Auto emergency stop confirmed.'));
    if (!owner) return;

    const { response: dcaResponse, payload: dcaPayload } = await autoApi('/api/mini/auto/dca');
    if (!dcaResponse.ok) {
      panel.insertAdjacentHTML('beforeend', `<div class="panel security"><b>DCA DATABASE PREPARATION REQUIRED</b><p>${escapeHtml(dcaPayload.error || 'DCA controls are not available yet.')}</p></div>`);
      return;
    }
    const dca = dcaPayload.dca || {};
    panel.insertAdjacentHTML('beforeend', `<section class="panel">
      <h3>Dedicated Dev Wallet</h3>
      <form id="auto-dca-wallet-form">
        <input name="wallet_address" value="${escapeHtml(dca.wallet_address || '')}" placeholder="Public Solana wallet address" required>
        <button class="button secondary" type="submit">Save Public Wallet</button>
        <small>Never enter a seed phrase or private key here.</small>
      </form>
    </section>
    <section class="panel">
      <h3>Owner DCA Limits</h3>
      <form id="auto-dca-limits-form">
        <div class="form-row"><input name="max_order_amount" type="number" min="0" step="any" value="${Number(dca.limits?.maxOrderAmount) || 0}" placeholder="Maximum each buy"><input name="max_daily_amount" type="number" min="0" step="any" value="${Number(dca.limits?.maxDailyAmount) || 0}" placeholder="Daily cap"></div>
        <div class="form-row"><input name="max_weekly_amount" type="number" min="0" step="any" value="${Number(dca.limits?.maxWeeklyAmount) || 0}" placeholder="Weekly cap"><input name="max_monthly_amount" type="number" min="0" step="any" value="${Number(dca.limits?.maxMonthlyAmount) || 0}" placeholder="Monthly cap"></div>
        <div class="form-row"><input name="min_interval_minutes" type="number" min="15" value="${Number(dca.limits?.minIntervalMinutes) || 60}" placeholder="Minimum interval"><input name="max_slippage_bps" type="number" min="1" value="${Number(dca.limits?.maxSlippageBps) || 300}" placeholder="Maximum slippage bps"></div>
        <input name="max_price_impact_bps" type="number" min="1" value="${Number(dca.limits?.maxPriceImpactBps) || 500}" placeholder="Maximum price impact bps">
        <button class="button secondary" type="submit">Save DCA Limits</button>
      </form>
    </section>
    <section class="panel">
      <h3>Create Buy Schedule</h3>
      <form id="auto-dca-form">
        <input name="token_mint" placeholder="Allowlisted Token-2022 or SPL mint" required>
        <div class="form-row"><input name="amount_per_buy" type="number" min="0" step="any" placeholder="Amount each buy" required><select name="currency"><option>SOL</option><option>USDC</option></select></div>
        <div class="form-row"><input name="order_count" type="number" min="1" max="10000" value="10" required><input name="interval_minutes" type="number" min="15" value="60" required></div>
        <div class="form-row"><input name="slippage_bps" type="number" min="1" value="150" placeholder="Slippage bps" required><input name="max_price_impact_bps" type="number" min="1" value="300" placeholder="Max impact bps" required></div>
        <button class="button" type="submit">Create DCA Draft</button>
        <small>One dedicated wallet • buy-only • no automatic selling • no multi-wallet activity.</small>
      </form>
    </section>
    <section class="panel">
      <div class="form-row"><button id="auto-dca-enable" class="button" type="button">Enable DCA</button><button id="auto-dca-disable" class="button secondary" type="button">Disable DCA</button></div>
      <small>Activation requires the matching dedicated wallet and secure executor in the separate Auto service.</small>
    </section>
    <section><div class="section-title"><h3>DCA Schedules</h3></div><div id="auto-dca-schedules">${(dcaPayload.schedules || []).map(scheduleMarkup).join('') || '<div class="panel"><p>No schedules yet.</p></div>'}</div></section>`);

    panel.querySelector('#auto-dca-wallet-form').addEventListener('submit', saveWallet);
    panel.querySelector('#auto-dca-limits-form').addEventListener('submit', saveLimits);
    panel.querySelector('#auto-dca-form').addEventListener('submit', createSchedule);
    panel.querySelector('#auto-dca-enable').addEventListener('click', () => control('/api/mini/auto/dca/enable', 'Auto DCA enabled.'));
    panel.querySelector('#auto-dca-disable').addEventListener('click', () => control('/api/mini/auto/dca/disable', 'Auto DCA disabled.'));
    panel.querySelectorAll('.dca-action').forEach((button) => button.addEventListener('click', () => scheduleAction(button.dataset.id, button.dataset.action)));
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
    notice('Public DCA wallet recorded. The secure executor remains separate.');
    refresh();
  }

  async function saveLimits(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const { response, payload } = await autoApi('/api/mini/auto/dca/limits', { method: 'POST', body: JSON.stringify(body) });
    if (!response.ok) return notice(payload.error || 'DCA limits were not saved.');
    notice('Auto DCA limits saved. Execution remains disabled until activation checks pass.');
    refresh();
  }

  async function createSchedule(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const { response, payload } = await autoApi('/api/mini/auto/dca/schedules', { method: 'POST', body: JSON.stringify(body) });
    if (!response.ok) return notice((payload.errors || [payload.error || 'DCA validation failed.']).join('\n'));
    notice(`DCA draft created.\n${payload.schedule.amount_per_buy} ${payload.schedule.input_currency} × ${payload.schedule.order_count}`);
    refresh();
  }

  async function scheduleAction(id, action) {
    const { response, payload } = await autoApi(`/api/mini/auto/dca/schedules/${encodeURIComponent(id)}/${encodeURIComponent(action)}`, { method: 'POST', body: '{}' });
    if (!response.ok) return notice(payload.error || `DCA ${action} failed.`);
    notice(`DCA schedule ${action} confirmed.`);
    refresh();
  }

  function refresh() {
    const panel = document.querySelector('#auto-owner-panel');
    if (!panel) return;
    panel.innerHTML = `<div class="section-title"><h2>🤖 Auto DCA</h2></div><div id="auto-owner-status" class="panel loading"><div class="orb"></div><p>Refreshing…</p></div>`;
    loadPanel(panel);
  }

  async function attach() {
    if (!tg || !tg.initData || document.querySelector('#auto-owner-panel')) return;
    const adminPanel = document.querySelector('#admin-panel');
    if (!adminPanel) return;
    const panel = createPanel();
    adminPanel.appendChild(panel);
    await loadPanel(panel);
  }

  const observer = new MutationObserver(() => attach());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', attach);
  setTimeout(attach, 1200);
})();

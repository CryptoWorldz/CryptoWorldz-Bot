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
    const limits = status.limits || {};
    return `<div class="profile-row"><span>Mode</span><b>${escapeHtml(String(status.mode || 'safe_locked').toUpperCase())}</b></div>
      <div class="profile-row"><span>Execution</span><b>${status.execution_enabled ? 'ENABLED' : 'LOCKED'}</b></div>
      <div class="profile-row"><span>Signing</span><b>${status.signing_enabled ? 'ENABLED' : 'DISABLED'}</b></div>
      <div class="profile-row"><span>Paused</span><b>${status.paused ? 'YES' : 'NO'}</b></div>
      <div class="profile-row"><span>Emergency stop</span><b>${status.emergency_stop ? 'ACTIVE' : 'CLEAR'}</b></div>
      <div class="profile-row"><span>Allowlisted tokens</span><b>${Number(status.allowlisted_tokens) || 0}</b></div>
      <div class="profile-row"><span>Maximum order</span><b>${Number(limits.maxOrderAmount) || 0}</b></div>
      <div class="profile-row"><span>Daily cap</span><b>${Number(limits.maxDailyAmount) || 0}</b></div>
      <div class="profile-row"><span>Minimum interval</span><b>${Number(limits.minIntervalMinutes) || 0} minutes</b></div>`;
  }

  function createPanel() {
    const wrapper = document.createElement('section');
    wrapper.id = 'auto-owner-panel';
    wrapper.className = 'panel';
    wrapper.innerHTML = `<div class="section-title"><h2>💎 Diamond Buy™ Auto</h2></div>
      <div id="auto-owner-status" class="panel loading"><div class="orb"></div><p>Checking SAFE LOCKED service…</p></div>`;
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
      statusHolder.innerHTML = `<b>SAFE LOCKED — NOT CONNECTED</b><p>Auto is prepared but the separate service or private bridge is not configured.</p><p>No transaction execution exists in this release.</p>`;
      return;
    }

    statusHolder.className = 'panel';
    statusHolder.innerHTML = `${statusMarkup(payload)}<div class="form-row">
      <button id="auto-pause" class="button secondary" type="button">Pause</button>
      <button id="auto-resume" class="button secondary" type="button">Resume Simulation</button>
    </div><button id="auto-emergency" class="button" type="button">Emergency Stop</button>`;

    const form = document.createElement('form');
    form.id = 'auto-simulation-form';
    form.className = 'panel';
    form.innerHTML = `<h3>Simulation Only</h3>
      <input name="token_mint" placeholder="Allowlisted Solana token mint" required>
      <div class="form-row"><input name="amount" type="number" min="0" step="any" placeholder="Amount per order" required><select name="currency"><option>SOL</option><option>USDC</option></select></div>
      <div class="form-row"><input name="order_count" type="number" min="1" max="365" value="1" required><input name="interval_minutes" type="number" min="1" value="60" required></div>
      <div class="form-row"><input name="slippage_bps" type="number" min="0" value="50" placeholder="Slippage bps" required><input name="price_impact_bps" type="number" min="0" value="50" placeholder="Price impact bps" required></div>
      <input name="liquidity_usd" type="number" min="0" step="any" placeholder="Observed liquidity USD" required>
      <button class="button" type="submit">Run Safe Simulation</button>
      <small>No transaction is built, signed, scheduled or submitted.</small>`;
    panel.appendChild(form);

    panel.querySelector('#auto-pause').addEventListener('click', () => control('/api/mini/auto/pause', 'Auto simulations paused.'));
    panel.querySelector('#auto-resume').addEventListener('click', () => control('/api/mini/auto/resume', 'Auto simulation mode resumed. Live execution remains disabled.'));
    panel.querySelector('#auto-emergency').addEventListener('click', () => control('/api/mini/auto/emergency-stop', 'Auto emergency stop confirmed.'));
    form.addEventListener('submit', simulate);
  }

  async function control(path, successMessage) {
    const { response, payload } = await autoApi(path, { method: 'POST', body: '{}' });
    if (!response.ok) return notice(payload.error || 'Auto control failed. Execution remains locked.');
    notice(successMessage);
    const panel = document.querySelector('#auto-owner-panel');
    if (panel) {
      panel.innerHTML = `<div class="section-title"><h2>💎 Diamond Buy™ Auto</h2></div><div id="auto-owner-status" class="panel loading"><div class="orb"></div><p>Refreshing…</p></div>`;
      loadPanel(panel);
    }
  }

  async function simulate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    body.network = 'solana';
    const { response, payload } = await autoApi('/api/mini/auto/simulate', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errors = payload.result && Array.isArray(payload.result.errors) ? payload.result.errors.join('\n') : payload.error;
      return notice(`Simulation rejected:\n${errors || 'Safety validation failed.'}`);
    }
    const proposal = payload.result?.proposal || {};
    notice(`Simulation accepted only.\n${proposal.order_count} orders • ${proposal.total_amount} ${proposal.currency}\nNo transaction was attempted.`);
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

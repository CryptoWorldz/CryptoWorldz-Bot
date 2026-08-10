(() => {
  const STORAGE_KEY = 'cw-admin-gateway';
  const GROUPS = Object.freeze([
    { id: 'ultimate', icon: '🥏', label: 'ULTIMATE' },
    { id: 'operations', icon: '✅', label: 'OPERATIONS' },
    { id: 'raaiiidds', icon: '🚀', label: 'RAAIIIDDS' },
    { id: 'team', icon: '🛡️', label: 'TEAM' },
    { id: 'points', icon: '⭐', label: 'POINTS' }
  ]);

  let activeGroup = sessionStorage.getItem(STORAGE_KEY) || 'ultimate';
  if (!GROUPS.some((group) => group.id === activeGroup)) activeGroup = 'ultimate';
  let applying = false;

  function groupFor(element) {
    if (!element || element.nodeType !== 1) return null;
    const id = element.id || '';
    if (id === 'auto-owner-panel') return 'ultimate';
    if (id === 'mission-create') return 'raaiiidds';
    if (id === 'points-rule') return 'points';
    if (id === 'executive-admin-panel' || id === 'admin-team' || id === 'admin-permission') return 'team';
    if (id === 'admin-submissions') return 'operations';
    if (element.dataset.adminGroup) return element.dataset.adminGroup;
    return 'operations';
  }

  function shellMarkup() {
    return `<div class="admin-gateway-head">
      <p class="eyebrow">COMMAND CENTRE • CLEAN ADMIN</p>
      <h3>Five controls. Everything else stays underneath.</h3>
      <p>Choose one section at a time. No functions have been removed.</p>
    </div>
    <nav class="admin-gateway-nav" aria-label="Admin Centre sections">
      ${GROUPS.map((group) => `<button class="button secondary${group.id === activeGroup ? ' active' : ''}" type="button" data-admin-gateway="${group.id}"><span>${group.icon}</span>${group.label}</button>`).join('')}
    </nav>
    <div id="admin-gateway-empty" class="admin-gateway-empty hidden"></div>`;
  }

  function ensureShell() {
    const screen = document.querySelector('#admin');
    const adminPanel = document.querySelector('#admin-panel');
    if (!screen || !adminPanel || !adminPanel.children.length) return null;
    let shell = document.querySelector('#admin-gateway-shell');
    if (!shell) {
      shell = document.createElement('section');
      shell.id = 'admin-gateway-shell';
      shell.className = 'panel admin-gateway-shell';
      shell.innerHTML = shellMarkup();
      screen.insertBefore(shell, adminPanel);
      shell.querySelectorAll('[data-admin-gateway]').forEach((button) => {
        button.addEventListener('click', () => setActive(button.dataset.adminGateway));
      });
    }
    return shell;
  }

  function setVisible(element, visible) {
    if (!element) return;
    if (element.id === 'admin-team' && document.querySelector('#executive-admin-panel')) {
      element.style.display = 'none';
      return;
    }
    element.style.display = visible ? '' : 'none';
  }

  function updateEmpty(shell, visibleCount) {
    const empty = shell?.querySelector('#admin-gateway-empty');
    if (!empty) return;
    if (visibleCount > 0) {
      empty.classList.add('hidden');
      empty.textContent = '';
      return;
    }
    const messages = {
      ultimate: 'Ultimate controls are available to the Owner and approved Executive safety roles.',
      operations: 'No pending operations are available right now.',
      raaiiidds: 'Raaiiidd creation tools are unavailable for this role.',
      team: 'Team controls are unavailable for this role.',
      points: 'Points controls are Owner-only.'
    };
    empty.textContent = messages[activeGroup] || 'No controls are available in this section.';
    empty.classList.remove('hidden');
  }

  function apply() {
    if (applying) return;
    applying = true;
    try {
      const adminPanel = document.querySelector('#admin-panel');
      const shell = ensureShell();
      if (!adminPanel || !shell) return;

      let visibleCount = 0;
      [...adminPanel.children].forEach((child) => {
        const group = groupFor(child);
        child.dataset.adminGroup = group;
        const visible = group === activeGroup;
        setVisible(child, visible);
        if (visible && !(child.id === 'admin-team' && document.querySelector('#executive-admin-panel'))) visibleCount += 1;
      });

      const worldzcast = document.querySelector('#worldzcast-root');
      if (worldzcast) {
        const hasContent = Boolean(worldzcast.children.length || worldzcast.textContent.trim());
        worldzcast.style.display = activeGroup === 'raaiiidds' ? '' : 'none';
        if (activeGroup === 'raaiiidds' && hasContent) visibleCount += 1;
      }

      shell.querySelectorAll('[data-admin-gateway]').forEach((button) => {
        const selected = button.dataset.adminGateway === activeGroup;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
      updateEmpty(shell, visibleCount);
    } finally {
      applying = false;
    }
  }

  function setActive(group) {
    if (!GROUPS.some((item) => item.id === group)) return;
    activeGroup = group;
    sessionStorage.setItem(STORAGE_KEY, group);
    apply();
    document.querySelector('#admin-gateway-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const observer = new MutationObserver(() => queueMicrotask(apply));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', apply);
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-open="admin"]')) setTimeout(apply, 0);
  });
  setTimeout(apply, 900);
})();
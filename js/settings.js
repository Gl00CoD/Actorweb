// The settings drawer: API keys, Trakt sign-in and how big the web gets.
(function () {
  const AW = (window.AW = window.AW || {});
  const $ = (id) => document.getElementById(id);
  let returnTo = null;
  let cancelLogin = false;

  function syncForm() {
    const s = AW.settings.get();
    const form = $('settingsForm');
    for (const input of form.querySelectorAll('input[name]')) {
      if (input.type === 'checkbox') input.checked = !!s[input.name];
      else if (document.activeElement !== input) input.value = s[input.name] ?? '';
    }
    form.querySelectorAll('output[data-for]').forEach((o) => (o.textContent = s[o.dataset.for]));
    const connected = AW.settings.hasTrakt();
    $('traktConnect').textContent = connected ? 'Disconnect Trakt' : 'Connect Trakt';
    $('traktState').textContent = connected ? 'Connected' : '';
  }

  function open() {
    returnTo = document.activeElement;
    syncForm();
    $('settings').hidden = false;
    requestAnimationFrame(() => $('settings').classList.add('is-open'));
    $('settingsForm').querySelector('input').focus({ preventScroll: true });
  }

  function close() {
    $('settings').classList.remove('is-open');
    setTimeout(() => ($('settings').hidden = true), 220);
    cancelLogin = true;
    $('deviceCode').hidden = true;
    if (returnTo && returnTo.focus) returnTo.focus({ preventScroll: true });
    AW.onSettingsClosed && AW.onSettingsClosed();
  }

  async function runTest(which, out) {
    out.textContent = 'Checking';
    out.className = '';
    try {
      out.textContent = await AW[which].test();
      out.className = 'ok';
    } catch (e) {
      out.textContent = e.message.includes('Failed to fetch')
        ? 'Could not reach ' + which.toUpperCase() + '. It may block requests from browsers.'
        : e.message;
      out.className = 'bad';
    }
  }

  async function traktButton() {
    const state = $('traktState');
    if (AW.settings.hasTrakt()) {
      AW.trakt.disconnect();
      syncForm();
      return;
    }
    cancelLogin = false;
    state.className = '';
    state.textContent = 'Asking Trakt for a code';
    try {
      const device = await AW.trakt.startDeviceLogin();
      $('deviceUrl').href = device.verification_url;
      $('deviceUrl').textContent = device.verification_url.replace(/^https?:\/\//, '');
      $('deviceUserCode').textContent = device.user_code;
      $('deviceCode').hidden = false;
      state.textContent = 'Waiting for you to approve';
      const ok = await AW.trakt.waitForApproval(device, () => cancelLogin);
      $('deviceCode').hidden = true;
      if (ok) {
        await AW.cache.clear();
        syncForm();
        state.className = 'ok';
      }
    } catch (e) {
      $('deviceCode').hidden = true;
      state.textContent = e.message;
      state.className = 'bad';
    }
  }

  function init() {
    $('openSettings').addEventListener('click', open);
    $('settings').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('settings').hidden) close(); });

    const form = $('settingsForm');
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('input', (e) => {
      const t = e.target;
      if (!t.name) return;
      const value = t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value;
      AW.settings.set({ [t.name]: value });
      if (t.type === 'range') form.querySelector(`output[data-for="${t.name}"]`).textContent = value;
      AW.settingsDirty = true;
    });

    form.querySelectorAll('[data-test]').forEach((b) => {
      b.addEventListener('click', () => runTest(b.dataset.test, form.querySelector(`output[data-result="${b.dataset.test}"]`)));
    });
    $('traktConnect').addEventListener('click', traktButton);
    $('clearCache').addEventListener('click', async () => {
      await AW.cache.clear();
      $('cacheState').textContent = 'Cleared';
      AW.settingsDirty = true;
    });
  }

  AW.settingsPanel = { init, open, close };
})();

// Wires everything together: routing, search, the start screen and the web.
(function () {
  const AW = (window.AW = window.AW || {});
  const $ = (id) => document.getElementById(id);
  let currentKey = null;
  let loadToken = 0;

  // ---------- toast ----------
  let toastTimer;
  AW.notify = function (msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 5000);
  };

  function status(msg) {
    const s = $('status');
    s.hidden = !msg;
    s.textContent = msg || '';
  }

  // ---------- small UI pieces ----------
  function titleChip(t, tag) {
    const el = document.createElement(tag || 'span');
    el.className = 'chip-disc' + (t.seen ? ' is-seen' : '');
    if (t.poster) {
      const img = new Image();
      img.src = t.poster.replace('/w342/', '/w154/');
      img.alt = '';
      img.onerror = () => { img.remove(); el.textContent = AW.graph.initials(t.title); };
      el.append(img);
    } else {
      el.textContent = AW.graph.initials(t.title);
    }
    return el;
  }

  const typeName = (t) => (t.type === 'tv' ? 'Series' : 'Film');

  // ---------- search ----------
  function setupSearch() {
    const input = $('searchInput');
    const list = $('searchResults');
    let items = [];
    let active = -1;
    let timer;
    let token = 0;

    function closeList() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      active = -1;
    }

    function paint() {
      list.innerHTML = '';
      items.forEach((t, i) => {
        const li = document.createElement('li');
        li.role = 'option';
        li.id = 'result-' + i;
        li.className = 'result' + (i === active ? ' is-active' : '');
        li.setAttribute('aria-selected', i === active);
        li.append(titleChip(t));
        const text = document.createElement('span');
        text.className = 'result-text';
        text.innerHTML = '<span class="result-title"></span><span class="result-meta"></span>';
        text.firstChild.textContent = t.title;
        text.lastChild.textContent = [t.year, typeName(t), t.seen ? 'watched' : null].filter(Boolean).join(', ');
        li.append(text);
        li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(i); });
        list.append(li);
      });
      input.setAttribute('aria-activedescendant', active >= 0 ? 'result-' + active : '');
    }

    function choose(i) {
      const t = items[i];
      if (!t) return;
      closeList();
      input.value = '';
      input.blur();
      location.hash = '#/' + t.type + '/' + t.id;
    }

    async function run(q) {
      const my = ++token;
      if (!q.trim()) { closeList(); return; }
      try {
        const res = await AW.source.search(q);
        if (my !== token) return;
        items = res;
        active = res.length ? 0 : -1;
        if (!res.length) {
          list.innerHTML = '';
          const li = document.createElement('li');
          li.className = 'result-empty';
          li.textContent = AW.source.isDemo()
            ? 'The demo only has The Matrix. Add a TMDB key in Settings to search everything.'
            : 'Nothing called "' + q.trim() + '". Try the original title.';
          list.append(li);
        } else {
          paint();
        }
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      } catch (e) {
        AW.notify(e.message);
      }
    }

    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => run(input.value), 220);
    });
    input.addEventListener('keydown', (e) => {
      if (list.hidden || !items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % items.length; paint(); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(Math.max(active, 0)); }
      else if (e.key === 'Escape') closeList();
    });
    input.addEventListener('blur', () => setTimeout(closeList, 120));
    input.addEventListener('focus', () => { if (input.value.trim()) run(input.value); });
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== input && !AW.popup.isOpen() && $('settings').hidden) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  // ---------- start screen ----------
  async function showHome() {
    currentKey = null;
    loadToken++;
    status('');
    document.body.className = 'is-home';
    $('slate').hidden = true;
    $('legend').hidden = true;
    AW.graph.clear();
    document.title = 'Actorweb';

    const demo = AW.source.isDemo();
    $('homeNote').innerHTML = demo
      ? 'No API keys yet, so this runs on a small demo. <button type="button" class="link-button" id="homeSettings">Add a TMDB key</button> to search every film and series.'
      : AW.settings.hasTrakt()
        ? 'Pick a film or series to see where its cast went next.'
        : 'Pick a film or series to see where its cast went next. <button type="button" class="link-button" id="homeSettings">Connect Trakt</button> to mark what you\'ve watched.';
    const hs = $('homeSettings');
    if (hs) hs.addEventListener('click', () => AW.settingsPanel.open());

    const recent = $('recent');
    recent.hidden = true;
    const items = await AW.source.recent();
    if (currentKey || !items.length) return;
    $('recentHeading').textContent = demo ? 'Or open the demo' : 'Start from something you watched';
    const ul = $('recentList');
    ul.innerHTML = '';
    items.forEach((t) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#/' + t.type + '/' + t.id;
      a.className = 'recent-item';
      a.append(titleChip(t));
      const name = document.createElement('span');
      name.className = 'recent-title';
      name.textContent = t.title;
      const year = document.createElement('span');
      year.className = 'recent-year';
      year.textContent = t.year || '';
      a.append(name, year);
      li.append(a);
      ul.append(li);
    });
    recent.hidden = false;
  }

  // ---------- the web ----------
  async function showWeb(type, id) {
    const key = type + ':' + id;
    currentKey = key;
    const my = ++loadToken;
    document.body.className = 'is-web';
    $('slate').hidden = true;
    $('legend').hidden = true;
    AW.graph.clear();
    status('Collecting the cast');
    try {
      const web = await AW.source.web(type, isNaN(id) ? id : Number(id), (done, total) => {
        if (my === loadToken) status('Reading filmographies, ' + done + ' of ' + total);
      });
      if (my !== loadToken) return;
      status('');
      if (!web.cast.length) {
        status('No cast listed for ' + web.center.title + '.');
        return;
      }
      AW.graph.render(web, {
        open: (entries, title, origin, el) => AW.popup.open(entries, title, origin, el, { centerKey: web.center.key }),
      });
      const others = new Set(web.cast.flatMap((m) => m.titles.map((t) => t.key))).size;
      $('slateTitle').textContent = web.center.title;
      $('slateMeta').textContent = [web.center.year, typeName(web.center).toLowerCase(), web.cast.length + ' actors', others + ' other titles']
        .filter(Boolean).join(', ');
      $('slate').hidden = false;
      document.title = web.center.title + ' in Actorweb';
      const showLegend = AW.settings.hasTrakt() || AW.source.isDemo();
      $('legend').hidden = !showLegend;
      $('legend').querySelector('span').textContent = AW.source.isDemo()
        ? 'Circled titles are ones you watched (demo history)'
        : 'Circled titles are in your Trakt history';
    } catch (e) {
      if (my !== loadToken) return;
      status('');
      AW.notify(e.message);
      if (AW.source.isDemo()) location.hash = '#/';
    }
  }

  function route() {
    AW.popup.close();
    const m = location.hash.match(/^#\/(movie|tv)\/([\w-]+)/);
    if (m) showWeb(m[1], m[2]);
    else showHome();
  }

  AW.onSettingsClosed = function () {
    if (!AW.settingsDirty) return;
    AW.settingsDirty = false;
    route();
  };

  document.addEventListener('DOMContentLoaded', () => {
    AW.popup.init();
    AW.settingsPanel.init();
    setupSearch();
    window.addEventListener('hashchange', route);
    route();
  });
})();

// The round popup: the actor as they look now on the left, the actor in the
// chosen title on the right, each labelled with its year around the rim.
(function () {
  const AW = (window.AW = window.AW || {});
  const $ = (id) => document.getElementById(id);

  let state = null;
  let request = 0;

  function age(person) {
    if (!person.birthday) return null;
    const b = new Date(person.birthday);
    const end = person.deathday ? new Date(person.deathday) : new Date();
    let a = end.getFullYear() - b.getFullYear();
    const m = end.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < b.getDate())) a--;
    return a;
  }

  function nowLabel(person) {
    const a = age(person);
    if (person.deathday) return 'Died ' + person.deathday.slice(0, 4) + (a != null ? ', age ' + a : '');
    return 'Now' + (a != null ? ', age ' + a : '');
  }

  function fill(half, url, label, focus) {
    half.innerHTML = '';
    half.classList.toggle('is-empty', !url);
    if (url) {
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.src = url;
      if (focus) img.style.objectPosition = focus;
      img.onerror = () => { img.remove(); half.classList.add('is-empty'); half.append(mono(label)); };
      half.append(img);
    } else {
      half.append(mono(label));
    }
  }

  function mono(label) {
    const s = document.createElement('span');
    s.className = 'half-mono';
    s.textContent = AW.graph.initials(label);
    return s;
  }

  function show(i) {
    const { entries, title } = state;
    state.index = (i + entries.length) % entries.length;
    const { person, character } = entries[state.index];
    const token = ++request;

    $('disc').classList.remove('show-now', 'show-role');
    $('ringName').textContent = person.name;
    $('ringNow').textContent = nowLabel(person);
    $('ringRole').textContent = title.year ? String(title.year) : 'Year unknown';
    $('popupCaption').textContent = person.name + (character ? ' as ' + character : '') + ' in ' + title.title + (title.year ? ' (' + title.year + ')' : '');
    $('popupNote').textContent = '';

    $('halfNow').setAttribute('aria-label', person.name + ' now. Show larger.');
    $('halfRole').setAttribute('aria-label', person.name + ' in ' + title.title + '. Show larger.');
    fill($('halfNow'), person.profile, person.name, '50% 22%');

    const role = $('halfRole');
    role.innerHTML = '<span class="half-wait">Looking for a still</span>';
    role.classList.add('is-empty');

    const pager = $('pager');
    pager.hidden = entries.length < 2;
    $('pagerCount').textContent = (state.index + 1) + ' of ' + entries.length;

    if (AW.source.isDemo()) {
      fill(role, null, person.name);
      $('popupNote').textContent = 'The demo has no photos. Add a TMDB key in Settings to see them.';
      return;
    }
    AW.source.rolePhoto(person, title).then((photo) => {
      if (token !== request) return;
      if (!photo) {
        fill(role, null, title.title);
        $('popupNote').textContent = 'No photo of ' + person.name + ' in this title was found.';
      } else {
        fill(role, photo.url, title.title, photo.kind === 'poster' ? '50% 30%' : '50% 35%');
        if (photo.kind === 'poster') {
          $('ringRole').textContent = (title.year || '') + ' poster';
          $('popupNote').textContent = 'No still of ' + person.name + ' in this title yet, so this is the poster.';
        }
      }
    });
  }

  function open(entries, title, origin, returnTo, opts) {
    if (!entries.length) return;
    state = { entries, title, index: 0, returnTo, opts: opts || {} };
    const pop = $('popup');
    const reel = $('reel');

    const rc = $('recenter');
    const canRecenter = title.key !== state.opts.centerKey && !AW.source.isDemo();
    rc.hidden = !canRecenter;
    rc.textContent = 'Center the web on ' + title.title;

    show(0);

    pop.hidden = false;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && origin) {
      const box = reel.getBoundingClientRect();
      const dx = origin.x - (box.left + box.width / 2);
      const dy = origin.y - (box.top + box.height / 2);
      reel.style.transition = 'none';
      reel.style.transform = `translate(${dx}px, ${dy}px) scale(0.1)`;
      reel.getBoundingClientRect();
      reel.style.transition = '';
    }
    requestAnimationFrame(() => {
      pop.classList.add('is-open');
      reel.style.transform = '';
    });
    $('closePopup').focus({ preventScroll: true });
  }

  function close() {
    if (!state) return;
    const pop = $('popup');
    pop.classList.remove('is-open');
    const back = state.returnTo;
    state = null;
    request++;
    setTimeout(() => { if (!state) pop.hidden = true; }, 220);
    if (back && back.focus) back.focus({ preventScroll: true });
  }

  function init() {
    $('closePopup').addEventListener('click', close);
    $('popup').addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) close(); });
    $('prevActor').addEventListener('click', () => state && show(state.index - 1));
    $('nextActor').addEventListener('click', () => state && show(state.index + 1));
    $('recenter').addEventListener('click', () => {
      if (!state) return;
      const t = state.title;
      close();
      location.hash = '#/' + t.type + '/' + t.id;
    });
    $('halfNow').addEventListener('click', () => $('disc').classList.toggle('show-now'));
    $('halfRole').addEventListener('click', () => $('disc').classList.toggle('show-role'));
    document.addEventListener('keydown', (e) => {
      if (!state) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft' && state.entries.length > 1) show(state.index - 1);
      else if (e.key === 'ArrowRight' && state.entries.length > 1) show(state.index + 1);
      else if (e.key === 'Tab') {
        // Keep focus inside the popup.
        const f = [...$('popup').querySelectorAll('button:not([hidden])')].filter((b) => b.offsetParent);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  AW.popup = { open, close, init, isOpen: () => !!state };
})();

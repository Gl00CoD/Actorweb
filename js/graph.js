// The web itself: a title in the middle, its cast around it, and the titles
// each actor went on to (or came from) at the edge. Titles shared by several
// actors pull inward and become knots in the web.
(function () {
  const AW = (window.AW = window.AW || {});
  const NS = 'http://www.w3.org/2000/svg';

  const R = { center: 66, actor: 30, title: 17, hub: 23 };
  const MONO_FILLS = ['#C6CFD2', '#BAC5C9', '#D0D7D9', '#B3BFC3'];

  let svg, viewport, zoom, nodesById, current;

  // ---------- helpers ----------
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function initials(name) {
    const words = String(name || '?').replace(/[^\p{L}\s'-]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    if (words[0].toLowerCase() === 'the' && words.length > 1) words.shift();
    return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
  }

  // A grease-pencil loop: slightly uneven, overshoots where it started.
  AW.pencilLoop = function (r, seed) {
    const s = seed || 1;
    const a0 = ((s % 360) / 360) * Math.PI * 2;
    const turn = Math.PI * 2 * 1.09;
    const p1 = (s % 7) / 7 * Math.PI * 2;
    const p2 = (s % 11) / 11 * Math.PI * 2;
    const squash = 0.92 + ((s % 13) / 13) * 0.1;
    const pts = [];
    const steps = 44;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = a0 + t * turn;
      const k = r * (1 + 0.035 * Math.sin(3 * a + p1) + 0.02 * Math.sin(5 * a + p2) + t * 0.06);
      pts.push([Math.cos(a) * k, Math.sin(a) * k * squash]);
    }
    return d3.line().curve(d3.curveCatmullRom.alpha(0.5))(pts);
  };

  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
  }

  // ---------- model ----------
  function buildModel(web) {
    const nodes = [];
    const links = [];
    const center = { id: web.center.key, kind: 'center', title: web.center, r: R.center, fx: 0, fy: 0 };
    nodes.push(center);
    const titles = new Map();
    web.cast.forEach((m, i) => {
      const a = { id: 'p:' + m.person.id + ':' + i, kind: 'actor', person: m.person, character: m.character, r: R.actor, index: i };
      nodes.push(a);
      links.push({ source: center, target: a, kind: 'cast' });
      m.titles.forEach((t) => {
        let n = titles.get(t.key);
        if (!n) {
          n = { id: t.key, kind: 'title', title: t, actors: [], r: R.title };
          titles.set(t.key, n);
          nodes.push(n);
        }
        n.actors.push({ person: m.person, character: t.character, actorNode: a });
        n.title.seen = n.title.seen || t.seen;
        links.push({ source: a, target: n, kind: 'credit' });
      });
    });
    titles.forEach((n) => { if (n.actors.length > 1) n.r = R.hub + Math.min(n.actors.length - 2, 3) * 3; });
    return { nodes, links, center };
  }

  function layout(model) {
    const actors = model.nodes.filter((n) => n.kind === 'actor');
    const count = Math.max(actors.length, 1);
    const ring = Math.max(210, count * 27);
    actors.forEach((a, i) => {
      a.angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      a.x = Math.cos(a.angle) * ring;
      a.y = Math.sin(a.angle) * ring;
    });
    model.nodes.filter((n) => n.kind === 'title').forEach((t, i) => {
      const sx = d3.sum(t.actors, (x) => Math.cos(x.actorNode.angle));
      const sy = d3.sum(t.actors, (x) => Math.sin(x.actorNode.angle));
      const ang = Math.atan2(sy, sx) + ((i % 5) - 2) * 0.12;
      const dist = t.actors.length > 1 ? ring * 0.95 + 40 : ring + 150 + (i % 3) * 30;
      t.x = Math.cos(ang) * dist;
      t.y = Math.sin(ang) * dist;
    });

    const sim = d3.forceSimulation(model.nodes)
      .force('link', d3.forceLink(model.links)
        .distance((l) => (l.kind === 'cast' ? ring : l.target.actors.length > 1 ? 150 : 115))
        .strength((l) => (l.kind === 'cast' ? 0.7 : 0.5)))
      .force('charge', d3.forceManyBody().strength((n) => (n.kind === 'actor' ? -520 : n.kind === 'center' ? -900 : -230)))
      .force('collide', d3.forceCollide((n) => n.r + (n.kind === 'actor' ? 30 : 16)).iterations(2))
      .force('radial', d3.forceRadial(ring + 165, 0, 0).strength((n) => (n.kind === 'title' && n.actors.length === 1 ? 0.06 : 0)))
      .stop();
    for (let i = 0; i < 420; i++) sim.tick();
    return ring;
  }

  // ---------- drawing ----------
  function drawDisc(g, n, label, imageUrl) {
    el('circle', { r: n.r, class: 'node-fill', fill: MONO_FILLS[hash(n.id) % MONO_FILLS.length] }, g);
    const mono = el('text', { class: 'node-mono', 'text-anchor': 'middle', dy: '0.36em', 'font-size': Math.round(n.r * 0.62) }, g);
    mono.textContent = initials(label);
    if (imageUrl) {
      const im = el('image', {
        href: imageUrl, x: -n.r, y: -n.r, width: n.r * 2, height: n.r * 2,
        preserveAspectRatio: 'xMidYMid slice', 'clip-path': 'url(#aw-clip)', class: 'node-image',
      }, g);
      im.addEventListener('error', () => im.remove());
      im.addEventListener('load', () => g.classList.add('has-image'));
    }
    el('circle', { r: n.r, class: 'node-rim' }, g);
  }

  function drawLabel(g, n) {
    if (n.kind === 'center') return;
    const y = n.r + 15;
    const t = el('text', { class: 'node-label', 'text-anchor': 'middle', y }, g);
    if (n.kind === 'actor') {
      t.textContent = n.person.name;
      if (n.character) {
        const c = el('text', { class: 'node-sub', 'text-anchor': 'middle', y: y + 14 }, g);
        c.textContent = truncate(n.character, 26);
      }
    } else {
      t.textContent = truncate(n.title.title, 28);
      const c = el('text', { class: 'node-sub', 'text-anchor': 'middle', y: y + 13 }, g);
      c.textContent = (n.title.year || '') + (n.title.type === 'tv' ? ' series' : '');
    }
  }

  function describe(n) {
    if (n.kind === 'center') return n.title.title + ', the center of the web. Open its cast.';
    if (n.kind === 'actor') return n.person.name + (n.character ? ' as ' + n.character : '') + '. Open photos.';
    const who = n.actors.map((a) => a.person.name).join(', ');
    return n.title.title + (n.title.year ? ' (' + n.title.year + ')' : '') + ', with ' + who + (n.title.seen ? '. Watched.' : '.');
  }

  function render(web, handlers) {
    svg = document.getElementById('web');
    svg.innerHTML = '';
    current = { web, handlers };
    const model = buildModel(web);
    const ring = layout(model);
    nodesById = new Map(model.nodes.map((n) => [n.id, n]));

    const defs = el('defs', {}, svg);
    const clip = el('clipPath', { id: 'aw-clip', clipPathUnits: 'objectBoundingBox' }, defs);
    el('circle', { cx: 0.5, cy: 0.5, r: 0.5 }, clip);

    viewport = el('g', { class: 'viewport' }, svg);
    const linkLayer = el('g', { class: 'links' }, viewport);
    const nodeLayer = el('g', { class: 'nodes' }, viewport);

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    model.links.forEach((l) => {
      const line = el('line', {
        x1: l.source.x, y1: l.source.y, x2: l.target.x, y2: l.target.y,
        class: 'link link-' + l.kind,
      }, linkLayer);
      l.el = line;
      if (!reduce) {
        const len = Math.hypot(l.target.x - l.source.x, l.target.y - l.source.y);
        line.style.strokeDasharray = len;
        line.style.strokeDashoffset = len;
        const delay = l.kind === 'cast' ? 80 + l.target.index * 45 : 520 + Math.hypot(l.target.x, l.target.y) * 0.55;
        line.style.animation = `aw-draw 520ms ${delay}ms cubic-bezier(.3,.6,.2,1) forwards`;
      }
    });

    model.nodes
      .slice()
      .sort((a, b) => (a.kind === 'title') - (b.kind === 'title'))
      .reverse()
      .forEach((n) => {
        const g = el('g', {
          class: 'node node-' + n.kind + (n.kind === 'title' && n.actors.length > 1 ? ' is-hub' : '') + (n.title && n.title.seen ? ' is-seen' : ''),
          transform: `translate(${n.x},${n.y})`,
          tabindex: 0, role: 'button', 'aria-label': describe(n),
        }, nodeLayer);
        n.el = g;
        const inner = el('g', { class: 'node-inner' }, g);
        if (n.kind === 'actor') drawDisc(inner, n, n.person.name, n.person.thumb);
        else drawDisc(inner, n, n.title.title, n.title.poster);
        if (n.title && n.title.seen) {
          el('path', { d: AW.pencilLoop(n.r + (n.kind === 'center' ? 11 : 7), hash(n.id)), class: 'pencil' }, inner);
        }
        drawLabel(inner, n);
        if (!reduce) {
          const delay = n.kind === 'center' ? 0 : n.kind === 'actor' ? 160 + n.index * 45 : 760 + Math.hypot(n.x, n.y) * 0.55;
          inner.style.animation = `aw-pop 420ms ${delay}ms cubic-bezier(.2,.9,.3,1.25) both`;
        }

        g.addEventListener('mouseenter', () => focusOn(n));
        g.addEventListener('mouseleave', clearFocus);
        g.addEventListener('focus', () => focusOn(n));
        g.addEventListener('blur', clearFocus);
        g.addEventListener('click', () => activate(n));
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(n); }
        });
      });

    // Draw the center last so it sits on top.
    nodeLayer.appendChild(model.center.el);

    model.links.forEach((l) => { (l.source.links = l.source.links || []).push(l); (l.target.links = l.target.links || []).push(l); });

    setupZoom(model, ring);
  }

  function setupZoom(model) {
    const sel = d3.select(svg);
    zoom = d3.zoom()
      .scaleExtent([0.25, 4])
      .on('zoom', (e) => {
        viewport.setAttribute('transform', e.transform.toString());
        svg.classList.toggle('is-close', e.transform.k > 1.35);
      });
    sel.call(zoom).on('dblclick.zoom', null);
    fit(model.nodes, false);
  }

  function fit(nodes, animate) {
    const list = nodes || [...nodesById.values()];
    const box = svg.getBoundingClientRect();
    const pad = { top: 92, bottom: window.innerWidth < 700 ? 150 : 120, side: 24 };
    const x0 = d3.min(list, (n) => n.x - n.r - 40);
    const x1 = d3.max(list, (n) => n.x + n.r + 40);
    const y0 = d3.min(list, (n) => n.y - n.r - 10);
    const y1 = d3.max(list, (n) => n.y + n.r + 44);
    const w = box.width - pad.side * 2;
    const h = box.height - pad.top - pad.bottom;
    const k = Math.min(w / (x1 - x0), h / (y1 - y0), 1.25);
    const tx = pad.side + w / 2 - k * (x0 + x1) / 2;
    const ty = pad.top + h / 2 - k * (y0 + y1) / 2;
    const t = d3.zoomIdentity.translate(tx, ty).scale(k);
    const sel = d3.select(svg);
    (animate ? sel.transition().duration(500) : sel).call(zoom.transform, t);
  }

  function focusOn(n) {
    svg.classList.add('is-focusing');
    n.el.classList.add('is-lit');
    (n.links || []).forEach((l) => {
      l.el.classList.add('is-lit');
      const other = l.source === n ? l.target : l.source;
      other.el.classList.add('is-near');
    });
  }

  function clearFocus() {
    if (!svg) return;
    svg.classList.remove('is-focusing');
    svg.querySelectorAll('.is-lit, .is-near').forEach((x) => x.classList.remove('is-lit', 'is-near'));
  }

  function originOf(n) {
    const r = n.el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function activate(n) {
    const h = current.handlers;
    const origin = originOf(n);
    const center = current.web.center;
    if (n.kind === 'actor') {
      h.open([{ person: n.person, character: n.character }], center, origin, n.el);
    } else if (n.kind === 'center') {
      h.open(current.web.cast.map((m) => ({ person: m.person, character: m.character })), center, origin, n.el);
    } else {
      h.open(n.actors.map((a) => ({ person: a.person, character: a.character })), n.title, origin, n.el);
    }
  }

  function clear() {
    if (svg) svg.innerHTML = '';
    current = null;
  }

  window.addEventListener('resize', () => { if (current) fit(null, false); });

  AW.graph = { render, clear, fit: () => current && fit(null, true), initials };
})();

// One place the rest of the app asks for data. Picks demo or live sources.
(function () {
  const AW = (window.AW = window.AW || {});

  const isDemo = () => !AW.settings.hasTmdb();

  async function mapLimit(items, limit, fn) {
    const out = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    });
    await Promise.all(workers);
    return out;
  }

  async function seen() {
    try {
      return await AW.trakt.seenKeys();
    } catch (e) {
      AW.notify && AW.notify(e.message);
      return new Set();
    }
  }

  async function search(query) {
    if (isDemo()) return AW.demo.search(query);
    const [results, seenSet] = await Promise.all([AW.tmdb.search(query), seen()]);
    results.forEach((r) => (r.seen = seenSet.has(r.key)));
    return results;
  }

  // The web for one title: the title, its top cast, and each actor's other titles.
  async function web(type, id, onProgress) {
    if (isDemo()) {
      if (type + ':' + id !== AW.demo.center.key) {
        throw new Error('The demo only knows The Matrix. Add a TMDB key in Settings to explore everything.');
      }
      await new Promise((r) => setTimeout(r, 350));
      return AW.demo.web();
    }
    const s = AW.settings.get();
    const [{ title, cast }, seenSet] = await Promise.all([AW.tmdb.titleDetails(type, id), seen()]);
    title.seen = seenSet.has(title.key);
    const top = cast.slice(0, s.castCount);
    let done = 0;
    const members = await mapLimit(top, 4, async (c) => {
      let p;
      try {
        p = await AW.tmdb.person(c.id);
      } catch (e) {
        p = { ...c, credits: [] };
      }
      onProgress && onProgress(++done, top.length);
      return {
        person: { id: p.id, name: p.name, profile: p.profile || c.profile, thumb: p.thumb || c.thumb, birthday: p.birthday, deathday: p.deathday },
        character: c.character,
        titles: AW.tmdb.pickTitles(p.credits, title.key, seenSet, s),
      };
    });
    return { center: title, cast: members };
  }

  // A photo of this person in this title. Returns { url, kind } where kind is
  // 'role' for a real still/character image or 'poster' as a stand-in.
  async function rolePhoto(person, title) {
    if (isDemo()) return null;
    try {
      const fromTvdb = await AW.tvdb.rolePhoto(person.name, title);
      if (fromTvdb) return { url: fromTvdb, kind: 'role' };
    } catch (e) { /* TVDB is optional */ }
    try {
      const fromTags = await AW.tmdb.rolePhotoFromTags(person.id, title);
      if (fromTags) return { url: fromTags, kind: 'role' };
    } catch (e) { /* fall through */ }
    return title.poster ? { url: title.poster, kind: 'poster' } : null;
  }

  async function recent() {
    if (isDemo()) return [AW.demo.center];
    try {
      const items = await AW.trakt.recent(8);
      // Fill in posters from TMDB.
      return await mapLimit(items, 4, async (it) => {
        try {
          const { title } = await AW.tmdb.titleDetails(it.type, it.id);
          return { ...title, seen: true };
        } catch (e) {
          return { ...it, poster: null, seen: true };
        }
      });
    } catch (e) {
      AW.notify && AW.notify(e.message);
      return [];
    }
  }

  AW.source = { isDemo, search, web, rolePhoto, recent };
})();

// TVDB: used for one thing TMDB is weak at, the photo of an actor *in* a
// specific series. TVDB stores a character image per role.
(function () {
  const AW = (window.AW = window.AW || {});
  const BASE = 'https://api4.thetvdb.com/v4';
  let tokenPromise = null;

  function login() {
    if (tokenPromise) return tokenPromise;
    const s = AW.settings.get();
    tokenPromise = AW.cache.remember('tvdb:token:' + s.tvdbKey.trim(), 25 * AW.DAY, async () => {
      const body = { apikey: s.tvdbKey.trim() };
      if (s.tvdbPin.trim()) body.pin = s.tvdbPin.trim();
      const res = await fetch(BASE + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('TVDB rejected the key (' + res.status + '). Check it in Settings.');
      return (await res.json()).data.token;
    }).catch((e) => { tokenPromise = null; throw e; });
    return tokenPromise;
  }

  async function get(path) {
    const token = await login();
    const res = await fetch(BASE + path, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) throw new Error('TVDB request failed (' + res.status + ').');
    return (await res.json()).data;
  }

  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

  async function characters(kind, tvdbId) {
    return AW.cache.remember('tvdb:' + kind + ':' + tvdbId, 7 * AW.DAY, async () => {
      const d = await get('/' + kind + '/' + tvdbId + '/extended?short=false');
      return (d.characters || []).map((c) => ({ personName: c.personName, image: c.image, name: c.name }));
    });
  }

  // title: a TMDB-shaped title; returns an image URL or null.
  async function rolePhoto(personName, title) {
    if (!AW.settings.hasTvdb() || title.type !== 'tv') return null;
    let tvdbId = title.tvdbId;
    if (!tvdbId) {
      const ext = await AW.tmdb.externalIds(title.type, title.id);
      tvdbId = ext.tvdb_id;
    }
    if (!tvdbId) return null;
    const chars = await characters('series', tvdbId);
    const hit = chars.find((c) => norm(c.personName) === norm(personName) && c.image);
    if (!hit) return null;
    return hit.image.startsWith('http') ? hit.image : 'https://artworks.thetvdb.com' + hit.image;
  }

  async function test() {
    tokenPromise = null;
    await login();
    return 'Connected to TVDB.';
  }

  AW.tvdb = { rolePhoto, test };
})();

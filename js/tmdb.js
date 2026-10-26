// TMDB: search, cast lists, filmographies, profile photos and tagged stills.
(function () {
  const AW = (window.AW = window.AW || {});
  const BASE = 'https://api.themoviedb.org/3';
  const IMG = 'https://image.tmdb.org/t/p/';

  // Genres that make a filmography noisy: talk shows, news, reality.
  const NOISY_GENRES = new Set([10767, 10763, 10764]);
  const SELF_ROLE = /\b(self|himself|herself|themselves|themself)\b/i;

  function auth() {
    const key = AW.settings.get().tmdbKey.trim();
    // A v4 read access token is a long JWT; a v3 key is 32 hex characters.
    return key.length > 40 ? { header: 'Bearer ' + key } : { param: key };
  }

  async function get(path, params) {
    const a = auth();
    const url = new URL(BASE + path);
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    if (a.param) url.searchParams.set('api_key', a.param);
    const res = await fetch(url, { headers: a.header ? { Authorization: a.header } : {} });
    if (res.status === 401) throw new Error('TMDB rejected the key. Check it in Settings.');
    if (!res.ok) throw new Error('TMDB request failed (' + res.status + ').');
    return res.json();
  }

  function cached(path, params, ttl) {
    const key = 'tmdb:' + path + '?' + new URLSearchParams(params || {}).toString();
    return AW.cache.remember(key, ttl || 3 * AW.DAY, () => get(path, params));
  }

  const img = (path, size) => (path ? IMG + (size || 'w342') + path : null);
  const yearOf = (d) => (d ? Number(String(d).slice(0, 4)) || null : null);

  function toTitle(item, type) {
    const t = type || item.media_type;
    return {
      key: t + ':' + item.id,
      type: t,
      id: item.id,
      title: t === 'movie' ? item.title : item.name,
      year: yearOf(t === 'movie' ? item.release_date : item.first_air_date),
      poster: img(item.poster_path),
      backdrop: img(item.backdrop_path, 'w780'),
      popularity: item.popularity || 0,
      votes: item.vote_count || 0,
    };
  }

  function toPerson(p) {
    return {
      id: p.id,
      name: p.name,
      profile: img(p.profile_path, 'h632'),
      thumb: img(p.profile_path, 'w185'),
    };
  }

  async function search(query) {
    const data = await get('/search/multi', { query, include_adult: 'false' });
    return data.results
      .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
      .map((r) => toTitle(r))
      .slice(0, 8);
  }

  async function titleDetails(type, id) {
    const extra = type === 'movie' ? 'credits,external_ids' : 'aggregate_credits,external_ids';
    const d = await cached('/' + type + '/' + id, { append_to_response: extra });
    const title = toTitle(d, type);
    title.tvdbId = (d.external_ids && d.external_ids.tvdb_id) || null;
    title.imdbId = (d.external_ids && d.external_ids.imdb_id) || null;
    const cast = type === 'movie'
      ? (d.credits ? d.credits.cast : []).map((c) => ({ ...toPerson(c), character: c.character, order: c.order }))
      : (d.aggregate_credits ? d.aggregate_credits.cast : []).map((c) => ({
          ...toPerson(c),
          character: c.roles && c.roles[0] ? c.roles[0].character : '',
          order: c.order,
          episodes: c.total_episode_count,
        }));
    cast.sort((a, b) => a.order - b.order);
    return { title, cast };
  }

  async function person(id) {
    const d = await cached('/person/' + id, { append_to_response: 'combined_credits' });
    return {
      ...toPerson(d),
      birthday: d.birthday,
      deathday: d.deathday,
      credits: d.combined_credits ? d.combined_credits.cast : [],
    };
  }

  // Other titles this person played in, best known first.
  // `seen` is a Set of title keys from Trakt; seen titles always win.
  function pickTitles(credits, excludeKey, seen, opts) {
    const byKey = new Map();
    for (const c of credits) {
      if (c.media_type !== 'movie' && c.media_type !== 'tv') continue;
      const t = toTitle(c);
      if (t.key === excludeKey || !t.title) continue;
      const isSeen = seen.has(t.key);
      if (!isSeen) {
        if (opts.onlySeen) continue;
        if (opts.hideTalkShows && ((c.genre_ids || []).some((g) => NOISY_GENRES.has(g)) || SELF_ROLE.test(c.character || ''))) continue;
        if (c.media_type === 'tv' && (c.episode_count || 0) < 2) continue; // guest spots
        if (!t.poster) continue;
      }
      t.character = c.character || '';
      t.seen = isSeen;
      if (!byKey.has(t.key)) byKey.set(t.key, t);
    }
    return [...byKey.values()]
      .sort((a, b) => (b.seen - a.seen) || (b.votes - a.votes))
      .slice(0, opts.titlesPerActor);
  }

  // Images TMDB users tagged with this person, e.g. stills from a film.
  async function taggedImages(personId) {
    const first = await cached('/person/' + personId + '/tagged_images', { page: 1 }, 7 * AW.DAY);
    let results = first.results || [];
    const pages = Math.min(first.total_pages || 1, 4);
    for (let p = 2; p <= pages; p++) {
      const more = await cached('/person/' + personId + '/tagged_images', { page: p }, 7 * AW.DAY);
      results = results.concat(more.results || []);
    }
    return results;
  }

  async function rolePhotoFromTags(personId, title) {
    const imgs = await taggedImages(personId);
    const match = imgs.filter((i) => i.media && i.media.id === title.id && i.media_type === title.type);
    const rank = { still: 0, backdrop: 1, poster: 2 };
    match.sort((a, b) => (rank[a.image_type] ?? 3) - (rank[b.image_type] ?? 3) || (b.vote_count || 0) - (a.vote_count || 0));
    return match[0] ? img(match[0].file_path, 'w780') : null;
  }

  async function externalIds(type, id) {
    return cached('/' + type + '/' + id + '/external_ids', {}, 30 * AW.DAY);
  }

  async function test() {
    await get('/configuration');
    return 'Connected to TMDB.';
  }

  AW.tmdb = { search, titleDetails, person, pickTitles, rolePhotoFromTags, externalIds, toTitle, img, yearOf, test };
})();

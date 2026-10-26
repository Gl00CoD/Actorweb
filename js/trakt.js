// Trakt: your watch history. Used to circle the titles you've seen and to
// offer recently watched titles as starting points.
(function () {
  const AW = (window.AW = window.AW || {});
  const BASE = 'https://api.trakt.tv';

  function headers(withAuth) {
    const s = AW.settings.get();
    const h = {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': s.traktClientId.trim(),
    };
    if (withAuth && s.traktAuth) h.Authorization = 'Bearer ' + s.traktAuth.access_token;
    return h;
  }

  async function post(path, body) {
    return fetch(BASE + path, { method: 'POST', headers: headers(false), body: JSON.stringify(body) });
  }

  // ----- device login: show a code, the user enters it on trakt.tv -----
  async function startDeviceLogin() {
    const s = AW.settings.get();
    if (!s.traktClientId.trim() || !s.traktClientSecret.trim()) {
      throw new Error('Add your Trakt client ID and client secret first.');
    }
    const res = await post('/oauth/device/code', { client_id: s.traktClientId.trim() });
    if (!res.ok) throw new Error('Trakt did not accept the client ID (' + res.status + ').');
    return res.json(); // { device_code, user_code, verification_url, expires_in, interval }
  }

  // Polls until the user approves. Resolves true when connected.
  async function waitForApproval(device, isCancelled) {
    const s = AW.settings.get();
    const deadline = Date.now() + device.expires_in * 1000;
    let interval = device.interval * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, interval));
      if (isCancelled()) return false;
      const res = await post('/oauth/device/token', {
        code: device.device_code,
        client_id: s.traktClientId.trim(),
        client_secret: s.traktClientSecret.trim(),
      });
      if (res.status === 200) {
        saveTokens(await res.json());
        return true;
      }
      if (res.status === 400) continue;          // still waiting
      if (res.status === 429) { interval += 1000; continue; }
      if (res.status === 418) throw new Error('You declined the request on Trakt.');
      if (res.status === 410) throw new Error('The code expired. Start again.');
      throw new Error('Trakt login failed (' + res.status + ').');
    }
    throw new Error('The code expired. Start again.');
  }

  function saveTokens(t) {
    AW.settings.set({
      traktAuth: {
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        expires_at: (t.created_at + t.expires_in) * 1000,
      },
    });
  }

  async function refreshIfNeeded() {
    const s = AW.settings.get();
    if (!s.traktAuth || s.traktAuth.expires_at - Date.now() > 3 * AW.DAY) return;
    const res = await post('/oauth/token', {
      refresh_token: s.traktAuth.refresh_token,
      client_id: s.traktClientId.trim(),
      client_secret: s.traktClientSecret.trim(),
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      grant_type: 'refresh_token',
    });
    if (res.ok) saveTokens(await res.json());
  }

  async function get(path) {
    await refreshIfNeeded();
    const res = await fetch(BASE + path, { headers: headers(true) });
    if (res.status === 401) {
      AW.settings.set({ traktAuth: null });
      throw new Error('Trakt sign-in expired. Connect again in Settings.');
    }
    if (!res.ok) throw new Error('Trakt request failed (' + res.status + ').');
    return res.json();
  }

  // Set of title keys ("movie:603", "tv:1399") you've watched.
  async function seenKeys() {
    if (!AW.settings.hasTrakt()) return new Set();
    const keys = await AW.cache.remember('trakt:watched', AW.HOUR, async () => {
      const [movies, shows] = await Promise.all([get('/sync/watched/movies'), get('/sync/watched/shows')]);
      const out = [];
      movies.forEach((m) => m.movie.ids.tmdb && out.push('movie:' + m.movie.ids.tmdb));
      shows.forEach((s) => s.show.ids.tmdb && out.push('tv:' + s.show.ids.tmdb));
      return out;
    });
    return new Set(keys);
  }

  // Most recently watched distinct titles, as { type, id, title, year }.
  async function recent(limit) {
    if (!AW.settings.hasTrakt()) return [];
    return AW.cache.remember('trakt:recent', 15 * 60e3, async () => {
      const items = await get('/sync/history?limit=60');
      const seen = new Set();
      const out = [];
      for (const it of items) {
        const media = it.type === 'movie' ? it.movie : it.show;
        const type = it.type === 'movie' ? 'movie' : 'tv';
        if (!media || !media.ids.tmdb) continue;
        const key = type + ':' + media.ids.tmdb;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ key, type, id: media.ids.tmdb, title: media.title, year: media.year });
        if (out.length >= (limit || 8)) break;
      }
      return out;
    });
  }

  function disconnect() {
    AW.settings.set({ traktAuth: null });
    AW.cache.clear();
  }

  AW.trakt = { startDeviceLogin, waitForApproval, seenKeys, recent, disconnect };
})();

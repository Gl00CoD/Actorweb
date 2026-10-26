// Settings (API keys, preferences) and a small response cache.
// Everything is kept in this browser only. Nothing here is ever sent anywhere
// except to the API it belongs to.
(function () {
  const AW = (window.AW = window.AW || {});

  const SETTINGS_KEY = 'actorweb.settings.v1';

  const DEFAULTS = {
    tmdbKey: '',          // TMDB API key (v3) or read access token (v4)
    tvdbKey: '',          // TVDB v4 API key
    tvdbPin: '',          // Only needed for user-supported TVDB keys
    traktClientId: '',
    traktClientSecret: '',
    traktAuth: null,      // { access_token, refresh_token, expires_at }
    castCount: 10,        // Actors around the center title
    titlesPerActor: 5,    // Other titles shown per actor
    onlySeen: false,      // Only show titles from Trakt history
    hideTalkShows: true,  // Skip talk shows, news and "as himself" credits
  };

  function readSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return Object.assign({}, DEFAULTS, raw ? JSON.parse(raw) : {});
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  let settings = readSettings();
  const listeners = new Set();

  AW.settings = {
    get: () => settings,
    set(patch) {
      settings = Object.assign({}, settings, patch);
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* private mode */ }
      listeners.forEach((fn) => fn(settings));
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    hasTmdb: () => !!settings.tmdbKey.trim(),
    hasTvdb: () => !!settings.tvdbKey.trim(),
    hasTrakt: () => !!(settings.traktClientId.trim() && settings.traktAuth),
  };

  // ---------- cache: memory first, IndexedDB behind it ----------
  const memory = new Map();
  let dbPromise = null;

  function db() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open('actorweb', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('cache');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
    return dbPromise;
  }

  async function idbGet(key) {
    const d = await db();
    if (!d) return undefined;
    return new Promise((resolve) => {
      try {
        const r = d.transaction('cache').objectStore('cache').get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(undefined);
      } catch (e) { resolve(undefined); }
    });
  }

  async function idbSet(key, value) {
    const d = await db();
    if (!d) return;
    try { d.transaction('cache', 'readwrite').objectStore('cache').put(value, key); } catch (e) { /* ignore */ }
  }

  AW.cache = {
    // Returns the cached value or runs `load`, storing the result for ttl ms.
    async remember(key, ttl, load) {
      const now = Date.now();
      const hit = memory.get(key) || (await idbGet(key));
      if (hit && hit.expires > now) {
        memory.set(key, hit);
        return hit.value;
      }
      const value = await load();
      const entry = { value, expires: now + ttl };
      memory.set(key, entry);
      idbSet(key, entry);
      return value;
    },
    async clear() {
      memory.clear();
      const d = await db();
      if (d) try { d.transaction('cache', 'readwrite').objectStore('cache').clear(); } catch (e) { /* ignore */ }
    },
  };

  AW.HOUR = 3600e3;
  AW.DAY = 24 * AW.HOUR;
})();

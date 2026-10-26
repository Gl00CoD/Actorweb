# Actorweb

Type a film or series and see where its cast went next. The title sits in the middle, its actors around it, and the other titles each actor played in at the edge. When several actors share a title, it becomes a knot in the web. If you connect Trakt, titles you've watched are circled in red.

Click an actor (or a title) for the round popup. The left half shows the actor now and the right half shows them in that title, each labelled with its year.

## Running it

It's a static site with no build step. Open `index.html` in a browser, or serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Without keys it runs on a small demo built around The Matrix.

## API keys

Open **Settings** in the top right. Keys are saved in your browser's local storage only. They are never written to this repository.

| Service | What it's for | Where to get it |
| --- | --- | --- |
| TMDB (needed) | Search, cast, filmographies, photos, stills tagged with an actor | themoviedb.org → Settings → API. The API key or the read access token both work. |
| TVDB (optional) | Photos of actors in character, for series | thetvdb.com/api-information |
| Trakt (optional) | Your watch history: circles watched titles and lists recent ones on the start page | trakt.tv/oauth/applications. Create an app with redirect URI `urn:ietf:wg:oauth:2.0:oob`, paste the client ID and secret, then click **Connect Trakt** and enter the code on trakt.tv. |

## Where the "in this title" photo comes from

The app tries these in order:

1. **TVDB**: the character image for that role (series only).
2. **TMDB**: images users have tagged with that actor, filtered to that title.
3. **The title's poster**, marked as such.

Some smaller titles will have no still.

## Files

- `index.html`: the page
- `css/app.css`: all styling
- `js/store.js`: settings and the response cache (IndexedDB)
- `js/tmdb.js`, `js/tvdb.js`, `js/trakt.js`: API clients
- `js/demo.js`: the offline demo
- `js/source.js`: chooses demo or live data and assembles the web
- `js/graph.js`: the web (D3 force layout, drawn as SVG)
- `js/popup.js`: the round actor popup
- `js/settings.js`, `js/app.js`: settings drawer, search, routing

## Notes

- Each web is a link (`#/movie/603`, `#/tv/1399`), so you can bookmark or share it.
- Responses are cached for a few days to keep things fast. Use **Clear saved data** in Settings to refresh.
- Press `/` to jump to the search box. In the popup, the arrow keys step through actors.

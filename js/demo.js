// A small hand-made dataset so the page works before any API keys are added.
// No photos: the demo shows initials instead.
(function () {
  const AW = (window.AW = window.AW || {});

  const T = (slug, type, title, year, seen) => ({ key: type + ':demo-' + slug, type, id: 'demo-' + slug, title, year, poster: null, seen: !!seen });

  const reloaded = T('reloaded', 'movie', 'The Matrix Reloaded', 2003);
  const wick2 = T('wick2', 'movie', 'John Wick: Chapter 2', 2017);
  const memento = T('memento', 'movie', 'Memento', 2000, true);

  const matrix = { key: 'movie:603', type: 'movie', id: 603, title: 'The Matrix', year: 1999, poster: null, seen: true };

  const cast = [
    {
      id: 'kr', name: 'Keanu Reeves', birthday: '1964-09-02', character: 'Neo',
      titles: [
        [reloaded, 'Neo'], [T('wick', 'movie', 'John Wick', 2014, true), 'John Wick'], [wick2, 'John Wick'],
        [T('speed', 'movie', 'Speed', 1994, true), 'Jack Traven'], [T('constantine', 'movie', 'Constantine', 2005), 'John Constantine'],
      ],
    },
    {
      id: 'lf', name: 'Laurence Fishburne', birthday: '1961-07-30', character: 'Morpheus',
      titles: [
        [reloaded, 'Morpheus'], [wick2, 'The Bowery King'], [T('mystic', 'movie', 'Mystic River', 2003), 'Whitey Powers'],
        [T('boyz', 'movie', 'Boyz n the Hood', 1991), 'Furious Styles'], [T('apocalypse', 'movie', 'Apocalypse Now', 1979), 'Mr. Clean'],
      ],
    },
    {
      id: 'cam', name: 'Carrie-Anne Moss', birthday: '1967-08-21', character: 'Trinity',
      titles: [
        [reloaded, 'Trinity'], [memento, 'Natalie'], [T('chocolat', 'movie', 'Chocolat', 2000), 'Caroline Clairmont'],
        [T('jessica', 'tv', 'Jessica Jones', 2015), 'Jeri Hogarth'], [T('disturbia', 'movie', 'Disturbia', 2007), 'Julie'],
      ],
    },
    {
      id: 'hw', name: 'Hugo Weaving', birthday: '1960-04-04', character: 'Agent Smith',
      titles: [
        [reloaded, 'Agent Smith'], [T('lotr', 'movie', 'The Lord of the Rings: The Fellowship of the Ring', 2001, true), 'Elrond'],
        [T('vendetta', 'movie', 'V for Vendetta', 2005), 'V'], [T('cloud', 'movie', 'Cloud Atlas', 2012), 'Bill Smoke'],
        [T('cap', 'movie', 'Captain America: The First Avenger', 2011), 'Johann Schmidt'],
      ],
    },
    {
      id: 'jp', name: 'Joe Pantoliano', birthday: '1951-09-12', character: 'Cypher',
      titles: [
        [memento, 'Teddy'], [T('sopranos', 'tv', 'The Sopranos', 1999, true), 'Ralph Cifaretto'],
        [T('fugitive', 'movie', 'The Fugitive', 1993), 'Cosmo Renfro'], [T('bound', 'movie', 'Bound', 1996), 'Caesar'],
        [T('risky', 'movie', 'Risky Business', 1983), 'Guido'],
      ],
    },
  ];

  function web() {
    return {
      center: matrix,
      cast: cast.map((c) => ({
        person: { id: c.id, name: c.name, birthday: c.birthday, profile: null, thumb: null },
        character: c.character,
        titles: c.titles.map(([t, character]) => ({ ...t, character })),
      })),
    };
  }

  function search(q) {
    const s = q.trim().toLowerCase();
    return s && 'the matrix'.includes(s) ? [matrix] : [];
  }

  AW.demo = { web, search, center: matrix };
})();

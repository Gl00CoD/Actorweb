// ========================================
// ACTOR WEB - DATA MANAGEMENT
// ========================================

// ===== TVDB API CONFIGURATION =====
const TVDB_API_URL = 'https://api4.thetvdb.com/v4';
let tvdbToken = null;
let cachedData = new Map();

// ===== DEMO DATA =====
const demoData = {
    'breaking bad': {
        id: 81189,
        title: 'Breaking Bad',
        year: 2008,
        type: 'series',
        actors: [
            { id: 1, name: 'Bryan Cranston', character: 'Walter White' },
            { id: 2, name: 'Aaron Paul', character: 'Jesse Pinkman' },
            { id: 3, name: 'Anna Gunn', character: 'Skyler White' },
            { id: 4, name: 'RJ Mitte', character: 'Walter White Jr.' },
            { id: 5, name: 'Betsy Brandt', character: 'Marie Schrader' }
        ]
    },
    'better call saul': {
        id: 290434,
        title: 'Better Call Saul',
        year: 2015,
        type: 'series',
        actors: [
            { id: 6, name: 'Bob Odenkirk', character: 'Jimmy McGill / Saul Goodman' },
            { id: 1, name: 'Bryan Cranston', character: 'Walter White' },
            { id: 2, name: 'Aaron Paul', character: 'Jesse Pinkman' },
            { id: 7, name: 'Rhea Seehorn', character: 'Kim Wexler' },
            { id: 8, name: 'Jonathan Banks', character: 'Mike Ehrmantraut' }
        ]
    },
    'the dark knight': {
        id: 155,
        title: 'The Dark Knight',
        year: 2008,
        type: 'movie',
        actors: [
            { id: 10, name: 'Christian Bale', character: 'Bruce Wayne / Batman' },
            { id: 11, name: 'Heath Ledger', character: 'Joker' },
            { id: 12, name: 'Aaron Eckhart', character: 'Harvey Dent' },
            { id: 13, name: 'Michael Caine', character: 'Alfred' },
            { id: 14, name: 'Gary Oldman', character: 'Commissioner Gordon' }
        ]
    },
    'batman begins': {
        id: 272,
        title: 'Batman Begins',
        year: 2005,
        type: 'movie',
        actors: [
            { id: 10, name: 'Christian Bale', character: 'Bruce Wayne / Batman' },
            { id: 13, name: 'Michael Caine', character: 'Alfred' },
            { id: 14, name: 'Gary Oldman', character: 'Commissioner Gordon' },
            { id: 15, name: 'Liam Neeson', character: 'Ra\'s Al Ghul' },
            { id: 16, name: 'Katie Holmes', character: 'Rachel Dawes' }
        ]
    },
    'inception': {
        id: 27205,
        title: 'Inception',
        year: 2010,
        type: 'movie',
        actors: [
            { id: 17, name: 'Leonardo DiCaprio', character: 'Cobb' },
            { id: 13, name: 'Michael Caine', character: 'Professor Miles' },
            { id: 18, name: 'Marion Cotillard', character: 'Mal' },
            { id: 19, name: 'Tom Hardy', character: 'Eames' },
            { id: 20, name: 'Ellen Page', character: 'Ariadne' }
        ]
    },
    'dunkirk': {
        id: 374720,
        title: 'Dunkirk',
        year: 2017,
        type: 'movie',
        actors: [
            { id: 19, name: 'Tom Hardy', character: 'Farrier' },
            { id: 21, name: 'Cillian Murphy', character: 'Shivering Soldier' },
            { id: 22, name: 'Kenneth Branagh', character: 'Commander Bolton' },
            { id: 23, name: 'Harry Styles', character: 'Alex' }
        ]
    },
    'the prestige': {
        id: 1124,
        title: 'The Prestige',
        year: 2006,
        type: 'movie',
        actors: [
            { id: 10, name: 'Christian Bale', character: 'Alfred Borden' },
            { id: 13, name: 'Michael Caine', character: 'Cutter' },
            { id: 24, name: 'Hugh Jackman', character: 'Robert Angier' },
            { id: 25, name: 'Scarlett Johansson', character: 'Olivia Wenscombe' }
        ]
    },
    'interstellar': {
        id: 157336,
        title: 'Interstellar',
        year: 2014,
        type: 'movie',
        actors: [
            { id: 26, name: 'Matthew McConaughey', character: 'Cooper' },
            { id: 27, name: 'Anne Hathaway', character: 'Brand' },
            { id: 13, name: 'Michael Caine', character: 'Professor Brand' },
            { id: 28, name: 'Jessica Chastain', character: 'Murph' }
        ]
    },
    'tenet': {
        id: 577922,
        title: 'Tenet',
        year: 2020,
        type: 'movie',
        actors: [
            { id: 29, name: 'John David Washington', character: 'Protagonist' },
            { id: 13, name: 'Michael Caine', character: 'Crosby' },
            { id: 30, name: 'Robert Pattinson', character: 'Neil' },
            { id: 31, name: 'Elizabeth Debicki', character: 'Kat' }
        ]
    },
    'peaky blinders': {
        id: 274409,
        title: 'Peaky Blinders',
        year: 2013,
        type: 'series',
        actors: [
            { id: 21, name: 'Cillian Murphy', character: 'Tommy Shelby' },
            { id: 19, name: 'Tom Hardy', character: 'Alfie Solomons' },
            { id: 32, name: 'Helen McCrory', character: 'Polly Gray' },
            { id: 33, name: 'Paul Anderson', character: 'Arthur Shelby' }
        ]
    }
};

// ===== DATA ACCESS FUNCTIONS =====

/**
 * Search for movies/shows in demo data
 */
function searchDemoData(query) {
    debugLog('Searching demo data for:', query);
    
    const searchTerm = query.toLowerCase();
    const results = Object.entries(demoData)
        .filter(([key, data]) => {
            const titleLower = data.title.toLowerCase();
            return titleLower.includes(searchTerm) || 
                   titleLower.split(' ').some(word => word.startsWith(searchTerm)) ||
                   key.includes(searchTerm);
        })
        .map(([key, data]) => ({
            id: data.id,
            title: data.title,
            year: data.year,
            type: data.type,
            key: key
        }))
        .slice(0, CONFIG.search.maxResults);

    debugLog('Demo search results:', results);
    return results;
}

/**
 * Get movie/show data by key
 */
function getMovieData(key) {
    return demoData[key] || null;
}

/**
 * Find connections between movies/shows based on shared actors
 */
function findConnections(centerMovieData) {
    debugLog('Finding connections for:', centerMovieData.title);
    
    const centerActors = centerMovieData.actors;
    const connections = [];

    Object.entries(demoData).forEach(([key, data]) => {
        if (data.id === centerMovieData.id) return;

        const sharedActors = centerActors.filter(centerActor =>
            data.actors.some(actor => actor.id === centerActor.id)
        );

        if (sharedActors.length > 0) {
            connections.push({
                ...data,
                key: key,
                sharedActors: sharedActors
            });
        }
    });

    debugLog('Found connections:', connections.length);
    return connections;
}

/**
 * Get all unique actors from demo data
 */
function getAllActors() {
    const actorsMap = new Map();
    
    Object.values(demoData).forEach(movie => {
        movie.actors.forEach(actor => {
            if (!actorsMap.has(actor.id)) {
                actorsMap.set(actor.id, {
                    id: actor.id,
                    name: actor.name,
                    movies: []
                });
            }
            actorsMap.get(actor.id).movies.push({
                title: movie.title,
                character: actor.character,
                year: movie.year,
                type: movie.type
            });
        });
    });
    
    return Array.from(actorsMap.values());
}

/**
 * Get random movie suggestions
 */
function getRandomSuggestions(count = 3) {
    const keys = Object.keys(demoData);
    const suggestions = [];
    
    while (suggestions.length < count && suggestions.length < keys.length) {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const movie = demoData[randomKey];
        
        if (!suggestions.find(s => s.id === movie.id)) {
            suggestions.push({
                id: movie.id,
                title: movie.title,
                year: movie.year,
                type: movie.type,
                key: randomKey
            });
        }
    }
    
    return suggestions;
}

// ===== TVDB API FUNCTIONS (for future use) =====

/**
 * Authenticate with TVDB API
 */
async function authenticateTVDB(apiKey) {
    try {
        const response = await fetch(`${TVDB_API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                apikey: apiKey
            })
        });

        if (!response.ok) {
            throw new Error('TVDB authentication failed');
        }

        const data = await response.json();
        tvdbToken = data.data.token;
        debugLog('TVDB authenticated successfully');
        return true;
    } catch (error) {
        console.error('TVDB authentication error:', error);
        return false;
    }
}

/**
 * Search TVDB for movies/shows
 */
async function searchTVDB(query) {
    if (!tvdbToken) {
        debugLog('No TVDB token, using demo data');
        return searchDemoData(query);
    }

    try {
        const response = await fetch(`${TVDB_API_URL}/search?query=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${tvdbToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('TVDB search failed');
        }

        const data = await response.json();
        
        // Transform TVDB data to our format
        return data.data.map(item => ({
            id: item.tvdb_id,
            title: item.name,
            year: item.year,
            type: item.type,
            key: item.tvdb_id.toString()
        }));
    } catch (error) {
        console.error('TVDB search error:', error);
        return searchDemoData(query); // Fallback to demo data
    }
}

/**
 * Get detailed movie/show data from TVDB
 */
async function getTVDBDetails(id) {
    if (!tvdbToken) {
        debugLog('No TVDB token, using demo data');
        return null;
    }

    if (cachedData.has(id)) {
        return cachedData.get(id);
    }

    try {
        const response = await fetch(`${TVDB_API_URL}/series/${id}/extended`, {
            headers: {
                'Authorization': `Bearer ${tvdbToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('TVDB details fetch failed');
        }

        const data = await response.json();
        const result = {
            id: data.data.id,
            title: data.data.name,
            year: new Date(data.data.firstAired).getFullYear(),
            type: 'series', // TVDB mainly handles series
            actors: data.data.characters ? data.data.characters.map(char => ({
                id: char.peopleId,
                name: char.personName,
                character: char.name
            })) : []
        };

        cachedData.set(id, result);
        return result;
    } catch (error) {
        console.error('TVDB details error:', error);
        return null;
    }
}

// ===== DATA UTILITY FUNCTIONS =====

/**
 * Generate placeholder actor image URL
 */
function getActorImageUrl(actorName, width = 150, height = 200) {
    const encodedName = encodeURIComponent(actorName.replace(' ', '+'));
    return `https://via.placeholder.com/${width}x${height}/${CONFIG.colors.primary.replace('#', '')}/${CONFIG.colors.text.primary.replace('#', '')}?text=${encodedName}`;
}

/**
 * Format movie/show display text
 */
function formatMediaTitle(title, year, type) {
    return `${title} (${year}) - ${type.toUpperCase()}`;
}

/**
 * Check if we're in demo mode
 */
function isDemoMode() {
    return CONFIG.api.useDemo || !tvdbToken;
}

/**
 * Get connection strength between two movies (based on shared actors)
 */
function getConnectionStrength(movie1, movie2) {
    const actors1 = movie1.actors.map(a => a.id);
    const actors2 = movie2.actors.map(a => a.id);
    return actors1.filter(id => actors2.includes(id)).length;
}

// ===== EXPORT FOR MODULE SYSTEMS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        demoData,
        searchDemoData,
        getMovieData,
        findConnections,
        getAllActors,
        getRandomSuggestions,
        authenticateTVDB,
        searchTVDB,
        getTVDBDetails,
        getActorImageUrl,
        formatMediaTitle,
        isDemoMode,
        getConnectionStrength
    };
}

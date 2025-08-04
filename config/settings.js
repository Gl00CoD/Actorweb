// ========================================
// ACTOR WEB - CONFIGURATION SETTINGS
// ========================================
// Edit these values to customize your app
// No coding knowledge required!

const CONFIG = {
    // ===== VISUAL THEME =====
    colors: {
        primary: '#4a9eff',        // Main blue color
        secondary: '#64b5f6',      // Light blue
        accent: '#ffd700',         // Gold for main nodes
        background: {
            start: '#0c0c0c',      // Dark gradient start
            middle: '#1a1a2e',     // Dark gradient middle  
            end: '#16213e'         // Dark gradient end
        },
        text: {
            primary: '#ffffff',    // Main text color
            secondary: '#cccccc',  // Secondary text
            muted: '#999999'       // Muted text
        }
    },

    // ===== ANIMATION SETTINGS =====
    animations: {
        searchTransition: 0.8,     // Search bar animation speed (seconds)
        nodeHover: 0.2,            // Node hover effect speed
        popupShow: 0.3,            // Popup appearance speed
        loadingDelay: 1000         // Fake loading delay for demo (milliseconds)
    },

    // ===== GRAPH LAYOUT =====
    graph: {
        nodeDistance: 200,         // Distance between connected nodes
        nodeStrength: -800,        // Force between nodes (negative = repel)
        mainNodeSize: 40,          // Size of the main/center node
        connectedNodeSize: 30,     // Size of connected nodes
        collisionRadius: 60,       // Prevent nodes from overlapping
        linkWidth: {
            base: 2,               // Base link thickness
            multiplier: 3          // Multiply by shared actors count
        }
    },

    // ===== SEARCH BEHAVIOR =====
    search: {
        minQueryLength: 2,         // Minimum characters before searching
        searchDelay: 300,          // Delay before search starts (milliseconds)
        maxResults: 8,             // Maximum search results to show
        placeholder: "Search for a movie or TV show..."
    },

    // ===== API SETTINGS =====
    api: {
        tvdbUrl: 'https://api4.thetvdb.com/v4',
        useDemo: true,             // Set to false when you have a real API key
        demoMode: {
            showNotice: true,      // Show the demo mode notice
            loadingTime: 1000      // Fake loading time for realism
        }
    },

    // ===== UI BEHAVIOR =====
    ui: {
        errorDisplayTime: 5000,    // How long to show error messages (milliseconds)
        popupMaxWidth: 500,        // Maximum width of actor popup
        searchResultsMaxHeight: 300, // Maximum height of search dropdown
        enableDebugMode: false     // Set to true for console logging
    },

    // ===== DEMO DATA SUGGESTIONS =====
    suggestions: [
        "Breaking Bad",
        "The Dark Knight", 
        "Inception",
        "Better Call Saul",
        "Batman Begins",
        "Dunkirk"
    ]
};

// ========================================
// EASY THEME PRESETS
// ========================================
// Uncomment one of these to quickly change themes:

// Blue Theme (default)
// Already configured above

// Green Theme
// CONFIG.colors.primary = '#4ade80';
// CONFIG.colors.secondary = '#86efac';
// CONFIG.colors.accent = '#fbbf24';

// Purple Theme  
// CONFIG.colors.primary = '#a855f7';
// CONFIG.colors.secondary = '#c084fc';
// CONFIG.colors.accent = '#f59e0b';

// Red Theme
// CONFIG.colors.primary = '#ef4444';
// CONFIG.colors.secondary = '#f87171';
// CONFIG.colors.accent = '#fbbf24';

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Helper to log messages when debug mode is on
function debugLog(message, data = null) {
    if (CONFIG.ui.enableDebugMode) {
        console.log(`[Actor Web] ${message}`, data || '');
    }
}

// Helper to get color values
function getColor(path) {
    const parts = path.split('.');
    let value = CONFIG.colors;
    for (const part of parts) {
        value = value[part];
        if (!value) return '#4a9eff'; // fallback
    }
    return value;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

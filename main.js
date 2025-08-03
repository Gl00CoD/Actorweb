// ========================================
// ACTOR WEB - MAIN APPLICATION
// ========================================

// Application state
let appState = {
    isInitialized: false,
    currentMovie: null,
    isLoading: false,
    isDemoMode: true
};

// ===== APPLICATION INITIALIZATION =====

/**
 * Initialize the entire application
 */
function initializeApp() {
    debugLog('Initializing Actor Web application');
    
    try {
        // Initialize all modules
        initializeSearch();
        initializeGraph();
        initializeUI();
        
        // Set up global event listeners
        setupGlobalEventListeners();
        
        // Apply initial theme
        applyTheme();
        
        // Show demo notice if in demo mode
        if (CONFIG.api.useDemo) {
            showDemoNotice();
        }
        
        appState.isInitialized = true;
        debugLog('Application initialized successfully');
        
        // Optional: Load a random suggestion on startup
        // loadRandomSuggestion();
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

/**
 * Initialize UI components
 */
function initializeUI() {
    // Set up popup close handlers
    setupPopupHandlers();
    
    // Initialize loading indicator
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // Set up error container
    const errorContainer = document.getElementById('errorContainer');
    if (!errorContainer) {
        const container = document.createElement('div');
        container.id = 'errorContainer';
        document.body.appendChild(container);
    }
    
    debugLog('UI initialized');
}

/**
 * Set up global event listeners
 */
function setupGlobalEventListeners() {
    // Close popup when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.actor-popup') && !e.target.closest('.node')) {
            closePopup();
        }
    });
    
    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closePopup();
            hideSearchResults();
        }
    });
    
    // Handle window visibility change
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Pause any animations or intensive operations
            if (simulation) {
                simulation.alpha(0);
            }
        } else {
            // Resume operations
            if (simulation && currentGraph) {
                simulation.alpha(0.1).restart();
            }
        }
    });
    
    debugLog('Global event listeners set up');
}

/**
 * Set up popup-related event handlers
 */
function setupPopupHandlers() {
    // Close button handler is already set in HTML onclick
    // Additional handlers can be added here
}

// ===== MOVIE SELECTION AND GRAPH CREATION =====

/**
 * Select a movie and create its connection graph
 */
function selectMovie(key) {
    if (appState.isLoading) {
        debugLog('Already loading, ignoring movie selection');
        return;
    }
    
    const movieData = getMovieData(key);
    if (!movieData) {
        showError(`Movie data not found for key: ${key}`);
        return;
    }
    
    debugLog('Movie selected:', movieData.title);
    
    // Update UI state
    hideSearchResults();
    minimizeSearch();
    setSearchValue(movieData.title);
    
    // Show loading
    showLoading('Loading connections...');
    appState.isLoading = true;
    appState.currentMovie = movieData;
    
    // Simulate loading delay for better UX
    setTimeout(() => {
        try {
            createGraph(movieData);
            animateGraphEntrance();
            hideLoading();
            appState.isLoading = false;
        } catch (error) {
            console.error('Error creating graph:', error);
            showError('Failed to create connection graph. Please try again.');
            hideLoading();
            appState.isLoading = false;
        }
    }, CONFIG.api.demoMode.loadingTime);
}

/**
 * Load a random movie suggestion
 */
function loadRandomSuggestion() {
    const suggestion = getRandomSuggestion();
    if (suggestion) {
        selectMovie(suggestion.key);
    }
}

/**
 * Reset the application to initial state
 */
function resetApp() {
    // Clear graph
    clearGraph();
    
    // Reset search
    clearSearch();
    restoreSearch();
    
    // Close any open popups
    closePopup();
    
    // Reset state
    appState.currentMovie = null;
    appState.isLoading = false;
    
    debugLog('Application reset');
}

// ===== UI FEEDBACK FUNCTIONS =====

/**
 * Show loading indicator
 */
function showLoading(message = 'Loading...') {
    const loadingElement = document.getElementById('loading');
    const loadingText = document.getElementById('loadingText');
    
    if (loadingElement) {
        if (loadingText) {
            loadingText.textContent = message;
        }
        loadingElement.style.display = 'block';
    }
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

/**
 * Show error message
 */
function showError(message, duration = null) {
    const errorContainer = document.getElementById('errorContainer');
    if (!errorContainer) {
        console.error('Error container not found');
        return;
    }
    
    // Remove existing error messages
    const existingErrors = errorContainer.querySelectorAll('.error-message');
    existingErrors.forEach(error => error.remove());
    
    // Create new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    errorContainer.appendChild(errorDiv);
    
    // Auto-remove after specified duration
    const displayDuration = duration || CONFIG.ui.errorDisplayTime;
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, displayDuration);
    
    debugLog('Error shown:', message);
}

/**
 * Show demo mode notice
 */
function showDemoNotice() {
    const demoNote = document.getElementById('demoNote');
    if (demoNote && CONFIG.api.demoMode.showNotice) {
        demoNote.style.display = 'block';
    }
}

/**
 * Hide demo mode notice
 */
function hideDemoNotice() {
    const demoNote = document.getElementById('demoNote');
    if (demoNote) {
        demoNote.style.display = 'none';
    }
}

// ===== THEME MANAGEMENT =====

/**
 * Apply current theme to the application
 */
function applyTheme() {
    const root = document.documentElement;
    
    // Update CSS custom properties
    root.style.setProperty('--primary', CONFIG.colors.primary);
    root.style.setProperty('--secondary', CONFIG.colors.secondary);
    root.style.setProperty('--accent', CONFIG.colors.accent);
    root.style.setProperty('--bg-start', CONFIG.colors.background.start);
    root.style.setProperty('--bg-middle', CONFIG.colors.background.middle);
    root.style.setProperty('--bg-end', CONFIG.colors.background.end);
    root.style.setProperty('--text-primary', CONFIG.colors.text.primary);
    root.style.setProperty('--text-secondary', CONFIG.colors.text.secondary);
    root.style.setProperty('--text-muted', CONFIG.colors.text.muted);
    
    // Update graph colors if graph exists
    if (currentGraph) {
        updateGraphColors();
    }
    
    debugLog('Theme applied');
}

/**
 * Switch to a predefined theme
 */
function switchTheme(themeName) {
    switch (themeName.toLowerCase()) {
        case 'green':
            CONFIG.colors.primary = '#4ade80';
            CONFIG.colors.secondary = '#86efac';
            CONFIG.colors.accent = '#fbbf24';
            break;
            
        case 'purple':
            CONFIG.colors.primary = '#a855f7';
            CONFIG.colors.secondary = '#c084fc';
            CONFIG.colors.accent = '#f59e0b';
            break;
            
        case 'red':
            CONFIG.colors.primary = '#ef4444';
            CONFIG.colors.secondary = '#f87171';
            CONFIG.colors.accent = '#fbbf24';
            break;
            
        case 'blue':
        default:
            CONFIG.colors.primary = '#4a9eff';
            CONFIG.colors.secondary = '#64b5f6';
            CONFIG.colors.accent = '#ffd700';
            break;
    }
    
    applyTheme();
    debugLog('Theme switched to:', themeName);
}

// ===== API INTEGRATION FUNCTIONS =====

/**
 * Set up TVDB API integration
 */
function setupTVDBAPI(apiKey) {
    if (!apiKey) {
        showError('No API key provided');
        return;
    }
    
    showLoading('Connecting to TVDB API...');
    
    authenticateTVDB(apiKey)
        .then(success => {
            if (success) {
                CONFIG.api.useDemo = false;
                appState.isDemoMode = false;
                hideDemoNotice();
                showSuccess('TVDB API connected successfully!');
                debugLog('TVDB API set up successfully');
            } else {
                showError('Failed to authenticate with TVDB API');
            }
        })
        .catch(error => {
            console.error('TVDB setup error:', error);
            showError('Error setting up TVDB API');
        })
        .finally(() => {
            hideLoading();
        });
}

/**
 * Show success message
 */
function showSuccess(message, duration = 3000) {
    const successDiv = document.createElement('div');
    successDiv.className = 'error-message'; // Reuse error message styling
    successDiv.style.background = 'rgba(76, 175, 80, 0.9)';
    successDiv.style.borderLeft = '4px solid #4caf50';
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, duration);
}

// ===== UTILITY FUNCTIONS =====

/**
 * Get current application state
 */
function getAppState() {
    return { ...appState };
}

/**
 * Check if application is ready
 */
function isAppReady() {
    return appState.isInitialized && !appState.isLoading;
}

/**
 * Export current graph as JSON
 */
function exportGraphData() {
    if (!currentGraph) {
        showError('No graph data to export');
        return null;
    }
    
    const exportData = {
        centerMovie: currentGraph.centerMovie,
        nodes: currentGraph.nodes,
        links: currentGraph.links,
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0'
    };
    
    return JSON.stringify(exportData, null, 2);
}

/**
 * Download graph data as JSON file
 */
function downloadGraphData() {
    const data = exportGraphData();
    if (!data) return;
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `actor-web-${appState.currentMovie?.title || 'graph'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    debugLog('Graph data downloaded');
}

// ===== AUTO-INITIALIZATION =====

/**
 * Auto-initialize when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    debugLog('DOM loaded, initializing application');
    initializeApp();
});

// Make key functions globally available
window.selectMovie = selectMovie;
window.closePopup = closePopup;
window.switchTheme = switchTheme;
window.resetApp = resetApp;
window.loadRandomSuggestion = loadRandomSuggestion;
window.setupTVDBAPI = setupTVDBAPI;
window.downloadGraphData = downloadGraphData;

// ===== EXPORT FOR MODULE SYSTEMS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApp,
        selectMovie,
        resetApp,
        showLoading,
        hideLoading,
        showError,
        switchTheme,
        applyTheme,
        setupTVDBAPI,
        getAppState,
        isAppReady,
        exportGraphData,
        downloadGraphData
    };
}
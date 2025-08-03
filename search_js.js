// ========================================
// ACTOR WEB - SEARCH FUNCTIONALITY
// ========================================

let searchTimeout;
let currentSearchQuery = '';

// ===== SEARCH INITIALIZATION =====

/**
 * Initialize search functionality
 */
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput) {
        console.error('Search input not found');
        return;
    }

    // Set placeholder from config
    searchInput.placeholder = CONFIG.search.placeholder;

    // Add event listeners
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    searchInput.addEventListener('focus', handleSearchFocus);
    
    // Handle clicks outside search to close results
    document.addEventListener('click', handleOutsideClick);
    
    debugLog('Search initialized');
}

// ===== EVENT HANDLERS =====

/**
 * Handle search input changes
 */
function handleSearchInput(e) {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    currentSearchQuery = query;
    
    if (query.length < CONFIG.search.minQueryLength) {
        hideSearchResults();
        return;
    }

    // Debounce search
    searchTimeout = setTimeout(() => {
        if (currentSearchQuery === query) { // Only search if query hasn't changed
            performSearch(query);
        }
    }, CONFIG.search.searchDelay);
}

/**
 * Handle keyboard navigation in search
 */
function handleSearchKeydown(e) {
    const resultsContainer = document.getElementById('searchResults');
    const results = resultsContainer.querySelectorAll('.search-result');
    
    if (results.length === 0) return;
    
    let selectedIndex = Array.from(results).findIndex(r => r.classList.contains('selected'));
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedIndex = selectedIndex < results.length - 1 ? selectedIndex + 1 : 0;
            updateSelection(results, selectedIndex);
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : results.length - 1;
            updateSelection(results, selectedIndex);
            break;
            
        case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0) {
                const selectedResult = results[selectedIndex];
                const key = selectedResult.dataset.key;
                if (key) {
                    selectMovie(key);
                }
            } else if (results.length > 0) {
                // Select first result if none selected
                const key = results[0].dataset.key;
                if (key) {
                    selectMovie(key);
                }
            }
            break;
            
        case 'Escape':
            hideSearchResults();
            e.target.blur();
            break;
    }
}

/**
 * Handle search input focus
 */
function handleSearchFocus(e) {
    if (e.target.value.trim().length >= CONFIG.search.minQueryLength) {
        showSearchResults();
    }
}

/**
 * Handle clicks outside search area
 */
function handleOutsideClick(e) {
    if (!e.target.closest('.search-container')) {
        hideSearchResults();
    }
}

// ===== SEARCH LOGIC =====

/**
 * Perform search operation
 */
async function performSearch(query) {
    debugLog('Performing search for:', query);
    
    try {
        let results;
        
        if (isDemoMode()) {
            results = searchDemoData(query);
        } else {
            results = await searchTVDB(query);
        }
        
        displaySearchResults(results, query);
    } catch (error) {
        console.error('Search error:', error);
        showSearchError('Search failed. Please try again.');
    }
}

/**
 * Display search results
 */
function displaySearchResults(results, query = '') {
    const container = document.getElementById('searchResults');
    
    if (!container) {
        console.error('Search results container not found');
        return;
    }
    
    // Clear previous results
    container.innerHTML = '';
    
    if (results.length === 0) {
        container.innerHTML = createNoResultsHTML(query);
    } else {
        container.innerHTML = results.map((result, index) => 
            createSearchResultHTML(result, index === 0)
        ).join('');
        
        // Add click handlers
        addResultClickHandlers(container);
    }
    
    showSearchResults();
    debugLog('Displayed search results:', results.length);
}

/**
 * Create HTML for a search result
 */
function createSearchResultHTML(result, isFirst = false) {
    return `
        <div class="search-result ${isFirst ? 'selected' : ''}" 
             data-key="${result.key}" 
             data-id="${result.id}">
            <div class="result-title">${escapeHtml(result.title)}</div>
            <div class="result-year">${result.year}</div>
            <div class="result-type">${result.type.toUpperCase()}</div>
        </div>
    `;
}

/**
 * Create HTML for no results found
 */
function createNoResultsHTML(query) {
    const suggestions = CONFIG.suggestions.slice(0, 3).join('", "');
    return `
        <div class="search-result no-results" style="text-align: center; color: ${CONFIG.colors.text.muted}; cursor: default;">
            <div style="padding: 15px;">
                <div>No results found for "${escapeHtml(query)}"</div>
                <div style="margin-top: 10px; font-size: 12px;">
                    Try: "${suggestions}"
                </div>
            </div>
        </div>
    `;
}

/**
 * Add click handlers to search results
 */
function addResultClickHandlers(container) {
    const results = container.querySelectorAll('.search-result:not(.no-results)');
    
    results.forEach(result => {
        result.addEventListener('click', () => {
            const key = result.dataset.key;
            if (key) {
                selectMovie(key);
            }
        });
        
        result.addEventListener('mouseenter', () => {
            updateSelection(results, Array.from(results).indexOf(result));
        });
    });
}

/**
 * Update visual selection in search results
 */
function updateSelection(results, selectedIndex) {
    results.forEach((result, index) => {
        result.classList.toggle('selected', index === selectedIndex);
    });
}

// ===== SEARCH UI CONTROL =====

/**
 * Show search results dropdown
 */
function showSearchResults() {
    const container = document.getElementById('searchResults');
    if (container) {
        container.style.display = 'block';
        container.classList.add('fade-in');
    }
}

/**
 * Hide search results dropdown
 */
function hideSearchResults() {
    const container = document.getElementById('searchResults');
    if (container) {
        container.style.display = 'none';
        container.classList.remove('fade-in');
    }
}

/**
 * Clear search input and results
 */
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        currentSearchQuery = '';
    }
    hideSearchResults();
}

/**
 * Minimize search container (move to top)
 */
function minimizeSearch() {
    const container = document.getElementById('searchContainer');
    if (container) {
        container.classList.add('minimized');
        hideSearchResults();
    }
}

/**
 * Restore search container (center position)
 */
function restoreSearch() {
    const container = document.getElementById('searchContainer');
    if (container) {
        container.classList.remove('minimized');
    }
}

/**
 * Set search input value
 */
function setSearchValue(value) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = value;
        currentSearchQuery = value;
    }
}

// ===== SEARCH SUGGESTIONS =====

/**
 * Show search suggestions when input is empty
 */
function showSearchSuggestions() {
    const suggestions = CONFIG.suggestions.map((title, index) => {
        const key = Object.keys(demoData).find(k => 
            demoData[k].title.toLowerCase() === title.toLowerCase()
        );
        
        if (key) {
            const data = demoData[key];
            return {
                id: data.id,
                title: data.title,
                year: data.year,
                type: data.type,
                key: key
            };
        }
        return null;
    }).filter(Boolean);
    
    displaySearchResults(suggestions);
}

/**
 * Get random movie suggestion
 */
function getRandomSuggestion() {
    const suggestions = getRandomSuggestions(1);
    return suggestions.length > 0 ? suggestions[0] : null;
}

// ===== ERROR HANDLING =====

/**
 * Show search error message
 */
function showSearchError(message) {
    const container = document.getElementById('searchResults');
    if (container) {
        container.innerHTML = `
            <div class="search-result error" style="text-align: center; color: #ff5252; cursor: default;">
                <div style="padding: 15px;">
                    <div>${escapeHtml(message)}</div>
                    <div style="margin-top: 10px; font-size: 12px; color: ${CONFIG.colors.text.muted};">
                        Please check your connection and try again
                    </div>
                </div>
            </div>
        `;
        showSearchResults();
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Highlight search terms in results
 */
function highlightSearchTerm(text, term) {
    if (!term) return text;
    
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    return text.replace(regex, `<mark style="background: ${CONFIG.colors.primary}; color: white; padding: 1px 3px; border-radius: 2px;">$1</mark>`);
}

/**
 * Escape regex special characters
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== EXPORT FOR MODULE SYSTEMS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeSearch,
        performSearch,
        displaySearchResults,
        showSearchResults,
        hideSearchResults,
        clearSearch,
        minimizeSearch,
        restoreSearch,
        setSearchValue,
        showSearchSuggestions,
        getRandomSuggestion
    };
}
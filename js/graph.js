// ========================================
// ACTOR WEB - GRAPH VISUALIZATION
// ========================================

let currentGraph = null;
let simulation = null;
let svg = null;

// ===== GRAPH INITIALIZATION =====

/**
 * Initialize the graph visualization
 */
function initializeGraph() {
    svg = d3.select('#graph');
    
    if (svg.empty()) {
        console.error('Graph SVG element not found');
        return;
    }
    
    // Set initial dimensions
    updateGraphDimensions();
    
    // Handle window resize
    window.addEventListener('resize', handleGraphResize);
    
    debugLog('Graph initialized');
}

/**
 * Update graph dimensions based on window size
 */
function updateGraphDimensions() {
    if (!svg) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    svg.attr('width', width).attr('height', height);
    
    if (simulation) {
        simulation.force('center', d3.forceCenter(width / 2, height / 2));
        simulation.alpha(0.3).restart();
    }
}

/**
 * Handle window resize
 */
function handleGraphResize() {
    updateGraphDimensions();
}

// ===== GRAPH CREATION =====

/**
 * Create graph from movie/show data
 */
function createGraph(centerMovieData) {
    debugLog('Creating graph for:', centerMovieData.title);
    
    if (!centerMovieData) {
        console.error('No movie data provided for graph creation');
        return;
    }
    
    const connections = findConnections(centerMovieData);
    
    // Create nodes
    const nodes = [
        createMainNode(centerMovieData)
    ];
    
    const links = [];
    
    // Add connected movies/shows as nodes
    connections.forEach(connection => {
        if (!nodes.find(n => n.id === connection.id)) {
            nodes.push(createConnectedNode(connection));
        }
        
        // Create link between main node and connected node
        links.push(createLink(centerMovieData.id, connection.id, connection.sharedActors));
    });
    
    // Store current graph data
    currentGraph = { nodes, links, centerMovie: centerMovieData };
    
    // Render the graph
    renderGraph(nodes, links);
    
    debugLog('Graph created with', nodes.length, 'nodes and', links.length, 'links');
}

/**
 * Create main/center node
 */
function createMainNode(movieData) {
    return {
        id: movieData.id,
        title: movieData.title,
        type: movieData.type,
        year: movieData.year,
        isMain: true,
        actors: movieData.actors,
        key: movieData.key || movieData.id.toString()
    };
}

/**
 * Create connected node
 */
function createConnectedNode(movieData) {
    return {
        id: movieData.id,
        title: movieData.title,
        type: movieData.type,
        year: movieData.year,
        isMain: false,
        actors: movieData.actors,
        key: movieData.key || movieData.id.toString(),
        sharedActors: movieData.sharedActors
    };
}

/**
 * Create link between nodes
 */
function createLink(sourceId, targetId, sharedActors) {
    return {
        source: sourceId,
        target: targetId,
        sharedActors: sharedActors,
        strength: sharedActors.length
    };
}

// ===== GRAPH RENDERING =====

/**
 * Render the graph visualization
 */
function renderGraph(nodes, links) {
    if (!svg || !nodes || !links) {
        console.error('Cannot render graph: missing required elements');
        return;
    }
    
    // Clear previous graph
    svg.selectAll('*').remove();
    
    const width = parseInt(svg.attr('width'));
    const height = parseInt(svg.attr('height'));
    
    // Create force simulation
    simulation = createForceSimulation(nodes, links, width, height);
    
    // Create visual elements
    const linkElements = createLinks(svg, links);
    const nodeElements = createNodes(svg, nodes);
    
    // Add interaction handlers
    addNodeInteractions(nodeElements);
    
    // Update positions on each simulation tick
    simulation.on('tick', () => {
        updateLinkPositions(linkElements);
        updateNodePositions(nodeElements);
    });
    
    debugLog('Graph rendered');
}

/**
 * Create force simulation
 */
function createForceSimulation(nodes, links, width, height) {
    return d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links)
            .id(d => d.id)
            .distance(CONFIG.graph.nodeDistance)
        )
        .force('charge', d3.forceManyBody()
            .strength(CONFIG.graph.nodeStrength)
        )
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide()
            .radius(CONFIG.graph.collisionRadius)
        );
}

/**
 * Create link visual elements
 */
function createLinks(svg, links) {
    return svg.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'link')
        .style('stroke', getColor('primary') + '66') // Add transparency
        .style('stroke-width', d => Math.sqrt(d.strength) * CONFIG.graph.linkWidth.multiplier)
        .style('opacity', 0.6);
}

/**
 * Create node visual elements
 */
function createNodes(svg, nodes) {
    const nodeGroups = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', d => `node ${d.isMain ? 'main' : ''}`)
        .call(createDragBehavior());
    
    // Add circles
    nodeGroups.append('circle')
        .attr('r', d => d.isMain ? CONFIG.graph.mainNodeSize : CONFIG.graph.connectedNodeSize)
        .style('fill', d => d.isMain ? getColor('accent') : getColor('primary'))
        .style('stroke', getColor('text.primary'))
        .style('stroke-width', 2);
    
    // Add main labels (titles)
    nodeGroups.append('text')
        .attr('class', 'node-label')
        .attr('dy', 5)
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('text-anchor', 'middle')
        .style('fill', getColor('text.primary'))
        .style('text-shadow', '1px 1px 2px rgba(0, 0, 0, 0.8)')
        .style('pointer-events', 'none')
        .text(d => truncateText(d.title, 15));
    
    // Add year labels
    nodeGroups.append('text')
        .attr('class', 'node-label')
        .attr('dy', 18)
        .style('font-size', '10px')
        .style('text-anchor', 'middle')
        .style('fill', getColor('text.secondary'))
        .style('text-shadow', '1px 1px 2px rgba(0, 0, 0, 0.8)')
        .style('pointer-events', 'none')
        .text(d => `(${d.year})`);
    
    return nodeGroups;
}

/**
 * Add interaction behaviors to nodes
 */
function addNodeInteractions(nodeElements) {
    nodeElements
        .on('mouseover', handleNodeMouseOver)
        .on('mouseout', handleNodeMouseOut)
        .on('click', handleNodeClick);
}

/**
 * Create drag behavior
 */
function createDragBehavior() {
    return d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded);
}

// ===== INTERACTION HANDLERS =====

/**
 * Handle node mouse over
 */
function handleNodeMouseOver(event, d) {
    // Enhance visual feedback
    d3.select(this).select('circle')
        .transition()
        .duration(CONFIG.animations.nodeHover * 1000)
        .attr('r', d => (d.isMain ? CONFIG.graph.mainNodeSize : CONFIG.graph.connectedNodeSize) * 1.2)
        .style('filter', `drop-shadow(0 0 15px ${getColor('primary')})`);
    
    // Highlight connected links
    if (currentGraph) {
        svg.selectAll('.link')
            .style('opacity', link => 
                (link.source.id === d.id || link.target.id === d.id) ? 1 : 0.2
            );
    }
}

/**
 * Handle node mouse out
 */
function handleNodeMouseOut(event, d) {
    // Reset visual state
    d3.select(this).select('circle')
        .transition()
        .duration(CONFIG.animations.nodeHover * 1000)
        .attr('r', d => d.isMain ? CONFIG.graph.mainNodeSize : CONFIG.graph.connectedNodeSize)
        .style('filter', d => d.isMain ? 
            `drop-shadow(0 0 10px ${getColor('accent')})` : 
            `drop-shadow(0 0 5px ${getColor('primary')})`
        );
    
    // Reset link opacity
    svg.selectAll('.link')
        .style('opacity', 0.6);
}

/**
 * Handle node click
 */
function handleNodeClick(event, d) {
    if (!d.isMain && currentGraph) {
        showActorPopup(event, d, currentGraph.centerMovie);
    } else if (d.isMain) {
        // Could add functionality for main node clicks (e.g., show movie details)
        debugLog('Main node clicked:', d.title);
    }
}

// ===== DRAG BEHAVIORS =====

/**
 * Handle drag start
 */
function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

/**
 * Handle dragging
 */
function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

/**
 * Handle drag end
 */
function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// ===== POSITION UPDATES =====

/**
 * Update link positions
 */
function updateLinkPositions(linkElements) {
    linkElements
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
}

/**
 * Update node positions - FIXED VERSION
 */
function updateNodePositions(nodeElements) {
    nodeElements.each(function(d) {
        const group = d3.select(this);
        
        // Update the group transform
        group.attr('transform', `translate(${d.x},${d.y})`);
        
        // CRITICAL FIX: Also update circle cx/cy attributes
        group.select('circle')
            .attr('cx', 0)  // Relative to group position
            .attr('cy', 0); // Relative to group position
    });
}

// ===== ACTOR POPUP FUNCTIONALITY =====

/**
 * Show popup with shared actors between two movies
 */
function showActorPopup(event, clickedMovie, mainMovie) {
    const popup = document.getElementById('actorPopup');
    const title = document.getElementById('popupTitle');
    const photos = document.getElementById('actorPhotos');
    
    if (!popup || !title || !photos) {
        console.error('Popup elements not found');
        return;
    }
    
    // Find shared actors from the link data
    const linkData = currentGraph.links.find(link => 
        (link.source.id === clickedMovie.id && link.target.id === mainMovie.id) ||
        (link.target.id === clickedMovie.id && link.source.id === mainMovie.id)
    );
    
    const sharedActors = linkData ? linkData.sharedActors : [];
    
    // Set popup title
    title.textContent = `Shared Actors: ${mainMovie.title} ↔ ${clickedMovie.title}`;
    
    // Create actor photos HTML
    if (sharedActors.length === 0) {
        photos.innerHTML = createNoActorsHTML();
    } else {
        photos.innerHTML = sharedActors.map(actor => 
            createActorPhotoHTML(actor, mainMovie, clickedMovie)
        ).join('');
    }
    
    // Position popup
    positionPopup(popup, event);
    
    // Show popup with animation
    popup.classList.add('show');
    
    debugLog('Actor popup shown for:', sharedActors.length, 'shared actors');
}

/**
 * Create HTML for when no shared actors are found
 */
function createNoActorsHTML() {
    return `
        <div style="text-align: center; color: ${getColor('text.muted')}; padding: 20px;">
            <div style="font-size: 18px; margin-bottom: 10px;">🎭</div>
            <div>No shared actors found</div>
            <div style="font-size: 12px; margin-top: 5px;">
                This connection might be through crew or other relationships
            </div>
        </div>
    `;
}

/**
 * Create HTML for an actor photo
 */
function createActorPhotoHTML(actor, mainMovie, clickedMovie) {
    const actorImage = getActorImageUrl(actor.name, 150, 200);
    
    return `
        <div class="actor-photo">
            <img src="${actorImage}" alt="${escapeHtml(actor.name)}" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div style="display: none; width: 150px; height: 200px; background: ${getColor('primary')}; 
                        border-radius: 10px; display: flex; align-items: center; justify-content: center; 
                        color: white; text-align: center; font-size: 14px; font-weight: bold;">
                ${escapeHtml(actor.name)}
            </div>
            <div class="photo-label">${escapeHtml(actor.name)}</div>
            <div class="photo-label" style="font-size: 12px; color: ${getColor('text.muted')}; margin-top: 5px;">
                <div><strong>${escapeHtml(mainMovie.title)}</strong> (${mainMovie.year})</div>
                <div style="margin: 2px 0;">as ${escapeHtml(getCharacterName(actor, mainMovie))}</div>
                <div style="border-top: 1px solid ${getColor('text.muted')}; padding-top: 5px; margin-top: 5px;">
                    <strong>${escapeHtml(clickedMovie.title)}</strong> (${clickedMovie.year})
                </div>
                <div>as ${escapeHtml(getCharacterName(actor, clickedMovie))}</div>
            </div>
        </div>
    `;
}

/**
 * Get character name for an actor in a specific movie
 */
function getCharacterName(actor, movie) {
    const movieActor = movie.actors.find(a => a.id === actor.id);
    return movieActor ? movieActor.character : actor.character || 'Unknown Character';
}

/**
 * Position popup relative to click event
 */
function positionPopup(popup, event) {
    const rect = event.target.getBoundingClientRect();
    const popupWidth = CONFIG.ui.popupMaxWidth;
    const popupHeight = 400; // Estimated height
    
    let left = rect.left;
    let top = rect.top + 50;
    
    // Adjust if popup would go off screen
    if (left + popupWidth > window.innerWidth) {
        left = window.innerWidth - popupWidth - 20;
    }
    
    if (top + popupHeight > window.innerHeight) {
        top = window.innerHeight - popupHeight - 20;
    }
    
    // Ensure minimum margins
    left = Math.max(20, left);
    top = Math.max(20, top);
    
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
}

/**
 * Close actor popup
 */
function closePopup() {
    const popup = document.getElementById('actorPopup');
    if (popup) {
        popup.classList.remove('show');
    }
}

// ===== GRAPH UTILITIES =====

/**
 * Clear the current graph
 */
function clearGraph() {
    if (svg) {
        svg.selectAll('*').remove();
    }
    
    if (simulation) {
        simulation.stop();
        simulation = null;
    }
    
    currentGraph = null;
    debugLog('Graph cleared');
}

/**
 * Get current graph data
 */
function getCurrentGraph() {
    return currentGraph;
}

/**
 * Restart simulation with new alpha
 */
function restartSimulation(alpha = 0.3) {
    if (simulation) {
        simulation.alpha(alpha).restart();
    }
}

/**
 * Update graph colors based on current theme
 */
function updateGraphColors() {
    if (!svg || !currentGraph) return;
    
    // Update node colors
    svg.selectAll('.node circle')
        .style('fill', d => d.isMain ? getColor('accent') : getColor('primary'))
        .style('stroke', getColor('text.primary'));
    
    // Update link colors
    svg.selectAll('.link')
        .style('stroke', getColor('primary') + '66');
    
    // Update text colors
    svg.selectAll('.node-label')
        .style('fill', (d, i, nodes) => {
            const element = d3.select(nodes[i]);
            return element.classed('year-label') ? 
                getColor('text.secondary') : 
                getColor('text.primary');
        });
    
    debugLog('Graph colors updated');
}

/**
 * Animate graph entrance
 */
function animateGraphEntrance() {
    if (!svg) return;
    
    // Animate nodes
    svg.selectAll('.node')
        .style('opacity', 0)
        .style('transform', 'scale(0)')
        .transition()
        .duration(500)
        .delay((d, i) => i * 100)
        .style('opacity', 1)
        .style('transform', 'scale(1)');
    
    // Animate links
    svg.selectAll('.link')
        .style('stroke-dasharray', '5,5')
        .style('stroke-dashoffset', 10)
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .delay(300)
        .style('opacity', 0.6)
        .style('stroke-dashoffset', 0);
}

/**
 * Focus on a specific node
 */
function focusOnNode(nodeId) {
    if (!simulation || !currentGraph) return;
    
    const node = currentGraph.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const width = parseInt(svg.attr('width'));
    const height = parseInt(svg.attr('height'));
    
    // Update center force to focus on the node
    simulation
        .force('center', d3.forceCenter(width / 2, height / 2))
        .alpha(0.3)
        .restart();
    
    // Highlight the focused node
    svg.selectAll('.node')
        .style('opacity', d => d.id === nodeId ? 1 : 0.5);
    
    setTimeout(() => {
        svg.selectAll('.node').style('opacity', 1);
    }, 2000);
}

// ===== UTILITY FUNCTIONS =====

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Get node color based on type and state
 */
function getNodeColor(node, state = 'default') {
    if (node.isMain) {
        return getColor('accent');
    }
    
    switch (state) {
        case 'hover':
            return getColor('secondary');
        case 'selected':
            return getColor('primary');
        default:
            return getColor('primary');
    }
}

/**
 * Calculate optimal node size based on connections
 */
function calculateNodeSize(node) {
    const baseSize = node.isMain ? CONFIG.graph.mainNodeSize : CONFIG.graph.connectedNodeSize;
    
    if (node.isMain) {
        return baseSize;
    }
    
    // Adjust size based on number of shared actors
    const sharedActorsCount = node.sharedActors ? node.sharedActors.length : 1;
    const sizeMultiplier = 1 + (sharedActorsCount - 1) * 0.2; // 20% increase per additional shared actor
    
    return Math.min(baseSize * sizeMultiplier, baseSize * 2); // Cap at 2x the base size
}

// ===== EXPORT FOR MODULE SYSTEMS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeGraph,
        createGraph,
        renderGraph,
        clearGraph,
        getCurrentGraph,
        restartSimulation,
        updateGraphColors,
        animateGraphEntrance,
        focusOnNode,
        showActorPopup,
        closePopup,
        updateGraphDimensions
    };
}

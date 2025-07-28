// ACT Placemat - Consistent Menu Bar
// Include this script in all pages for consistent navigation

(function() {
    // Menu bar HTML
    const menuHTML = `
        <div class="act-menu-bar">
            <div class="act-menu-container">
                <a href="/" class="act-logo">
                    <span>🌱</span>
                    <span>ACT Placemat</span>
                </a>
                
                <nav class="act-nav" id="act-nav">
                    <a href="dashboard-home.html" class="act-nav-link" data-page="home">Dashboard</a>
                    <a href="map-modern.html" class="act-nav-link" data-page="projects">Projects Map</a>
                    <a href="opportunities-modern.html" class="act-nav-link" data-page="opportunities">Opportunities</a>
                    <a href="analytics-modern.html" class="act-nav-link" data-page="analytics">Analytics</a>
                    <a href="docs-modern.html" class="act-nav-link" data-page="docs">Docs</a>
                </nav>
                
                <button class="act-menu-toggle" id="act-menu-toggle">☰</button>
            </div>
        </div>
    `;
    
    // Insert menu bar at the beginning of body
    document.addEventListener('DOMContentLoaded', function() {
        // Create menu element
        const menuElement = document.createElement('div');
        menuElement.innerHTML = menuHTML;
        document.body.insertBefore(menuElement.firstElementChild, document.body.firstChild);
        
        // Mobile menu toggle functionality
        const toggle = document.getElementById('act-menu-toggle');
        const nav = document.getElementById('act-nav');
        
        if (toggle && nav) {
            toggle.addEventListener('click', function() {
                nav.classList.toggle('open');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', function(event) {
                if (!toggle.contains(event.target) && !nav.contains(event.target)) {
                    nav.classList.remove('open');
                }
            });
        }
        
        // Set active page
        setActivePage();
    });
    
    function setActivePage() {
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.act-nav-link');
        
        links.forEach(link => {
            link.classList.remove('active');
            
            const page = link.getAttribute('data-page');
            
            // Determine which link should be active
            if ((currentPath === '/' && page === 'home') ||
                (currentPath.includes('/projects') && page === 'projects') ||
                (currentPath.includes('/index') && page === 'projects') ||
                (currentPath.includes('daily-dashboard') && page === 'analytics') ||
                (currentPath.includes('opportunities') && page === 'opportunities') ||
                (currentPath.includes('.md') && page === 'docs')) {
                link.classList.add('active');
            }
        });
    }
})();
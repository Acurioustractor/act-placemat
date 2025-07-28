// Navigation Header Component
// Include this script in any page to add a consistent navigation header

(function() {
    // Create navigation header HTML
    const navHTML = `
        <style>
            .act-nav-header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: rgba(30, 60, 114, 0.95);
                backdrop-filter: blur(10px);
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }
            
            .act-nav-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 60px;
            }
            
            .act-nav-logo {
                display: flex;
                align-items: center;
                gap: 10px;
                color: white;
                text-decoration: none;
                font-size: 20px;
                font-weight: 600;
            }
            
            .act-nav-logo:hover {
                opacity: 0.9;
            }
            
            .act-nav-menu {
                display: flex;
                gap: 30px;
                align-items: center;
            }
            
            .act-nav-link {
                color: white;
                text-decoration: none;
                font-size: 16px;
                transition: opacity 0.2s;
                position: relative;
            }
            
            .act-nav-link:hover {
                opacity: 0.8;
            }
            
            .act-nav-link.active::after {
                content: '';
                position: absolute;
                bottom: -5px;
                left: 0;
                right: 0;
                height: 2px;
                background: white;
            }
            
            .act-nav-mobile-toggle {
                display: none;
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
            }
            
            /* Add padding to body to account for fixed header */
            body {
                padding-top: 60px !important;
            }
            
            @media (max-width: 768px) {
                .act-nav-mobile-toggle {
                    display: block;
                }
                
                .act-nav-menu {
                    position: fixed;
                    top: 60px;
                    left: 0;
                    right: 0;
                    background: rgba(30, 60, 114, 0.98);
                    flex-direction: column;
                    padding: 20px;
                    gap: 20px;
                    transform: translateY(-100%);
                    transition: transform 0.3s;
                }
                
                .act-nav-menu.active {
                    transform: translateY(0);
                }
            }
        </style>
        
        <header class="act-nav-header">
            <div class="act-nav-container">
                <a href="/" class="act-nav-logo">
                    <span>🌱</span>
                    <span>ACT Placemat</span>
                </a>
                
                <nav class="act-nav-menu" id="act-nav-menu">
                    <a href="/projects" class="act-nav-link" data-page="projects">Projects Map</a>
                    <a href="/daily-dashboard.html" class="act-nav-link" data-page="dashboard">Dashboard</a>
                    <a href="/opportunities" class="act-nav-link" data-page="opportunities">Opportunities</a>
                    <a href="/" class="act-nav-link" data-page="navigation">Menu</a>
                </nav>
                
                <button class="act-nav-mobile-toggle" id="act-nav-toggle">☰</button>
            </div>
        </header>
    `;
    
    // Insert navigation at the beginning of body
    document.addEventListener('DOMContentLoaded', function() {
        const navElement = document.createElement('div');
        navElement.innerHTML = navHTML;
        document.body.insertBefore(navElement.firstElementChild, document.body.firstChild);
        
        // Mobile menu toggle
        const toggle = document.getElementById('act-nav-toggle');
        const menu = document.getElementById('act-nav-menu');
        
        toggle.addEventListener('click', function() {
            menu.classList.toggle('active');
        });
        
        // Mark active page
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.act-nav-link');
        
        links.forEach(link => {
            if (currentPath.includes(link.getAttribute('data-page')) || 
                (currentPath === '/' && link.getAttribute('data-page') === 'navigation') ||
                (currentPath.includes('index') && link.getAttribute('data-page') === 'projects')) {
                link.classList.add('active');
            }
        });
    });
})();
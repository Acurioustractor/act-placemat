// Modern Navigation Component for ACT Placemat
// Apple-inspired sidebar navigation

class ModernNavigation {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path.includes('dashboard')) return 'dashboard';
        if (path.includes('projects')) return 'projects';
        if (path.includes('map')) return 'map';
        if (path.includes('opportunities')) return 'opportunities';
        if (path.includes('analytics')) return 'analytics';
        if (path.includes('docs') || path.includes('documentation')) return 'docs';
        if (path.includes('help') || path.includes('support')) return 'help';
        return 'dashboard';
    }

    init() {
        this.createNavigation();
        this.attachEventListeners();
    }

    createNavigation() {
        const navHTML = `
            <div class="app-sidebar">
                <div class="sidebar-header">
                    <a href="/" class="sidebar-brand">ACT Placemat</a>
                </div>
                
                <nav class="sidebar-nav">
                    <div class="sidebar-section">
                        <div class="sidebar-section-title">Overview</div>
                        <a href="/" class="sidebar-nav-item ${this.currentPage === 'dashboard' ? 'active' : ''}">
                            <svg class="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                            </svg>
                            Dashboard
                        </a>
                        
                        <a href="/projects" class="sidebar-nav-item ${this.currentPage === 'projects' ? 'active' : ''}">
                            <svg class="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                            Projects
                        </a>
                        
                        <a href="/map" class="sidebar-nav-item ${this.currentPage === 'map' ? 'active' : ''}">
                            <svg class="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clip-rule="evenodd"/>
                            </svg>
                            Project Map
                        </a>
                    </div>
                    
                    <div class="sidebar-section">
                        <div class="sidebar-section-title">Management</div>
                        <a href="/opportunities" class="sidebar-nav-item ${this.currentPage === 'opportunities' ? 'active' : ''}">
                            <svg class="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Opportunities
                        </a>
                        
                        <a href="/analytics" class="sidebar-nav-item ${this.currentPage === 'analytics' ? 'active' : ''}">
                            <svg class="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                            </svg>
                            Analytics
                        </a>
                    </div>
                    
                    <div class="sidebar-section">
                        <div class="sidebar-section-title">Resources</div>
                        <a href="/docs" class="sidebar-nav-item ${this.currentPage === 'docs' ? 'active' : ''}">
                            <svg class="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                            </svg>
                            Documentation
                        </a>
                        
                        <a href="/help" class="sidebar-nav-item ${this.currentPage === 'help' ? 'active' : ''}">
                            <svg class="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                            </svg>
                            Help & Support
                        </a>
                    </div>
                </nav>
            </div>
        `;

        // Insert navigation before the main content
        const existingNav = document.querySelector('.app-sidebar');
        if (existingNav) {
            existingNav.remove();
        }

        document.body.insertAdjacentHTML('afterbegin', navHTML);
    }

    attachEventListeners() {
        // Mobile menu toggle (if needed)
        const menuButton = document.querySelector('.mobile-menu-button');
        const sidebar = document.querySelector('.app-sidebar');
        
        if (menuButton && sidebar) {
            menuButton.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Close sidebar on outside click on mobile
        document.addEventListener('click', (e) => {
            const sidebar = document.querySelector('.app-sidebar');
            const menuButton = document.querySelector('.mobile-menu-button');
            
            if (window.innerWidth <= 1024 && sidebar && !sidebar.contains(e.target) && !menuButton?.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ModernNavigation();
});

// Export for manual initialization
if (typeof window !== 'undefined') {
    window.ModernNavigation = ModernNavigation;
}
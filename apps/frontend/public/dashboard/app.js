/**
 * ACT Ecosystem Dashboard - Application Logic
 *
 * Connects to the Intelligence Platform API for:
 * - Unified search across all data sources
 * - Project and contact information
 * - AI agent status and actions
 */

// API Configuration
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : '/api'; // Use relative path in production

// State
let isConnected = false;

// DOM Elements
const elements = {
  connectionStatus: document.getElementById('connectionStatus'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  searchResults: document.getElementById('searchResults'),
  searchResultCount: document.getElementById('searchResultCount'),
  projectsList: document.getElementById('projectsList'),
  projectCount: document.getElementById('projectCount'),
  contactCount: document.getElementById('contactCount'),
  storyCount: document.getElementById('storyCount'),
};

// Projects data (static for now)
const projects = [
  { icon: '🎨', name: 'ACT Studio', desc: 'Main website & project showcase', url: 'https://acurioustractor.com' },
  { icon: '📖', name: 'Empathy Ledger', desc: 'Ethical storytelling platform', url: 'https://empathyledger.com' },
  { icon: '⚖️', name: 'JusticeHub', desc: 'Youth justice programs', url: 'https://justicehub.org' },
  { icon: '🌾', name: 'The Harvest', desc: 'CSA & community events', url: 'https://theharvest.community' },
  { icon: '📦', name: 'Goods', desc: 'Circular economy products', url: 'https://goods.acurioustractor.com' },
  { icon: '🌱', name: 'ACT Farm', desc: 'Black Cockatoo Valley estate', url: 'https://farm.acurioustractor.com' },
  { icon: '🧠', name: 'Intelligence Platform', desc: 'Ecosystem dashboard', url: 'https://placemat.acurioustractor.com' },
];

/**
 * Initialize the dashboard
 */
async function init() {
  console.log('ACT Dashboard initializing...');

  // Render static content
  renderProjects();

  // Set up event listeners
  elements.searchBtn.addEventListener('click', handleSearch);
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Check API connection and load data
  await checkConnection();
  if (isConnected) {
    await loadDashboardData();
  }
}

/**
 * Check API connection
 */
async function checkConnection() {
  try {
    const response = await fetch(`${API_BASE}/api/v1/search/health`);
    if (response.ok) {
      const data = await response.json();
      isConnected = true;
      elements.connectionStatus.textContent = 'Connected';
      elements.connectionStatus.classList.add('connected');
      console.log('API connected:', data);
    } else {
      throw new Error('API not healthy');
    }
  } catch (error) {
    console.warn('API connection failed:', error);
    isConnected = false;
    elements.connectionStatus.textContent = 'Offline Mode';
    elements.connectionStatus.classList.add('error');

    // Use demo data
    loadDemoData();
  }
}

/**
 * Load dashboard data from API
 */
async function loadDashboardData() {
  try {
    // Load contacts count
    const contactsResponse = await fetch(`${API_BASE}/api/v1/contacts?limit=1`);
    if (contactsResponse.ok) {
      const contactsData = await contactsResponse.json();
      const count = contactsData.data?.pagination?.total || contactsData.pagination?.total;
      elements.contactCount.textContent = formatNumber(count || 40530);
    }

    // Load projects count
    elements.projectCount.textContent = '70+';

    // Load stories count (demo)
    elements.storyCount.textContent = '328';

  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    loadDemoData();
  }
}

/**
 * Load demo data when API is unavailable
 */
function loadDemoData() {
  elements.projectCount.textContent = '70+';
  elements.contactCount.textContent = '40.5K';
  elements.storyCount.textContent = '328';
}

/**
 * Render projects list
 */
function renderProjects() {
  elements.projectsList.innerHTML = projects.map(project => `
    <div class="project-item" onclick="window.open('${project.url}', '_blank')">
      <span class="project-icon">${project.icon}</span>
      <div class="project-info">
        <div class="project-name">${project.name}</div>
        <div class="project-desc">${project.desc}</div>
      </div>
    </div>
  `).join('');
}

/**
 * Handle search
 */
async function handleSearch() {
  const query = elements.searchInput.value.trim();
  if (!query) return;

  elements.searchResults.innerHTML = '<div class="loading-spinner"></div>';
  elements.searchResultCount.textContent = 'Searching...';

  try {
    if (!isConnected) {
      // Show demo results
      showDemoSearchResults(query);
      return;
    }

    const response = await fetch(`${API_BASE}/api/v1/search?q=${encodeURIComponent(query)}&mode=hybrid`);
    if (!response.ok) throw new Error('Search failed');

    const data = await response.json();
    renderSearchResults(data.data || data);
  } catch (error) {
    console.error('Search error:', error);
    elements.searchResults.innerHTML = `
      <div class="empty-state">
        <p>Search failed. ${isConnected ? 'Please try again.' : 'API is offline.'}</p>
      </div>
    `;
    elements.searchResultCount.textContent = 'Error';
  }
}

/**
 * Render search results
 */
function renderSearchResults(results) {
  const combined = results.combined || [];
  const total = results.meta?.totalResults || combined.length;

  elements.searchResultCount.textContent = `${total} results`;

  if (combined.length === 0) {
    elements.searchResults.innerHTML = `
      <div class="empty-state">
        <p>No results found for "${results.query}"</p>
        <p class="hint">Try different keywords</p>
      </div>
    `;
    return;
  }

  elements.searchResults.innerHTML = combined.slice(0, 10).map(item => {
    const source = item._sourceType || 'unknown';
    const sourceEmoji = source === 'contacts' ? '👤' : source === 'projects' ? '📋' : '📖';
    const title = item.full_name || item.name || item.title || 'Unknown';
    const meta = item.current_company || item.current_position || item.status || item.summary?.slice(0, 80) || '';

    return `
      <div class="search-result">
        <div class="search-result-title">${sourceEmoji} ${title}</div>
        <div class="search-result-meta">
          ${meta}
          <span class="search-result-source">${source}</span>
        </div>
      </div>
    `;
  }).join('');

  if (total > 10) {
    elements.searchResults.innerHTML += `
      <div class="empty-state">
        <p class="hint">Showing 10 of ${total} results</p>
      </div>
    `;
  }
}

/**
 * Show demo search results when offline
 */
function showDemoSearchResults(query) {
  const demoResults = [
    { type: 'contacts', icon: '👤', title: 'Foundation Manager - Brisbane', meta: 'Impact Foundation' },
    { type: 'projects', icon: '📋', title: 'Youth Justice Program', meta: 'Status: Active' },
    { type: 'stories', icon: '📖', title: 'Community Resilience Story', meta: 'Empathy Ledger' },
    { type: 'contacts', icon: '👤', title: 'Grant Officer - QLD', meta: 'QLD Government' },
  ];

  elements.searchResultCount.textContent = `${demoResults.length} demo results`;

  elements.searchResults.innerHTML = demoResults.map(item => `
    <div class="search-result">
      <div class="search-result-title">${item.icon} ${item.title}</div>
      <div class="search-result-meta">
        ${item.meta}
        <span class="search-result-source">${item.type}</span>
      </div>
    </div>
  `).join('');

  elements.searchResults.innerHTML += `
    <div class="empty-state">
      <p class="hint">Demo mode - Connect to API for real results</p>
    </div>
  `;
}

/**
 * Format large numbers
 */
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

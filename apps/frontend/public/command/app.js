/**
 * ACT Command Center - Living Intelligence Dashboard
 *
 * A unified command center for the ACT ecosystem:
 * - Story intelligence and gap analysis
 * - Email intelligence from Gmail
 * - Relationship health from CRM/GoHighLevel
 * - Task management and pipeline status
 */

// API Configuration
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : '';

// State
let currentView = 'home';
let morningBriefData = null;
let dashboardData = {};

// DOM Elements
const elements = {};

/**
 * Initialize the command center
 */
async function init() {
  console.log('🌱 ACT Command Center initializing...');

  // Cache DOM elements
  cacheElements();

  // Set up event listeners
  setupEventListeners();

  // Update greeting based on time
  updateGreeting();

  // Load initial data
  await loadDashboardData();
}

/**
 * Cache frequently accessed DOM elements
 */
function cacheElements() {
  elements.viewTitle = document.getElementById('viewTitle');
  elements.viewSubtitle = document.getElementById('viewSubtitle');
  elements.globalSearch = document.getElementById('globalSearch');
  elements.refreshBtn = document.getElementById('refreshBtn');
  elements.morningBriefContent = document.getElementById('morningBriefContent');
  elements.briefTime = document.getElementById('briefTime');
  elements.statStories = document.getElementById('statStories');
  elements.statContacts = document.getElementById('statContacts');
  elements.statProjects = document.getElementById('statProjects');
  elements.statEmails = document.getElementById('statEmails');
  elements.emailTrend = document.getElementById('emailTrend');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      switchView(view);
    });
  });

  // Card links that switch views
  document.querySelectorAll('.card-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      switchView(view);
    });
  });

  // Refresh button
  elements.refreshBtn?.addEventListener('click', () => {
    elements.refreshBtn.style.animation = 'spin 1s linear';
    loadDashboardData().then(() => {
      elements.refreshBtn.style.animation = '';
    });
  });

  // Global search
  elements.globalSearch?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleGlobalSearch(e.target.value);
    }
  });
}

/**
 * Switch between views
 */
function switchView(viewName) {
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.view === viewName) {
      item.classList.add('active');
    }
  });

  // Hide all views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  // Show selected view
  const targetView = document.getElementById(`${viewName}View`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update header
  updateHeader(viewName);

  currentView = viewName;
}

/**
 * Update header based on current view
 */
function updateHeader(viewName) {
  const headers = {
    home: { title: getGreeting(), subtitle: "Here's what's happening across ACT today" },
    stories: { title: 'Story Intelligence', subtitle: '31 vignettes across 6 categories, 328 stories in Empathy Ledger' },
    emails: { title: 'Email Intelligence', subtitle: 'Gmail analysis and actionable insights' },
    relationships: { title: 'Relationship Health', subtitle: '40,530 contacts in your network' },
    grants: { title: 'Grant Intelligence', subtitle: 'Opportunities and application tracking' },
    projects: { title: 'Project Portfolio', subtitle: '70+ projects across the ACT ecosystem' },
    tasks: { title: 'Tasks & Actions', subtitle: 'Your current focus and priorities' },
    pipeline: { title: 'Development Pipeline', subtitle: 'System health and CI/CD status' },
  };

  const header = headers[viewName] || headers.home;
  if (elements.viewTitle) elements.viewTitle.textContent = header.title;
  if (elements.viewSubtitle) elements.viewSubtitle.textContent = header.subtitle;
}

/**
 * Get time-appropriate greeting
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, Ben';
  if (hour < 17) return 'Good afternoon, Ben';
  return 'Good evening, Ben';
}

/**
 * Update greeting based on time of day
 */
function updateGreeting() {
  if (elements.viewTitle && currentView === 'home') {
    elements.viewTitle.textContent = getGreeting();
  }
}

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
  console.log('📊 Loading dashboard data...');

  // Load data in parallel
  await Promise.all([
    loadCommandCenterOverview(),
    loadMorningBrief(),
    loadEmailIntelligence(),
    loadRelationshipHealth(),
    loadStoryGaps(),
    loadPipelineStatus(),
  ]);

  console.log('✅ Dashboard data loaded');
}

/**
 * Load Command Center overview (unified endpoint)
 */
async function loadCommandCenterOverview() {
  try {
    const response = await fetch(`${API_BASE}/api/v1/command-center/overview`);
    if (response.ok) {
      const data = await response.json();
      dashboardData.overview = data.data;
      renderOverviewStats(data.data);
    }
  } catch (error) {
    console.warn('Command Center overview unavailable:', error);
    renderOverviewStatsFallback();
  }
}

/**
 * Render overview stats from API
 */
function renderOverviewStats(data) {
  if (elements.statStories) {
    elements.statStories.textContent = data.stories?.total || '328';
  }
  if (elements.statContacts) {
    const count = data.contacts?.total || 40530;
    elements.statContacts.textContent = formatNumber(count);
  }
  if (elements.statProjects) {
    elements.statProjects.textContent = data.projects?.total || '70';
  }

  // Update story gaps panel
  if (data.storyGaps && data.storyGaps.length > 0) {
    renderStoryGapsPanel(data.storyGaps);
  }

  // Update art opportunities panel
  if (data.artOpportunities && data.artOpportunities.length > 0) {
    renderArtOpportunitiesPanel(data.artOpportunities);
  }
}

/**
 * Render overview stats fallback
 */
function renderOverviewStatsFallback() {
  if (elements.statStories) elements.statStories.textContent = '328';
  if (elements.statContacts) elements.statContacts.textContent = '40.5K';
  if (elements.statProjects) elements.statProjects.textContent = '70';
}

/**
 * Render story gaps panel
 */
function renderStoryGapsPanel(gaps) {
  const panel = document.getElementById('storyGapsPanel');
  if (!panel) return;

  const html = gaps.slice(0, 4).map(gap => `
    <div class="priority-item ${gap.priority || 'medium'}">
      <div class="priority-icon">📝</div>
      <div class="priority-content">
        <div class="priority-title">${gap.projectName || gap.name}</div>
        <div class="priority-meta">${gap.reason || 'No stories collected yet'}</div>
      </div>
    </div>
  `).join('');

  panel.innerHTML = html || '<p class="empty-state">All projects have stories!</p>';
}

/**
 * Render art opportunities panel
 */
function renderArtOpportunitiesPanel(opportunities) {
  const panel = document.getElementById('artOpportunitiesPanel');
  if (!panel) return;

  const html = opportunities.slice(0, 4).map(opp => `
    <div class="priority-item">
      <div class="priority-icon">🎨</div>
      <div class="priority-content">
        <div class="priority-title">${opp.title || opp.name}</div>
        <div class="priority-meta">ALMA Score: ${opp.almaScore || opp.score || '-'}</div>
      </div>
    </div>
  `).join('');

  panel.innerHTML = html || '<p class="empty-state">No art opportunities identified</p>';
}

/**
 * Load morning brief
 */
async function loadMorningBrief() {
  try {
    const response = await fetch(`${API_BASE}/api/morning-brief`);
    if (response.ok) {
      const data = await response.json();
      morningBriefData = data;
      renderMorningBrief(data);
    } else {
      renderMorningBriefFallback();
    }
  } catch (error) {
    console.warn('Morning brief unavailable:', error);
    renderMorningBriefFallback();
  }
}

/**
 * Render morning brief content
 */
function renderMorningBrief(data) {
  if (!elements.morningBriefContent) return;

  const summary = data.summary || data.brief || data.data?.summary;

  if (summary) {
    elements.morningBriefContent.innerHTML = `<p>${summary}</p>`;
  } else {
    renderMorningBriefFallback();
  }

  if (elements.briefTime) {
    elements.briefTime.textContent = new Date().toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * Render fallback morning brief
 */
function renderMorningBriefFallback() {
  if (!elements.morningBriefContent) return;

  elements.morningBriefContent.innerHTML = `
    <p>
      <strong>4 urgent story gaps</strong> need attention: Witta Harvest HQ, Goods, Diagrama, and MMEIC Justice
      are active projects without community stories yet.
    </p>
    <p style="margin-top: 12px;">
      <strong>6 art opportunities</strong> are ready NOW with ALMA scores above 4.3 —
      Orange Sky Origins and Community Innovation have video ready for social clips.
    </p>
    <p style="margin-top: 12px;">
      <strong>6 vignettes</strong> are pending Elder review before external sharing.
    </p>
  `;

  if (elements.briefTime) {
    elements.briefTime.textContent = 'Static data';
  }
}


/**
 * Load email intelligence
 */
async function loadEmailIntelligence() {
  try {
    // Try the new Command Center endpoint first
    const response = await fetch(`${API_BASE}/api/v1/command-center/emails`);
    if (response.ok) {
      const data = await response.json();
      dashboardData.emails = data.data;
      renderEmailPanel(data.data);
      return;
    }
  } catch (error) {
    console.warn('Command Center emails unavailable:', error);
  }

  // Fallback to direct Gmail status
  try {
    const response = await fetch(`${API_BASE}/api/gmail/status`);
    if (response.ok) {
      const data = await response.json();
      if (elements.statEmails) {
        elements.statEmails.textContent = data.unreadCount || '-';
      }
      if (elements.emailTrend) {
        elements.emailTrend.textContent = data.connected ? 'Connected' : 'Not connected';
      }
    }
  } catch (error) {
    console.warn('Email intelligence unavailable:', error);
    renderEmailPanelFallback();
  }
}

/**
 * Render email panel from API data
 */
function renderEmailPanel(data) {
  if (elements.statEmails) {
    elements.statEmails.textContent = data.unread || '-';
  }
  if (elements.emailTrend) {
    elements.emailTrend.textContent = data.connected ? 'Connected' : 'Offline';
  }

  const panel = document.getElementById('emailIntelPanel');
  if (!panel || !data.actionItems) return;

  const html = data.actionItems.slice(0, 3).map(email => `
    <div class="priority-item ${email.priority || 'medium'}">
      <div class="priority-icon">📧</div>
      <div class="priority-content">
        <div class="priority-title">${email.subject || email.from}</div>
        <div class="priority-meta">${email.from} • ${email.timeAgo || 'Recently'}</div>
      </div>
    </div>
  `).join('');

  panel.innerHTML = html || '<p class="empty-state">No action items</p>';
}

/**
 * Render email panel fallback
 */
function renderEmailPanelFallback() {
  if (elements.statEmails) elements.statEmails.textContent = '-';
  if (elements.emailTrend) elements.emailTrend.textContent = 'Offline';
}

/**
 * Load relationship health
 */
async function loadRelationshipHealth() {
  try {
    const response = await fetch(`${API_BASE}/api/v1/command-center/relationships`);
    if (response.ok) {
      const data = await response.json();
      dashboardData.relationships = data.data;
      renderRelationshipPanel(data.data);
    }
  } catch (error) {
    console.warn('Relationship health unavailable:', error);
    renderRelationshipPanelFallback();
  }
}

/**
 * Render relationship panel
 */
function renderRelationshipPanel(data) {
  const panel = document.getElementById('relationshipPanel');
  if (!panel) return;

  if (!data.contacts || data.contacts.length === 0) {
    renderRelationshipPanelFallback();
    return;
  }

  const html = data.contacts.slice(0, 4).map(contact => {
    const scoreClass = contact.health >= 80 ? 'high' :
                       contact.health >= 50 ? 'medium' : 'low';
    return `
      <div class="relationship-item">
        <div class="relationship-avatar">${contact.avatar || contact.name?.charAt(0) || '?'}</div>
        <div class="relationship-info">
          <div class="relationship-name">${contact.name}</div>
          <div class="relationship-role">${contact.role || contact.company || 'Contact'}</div>
        </div>
        <div class="relationship-score ${scoreClass}">${contact.health || '-'}%</div>
      </div>
    `;
  }).join('');

  panel.innerHTML = html;
}

/**
 * Render relationship panel fallback
 */
function renderRelationshipPanelFallback() {
  const panel = document.getElementById('relationshipPanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="relationship-item">
      <div class="relationship-avatar">👤</div>
      <div class="relationship-info">
        <div class="relationship-name">Connect CRM</div>
        <div class="relationship-role">GoHighLevel integration needed</div>
      </div>
      <div class="relationship-score medium">-</div>
    </div>
  `;
}

/**
 * Load story gaps from gap analysis
 */
async function loadStoryGaps() {
  try {
    // Try gap analysis endpoint
    const response = await fetch(`${API_BASE}/api/gap-analysis/latest`);
    if (response.ok) {
      const data = await response.json();
      if (data.storyGaps) {
        renderStoryGapsPanel(data.storyGaps);
      }
    }
  } catch (error) {
    console.warn('Story gaps unavailable:', error);
    // Fallback is already handled by overview
  }
}

/**
 * Load pipeline status
 */
async function loadPipelineStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/v1/command-center/pipeline`);
    if (response.ok) {
      const data = await response.json();
      dashboardData.pipeline = data.data;
      renderPipelinePanel(data.data);
    }
  } catch (error) {
    console.warn('Pipeline status unavailable:', error);
    renderPipelinePanelFallback();
  }
}

/**
 * Render pipeline panel
 */
function renderPipelinePanel(data) {
  const panel = document.getElementById('pipelinePanel');
  if (!panel) return;

  if (!data.repositories || data.repositories.length === 0) {
    renderPipelinePanelFallback();
    return;
  }

  const html = data.repositories.slice(0, 6).map(repo => {
    const statusIcon = repo.status === 'healthy' ? '✅' :
                       repo.status === 'warning' ? '⚠️' : '❌';
    const statusClass = repo.status || 'unknown';
    return `
      <div class="pipeline-item ${statusClass}">
        <span class="pipeline-icon">${statusIcon}</span>
        <span class="pipeline-name">${repo.name}</span>
        <span class="pipeline-status">${repo.lastActivity || 'Active'}</span>
      </div>
    `;
  }).join('');

  panel.innerHTML = html;
}

/**
 * Render pipeline panel fallback
 */
function renderPipelinePanelFallback() {
  const panel = document.getElementById('pipelinePanel');
  if (!panel) return;

  const projects = [
    { name: 'empathy-ledger', status: 'healthy' },
    { name: 'intelligence-platform', status: 'healthy' },
    { name: 'act-farm', status: 'healthy' },
    { name: 'the-harvest', status: 'healthy' },
    { name: 'justicehub', status: 'healthy' },
    { name: 'act-studio', status: 'warning' },
  ];

  const html = projects.map(repo => {
    const statusIcon = repo.status === 'healthy' ? '✅' : '⚠️';
    return `
      <div class="pipeline-item ${repo.status}">
        <span class="pipeline-icon">${statusIcon}</span>
        <span class="pipeline-name">${repo.name}</span>
        <span class="pipeline-status">Local</span>
      </div>
    `;
  }).join('');

  panel.innerHTML = html;
}

/**
 * Handle global search
 */
async function handleGlobalSearch(query) {
  if (!query.trim()) return;

  console.log('🔍 Searching:', query);

  try {
    const response = await fetch(`${API_BASE}/api/v1/search?q=${encodeURIComponent(query)}&mode=hybrid`);
    if (response.ok) {
      const data = await response.json();
      console.log('Search results:', data);
      // TODO: Display search results in a modal or dedicated view
      alert(`Found ${data.meta?.totalResults || 0} results for "${query}"`);
    }
  } catch (error) {
    console.error('Search error:', error);
  }
}

/**
 * Format large numbers
 */
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Add spin animation for refresh button
 */
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

// Update greeting periodically
setInterval(updateGreeting, 60000);

// Auto-refresh data every 5 minutes
let refreshInterval = null;

/**
 * Start auto-refresh polling
 */
function startAutoRefresh() {
  if (refreshInterval) return;
  refreshInterval = setInterval(() => {
    console.log('🔄 Auto-refreshing data...');
    loadDashboardData();
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Stop auto-refresh polling
 */
function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// Start auto-refresh when page is visible
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAutoRefresh();
  } else {
    startAutoRefresh();
    loadDashboardData(); // Refresh immediately when tab becomes visible
  }
});

// Start auto-refresh on load
startAutoRefresh();

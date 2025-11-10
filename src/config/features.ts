/**
 * Feature flags - control what shows up in your app
 * Update .env file to toggle features on/off
 */

export const FEATURES = {
  // Navigation
  showWebflowNav: import.meta.env.VITE_SHOW_WEBFLOW_NAV === 'true',
  mainSiteUrl: import.meta.env.VITE_MAIN_SITE_URL || 'https://act-revised-site.webflow.io',

  // Pages
  showDashboard: import.meta.env.VITE_SHOW_DASHBOARD !== 'false', // default true
  showProjects: import.meta.env.VITE_SHOW_PROJECTS !== 'false',
  showOpportunities: import.meta.env.VITE_SHOW_OPPORTUNITIES !== 'false',
  showAnalytics: import.meta.env.VITE_SHOW_ANALYTICS !== 'false',
  showNetwork: import.meta.env.VITE_SHOW_NETWORK !== 'false',
  showArtifacts: import.meta.env.VITE_SHOW_ARTIFACTS !== 'false',
} as const;

export default FEATURES;

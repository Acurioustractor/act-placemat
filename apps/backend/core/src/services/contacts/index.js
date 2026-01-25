/**
 * Contact Intelligence Module Aggregator
 *
 * Modular contact intelligence service for youth justice advocacy.
 * Provides comprehensive contact management with AI-powered enrichment.
 *
 * @module contacts
 */

// Database and metrics (foundational)
export { ContactDatabase } from './database.js';
export { ContactMetrics } from './metrics.js';

// Core processing
export { ContactNormalizer } from './normalizer.js';
export { ContactDashboard } from './dashboard.js';

// Enrichment and engagement
export { ContactEnricher } from './enricher.js';
export { ContactEngagement } from './engagement.js';
export { ContactIntelligence } from './intelligence.js';

// Import operations
export { ContactImporter } from './importer.js';

export default {
  ContactDatabase,
  ContactMetrics,
  ContactNormalizer,
  ContactDashboard,
  ContactEnricher,
  ContactEngagement,
  ContactIntelligence,
  ContactImporter
};

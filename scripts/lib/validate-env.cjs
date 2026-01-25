/**
 * Environment Variable Validation Helper
 *
 * Use at the top of scripts to fail fast on missing config.
 *
 * Usage:
 *   const { validateEnv, INTELLIGENCE_PLATFORM, KNOWLEDGE_HUB, BOTH_DATABASES } = require('./lib/validate-env.cjs');
 *   validateEnv(INTELLIGENCE_PLATFORM);  // Only need main DB
 *   validateEnv(KNOWLEDGE_HUB);          // Only need Knowledge Hub
 *   validateEnv(BOTH_DATABASES);         // Need both
 */

// Preset configurations
const INTELLIGENCE_PLATFORM = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const KNOWLEDGE_HUB = ['KNOWLEDGE_HUB_SUPABASE_URL', 'KNOWLEDGE_HUB_SUPABASE_KEY'];
const BOTH_DATABASES = [...INTELLIGENCE_PLATFORM, ...KNOWLEDGE_HUB];

/**
 * Validate required environment variables
 * @param {string[]} requiredVars - Array of required env var names
 * @param {object} options - Options
 * @param {string} options.envPath - Path to .env file (default: 'apps/backend/.env')
 */
function validateEnv(requiredVars, options = {}) {
  const { envPath = 'apps/backend/.env' } = options;

  // Load .env file
  try {
    require('dotenv').config({ path: envPath });
  } catch (e) {
    console.error(`Could not load ${envPath}. Make sure dotenv is installed.`);
  }

  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('');
    console.error('╔════════════════════════════════════════════════╗');
    console.error('║  ❌ Missing required environment variables      ║');
    console.error('╚════════════════════════════════════════════════╝');
    console.error('');
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    console.error('');
    console.error('Required databases:');
    if (requiredVars.includes('SUPABASE_URL')) {
      console.error('   - Intelligence Platform (tednluwflfhxyucgwigh)');
    }
    if (requiredVars.includes('KNOWLEDGE_HUB_SUPABASE_URL')) {
      console.error('   - Knowledge Hub (bhwyqqbovcjoefezgfnq)');
    }
    console.error('');
    console.error(`Check: ${envPath}`);
    console.error('See:   docs/DUAL_DATABASE_ARCHITECTURE.md');
    console.error('');
    process.exit(1);
  }

  return true;
}

module.exports = {
  validateEnv,
  INTELLIGENCE_PLATFORM,
  KNOWLEDGE_HUB,
  BOTH_DATABASES
};

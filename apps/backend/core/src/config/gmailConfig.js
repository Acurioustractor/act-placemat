/**
 * Centralized Gmail Configuration
 * LOCKED DOWN - NEVER CHANGE THIS UNLESS ABSOLUTELY NECESSARY
 */

// Use getter function to lazy-load env vars (ensures .env is loaded first)
const getGmailConfig = () => ({
  // OAuth Client Configuration (NEVER CHANGE)
  oauth: {
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    redirectUri: 'urn:ietf:wg:oauth:2.0:oob', // Desktop OAuth client - LOCKED
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ]
  },

  // Token Management
  tokens: {
    file: '.gmail_tokens.json',
    backupFile: '.gmail_tokens_backup.json'
  },

  // Service Configuration
  service: {
    autoRefreshTokens: true,
    maxRetries: 3,
    timeout: 30000 // 30 seconds
  },

  // Intelligence Filters
  filters: {
    projectKeywords: [
      'ANAT SPECTRA', 'Barkly Backbone', 'BG Fit', 'Black Cockatoo Valley',
      'Climate Justice Innovation Lab', 'Dad.Lab', 'Designing for Obsolescence',
      'Contained', 'PICC', 'Justice Hub', 'Empathy Ledger'
    ],

    organizationDomains: [
      '@act.place', '@empathyledger.com', '@picc.org.au',
      '@climateseed.com', '@justiceseed.com'
    ],

    subjectPatterns: [
      /partnership/i, /collaboration/i, /project/i, /funding/i, /grant/i,
      /community/i, /workshop/i, /event/i, /meeting/i, /proposal/i,
      /opportunity/i, /application/i, /letter of support/i, /introduction/i
    ]
  }
});

// Export config with lazy evaluation
export const gmailConfig = new Proxy({}, {
  get(target, prop) {
    return getGmailConfig()[prop];
  }
});

/**
 * Validate Gmail configuration
 */
export function validateGmailConfig() {
  const config = getGmailConfig();
  const errors = [];

  if (!config.oauth.clientId) {
    errors.push('GMAIL_CLIENT_ID not set in environment');
  }

  if (!config.oauth.clientSecret) {
    errors.push('GMAIL_CLIENT_SECRET not set in environment');
  }

  if (errors.length > 0) {
    throw new Error(`Gmail configuration invalid: ${errors.join(', ')}`);
  }

  return true;
}

/**
 * Create OAuth client with locked configuration
 */
export async function createGmailOAuthClient() {
  validateGmailConfig();

  const googleapis = await import('googleapis');
  const config = getGmailConfig();

  return new googleapis.google.auth.OAuth2(
    config.oauth.clientId,
    config.oauth.clientSecret,
    config.oauth.redirectUri
  );
}

export default gmailConfig;
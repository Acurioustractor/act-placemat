/**
 * Google OAuth Configuration
 * Supports multiple environment variable naming conventions
 */

export function getGoogleCredentials() {
  return {
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/google/callback',
    accessToken: process.env.GOOGLE_ACCESS_TOKEN,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN
  };
}

export function hasGoogleCredentials() {
  const creds = getGoogleCredentials();
  return !!(creds.clientId && creds.clientSecret);
}

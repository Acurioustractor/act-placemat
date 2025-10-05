/**
 * Xero Token Manager - Automatic token refresh and persistence
 * Prevents the fucking annoying re-authentication every time
 */

import { XeroClient } from 'xero-node';
import fs from 'fs';
import path from 'path';

class XeroTokenManager {
  constructor() {
    this.xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET,
      redirectUris: [process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback'],
      scopes: ['accounting.transactions.read', 'accounting.reports.read', 'accounting.contacts.read', 'accounting.settings.read', 'offline_access']
    });
    
    this.tokenRefreshInProgress = false;
    this.lastTokenRefresh = 0;
    this.refreshBuffer = 5 * 60 * 1000; // Refresh 5 minutes before expiry
  }

  // Update environment files with new tokens
  updateEnvFile(key, value) {
    // Update root .env file  
    const rootEnvPath = path.join(process.cwd(), '.env');
    try {
      let rootEnvContent = fs.readFileSync(rootEnvPath, 'utf8');
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(rootEnvContent)) {
        rootEnvContent = rootEnvContent.replace(regex, `${key}=${value}`);
      } else {
        rootEnvContent += `\n${key}=${value}`;
      }
      fs.writeFileSync(rootEnvPath, rootEnvContent);
    } catch (error) {
      console.warn(`Failed to update root .env: ${error.message}`);
    }
    
    // Update backend .env file
    const backendEnvPath = path.join(process.cwd(), '.env');
    try {
      let backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(backendEnvContent)) {
        backendEnvContent = backendEnvContent.replace(regex, `${key}=${value}`);
      } else {
        backendEnvContent += `\n${key}=${value}`;
      }
      fs.writeFileSync(backendEnvPath, backendEnvContent);
    } catch (error) {
      console.warn(`Failed to update backend .env: ${error.message}`);
    }
    
    // Update current process environment
    process.env[key] = value;
  }

  // Get authenticated Xero client with auto token refresh
  async getAuthenticatedClient() {
    if (!process.env.XERO_REFRESH_TOKEN || !process.env.XERO_TENANT_ID) {
      throw new Error('No Xero tokens found - authentication required');
    }

    // Check if we need to refresh tokens
    const now = Date.now();
    const needsRefresh = (now - this.lastTokenRefresh) > (50 * 60 * 1000); // Refresh every 50 minutes

    if (needsRefresh && !this.tokenRefreshInProgress) {
      await this.refreshTokens();
    }

    return this.xero;
  }

  // Refresh tokens and persist to storage
  async refreshTokens() {
    if (this.tokenRefreshInProgress) {
      // Wait for existing refresh to complete
      while (this.tokenRefreshInProgress) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.tokenRefreshInProgress = true;
    
    try {
      console.log('🔄 Refreshing Xero tokens...');
      
      const tokenSet = await this.xero.refreshWithRefreshToken(
        process.env.XERO_CLIENT_ID,
        process.env.XERO_CLIENT_SECRET,
        process.env.XERO_REFRESH_TOKEN
      );

      // Update tokens in environment and files
      this.updateEnvFile('XERO_ACCESS_TOKEN', tokenSet.access_token);
      this.updateEnvFile('XERO_REFRESH_TOKEN', tokenSet.refresh_token);
      
      // Set tokens in client
      this.xero.setTokenSet(tokenSet);
      
      this.lastTokenRefresh = Date.now();
      
      console.log('✅ Xero tokens refreshed successfully');
      
    } catch (error) {
      console.error('❌ Failed to refresh Xero tokens:', error);
      throw new Error('Token refresh failed - re-authentication required');
    } finally {
      this.tokenRefreshInProgress = false;
    }
  }

  // Check connection status
  async getConnectionStatus() {
    try {
      const hasTokens = !!(process.env.XERO_REFRESH_TOKEN && process.env.XERO_TENANT_ID);
      
      if (!hasTokens) {
        return {
          status: 'disconnected',
          message: 'Xero not connected',
          action: 'Visit /api/xero/connect to authorize'
        };
      }

      // Try to get authenticated client (this will refresh tokens if needed)
      const client = await this.getAuthenticatedClient();
      
      return {
        status: 'connected',
        tenantId: process.env.XERO_TENANT_ID,
        message: 'Xero connected and tokens valid',
        lastRefresh: new Date(this.lastTokenRefresh).toISOString()
      };

    } catch (error) {
      if (error.message.includes('authentication required')) {
        return {
          status: 'token_expired',
          message: 'Xero tokens have expired',
          action: 'Visit /api/xero/connect to re-authorize'
        };
      }
      
      throw error;
    }
  }

  // Make authenticated API call with automatic token refresh
  async makeApiCall(apiCall) {
    try {
      const client = await this.getAuthenticatedClient();
      return await apiCall(client);
    } catch (error) {
      // If it's an auth error, try refreshing once more
      if (error.response?.status === 401) {
        console.log('🔄 401 error, attempting token refresh...');
        await this.refreshTokens();
        const client = await this.getAuthenticatedClient();
        return await apiCall(client);
      }
      
      throw error;
    }
  }

  // Initialize background token refresh (call this on server start)
  startBackgroundRefresh() {
    // Refresh tokens every 45 minutes
    setInterval(() => {
      if (process.env.XERO_REFRESH_TOKEN) {
        this.refreshTokens().catch(error => {
          console.error('Background token refresh failed:', error);
        });
      }
    }, 45 * 60 * 1000);
    
    console.log('🔄 Xero background token refresh started (every 45 minutes)');
  }
}

// Export singleton instance
export default new XeroTokenManager();
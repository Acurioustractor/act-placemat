import express from 'express';
import { XeroClient } from 'xero-node';
import xeroTokenManager from '../services/xeroTokenManager.js';

const router = express.Router();

// Initialize Xero client for OAuth flow only (token manager handles authenticated calls)
const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: [process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback'],
  scopes: ['accounting.transactions.read', 'accounting.reports.read', 'accounting.contacts.read', 'accounting.settings.read', 'offline_access']
});

// Start OAuth flow
router.get('/connect', async (req, res) => {
  try {
    const consentUrl = await xero.buildConsentUrl();
    console.log('🔗 Xero OAuth URL generated');
    res.json({ 
      url: consentUrl,
      message: 'Visit this URL to authorize Xero access',
      instructions: 'After authorization, you will be redirected back automatically'
    });
  } catch (error) {
    console.error('❌ Xero OAuth URL generation failed:', error);
    res.status(500).json({ error: 'Failed to generate Xero authorization URL' });
  }
});

// Handle OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      throw new Error('No authorization code received');
    }
    
    // Exchange code for tokens
    const tokenSet = await xero.apiCallback(req.url);
    await xero.updateTenants();
    
    const tenants = xero.tenants;
    if (!tenants || tenants.length === 0) {
      throw new Error('No Xero organizations found');
    }
    
    // Use the first tenant
    const tenant = tenants[0];
    
    // Store tokens and tenant info in environment using token manager
    xeroTokenManager.updateEnvFile('XERO_REFRESH_TOKEN', tokenSet.refresh_token);
    xeroTokenManager.updateEnvFile('XERO_ACCESS_TOKEN', tokenSet.access_token);
    xeroTokenManager.updateEnvFile('XERO_TENANT_ID', tenant.tenantId);
    xeroTokenManager.updateEnvFile('XERO_DEMO_MODE', 'false');
    
    console.log('✅ Xero tokens saved successfully');
    console.log(`📊 Connected to organization: ${tenant.tenantName}`);
    
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #28a745;">✅ Xero Connected Successfully!</h1>
          <p><strong>Organization:</strong> ${tenant.tenantName}</p>
          <p><strong>Tenant ID:</strong> ${tenant.tenantId}</p>
          <p>You can now close this window. Xero financial data is now available.</p>
          <script>
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('❌ Xero OAuth callback failed:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #dc3545;">❌ Xero Connection Failed</h1>
          <p><strong>Error:</strong> ${error.message}</p>
          <p>Please try the authorization process again.</p>
          <a href="/api/xero/connect" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Retry Authorization</a>
        </body>
      </html>
    `);
  }
});

// Test connection
router.get('/test', async (req, res) => {
  try {
    if (!process.env.XERO_REFRESH_TOKEN) {
      return res.status(401).json({ 
        error: 'No Xero tokens found',
        action: 'Visit /api/xero/connect to authorize'
      });
    }
    
    // Use token manager for authenticated API call
    const result = await xeroTokenManager.makeApiCall(async (client) => {
      const response = await client.accountingApi.getOrganisations(process.env.XERO_TENANT_ID);
      return response.body.organisations[0];
    });
    
    res.json({
      status: 'connected',
      organization: result.name,
      country: result.countryCode,
      currency: result.defaultCurrency,
      subscription: result.subscriptionType,
      message: 'Xero connection test successful'
    });
    
  } catch (error) {
    console.error('❌ Xero test failed:', error);
    res.status(500).json({ 
      error: 'Xero connection test failed',
      details: error.message,
      action: 'Visit /api/xero/connect to re-authorize'
    });
  }
});

// Get connection status
router.get('/status', async (req, res) => {
  try {
    const connectionStatus = await xeroTokenManager.getConnectionStatus();
    res.json(connectionStatus);
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

export default router;
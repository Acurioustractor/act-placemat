# Xero Authentication & Security Guide

## 🚨 CURRENT STATUS
**Status:** Token Expired (401 Unauthorized)  
**Action Required:** Re-authorization needed  
**Last Refresh Attempt:** Failed (invalid refresh token)

## 🔧 IMMEDIATE FIX - RE-AUTHORIZATION

### Step 1: Re-authorize Xero Access
```bash
# Open this URL in your browser:
open "http://localhost:4000/api/xero/connect"
```

**What happens:**
1. Redirects you to Xero OAuth login
2. You'll login with your Xero credentials
3. Grant permissions to ACT platform
4. Returns to localhost with new tokens
5. Tokens automatically saved and refresh cycle restarts

### Step 2: Verify Connection
```bash
curl -s "http://localhost:4000/api/xero/status"
```

**Expected Response:**
```json
{
  "status": "connected",
  "organization": "ACT Organization Name",
  "scopes": ["accounting.contacts.read", "accounting.transactions.read", ...]
}
```

## 🔒 SECURITY RECOMMENDATIONS

### 1. Token Security Improvements
```javascript
// Current: Tokens stored in memory (lost on restart)
// Recommended: Encrypted database storage

// Add to .env:
XERO_TOKEN_ENCRYPTION_KEY=your-256-bit-key-here
XERO_WEBHOOK_SECRET=webhook-validation-secret
```

### 2. Scope Limitation
Review current permissions and limit to essential scopes:
```javascript
const REQUIRED_SCOPES = [
  'accounting.transactions.read',  // For transaction analysis
  'accounting.reports.read',       // For P&L and cash flow
  'accounting.contacts.read',      // For supplier/customer intelligence
  'offline_access'                 // For token refresh
];

// Remove if not needed:
// 'accounting.transactions.write'  // Writing transactions
// 'accounting.settings.read'       // Organization settings
```

### 3. Environment Security
```bash
# .env security checklist:
✅ XERO_CLIENT_ID=your-client-id
✅ XERO_CLIENT_SECRET=your-client-secret  
✅ XERO_REDIRECT_URI=http://localhost:4000/api/xero/callback
⚠️  XERO_WEBHOOK_SECRET=add-webhook-secret
⚠️  XERO_TOKEN_ENCRYPTION_KEY=add-encryption-key
```

### 4. Auto-Refresh Configuration
The system currently attempts refresh every 45 minutes:
```javascript
// Current settings (in xeroTokenManager.js):
REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes
TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes buffer

// Recommended: More conservative refresh
REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
TOKEN_EXPIRY_BUFFER = 10 * 60 * 1000; // 10 minutes buffer
```

## 🛡️ ENHANCED SECURITY MEASURES

### 1. IP Whitelist (for Production)
```javascript
// Add to Xero app settings:
const ALLOWED_IPS = [
  'your.server.ip.address',
  'localhost' // Remove in production
];
```

### 2. Webhook Validation
```javascript
// Validate Xero webhooks:
app.post('/api/xero/webhook', (req, res) => {
  const signature = req.headers['x-xero-signature'];
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.XERO_WEBHOOK_SECRET)
    .update(payload)
    .digest('base64');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook safely
});
```

### 3. Token Encryption at Rest
```javascript
// Encrypt tokens before database storage:
const encryptToken = (token) => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.XERO_TOKEN_ENCRYPTION_KEY);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};
```

### 4. Access Monitoring
```javascript
// Log all Xero API calls:
const xeroLogger = {
  logApiCall: (endpoint, status, duration) => {
    console.log(`Xero API: ${endpoint} - ${status} (${duration}ms)`);
    // Store in audit log
  },
  
  logTokenRefresh: (success, attempt) => {
    console.log(`Xero Token Refresh: ${success ? 'Success' : 'Failed'} (attempt ${attempt})`);
  }
};
```

## 🎯 IMMEDIATE ACTION PLAN

1. **Re-authorize now:** Visit `http://localhost:4000/api/xero/connect`
2. **Test connection:** Run financial summary endpoint
3. **Add webhook secret:** Generate and add to .env
4. **Review scopes:** Ensure minimal necessary permissions
5. **Monitor logs:** Watch for failed refresh attempts

## 🔄 ONGOING MAINTENANCE

### Daily
- [ ] Check Xero connection status in logs
- [ ] Verify token refresh is working

### Weekly  
- [ ] Review Xero API usage logs
- [ ] Check for any failed authentication attempts

### Monthly
- [ ] Rotate webhook secrets if needed
- [ ] Review and update access scopes
- [ ] Test disaster recovery (re-auth process)

This ensures your Xero integration is both functional and secure!
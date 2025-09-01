# 📧 Gmail Sync Setup Guide for ACT Community Ecosystem

This guide will help you set up intelligent Gmail synchronization that automatically detects community-relevant emails and connects them to your ACT ecosystem.

## 🎯 **What Gmail Sync Does**

### **Smart Email Detection**
- **Project Recognition**: Automatically detects emails mentioning your real projects (ANAT SPECTRA 2025, Barkly Backbone, BG Fit, etc.)
- **Community Context**: Identifies partnership inquiries, funding opportunities, collaboration requests
- **Contact Matching**: Links emails to existing Notion contacts and relationships
- **Urgency Detection**: Prioritizes time-sensitive community communications

### **Automatic Actions**
- **Contact Sync**: Gmail contacts automatically sync with Notion People database
- **Activity Logging**: All community email interactions tracked in daily habits
- **Smart Notifications**: Urgent emails trigger Slack alerts
- **Project Linking**: Emails mentioning projects get connected to relevant Notion pages

---

## 🔧 **Setup Instructions**

### **Step 1: Create Gmail API Credentials (15 minutes)**

1. **Go to Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **Create a New Project** (or select existing)
   - Project name: "ACT Community Gmail Sync"
   - Organization: Your organization

3. **Enable Gmail API**
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "ACT Community Sync"
   - Authorized redirect URIs:
     ```
     http://localhost:4000/api/gmail/auth/callback
     https://yourdomain.com/api/gmail/auth/callback
     ```

5. **Download Credentials**
   - Download the JSON file with your credentials
   - You'll need the `client_id` and `client_secret`

### **Step 2: Configure Environment Variables**

Add these to your `.env` file:

```bash
# Gmail API Configuration
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:4000/api/gmail/auth/callback

# Optional: Google Cloud Pub/Sub for real-time webhooks
GMAIL_PUBSUB_TOPIC=projects/your-project/topics/gmail-notifications
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# API Key for protected endpoints
API_KEY=your_secure_api_key_here
```

### **Step 3: Run Database Migration**

```bash
# Apply Gmail sync database tables
cd apps/backend
npm run migrate

# Or manually run the migration
psql your_database < database/migrations/2025-08-05-2000-gmail-sync-tables.sql
```

### **Step 4: Start the Application**

```bash
# Start with your bulletproof dev server
./dev.sh auto

# Or start manually
npm run dev
```

### **Step 5: Configure Gmail Sync**

1. **Visit Gmail Sync Setup**
   ```
   http://localhost:5173/gmail-sync
   ```

2. **Click "Connect Gmail"**
   - This opens Google's OAuth consent screen
   - Grant the necessary permissions:
     - Read your email messages
     - Manage your contacts
     - Send notifications

3. **Complete Authentication**
   - After granting permissions, you'll be redirected back
   - The system will automatically set up email monitoring

4. **Verify Setup**
   - Check that authentication status shows "Connected"
   - Run initial contact sync
   - Review detected smart filters

---

## 🎛️ **Configuration Options**

### **Smart Filter Customization**

The system comes pre-configured with filters based on your real ACT projects, but you can customize:

#### **Project Keywords** (Auto-detected from your Notion)
```javascript
// These are automatically loaded from your real projects
'ANAT SPECTRA', 'Barkly Backbone', 'BG Fit', 
'Black Cockatoo Valley', 'Climate Justice Innovation Lab',
'Dad.Lab', 'Designing for Obsolescence', 'Contained'
```

#### **Organization Domains** (Customize these)
```javascript
'@act.place', '@empathyledger.com', '@picc.org.au',
'@climateseed.com', '@justiceseed.com'
// Add your partner organization domains
```

#### **Subject Patterns** (Automatically detects)
- Partnership, collaboration, funding, grant
- Opportunity, proposal, letter of support
- Introduction, meeting, workshop

### **Relevance Scoring**

Emails are scored 0-100 based on:
- **Known organization domain**: +30 points
- **Project keyword match**: +25 points each
- **Subject pattern match**: +20 points
- **Context detection** (funding, partnership): +15 points
- **Existing Notion contact**: +40 points
- **Urgency indicators**: +10 points

**Threshold**: Emails scoring 25+ are considered community-relevant.

---

## 🔍 **How It Works**

### **Email Processing Flow**

1. **Real-time Detection**
   - Gmail sends webhook when new email arrives
   - System immediately processes email content

2. **Smart Analysis**
   - Extracts sender, subject, body content
   - Runs against community intelligence filters
   - Calculates relevance score and context

3. **Community Enrichment**
   - Looks up sender in Notion People database
   - Identifies mentioned projects from your real data
   - Extracts key information (amounts, dates, organizations)

4. **Automatic Actions**
   - Stores community email in database
   - Updates daily habits tracker
   - Sends Slack notifications if urgent
   - Creates contact suggestions

### **Contact Sync Process**

1. **Gmail Contacts** → **Analysis** → **Notion People**
2. **Bidirectional sync** keeps both systems updated
3. **Relationship context** preserved from Notion
4. **Email interaction history** tracked

---

## 📊 **Monitoring & Analytics**

### **Gmail Sync Dashboard**
Access at: `http://localhost:5173/gmail-sync`

**Metrics Tracked:**
- Total emails processed
- Community emails detected (relevance score ≥25)
- Contacts synced between Gmail and Notion
- Last sync timestamp

**Recent Activity:**
- Shows latest community-relevant emails
- Displays relevance scores and detected contexts
- Links to related Notion contacts and projects

### **Integration with Daily Habits**
Gmail activity automatically appears in your daily habits tracker:
- Morning data check includes overnight emails
- Community action log shows email interactions
- Real data reflection includes email insights

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Authentication Fails**
```bash
# Check credentials
echo $GMAIL_CLIENT_ID
echo $GMAIL_CLIENT_SECRET

# Verify redirect URI matches exactly
# Must include http://localhost:4000/api/gmail/auth/callback
```

#### **No Emails Detected**
```bash
# Check Gmail API quota
# Visit: https://console.cloud.google.com/apis/dashboard

# Verify filters are working
curl -H "X-API-Key: $API_KEY" http://localhost:4000/api/gmail/status
```

#### **Webhook Issues**
```bash
# For production, set up Google Cloud Pub/Sub
# For development, webhooks may not work locally
# Use manual email processing instead
```

### **Testing the Setup**

1. **Send Test Email**
   - Send yourself an email with subject: "ANAT SPECTRA Partnership Opportunity"
   - Should be detected as high-relevance community email

2. **Check Processing**
   ```bash
   # View processed emails
   curl -H "X-API-Key: $API_KEY" http://localhost:4000/api/gmail/community-emails
   ```

3. **Verify Contact Sync**
   - Add a contact in Gmail with your organization domain
   - Run contact sync from the dashboard
   - Check if contact appears in Notion People

---

## 🔐 **Security & Privacy**

### **Data Handling**
- **OAuth 2.0**: Secure authentication with Google
- **Encrypted Storage**: All tokens encrypted at rest
- **Minimal Permissions**: Only requests necessary Gmail scopes
- **Local Processing**: Email content processed locally, not sent to external services

### **Privacy Controls**
- **Consent Required**: Explicit consent for each data type
- **Retention Policy**: Email data retained for 2 years (configurable)
- **Right to Erasure**: Complete data deletion available
- **Audit Trail**: All processing actions logged

### **Access Controls**
- **API Key Protection**: All endpoints require authentication
- **Rate Limiting**: Prevents abuse of Gmail API
- **Secure Tokens**: Refresh tokens stored securely
- **CORS Protection**: Frontend access properly configured

---

## 🎯 **Next Steps After Setup**

### **Week 1: Monitor & Adjust**
- Review detected emails daily
- Adjust filters if too many/few emails detected
- Verify contact sync accuracy

### **Week 2: WhatsApp Integration**
- With Gmail working, add WhatsApp Business API
- Cross-platform contact unification
- Multi-channel notification system

### **Week 3: Advanced Intelligence**
- Email sentiment analysis
- Relationship strength scoring
- Predictive community insights

---

## 📞 **Support**

If you encounter issues:

1. **Check Logs**
   ```bash
   # Backend logs
   tail -f backend.log
   
   # Gmail sync specific logs
   grep "Gmail" backend.log
   ```

2. **Test API Endpoints**
   ```bash
   # Status check
   curl -H "X-API-Key: $API_KEY" http://localhost:4000/api/gmail/status
   
   # Manual contact sync
   curl -X POST -H "X-API-Key: $API_KEY" http://localhost:4000/api/gmail/sync-contacts
   ```

3. **Dashboard Diagnostics**
   - Visit `/gmail-sync` for visual status check
   - Green authentication = working
   - Red authentication = needs setup

Your ACT Community Ecosystem will now intelligently process every email, connecting the right people to the right projects at the right time! 🚜✨
# Dext Integration Setup Guide

## Overview

Dext (formerly Receipt Bank) is integrated into the ACT Platform's automated bookkeeping system to provide professional receipt processing, OCR data extraction, and automated expense categorisation. This integration dramatically improves bookkeeping accuracy and reduces manual data entry.

## Features

### Automated Receipt Processing
- **AI-Powered OCR**: 95% accuracy in extracting data from receipts
- **Auto-Matching**: Intelligent matching of receipts to transactions
- **Smart Categorisation**: AI-powered expense categorisation
- **Multi-Format Support**: PDF, images (PNG, JPEG), email attachments

### Workflow Integration
- **Real-time Processing**: Receipts processed as they arrive
- **Notification System**: Automated alerts for actions needed
- **Tax Compliance**: BAS preparation and tax-deductible tracking
- **Duplicate Detection**: Prevents double-entry errors

## Environment Variables

Add these variables to your `.env` file:

### Option 1: API Key Authentication (Recommended)
```bash
# Dext API Key (simpler setup)
DEXT_API_KEY=your_dext_api_key_here
DEXT_ACCOUNT_ID=your_dext_account_id
```

### Option 2: OAuth Authentication (Enterprise)
```bash
# Dext OAuth credentials
DEXT_CLIENT_ID=your_client_id
DEXT_CLIENT_SECRET=your_client_secret
DEXT_ACCOUNT_ID=your_dext_account_id
```

## Getting Dext Credentials

### 1. Sign up for Dext
- Visit [Dext.com](https://dext.com) 
- Sign up for a business account
- Complete the onboarding process

### 2. Get API Credentials
- Navigate to Settings → Integrations → API
- Generate an API key OR create OAuth app
- Copy your Account ID from the account settings

### 3. Configure Permissions
Ensure your Dext account has these permissions:
- Read receipts and invoices
- Upload new receipts
- Access processing status
- Retrieve extracted data

## API Endpoints

### Status and Health
```bash
# Check Dext connection status
GET /api/bookkeeping/dext/status

# Response
{
  "success": true,
  "dext": {
    "configured": true,
    "connected": true,
    "recentActivity": {
      "receiptsProcessed": 15,
      "lastProcessed": "2025-08-17T12:00:00Z"
    }
  },
  "recommendations": [
    "Dext integration is working correctly",
    "Receipts will be automatically processed"
  ]
}
```

### Receipt Management
```bash
# Get processed receipts from Dext
GET /api/bookkeeping/dext/receipts?days=30&limit=50

# Upload receipt to Dext
POST /api/bookkeeping/receipts/upload-to-dext
{
  "file": "<file_data>",
  "metadata": {
    "supplier": "Office Works",
    "date": "2025-08-17",
    "total": 45.50,
    "category": "Office Supplies"
  }
}

# Sync Dext receipts with bookkeeping
POST /api/bookkeeping/dext/sync
{
  "fromDate": "2025-08-01"
}
```

### Workflow Integration
```bash
# Get complete bookkeeping workflow (includes Dext step)
GET /api/bookkeeping/workflow

# Process all bookkeeping notifications (includes Dext processing)
POST /api/bookkeeping/notifications/process
```

## Testing the Integration

### 1. Test Connection
```bash
curl -s http://localhost:4000/api/bookkeeping/dext/status | jq
```

### 2. Test Workflow Status
```bash
curl -s http://localhost:4000/api/bookkeeping/workflow | jq '.workflow.steps[] | select(.name | contains("Dext"))'
```

### 3. Test Receipt Processing
```bash
curl -s -X POST http://localhost:4000/api/bookkeeping/notifications/process | jq
```

## Workflow Steps

### 1. Receipt Collection
- **Email Scanning**: Gmail searches for receipts/invoices
- **Dext Upload**: Receipts automatically sent to Dext for processing
- **OCR Processing**: Dext extracts data with 95% accuracy

### 2. Data Extraction
- **Supplier Information**: Company name, ABN, contact details
- **Transaction Details**: Amount, date, payment method
- **Line Items**: Individual purchases with quantities and prices
- **Tax Information**: GST amounts and tax-deductible status

### 3. Auto-Matching
- **Smart Algorithms**: Match receipts to existing transactions
- **Confidence Scoring**: Only auto-match high-confidence matches
- **Manual Review**: Flag uncertain matches for review

### 4. Categorisation
- **AI Classification**: Claude AI categorises expenses
- **Tax Rules**: Applies Australian tax deduction rules
- **Custom Categories**: Uses your existing category structure

### 5. Notifications
- **Auto-Match Success**: Confirms successful receipt attachment
- **Manual Review Needed**: Alerts for uncertain matches
- **Missing Receipts**: Reminds about transactions needing receipts
- **Tax Deadlines**: BAS preparation reminders

## Benefits

### Time Savings
- **80% Reduction**: In manual data entry time
- **95% Accuracy**: Eliminates typing errors
- **Automated Workflows**: Reduces repetitive tasks

### Compliance
- **BAS Preparation**: Automatic quarterly summaries
- **Audit Trail**: Complete receipt and transaction history
- **Tax Deductions**: Maximises legitimate tax claims

### Business Intelligence
- **Expense Analytics**: Spending patterns and trends
- **Supplier Insights**: Top vendors and payment analysis
- **Budget Tracking**: Real-time expense monitoring

## Troubleshooting

### Common Issues

#### 1. Connection Errors
```bash
# Error: "Dext not configured"
# Solution: Add DEXT_API_KEY and DEXT_ACCOUNT_ID to .env

# Error: "Authentication failed"
# Solution: Check API key validity and account permissions
```

#### 2. Upload Failures
```bash
# Error: "File format not supported"
# Solution: Use PDF, PNG, or JPEG files only

# Error: "File too large"
# Solution: Compress images or split multi-page PDFs
```

#### 3. Matching Issues
```bash
# Error: "No transactions found to match"
# Solution: Check date ranges and amount tolerances

# Error: "Multiple potential matches"
# Solution: Use manual matching via dashboard
```

### Debug Logs
Enable debug logging by adding:
```bash
DEBUG_DEXT=true
```

### Support Resources
- **Dext Support**: [support.dext.com](https://support.dext.com)
- **API Documentation**: [developers.dext.com](https://developers.dext.com)
- **ACT Platform Issues**: Create issue in GitHub repository

## Security Considerations

### API Key Protection
- Store keys in environment variables only
- Never commit credentials to version control
- Rotate keys regularly (quarterly recommended)
- Use least-privilege permissions

### Data Privacy
- Receipts processed in Dext cloud (UK/EU servers)
- Data encrypted in transit and at rest
- GDPR compliant data handling
- Option for data deletion on request

### Access Control
- Restrict Dext access to accounting team only
- Use role-based permissions
- Monitor API usage regularly
- Set up audit logging

## Advanced Configuration

### Custom Categories
```javascript
// Add custom expense categories
const customCategories = [
  'Community Grants',
  'Impact Measurement',
  'Stakeholder Engagement',
  'Capacity Building'
];
```

### Matching Rules
```javascript
// Adjust auto-matching sensitivity
const matchingConfig = {
  amountTolerance: 0.05, // 5% tolerance
  dateTolerance: 3,      // ±3 days
  confidenceThreshold: 0.8 // 80% minimum confidence
};
```

### Notification Settings
```javascript
// Customise notification preferences
const notificationConfig = {
  emailDigest: 'daily',        // daily, weekly, never
  slackAlerts: true,           // enable Slack notifications
  urgentThreshold: 1000,       // $1000+ transactions
  reminderFrequency: 24        // hours between reminders
};
```

## Future Enhancements

### Planned Features
- **Mobile App Integration**: Upload receipts via smartphone
- **Bank Feed Integration**: Auto-match with bank transactions  
- **Advanced Analytics**: ML-powered spending insights
- **Multi-Currency**: Support for international transactions

### API Extensions
- **Webhook Support**: Real-time processing notifications
- **Bulk Operations**: Process multiple receipts simultaneously
- **Custom Fields**: Organisation-specific data capture
- **Integration Hub**: Connect with additional accounting tools

## Success Metrics

Track these KPIs to measure Dext integration success:

### Efficiency Metrics
- **Processing Time**: Average time from receipt to booking
- **Auto-Match Rate**: Percentage of receipts matched automatically
- **Error Reduction**: Decrease in manual data entry errors

### Compliance Metrics
- **Receipt Coverage**: Percentage of transactions with receipts
- **Tax Preparation**: Time saved on BAS quarterly returns  
- **Audit Readiness**: Completeness of documentation

### Business Impact
- **Cost Savings**: Reduced bookkeeping labour costs
- **Cash Flow**: Faster expense processing and reimbursements
- **Decision Making**: Real-time expense visibility

---

*This integration positions ACT as a leader in automated community organisation management, reducing administrative overhead while maintaining the highest standards of financial transparency and compliance.*
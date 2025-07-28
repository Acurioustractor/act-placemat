# 🎯 Opportunities Database Setup Guide

## Quick Setup Checklist

### Step 1: Create Database in Notion
1. **Open Notion** and navigate to your ACT workspace
2. **Create new database** (Table view)
3. **Name it**: "Opportunities Pipeline"
4. **Copy the database ID** from URL for later

### Step 2: Add Required Fields

**IMPORTANT**: Add these fields in this exact order for best compatibility:

#### 📋 **Core Information Fields**
| Field Name | Type | Options |
|------------|------|---------|
| **Opportunity Name** | Title | (default field) |
| **Description** | Rich Text | - |
| **Stage** | Select | Discovery, Qualification, Proposal, Negotiation, Closed Won, Closed Lost |
| **Type** | Select | Grant, Contract, Partnership, Investment, License, Donation |

#### 💰 **Financial Fields**
| Field Name | Type | Options |
|------------|------|---------|
| **Revenue Amount** | Number | Format: Currency (AUD) |
| **Probability** | Select | 10%, 25%, 50%, 75%, 90%, 100% |
| **Budget Required** | Number | Format: Currency (AUD) |
| **ROI Projection** | Number | Format: Percentage |

#### 📅 **Timeline Fields**
| Field Name | Type | Options |
|------------|------|---------|
| **Application Date** | Date | - |
| **Deadline** | Date | - |
| **Expected Decision Date** | Date | - |
| **Next Action Date** | Date | - |

#### 📝 **Action & Requirements**
| Field Name | Type | Options |
|------------|------|---------|
| **Next Action** | Rich Text | - |
| **Requirements** | Rich Text | - |
| **Eligibility Criteria** | Rich Text | - |
| **Notes** | Rich Text | - |

#### 🔗 **Relationship Fields** (Add these after creating other databases)
| Field Name | Type | Relation To |
|------------|------|-------------|
| **Primary Contact** | Relation | People database |
| **Organization** | Relation | Organizations database |
| **Related Projects** | Relation | Projects database |

#### 📊 **Status & Analytics**
| Field Name | Type | Options |
|------------|------|---------|
| **Application Status** | Select | Not Started, In Progress, Submitted, Under Review |
| **Risk Assessment** | Select | Low, Medium, High |
| **Strategic Fit** | Select | Perfect, Good, Fair, Poor |

### Step 3: Add Sample Data

Add these 3 sample opportunities to test the system:

#### **Opportunity 1: Ford Foundation Climate Justice Grant**
- **Stage**: Proposal
- **Type**: Grant
- **Revenue Amount**: $150,000
- **Probability**: 75%
- **Deadline**: 2025-08-15
- **Next Action**: Submit final proposal with community impact metrics
- **Application Status**: In Progress
- **Strategic Fit**: Perfect

#### **Opportunity 2: Microsoft AI for Good Partnership**
- **Stage**: Negotiation
- **Type**: Partnership
- **Revenue Amount**: $80,000
- **Probability**: 90%
- **Deadline**: 2025-07-27
- **Next Action**: Finalize partnership terms and deliverables
- **Application Status**: Submitted
- **Strategic Fit**: Good

#### **Opportunity 3: Queensland Innovation Grant**
- **Stage**: Discovery
- **Type**: Grant
- **Revenue Amount**: $50,000
- **Probability**: 50%
- **Deadline**: 2025-09-30
- **Next Action**: Research eligibility requirements
- **Application Status**: Not Started
- **Strategic Fit**: Good

### Step 4: Share Database with Integration
1. **Click "Share"** button in top-right of database
2. **Add integration**: Search for "ACT Placemat Integration"
3. **Grant access**: Give "Full access" permissions

### Step 5: Update Environment Variables
1. **Copy database ID** from URL: `notion.so/workspace/DATABASE_ID?v=view_id`
2. **Add to .env file**:
   ```env
   NOTION_OPPORTUNITIES_DB=your_opportunities_database_id_here
   ```

### Step 6: Test Integration
```bash
# Restart the server to pick up new environment variable
npm start

# Test the integration
node test-complete-system.js
```

### Expected Results After Setup
- ✅ Opportunities database configured
- ✅ Real opportunities data in system
- ✅ Pipeline value calculations working
- ✅ Deadline alerts functioning
- ✅ Project-opportunity relationships ready

---

## 🚀 Advanced Features (Once Basic Setup Complete)

### Formula Fields
Add these calculated fields for advanced analytics:

1. **Weighted Revenue** (Formula):
   ```
   prop("Revenue Amount") * (toNumber(prop("Probability")) / 100)
   ```

2. **Days to Deadline** (Formula):
   ```
   dateBetween(prop("Deadline"), now(), "days")
   ```

3. **Time in Stage** (Formula):
   ```
   dateBetween(prop("Last edited time"), now(), "days")
   ```

### Views for Different Perspectives

1. **Pipeline Overview**: Group by Stage, Sort by Revenue Amount
2. **Urgent Actions**: Filter by Next Action Date < 7 days
3. **High Value**: Filter by Revenue Amount > $50,000
4. **Closing Soon**: Filter by Deadline < 30 days

---

## 🛠️ Troubleshooting

### "Database not found" Error
- ✅ Check database is shared with integration
- ✅ Verify database ID is correct in .env
- ✅ Restart server after updating .env

### Empty Data in System
- ✅ Add at least one opportunity record
- ✅ Check field names match exactly
- ✅ Verify probability field uses percentage format

### Integration Test Fails
- ✅ Run `node debug-notion.js` for detailed diagnostics
- ✅ Check server logs for API errors
- ✅ Verify Notion token has not expired

---

## 📈 Expected Impact

Once the Opportunities database is configured, you'll unlock:

- **Real pipeline tracking** instead of mock data
- **Automated deadline alerts** for all opportunities
- **Revenue forecasting** with probability weighting
- **Project-opportunity mapping** for grant applications
- **Performance analytics** on win rates and cycle times

The system will transform from a project tracker to a complete business development platform! 
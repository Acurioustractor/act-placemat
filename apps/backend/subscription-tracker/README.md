# ACT Subscription Tracker

**R&D Project**: AI-Powered Subscription Discovery System
**Status**: Phase 1 Development
**R&D Potential**: $50K-150K annual tax offset (43.5% AusIndustry refund)

---

## Overview

Custom subscription tracker built for ACT that:
- 🔍 Discovers subscriptions by scanning Gmail receipts + analyzing Xero recurring transactions
- 🤖 Extracts metadata using AI (OCR for PDFs, NER for amounts/dates/vendors)
- 📊 Tracks in dashboard with cancellation recommendations ($1K-3K/year savings)
- 📝 Documents R&D for AusIndustry tax claims (hypothesis-driven development)
- 🌍 Open-sources on GitHub for JusticeHub community ($20K/year royalty potential)

---

## Quick Start

### 1. Install Dependencies

```bash
# Node.js dependencies
npm install

# Python AI environment
cd services/ai
python3 -m venv venv
source venv/bin/activate
pip install pytesseract pdf2image transformers torch pillow
```

### 2. Configure Environment

Add to `/apps/backend/.env`:

```ini
# === SUBSCRIPTION TRACKER ===
NOTION_RD_DATABASE_ID=...          # Notion R&D tracking database
PYTHON_PATH=/usr/bin/python3       # Python interpreter path
OCR_CONFIDENCE_THRESHOLD=0.75      # Minimum OCR confidence
NER_MODEL=dslim/bert-base-NER      # HuggingFace NER model
SUBSCRIPTION_CACHE_TTL=86400       # Cache TTL (24h in seconds)
```

### 3. Run Database Migration

```bash
cd /apps/backend
npx supabase db push --file subscription-tracker/migrations/20260101000000_subscription_tracker.sql
```

### 4. Test Discovery

```bash
curl -X POST "http://localhost:4000/api/v1/subscriptions/discover?tenantId=YOUR_TENANT_ID"
```

---

## Architecture

```
subscription-tracker/
├── services/
│   ├── gmail/          # Gmail API email scanning
│   ├── xero/           # Xero recurring pattern detection
│   ├── ai/             # Python OCR + NER extraction
│   ├── discovery/      # Multi-signal aggregation
│   └── notion/         # R&D hypothesis tracking
├── routes/             # Express V1 API endpoints
├── models/             # Data models
├── utils/              # Helper functions
└── tests/              # Unit + integration tests
```

---

## R&D Documentation

### Hypothesis-Driven Development

Every component includes R&D metadata for AusIndustry compliance:

- **Hypothesis**: What technical uncertainty we're resolving
- **Methodology**: How we're testing the hypothesis
- **Success Metric**: Quantifiable target (e.g., 80% accuracy)
- **Findings**: Results after implementation

### Example R&D Components

**Gmail Receipt Scanner**
- Hypothesis: Multi-keyword search achieves 80%+ recall on subscription emails
- Target: 80% recall, 90% precision

**Xero Transaction Analyzer**
- Hypothesis: Temporal + amount analysis identifies 85%+ recurring subscriptions
- Target: 85% precision, 75% recall

**Subscription Discovery Engine**
- Hypothesis: Multi-signal fusion achieves 90%+ accuracy vs 70% single-source
- Target: F1 >= 0.87

---

## API Endpoints

**Base Path**: `/api/v1/subscriptions`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/discover` | Trigger subscription discovery scan |
| GET | `/` | List discovered subscriptions (paginated) |
| GET | `/:id` | Get single subscription detail |
| PATCH | `/:id` | Update subscription status/notes |
| GET | `/analytics/savings` | Calculate potential savings |

**Example Response**:

```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "uuid",
        "vendor": "Netflix",
        "amount": 19.99,
        "frequency": "monthly",
        "confidence": 0.92,
        "signals": {
          "gmail": 0.85,
          "xero": 0.95,
          "ai": 0.80
        }
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 45,
      "hasMore": true
    }
  }
}
```

---

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests
npm test
```

---

## R&D Claim Potential

**Phase 1 (3-5 days)**:
- Dev Time: ~40 hours @ $150/hr = $6,000
- Infrastructure: $500
- **Total**: $6,500
- **43.5% Offset**: $2,827.50

**Full Year**:
- Total R&D eligible: $50K-150K
- Tax refund: $21,750 - $65,250

---

## Open Source Strategy

**Repository**: `act-regenerative-studio/subscription-tracker`

**Monetization**:
- JusticeHub Add-On: $10/month per user
- 20% royalty on paid plans
- Target: 100 users = $12K/year revenue

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Discovery Recall | >= 80% |
| Discovery Precision | >= 90% |
| OCR Accuracy | >= 75% |
| NER Extraction | >= 80% |
| Processing Time | <= 30s |
| Admin Time Saved | 40-60% |
| Cost Savings | $1K-3K/yr |

---

## License

MIT - Built by ACT for the JusticeHub community

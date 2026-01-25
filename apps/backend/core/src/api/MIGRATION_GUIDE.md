# API Migration Guide
**Migrate from legacy endpoints to v1 standardized API**

---

## Quick Reference

| Legacy Endpoint | New Endpoint | Action Required |
|-----------------|--------------|-----------------|
| `/api/contact-intelligence/contacts` | `/api/v1/contacts/all` | Update URL |
| `/api/contact-intelligence/flag` | `/api/v1/contacts/flag` | Update URL |
| `/api/contact-intelligence/campaigns` | `/api/v1/contacts/campaigns` | Update URL |
| `/api/contact-intelligence/bulk-enrich` | `/api/v1/contacts/bulk-enrich` | Update URL |
| `/api/unified-intelligence/recommendations` | `/api/v1/intelligence/recommendations` | Update URL |
| `/api/bookkeeping/transactions` | `/api/v1/financial/transactions` | Update URL |

---

## Contact Endpoints

### Listing Contacts

**Old:**
```bash
GET /api/contact-intelligence/contacts?tier=high
```

**New:**
```bash
GET /api/v1/contacts/all?engagement_priority=high
```

**Response changes:**
```json
// Old
{ "success": true, "contacts": [...] }

// New
{ "success": true, "contacts": [...], "pagination": {...} }
```

### Flagging Contacts

**Old:**
```bash
POST /api/contact-intelligence/flag
{"person_id": "xxx", "priority_level": "high"}
```

**New:**
```bash
POST /api/v1/contacts/flag
{"person_id": "xxx", "priority_level": "high"}
```

### Campaign Management

**Old:**
```bash
GET /api/contact-intelligence/campaigns
POST /api/contact-intelligence/campaigns
POST /api/contact-intelligence/campaigns/:id/assign
```

**New:**
```bash
GET /api/v1/contacts/campaigns
POST /api/v1/contacts/campaigns
POST /api/v1/contacts/campaigns/:id/assign
```

---

## Financial Endpoints

### Transaction Sync

**Old:**
```bash
POST /api/bookkeeping/transactions/sync
```

**New:**
```bash
POST /api/v1/financial/transactions/sync
```

### Transaction List

**Old:**
```bash
GET /api/bookkeeping/transactions?limit=50
```

**New:**
```bash
GET /api/v1/financial/transactions?limit=50
```

### Financial Reports

**Old:**
```bash
GET /api/bookkeeping/reports/summary
```

**New:**
```bash
GET /api/v1/financial/reports/summary
```

---

## Intelligence Endpoints

### Recommendations

**Old:**
```bash
GET /api/unified-intelligence/recommendations
```

**New:**
```bash
GET /api/v1/intelligence/recommendations
```

---

## Deprecation Timeline

| Date | Action |
|------|--------|
| Week 1-2 | Legacy endpoints return `X-Deprecated` header |
| Week 3-4 | Legacy endpoints return 301 redirect to v1 |
| Month 2 | Legacy endpoints return 410 Gone |
| Month 3 | Legacy adapter removed |

---

## Backward Compatibility

During the transition period (Weeks 1-4), legacy endpoints will:
1. Include `X-Deprecated` header with migration guidance
2. Optionally redirect (301) to new endpoints
3. Continue to function for existing clients

Example response from legacy endpoint during transition:
```json
{
  "success": true,
  "data": [...],
  "_deprecated": {
    "message": "This endpoint will be removed",
    "new_url": "/api/v1/contacts/all",
    "sunset_date": "2026-03-01"
  }
}
```

---

## Client Migration Checklist

- [ ] Replace `/api/contact-intelligence` with `/api/v1/contacts`
- [ ] Replace `/api/bookkeeping` with `/api/v1/financial`
- [ ] Replace `/api/unified-intelligence` with `/api/v1/intelligence`
- [ ] Update response parsing for new pagination format
- [ ] Remove handling of `X-Deprecated` headers after migration
- [ ] Test all endpoints with new API base URL

---

## Support

Questions? Contact the platform team or check the full audit report at:
`/api/API_AUDIT_REPORT.md`

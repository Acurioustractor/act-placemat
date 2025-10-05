# ACT Platform - Integration Registry Overview

*Generated on: 2025-08-28T09:55:40.496Z*

## 📊 Statistics

- **Total Integrations**: 8
- **Active**: 6
- **Unhealthy**: 2
- **Health Rate**: 75%

### By Type

- **Database**: 1
- **Graph Database**: 1
- **Cache**: 1
- **Rest Api**: 4
- **Internal Service**: 3

### By Owner

- **Data Team**: 3
- **Intelligence Team**: 3
- **AI Team**: 1
- **Platform Team**: 1
- **Content Team**: 1
- **Finance Team**: 1
- **Compliance Team**: 1

## 🔌 All Integrations

| Name | Type | Status | Owner | Data Flow |
|------|------|--------|-------|----------|
| [PostgreSQL Database](postgres.md) | database | ✅ active | Data Team | bidirectional |
| [Redis Cache](redis.md) | cache | ✅ active | Platform Team | bidirectional |
| [Neo4j Knowledge Graph](neo4j.md) | graph-database | ✅ active | AI Team | bidirectional |
| [Gmail API](gmail-api.md) | rest-api | ✅ active | Intelligence Team | source |
| [LinkedIn API](linkedin-api.md) | rest-api | ✅ active | Intelligence Team | source |
| [Notion API](notion-api.md) | rest-api | ✅ active | Content Team | bidirectional |
| [Xero API](xero-api.md) | rest-api | ✅ active | Finance Team | source |
| [Compliance Service](compliance-service.md) | internal-service | ✅ active | Compliance Team | bidirectional |

## 🔗 Quick Links

### Data Sources
- [PostgreSQL Database](postgres.md) - Primary database for structured data with field-level encryption
- [Redis Cache](redis.md) - In-memory cache and session storage
- [Neo4j Knowledge Graph](neo4j.md) - Graph database for relationship and knowledge management

### External APIs
- [Gmail API](gmail-api.md) - Google Gmail API for email intelligence and sync
- [LinkedIn API](linkedin-api.md) - LinkedIn API for professional relationship intelligence
- [Notion API](notion-api.md) - Notion API for content management and project sync
- [Xero API](xero-api.md) - Xero accounting API for financial data integration

### Internal Services
- [Compliance Service](compliance-service.md) - Internal compliance monitoring and audit service

## 🔍 Monitoring & Health Checks

All integrations are continuously monitored through:

- **Health Checks**: Automated health checks run every 5 minutes
- **Status Monitoring**: Real-time status tracking and alerting
- **Performance Metrics**: Response time and error rate monitoring
- **API Dashboard**: [Integration Registry API](/api/integration-registry)

### API Endpoints

- `GET /api/integration-registry` - Integration overview and stats
- `GET /api/integration-registry/:key` - Detailed integration info
- `POST /api/integration-registry/health-check` - Run health checks
- `GET /api/integration-registry/export/documentation` - Export documentation

---

*This documentation is automatically generated from the Integration Registry.*
*For integration standards and development guidelines, see [INTEGRATION_STANDARDS.md](../INTEGRATION_STANDARDS.md)*

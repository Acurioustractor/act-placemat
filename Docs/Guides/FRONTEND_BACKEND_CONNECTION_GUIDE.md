# ACT Placemat Frontend-Backend Connection Guide

## Overview
This document provides a comprehensive guide to the robust frontend-backend connection system implemented for the ACT Placemat application.

## Architecture

### Backend (Node.js + Express)
- **Port**: 5001 (configurable via PORT env var)
- **Main Server**: `server.js`
- **Core Components**:
  - Express server with CORS enabled
  - Notion API proxy endpoints
  - Configuration management
  - Health monitoring
  - Error handling with retry logic

### Frontend (React + TypeScript + Vite)
- **Port**: 5173 (Vite default, auto-increments if busy)
- **Main App**: `client/src/App.tsx`
- **Core Components**:
  - React Query for data fetching
  - Service layer architecture
  - Smart data service with fallbacks
  - Connection status monitoring
  - TypeScript for type safety

## Key Components

### 1. Configuration Service (`client/src/services/configService.ts`)
```typescript
// Fetches backend configuration and database IDs
const config = await configService.getConfig();
const healthStatus = await configService.getHealthStatus();
```

### 2. Smart Data Service (`client/src/services/smartDataService.ts`)
```typescript
// Intelligent data fetching with fallbacks
- Notion API (primary)
- Cache (fallback 1)
- Mock data (fallback 2)
```

### 3. Connection Monitoring (`client/src/components/ui/ConnectionStatus.tsx`)
```typescript
// Real-time connection status display
<ConnectionStatus compact={false} />
```

### 4. API Service (`client/src/services/api.ts`)
```typescript
// Base HTTP client with error handling
const data = await apiService.post('/notion/query', payload);
```

## API Endpoints

### Health & Configuration
- `GET /api/health` - Server health status
- `GET /api/config` - Database configuration
- `GET /api/debug/projects` - Project data test
- `GET /api/debug/frontend-flow` - End-to-end test

### Data Endpoints
- `POST /api/notion/query` - Query Notion databases

## Connection Flow

### 1. Application Startup
```
1. Frontend loads -> React Query initializes
2. ConfigService fetches /api/config
3. HealthService monitors /api/health
4. Connection status updates in real-time
```

### 2. Data Fetching
```
1. Component requests data via hooks
2. ProjectService gets database ID from config
3. SmartDataService handles request with fallbacks
4. API service makes HTTP request to backend
5. Backend proxies to Notion API
6. Response transformed and cached
```

### 3. Error Handling
```
1. Notion API fails -> Use stale cache
2. Cache empty -> Use mock data
3. All fail -> Show error state with retry
```

## Environment Configuration

### Backend (.env)
```bash
# Required
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_projects_database_id

# Optional
PORT=5001
NODE_ENV=development
NOTION_API_VERSION=2022-06-28

# Additional databases
NOTION_OPPORTUNITIES_DB=opportunity_database_id
NOTION_ORGANIZATIONS_DB=organization_database_id
NOTION_PEOPLE_DB=people_database_id
NOTION_ARTIFACTS_DB=artifacts_database_id
```

### Frontend (client/.env)
```bash
# API base URL (optional, defaults to localhost:5001)
VITE_API_BASE_URL=http://localhost:5001/api
```

## Development Workflow

### 1. Setup
```bash
# Run the automated setup script
./setup-development.sh

# Or manual setup:
npm install
cd client && npm install
```

### 2. Start Development
```bash
# Start both backend and frontend
npm run dev

# Or separately:
npm run dev:server  # Backend only
npm run dev:client  # Frontend only
```

### 3. Test Connection
```bash
# Test connection health
./test-connection.sh

# Or manual testing:
curl http://localhost:5001/api/health
curl http://localhost:5001/api/config
```

## Troubleshooting

### Common Issues

#### 1. "EADDRINUSE: address already in use"
```bash
# Kill processes on port 5001
lsof -ti:5001 | xargs kill -9
```

#### 2. "Cannot resolve module '../constants'"
- Constants file was missing, now created at `client/src/constants/index.ts`

#### 3. "Notion API error: 401"
- Check NOTION_TOKEN in .env
- Verify token has correct permissions

#### 4. "Database ID not configured"
- Check NOTION_DATABASE_ID in .env
- Verify database exists and token has access

#### 5. Frontend build errors
```bash
cd client
npm run type-check  # Check TypeScript errors
npm run lint        # Check linting issues
```

### Debug Endpoints

#### Backend Debug
```bash
# Test project data flow
curl http://localhost:5001/api/debug/projects

# Test full frontend simulation
curl http://localhost:5001/api/debug/frontend-flow
```

#### Frontend Debug
- Open browser dev tools
- Check Network tab for API calls
- Look for service worker or CORS issues
- Check Console for JavaScript errors

## Performance Optimizations

### 1. Caching Strategy
- React Query: 5-minute stale time, 10-minute cache time
- Smart Data Service: In-memory cache with TTL
- Notion API: Pagination and batch requests

### 2. Error Recovery
- Retry logic with exponential backoff
- Graceful degradation to mock data
- User-friendly error messages

### 3. Real-time Updates
- Health monitoring every 30 seconds
- Connection status updates
- Automatic retry on reconnection

## Security Considerations

### 1. API Keys
- Notion token stored in backend only
- No sensitive data in frontend
- Environment variables for configuration

### 2. CORS
- Configured for development and production
- Restricted origins in production

### 3. Input Validation
- Request body validation
- Parameter sanitization
- Error message sanitization

## Monitoring & Logging

### 1. Backend Logging
- Request/response logging
- Error tracking with context
- Performance metrics

### 2. Frontend Monitoring
- Connection status tracking
- API call success/failure rates
- User interaction analytics

## Production Deployment

### 1. Environment Variables
```bash
# Production backend
NODE_ENV=production
PORT=80
NOTION_TOKEN=prod_token
NOTION_DATABASE_ID=prod_database_id

# Production frontend
VITE_API_BASE_URL=https://api.yourdomain.com
```

### 2. Build Process
```bash
# Build frontend
cd client && npm run build

# Serve static files from backend
# (Express configured to serve client/dist)
```

### 3. Health Checks
- Backend: `/api/health`
- Frontend: Connection status component
- Monitoring: Real-time status dashboard

## Future Enhancements

### 1. Advanced Features
- WebSocket connections for real-time updates
- Offline support with service workers
- Advanced caching strategies
- Rate limiting and throttling

### 2. Monitoring
- APM integration (New Relic, DataDog)
- Error reporting (Sentry)
- Performance monitoring
- User analytics

### 3. Developer Experience
- Hot reload improvements
- Better error messages
- Development dashboard
- Automated testing

## Support

### Getting Help
1. Check this documentation first
2. Review error logs in browser console
3. Check backend logs in terminal
4. Run connection tests
5. Create GitHub issue with details

### Reporting Issues
Include:
- Environment details (Node.js version, OS)
- Error messages and stack traces
- Steps to reproduce
- Expected vs actual behavior
- Configuration (without sensitive data)
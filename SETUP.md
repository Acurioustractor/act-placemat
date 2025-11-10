# ACT Placemat - Complete Setup Guide

This guide walks you through setting up the complete ACT Placemat application stack.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    ACT Placemat                          │
│              Analytics Intelligence Center               │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │   React Frontend    │  ← This Repository
        │   Port: 5173 (dev)  │
        └──────────┬──────────┘
                   │
                   │ HTTP/REST
                   │
        ┌──────────┴──────────┐
        │   Express Backend   │  ← Backend Repository (see below)
        │   Port: 5001        │
        └──────────┬──────────┘
                   │
                   │ REST API
                   │
        ┌──────────┴──────────┐
        │   Notion Database   │  ← Primary Data Source
        │   (5 databases)     │
        └─────────────────────┘
```

## Prerequisites

- **Node.js**: v18+ recommended
- **npm**: v9+
- **Notion Account**: With API access
- **Backend Repository**: Location TBD (see Backend Setup section)

## Frontend Setup (This Repository)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory (optional - has sensible defaults):

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5001/api

# Optional: Override in production
# VITE_API_BASE_URL=https://your-production-api.com/api
```

**Note**: If not set, defaults to `http://localhost:5001/api`

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Building
npm run build            # Build for production
npm run preview          # Preview production build locally

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format code with Prettier
npm run type-check       # Run TypeScript type checking

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:ui          # Run tests with UI
```

## Backend Setup

### Backend Repository Location

**⚠️ TODO**: Document backend repository location

The backend is a separate Express.js application that:
- Handles Notion API integration
- Provides REST endpoints for the frontend
- Manages authentication and authorization (if applicable)
- Runs on port 5001 by default

### Expected Backend Endpoints

The frontend expects the following API endpoints:

```
GET  /api/health                 # Health check
GET  /api/config                 # Configuration (database IDs, status)
POST /api/notion/query           # Query Notion databases
GET  /api/artifacts              # Fetch artifacts
```

### Backend Environment Variables

The backend should be configured with:

```env
NOTION_API_KEY=secret_xxxxx...
NOTION_PROJECTS_DB=177ebcf981cf80dd9514f1ec32f3314c
NOTION_OPPORTUNITIES_DB=234ebcf981cf804e873ff352f03c36da
NOTION_ORGANIZATIONS_DB=<database-id>
NOTION_PEOPLE_DB=<database-id>
NOTION_ARTIFACTS_DB=<database-id>
PORT=5001
```

## Notion Setup

### Required Databases

The application requires 5 Notion databases:

1. **Projects Database**
   - ID: `177ebcf981cf80dd9514f1ec32f3314c`
   - Properties: Name, Description, Status, Theme, Location, Revenue Actual/Potential, etc.

2. **Opportunities Database**
   - ID: `234ebcf981cf804e873ff352f03c36da`
   - Properties: Name, Amount, Stage, Probability, Organisation, etc.

3. **Organizations Database**
   - Properties: Name, Type, Status, Relationship Status, etc.

4. **People Database**
   - Properties: Full Name, Email, Mobile, Company, Source, etc.

5. **Artifacts Database**
   - Properties: Name, Type, Format, Status, Purpose, Access Level, etc.

### Notion Integration Setup

1. Go to https://www.notion.so/my-integrations
2. Create a new integration
3. Copy the Internal Integration Token (starts with `secret_`)
4. Share each database with your integration
5. Add the token to your backend `.env` file

## Webflow Integration (Optional)

### Current Status

**⚠️ TODO**: Document existing Webflow functions

The application has Webflow integration capabilities. If you're using Webflow:

1. **Webflow API Token**: Obtain from Webflow account settings
2. **Webflow Site ID**: Find in your Webflow site settings
3. **Backend Configuration**: Add Webflow credentials to backend
4. **Frontend Integration**: Webflow service layer (to be documented)

### Webflow Functions Location

If Webflow functions exist in the backend, document:
- Endpoints available
- Data synchronization patterns
- Webhook setup (if any)

## Development Workflow

### Full Stack Development

1. Start backend server (port 5001)
2. Start frontend dev server (port 5173)
3. Make changes with hot reload enabled
4. Test with Notion real data or cached data

### Working with Data

**Caching**:
- Cache is enabled by default (30-minute TTL)
- Clear cache via browser console: `smartDataService.clearCache()`
- Cache clears automatically on page refresh

**Data Sources**:
1. Primary: Live Notion API
2. Fallback: Cached data (if Notion unavailable)
3. Last Resort: Empty array (mock data disabled by default)

### Logging

The application uses environment-aware logging:

**Development Mode** (npm run dev):
- All logs visible (debug, info, warn, error)
- Helpful for troubleshooting

**Production Mode** (npm run build):
- Only warnings and errors logged
- Reduced console noise

To customize logging:
```typescript
import { logger, apiLogger, cacheLogger, dataLogger } from './utils/logger';

logger.debug('Debug message');     // Development only
logger.info('Info message');       // Development only
logger.warn('Warning');            // Always logged
logger.error('Error');             // Always logged
```

## Deployment

### Frontend Deployment

**Recommended Platforms**:
- Vercel (recommended for Vite)
- Netlify
- AWS Amplify
- Cloudflare Pages

**Build Command**: `npm run build`
**Output Directory**: `dist`

**Environment Variables**:
```
VITE_API_BASE_URL=https://your-production-api.com/api
```

### Backend Deployment

Document backend deployment process separately (backend repository).

**Requirements**:
- Node.js runtime
- Environment variables configured
- Notion API access
- CORS configured for frontend domain

## Troubleshooting

### Frontend Issues

**Problem**: "Cannot connect to backend"
- **Solution**: Ensure backend is running on port 5001
- Check `VITE_API_BASE_URL` configuration
- Verify CORS is enabled on backend

**Problem**: "No data loading"
- **Solution**: Check Notion API configuration in backend
- Verify database IDs are correct
- Check browser console for errors
- Try clearing cache: `smartDataService.clearCache()`

**Problem**: "ESLint not working"
- **Solution**: Run `npm install` to ensure all dependencies installed
- Check `eslint.config.js` is present

**Problem**: TypeScript errors
- **Solution**: Run `npm run type-check` to see all errors
- Ensure all dependencies are installed
- Check `tsconfig.json` is correctly configured

### Backend Issues

**Problem**: "Notion API authentication failed"
- **Solution**: Verify `NOTION_API_KEY` is set correctly
- Ensure integration is shared with all databases
- Check token hasn't expired

**Problem**: "Database not found"
- **Solution**: Verify database IDs in backend environment
- Ensure integration has access to databases

### Common Development Issues

**Problem**: Hot reload not working
- **Solution**: Restart Vite dev server
- Check file watchers aren't exceeded (Linux: `fs.inotify.max_user_watches`)

**Problem**: Build fails
- **Solution**: Run `npm run type-check` first
- Fix TypeScript errors
- Ensure all imports are correct

## Project Structure

```
/home/user/act-placemat/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Basic UI (Card, Button, Modal, etc.)
│   │   ├── charts/        # Data visualizations
│   │   ├── layout/        # Layout components (Header, Sidebar, Footer)
│   │   ├── forms/         # Form components
│   │   └── ...
│   ├── pages/             # Page components (Dashboard, Projects, Analytics, etc.)
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services and data layer
│   │   ├── apiService.ts        # Base HTTP client
│   │   ├── smartDataService.ts  # Intelligent data fetching
│   │   ├── projectService.ts    # Projects API
│   │   ├── opportunityService.ts
│   │   └── ...
│   ├── types/             # TypeScript definitions
│   │   ├── models.ts      # Data models
│   │   ├── enums.ts       # Enumerations
│   │   └── ...
│   ├── utils/             # Utility functions
│   │   ├── logger.ts      # Logging utility
│   │   ├── formatting.ts  # Data formatting
│   │   └── ...
│   ├── constants/         # Application constants
│   └── styles/            # Global styles
├── public/                # Static assets
├── README.md              # Quick start guide
├── SETUP.md               # This file - comprehensive setup
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript 5.8** - Type safety
- **Vite 7** - Build tool and dev server
- **React Query 5** - Server state management
- **React Router 7** - Navigation
- **Tailwind CSS 4** - Styling
- **Nivo + Recharts** - Data visualization
- **Framer Motion** - Animations
- **Vitest** - Testing framework

### Backend
- **Express.js** - API framework
- **Notion SDK** - Notion API client
- (Document other backend technologies)

### Data Storage
- **Notion** - Primary database (5 databases)

## Security Notes

- **API Keys**: Never commit `.env` files to Git
- **CORS**: Backend should validate origin
- **Input Validation**: Backend validates all inputs
- **Rate Limiting**: Consider implementing on backend
- **Authentication**: Add if deploying publicly

## Contributing

### Code Style
- Run `npm run lint:fix` before committing
- Follow TypeScript best practices
- Use provided logger instead of console.log
- Write meaningful commit messages

### Testing
- Write tests for new features
- Run `npm test` before committing
- Aim for >60% code coverage

## Support & Documentation

- **Frontend Repo**: This repository
- **Backend Repo**: [TODO: Add link]
- **Notion Documentation**: https://developers.notion.com
- **React Query Docs**: https://tanstack.com/query/latest
- **Vite Docs**: https://vitejs.dev

## Next Steps

After setup:

1. ✅ Verify frontend loads at `http://localhost:5173`
2. ✅ Verify backend responds at `http://localhost:5001/api/health`
3. ✅ Check data loads on dashboard
4. ✅ Test navigation between pages
5. ✅ Try filtering and searching
6. 📝 Set up Webflow integration (if needed)
7. 📝 Configure deployment pipeline
8. 📝 Add authentication (if needed)

## Questions?

If you encounter issues not covered here:
1. Check browser console for errors
2. Check backend logs
3. Verify Notion database access
4. Review this SETUP.md for missed steps
5. Create an issue in the repository

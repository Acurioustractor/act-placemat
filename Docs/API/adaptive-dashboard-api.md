# Adaptive Dashboard API Documentation

## Overview

The Adaptive Dashboard API provides comprehensive functionality for managing personalized, role-based dashboards with AI-powered recommendations and user preference learning.

## Table of Contents

- [Authentication](#authentication)
- [Configuration Endpoints](#configuration-endpoints)
- [Widget Management](#widget-management)
- [User Preferences](#user-preferences)
- [Analytics & Tracking](#analytics--tracking)
- [Recommendations](#recommendations)
- [Performance Monitoring](#performance-monitoring)
- [Error Handling](#error-handling)
- [Component API Reference](#component-api-reference)

## Authentication

All dashboard API endpoints require authentication via JWT token in the Authorization header.

```http
Authorization: Bearer <jwt-token>
```

### Optional Authentication

Some endpoints support optional authentication for demo/guest experiences:

- Without auth: Returns default configuration
- With auth: Returns personalized configuration

## Configuration Endpoints

### Get Dashboard Configuration

Retrieves the user's dashboard configuration including layout, theme, widgets, and role-based features.

```http
GET /api/adaptive-dashboard/config
```

**Response:**
```json
{
  "success": true,
  "config": {
    "layout": "grid",
    "theme": "light",
    "density": "comfortable",
    "widgets": [
      {
        "id": "overview",
        "type": "overview",
        "position": { "x": 0, "y": 0, "w": 12, "h": 4 },
        "enabled": true,
        "settings": {}
      }
    ],
    "roleBasedFeatures": {
      "canManageProjects": true,
      "canViewFinancials": false,
      "canAccessAnalytics": true,
      "canManageUsers": false
    }
  },
  "userId": "user-123",
  "lastUpdated": "2025-08-20T01:30:00.000Z"
}
```

### Save Dashboard Configuration

Saves the user's dashboard configuration with validation and optimization.

```http
POST /api/adaptive-dashboard/config
```

**Request Body:**
```json
{
  "config": {
    "layout": "grid",
    "theme": "dark",
    "density": "compact",
    "widgets": [...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "config": { ... },
  "optimizations": [
    "Removed duplicate widgets",
    "Optimized layout for performance"
  ],
  "lastUpdated": "2025-08-20T01:30:00.000Z"
}
```

## Widget Management

### Get Available Widgets

Returns widgets available to the current user based on their role and permissions.

```http
GET /api/adaptive-dashboard/widgets
```

**Query Parameters:**
- `role` (optional): Filter by specific role
- `category` (optional): Filter by widget category

**Response:**
```json
{
  "success": true,
  "widgets": [
    {
      "id": "overview",
      "name": "Overview",
      "description": "Project and opportunity overview",
      "category": "summary",
      "icon": "dashboard",
      "requiredPermissions": [],
      "configurable": true,
      "defaultSize": { "w": 12, "h": 4 },
      "minSize": { "w": 6, "h": 3 },
      "maxSize": { "w": 12, "h": 8 }
    }
  ]
}
```

### Get Layout Templates

Returns predefined layout templates for different roles and use cases.

```http
GET /api/adaptive-dashboard/layout?role=project-manager
```

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "project-manager-default",
      "name": "Project Manager Dashboard",
      "description": "Optimized for project management workflows",
      "widgets": [...],
      "layout": "grid",
      "popularity": 0.85
    }
  ]
}
```

## User Preferences

### Get User Preferences

Retrieves user preferences including personalizations, behavioral data, and accessibility settings.

```http
GET /api/adaptive-dashboard/preferences
```

**Response:**
```json
{
  "success": true,
  "preferences": {
    "personalizations": {
      "preferredProjectTypes": ["community", "technology"],
      "interestedOpportunityTypes": ["grant", "partnership"],
      "focusAreas": ["sustainability", "innovation"],
      "notificationSettings": {
        "email": true,
        "push": false,
        "frequency": "daily"
      }
    },
    "behavioralData": {
      "mostViewedSections": ["projects", "opportunities"],
      "timeSpentByWidget": {
        "projects": 1200000,
        "opportunities": 800000
      },
      "interactionPatterns": [],
      "learningPreferences": "visual"
    },
    "accessibility": {
      "fontSize": "medium",
      "highContrast": false,
      "reducedMotion": false,
      "screenReader": false
    }
  },
  "lastUpdated": "2025-08-20T01:30:00.000Z"
}
```

### Save User Preferences

Updates user preferences with validation and conflict resolution.

```http
POST /api/adaptive-dashboard/preferences
```

**Request Body:**
```json
{
  "preferences": {
    "personalizations": { ... },
    "accessibility": { ... }
  }
}
```

## Analytics & Tracking

### Track User Interaction

Records user interactions for preference learning and analytics.

```http
POST /api/adaptive-dashboard/analytics/track
```

**Request Body:**
```json
{
  "event": "widget-interaction",
  "data": {
    "widgetId": "projects",
    "action": "click",
    "timestamp": "2025-08-20T01:30:00.000Z",
    "metadata": {
      "section": "project-list",
      "duration": 1500
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "processed": true
}
```

### Common Event Types

| Event Type | Description | Required Data |
|------------|-------------|---------------|
| `widget-interaction` | User interacts with widget | `widgetId`, `action` |
| `layout-changed` | User changes layout | `oldLayout`, `newLayout` |
| `widget-added` | User adds widget | `widgetType`, `position` |
| `widget-removed` | User removes widget | `widgetId` |
| `theme-changed` | User changes theme | `oldTheme`, `newTheme` |
| `density-changed` | User changes density | `oldDensity`, `newDensity` |
| `preference-updated` | User updates preferences | `section`, `changes` |

## Recommendations

### Get AI Recommendations

Returns personalized recommendations based on user behavior and preferences.

```http
GET /api/adaptive-dashboard/recommendations?type=widget&limit=5
```

**Query Parameters:**
- `type`: `all`, `widget`, `layout`, `content`
- `limit`: Number of recommendations (default: 10, max: 50)

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "id": "rec-001",
      "type": "widget",
      "title": "Add Analytics Widget",
      "description": "Based on your usage patterns, an analytics widget would help track your project metrics",
      "confidence": 0.85,
      "reason": "You frequently view project details and spend significant time in data-related sections",
      "action": "add-widget",
      "data": {
        "widgetType": "analytics",
        "suggestedPosition": { "x": 6, "y": 0, "w": 6, "h": 4 }
      },
      "impact": "high",
      "category": "productivity"
    }
  ],
  "metadata": {
    "totalRecommendations": 12,
    "userProfile": "data-driven",
    "lastUpdated": "2025-08-20T01:30:00.000Z"
  }
}
```

## Performance Monitoring

### Get Performance Metrics

Returns dashboard performance metrics and health status.

```http
GET /api/adaptive-dashboard/performance
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "loadTime": 1200,
    "widgetCount": 6,
    "cacheHitRate": 0.78,
    "memoryUsage": 45000000,
    "errorRate": 0.02
  },
  "health": "good",
  "recommendations": [
    "Consider enabling more aggressive caching for better performance"
  ]
}
```

## Error Handling

### Error Response Format

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CONFIG",
    "message": "Dashboard configuration validation failed",
    "details": [
      "Widget 'invalid-widget' is not available for your role",
      "Position overlaps detected in layout"
    ],
    "timestamp": "2025-08-20T01:30:00.000Z",
    "requestId": "req-123456"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CONFIG` | 400 | Configuration validation failed |
| `WIDGET_NOT_FOUND` | 404 | Requested widget doesn't exist |
| `PERMISSION_DENIED` | 403 | User lacks required permissions |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

## Component API Reference

### React Hooks

#### `useAdaptiveDashboard`

Primary hook for dashboard data and functionality.

```typescript
const {
  config,
  preferences,
  recommendations,
  availableWidgets,
  isLoading,
  configError,
  saveDashboardConfig,
  saveUserPreferences,
  trackInteraction
} = useAdaptiveDashboard();
```

**Returns:**
- `config`: Current dashboard configuration
- `preferences`: User preferences
- `recommendations`: AI recommendations
- `availableWidgets`: Available widgets for user
- `isLoading`: Loading state
- `configError`: Configuration error state
- `saveDashboardConfig`: Function to save configuration
- `saveUserPreferences`: Function to save preferences
- `trackInteraction`: Function to track user interactions

#### `useAccessibility`

Hook for accessibility features and controls.

```typescript
const {
  highContrast,
  toggleHighContrast,
  fontSize,
  setFontSize,
  reducedMotion,
  toggleReducedMotion,
  announceToScreenReader
} = useAccessibility();
```

#### `usePerformanceMonitoring`

Hook for performance tracking and monitoring.

```typescript
const {
  trackWidgetLoad,
  trackInteraction,
  getMetrics,
  mark,
  measure
} = usePerformanceMonitoring();
```

### Components

#### `AdaptiveDashboard`

Main dashboard container component.

```typescript
interface AdaptiveDashboardProps {
  userId?: string;
  role?: string;
  initialConfig?: DashboardConfig;
  onConfigChange?: (config: DashboardConfig) => void;
  onError?: (error: Error) => void;
  className?: string;
}

<AdaptiveDashboard
  userId="user-123"
  role="project-manager"
  onConfigChange={handleConfigChange}
  className="custom-dashboard"
/>
```

#### `LazyWidget`

Lazy-loaded widget component with error boundaries.

```typescript
interface LazyWidgetProps {
  widgetId: string;
  widgetType: string;
  title: string;
  config?: any;
  onInteraction?: (event: string, data?: any) => void;
  onError?: (error: Error) => void;
}

<LazyWidget
  widgetId="projects-001"
  widgetType="projects"
  title="My Projects"
  config={{ filter: "active" }}
  onInteraction={handleInteraction}
/>
```

#### `AccessibilityControls`

User-facing accessibility controls.

```typescript
interface AccessibilityControlsProps {
  showAdvanced?: boolean;
  className?: string;
}

<AccessibilityControls showAdvanced={true} />
```

#### `VirtualScrollList`

High-performance virtual scrolling for large datasets.

```typescript
interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  containerHeight: number;
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  onScroll?: (scrollTop: number, startIndex: number, endIndex: number) => void;
}

<VirtualScrollList
  items={projects}
  itemHeight={80}
  containerHeight={400}
  renderItem={renderProjectItem}
/>
```

### Services

#### `cacheService`

Advanced caching service for dashboard data.

```typescript
// Get cached data
const data = cacheService.get<ProjectData>('projects');

// Set cached data with TTL and tags
cacheService.set('projects', projectData, {
  ttl: 10 * 60 * 1000, // 10 minutes
  tags: ['projects', 'user-data'],
  persist: true
});

// Invalidate by tags
cacheService.invalidateByTags(['projects']);

// Get cache statistics
const stats = cacheService.getStats();
```

#### `performanceMonitoring`

Performance monitoring and metrics collection.

```typescript
// Track custom metrics
performanceMonitoring.recordCustomMetric({
  name: 'widget-load',
  value: 150,
  category: 'performance',
  unit: 'ms'
});

// Mark timing points
performanceMonitoring.mark('widget-start');
performanceMonitoring.measure('widget-load', 'widget-start');

// Get performance summary
const summary = performanceMonitoring.getSummary();
```

## Rate Limiting

API endpoints have the following rate limits:

| Endpoint Pattern | Limit | Window |
|------------------|-------|--------|
| `/api/adaptive-dashboard/config` | 100 requests | 1 hour |
| `/api/adaptive-dashboard/preferences` | 50 requests | 1 hour |
| `/api/adaptive-dashboard/analytics/track` | 1000 requests | 1 hour |
| `/api/adaptive-dashboard/recommendations` | 20 requests | 1 hour |

## Caching Strategy

The API implements multi-level caching:

### Server-Side Caching
- Configuration data: 15 minutes
- Widget metadata: 1 hour
- Recommendations: 30 minutes
- User preferences: 1 hour

### Client-Side Caching
- Dashboard configuration: 10 minutes
- Available widgets: 30 minutes
- Recommendations: 5 minutes
- User preferences: 10 minutes

### Cache Invalidation
- User-triggered: Immediate
- Configuration changes: Immediate
- Preference updates: Immediate
- System updates: Next request

## Security Considerations

### Data Privacy
- Personal preferences encrypted at rest
- Behavioral data anonymized for analytics
- GDPR-compliant data retention policies
- User consent for data collection

### API Security
- JWT token validation on all requests
- Role-based access control (RBAC)
- Rate limiting per user and IP
- Input validation and sanitization
- CSRF protection
- CORS configuration

### Performance Security
- Query complexity limits
- Resource usage monitoring
- DDoS protection
- Memory leak detection

## Migration Guide

### From Legacy Dashboard

1. **Export Configuration**
   ```javascript
   const legacyConfig = getLegacyDashboardConfig();
   const adaptiveConfig = migrateToAdaptive(legacyConfig);
   ```

2. **Update Components**
   ```javascript
   // Old
   <Dashboard config={config} />
   
   // New
   <AdaptiveDashboard 
     initialConfig={adaptiveConfig}
     onConfigChange={handleChange}
   />
   ```

3. **Migrate Tracking**
   ```javascript
   // Old
   analytics.track('dashboard_view');
   
   // New
   trackInteraction('dashboard-view', { timestamp: Date.now() });
   ```

## Troubleshooting

### Common Issues

**Configuration Not Saving**
- Check user permissions
- Validate configuration format
- Verify network connectivity
- Check browser console for errors

**Widgets Not Loading**
- Check widget permissions
- Verify widget type exists
- Check network requests
- Clear browser cache

**Poor Performance**
- Enable performance monitoring
- Check browser memory usage
- Verify caching configuration
- Review widget complexity

### Debug Mode

Enable debug mode for additional logging:

```javascript
window.ADAPTIVE_DASHBOARD_DEBUG = true;
```

### Support

For technical support and questions:
- GitHub Issues: [ACT Placemat Issues](https://github.com/act-placemat/issues)
- Documentation: [Full API Docs](https://docs.act-placemat.org)
- Email: dev@actplacemat.org
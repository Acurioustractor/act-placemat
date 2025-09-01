# Adaptive Dashboard Components API Documentation

## Overview

The Adaptive Dashboard system provides a flexible, user-customizable interface for the ACT Placemat platform. It consists of several interconnected components, stores, and APIs that work together to create a personalised experience for different user roles.

## Core Architecture

### Component Hierarchy

```
AdaptiveDashboard (Root)
├── AdaptiveDashboardGrid (Layout Manager)
├── DashboardWidget (Individual Widgets)
├── AccessibilityProvider (A11y Context)
├── AIRecommendationsPanel (ML Suggestions)
└── RoleTemplateSelector (Role-based Templates)
```

### Store Architecture

The dashboard uses Zustand stores for state management:

- `useDashboardStore` - Dashboard configuration and widget management
- `useUserPreferencesStore` - User preferences and interaction tracking
- `useAdaptiveUIStore` - AI recommendations and learning system

## Component APIs

### AdaptiveDashboard

**Description:** Root dashboard component that orchestrates all dashboard functionality.

**Props:** None (uses stores for configuration)

**Key Methods:**
```typescript
// Store actions available through hooks
const {
  config,           // Current dashboard configuration
  isLoading,        // Loading state
  error,           // Error state
  loadConfig,      // Load dashboard configuration
  updateWidget,    // Update widget properties
  addWidget,       // Add new widget
  removeWidget     // Remove widget
} = useDashboardStore()
```

**Usage Example:**
```tsx
import { AdaptiveDashboard } from './components/dashboard/AdaptiveDashboard'

function DashboardPage() {
  return (
    <div className="dashboard-container">
      <AdaptiveDashboard />
    </div>
  )
}
```

### DashboardWidget

**Description:** Individual widget wrapper component with controls and content rendering.

**Props:**
```typescript
interface DashboardWidgetProps {
  widget: WidgetType              // Widget configuration object
  editable?: boolean              // Whether widget can be edited
  isDragging?: boolean            // Drag state indicator
  onClick?: () => void            // Click handler
  onToggle?: () => void           // Toggle handler
  onResize?: (newSize: { w: number; h: number }) => void  // Resize handler
  onRemove?: () => void           // Remove handler
}
```

**Widget Types:**
- `overview` - Dashboard metrics overview
- `projects` - Project management interface
- `opportunities` - Opportunity tracking
- `activity` - Recent activity feed
- `actions` - Quick action buttons
- `recommendations` - AI-powered suggestions

**Usage Example:**
```tsx
import { DashboardWidget } from './components/dashboard/DashboardWidget'

const widget = {
  id: 'overview',
  type: 'overview',
  position: { x: 0, y: 0, w: 12, h: 4 },
  enabled: true
}

<DashboardWidget 
  widget={widget}
  editable={true}
  onToggle={() => handleToggle(widget.id)}
  onRemove={() => handleRemove(widget.id)}
/>
```

### AdaptiveDashboardGrid

**Description:** Layout management component that handles widget positioning and drag-and-drop.

**Props:**
```typescript
interface AdaptiveDashboardGridProps {
  widgets: WidgetType[]           // Array of widget configurations
  layout: 'grid' | 'masonry' | 'list'  // Layout type
  editable?: boolean              // Whether layout can be edited
  onLayoutChange?: (widgets: WidgetType[]) => void  // Layout change handler
  onWidgetUpdate?: (widgetId: string, updates: Partial<WidgetType>) => void
}
```

**Features:**
- Responsive grid system
- Drag-and-drop widget repositioning
- Automatic layout adjustments
- Mobile-responsive layouts

### AccessibilityProvider

**Description:** Provides accessibility context and controls for the dashboard.

**Context API:**
```typescript
interface AccessibilityContext {
  // Focus management
  focusWidget: (widgetId: string) => void
  focusNextWidget: () => void
  focusPreviousWidget: () => void
  
  // Screen reader announcements
  announceChange: (message: string) => void
  
  // Keyboard navigation
  handleKeyboardNavigation: (event: KeyboardEvent) => void
  
  // High contrast mode
  highContrastMode: boolean
  toggleHighContrast: () => void
  
  // Reduced motion
  reducedMotion: boolean
  setReducedMotion: (enabled: boolean) => void
}
```

### AIRecommendationsPanel

**Description:** Displays AI-powered dashboard customisation recommendations.

**Props:**
```typescript
interface AIRecommendationsPanelProps {
  recommendations: Recommendation[]
  onApplyRecommendation: (id: string) => void
  onDismissRecommendation: (id: string) => void
  visible?: boolean
}

interface Recommendation {
  id: string
  type: 'widget' | 'layout' | 'theme' | 'density'
  title: string
  description: string
  confidence: number  // 0-1 confidence score
  action: string      // Action type
  data: any          // Action-specific data
}
```

## Store APIs

### useDashboardStore

**State:**
```typescript
interface DashboardState {
  config: DashboardConfig | null
  isLoading: boolean
  error: string | null
  lastUpdated: string | null
}

interface DashboardConfig {
  layout: 'grid' | 'masonry' | 'list'
  theme: 'light' | 'dark' | 'auto'
  density: 'compact' | 'comfortable' | 'spacious'
  widgets: WidgetType[]
}
```

**Actions:**
```typescript
// Configuration management
loadConfig(): Promise<void>
saveConfig(config: DashboardConfig): Promise<void>
resetConfig(): Promise<void>

// Widget management
addWidget(widget: WidgetType): void
updateWidget(widgetId: string, updates: Partial<WidgetType>): void
removeWidget(widgetId: string): void
toggleWidget(widgetId: string): void

// Layout management
updateLayout(layout: 'grid' | 'masonry' | 'list'): void
updateTheme(theme: 'light' | 'dark' | 'auto'): void
updateDensity(density: 'compact' | 'comfortable' | 'spacious'): void
```

### useUserPreferencesStore

**State:**
```typescript
interface UserPreferencesState {
  preferences: UserPreferences | null
  isLoading: boolean
  interactionHistory: Interaction[]
}

interface UserPreferences {
  personalizations: {
    focusAreas: string[]
    workingHours: { start: string; end: string }
    timezone: string
    preferredWidgets: string[]
  }
  accessibility: {
    highContrast: boolean
    reducedMotion: boolean
    screenReader: boolean
    fontSize: 'small' | 'medium' | 'large'
  }
  ui: {
    theme: 'light' | 'dark' | 'auto'
    density: 'compact' | 'comfortable' | 'spacious'
    layout: 'grid' | 'masonry' | 'list'
  }
}
```

**Actions:**
```typescript
// Preferences management
loadPreferences(): Promise<void>
updatePersonalizations(updates: Partial<Personalizations>): Promise<void>
updateAccessibility(updates: Partial<AccessibilitySettings>): Promise<void>
updateUI(updates: Partial<UISettings>): Promise<void>

// Interaction tracking
trackInteraction(type: string, data: any): void
getInteractionHistory(days?: number): Interaction[]
clearInteractionHistory(): void
```

### useAdaptiveUIStore

**State:**
```typescript
interface AdaptiveUIState {
  recommendations: Recommendation[]
  adaptationScore: number
  isLearning: boolean
  learningData: LearningData
}
```

**Actions:**
```typescript
// Recommendations
loadRecommendations(): Promise<void>
applyRecommendation(recommendationId: string): Promise<void>
dismissRecommendation(recommendationId: string): void

// Learning system
enableLearning(): void
disableLearning(): void
trainModel(): Promise<void>
getAdaptationScore(): number
```

## API Endpoints

### Dashboard Configuration

**GET** `/api/adaptive-dashboard/config`
- Returns current dashboard configuration
- Response: `{ success: boolean, config: DashboardConfig }`

**POST** `/api/adaptive-dashboard/config`
- Saves dashboard configuration
- Body: `{ config: DashboardConfig }`
- Response: `{ success: boolean }`

### Recommendations

**GET** `/api/adaptive-dashboard/recommendations`
- Returns AI-generated recommendations
- Query params: `?userId=string&context=string`
- Response: `{ recommendations: Recommendation[] }`

**POST** `/api/adaptive-dashboard/recommendations/apply`
- Applies a recommendation
- Body: `{ recommendationId: string, userId: string }`
- Response: `{ success: boolean }`

### Analytics Tracking

**POST** `/api/adaptive-dashboard/analytics/track`
- Tracks user interactions for learning
- Body: `{ event: string, data: any, timestamp: string }`
- Response: `{ success: boolean }`

## Widget Development

### Creating Custom Widgets

1. **Define Widget Type:**
```typescript
interface CustomWidgetType extends WidgetType {
  type: 'custom-widget'
  settings: {
    customProp: string
    // other custom properties
  }
}
```

2. **Create Widget Component:**
```tsx
const CustomWidget: React.FC<{ widget: CustomWidgetType }> = ({ widget }) => {
  return (
    <div className="custom-widget">
      <h3>{widget.settings.customProp}</h3>
      {/* widget content */}
    </div>
  )
}
```

3. **Register in Widget Content:**
```tsx
// In DashboardWidget.tsx
case 'custom-widget':
  return <CustomWidget widget={widget as CustomWidgetType} />
```

### Widget Configuration Schema

```typescript
interface WidgetType {
  id: string                    // Unique widget identifier
  type: string                  // Widget type for rendering
  position: {                   // Grid position
    x: number                   // X coordinate
    y: number                   // Y coordinate  
    w: number                   // Width in grid units
    h: number                   // Height in grid units
  }
  enabled: boolean             // Whether widget is visible
  settings?: {                 // Widget-specific settings
    [key: string]: any
  }
}
```

## Integration Patterns

### Role-Based Configurations

```typescript
// Load role-specific template
const loadRoleTemplate = async (role: string) => {
  const { data } = await fetch(`/api/dashboard/templates/${role}`)
  return data.template
}

// Apply role-based restrictions
const filterWidgetsByRole = (widgets: WidgetType[], role: string) => {
  return widgets.filter(widget => 
    hasPermission(widget.type, role)
  )
}
```

### Accessibility Integration

```tsx
// Use accessibility context
const { focusWidget, announceChange } = useAccessibility()

// Handle keyboard navigation
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Tab':
      focusNextWidget()
      break
    case 'ArrowRight':
      focusNextWidget()
      break
    case 'ArrowLeft':
      focusPreviousWidget()
      break
  }
}
```

### Error Handling

```tsx
// Error boundary for widgets
const WidgetErrorBoundary: React.FC = ({ children, widgetId }) => {
  const [hasError, setHasError] = useState(false)
  
  if (hasError) {
    return (
      <div className="widget-error" data-widget-id={widgetId}>
        <p>Widget failed to load</p>
        <button onClick={() => setHasError(false)}>
          Retry
        </button>
      </div>
    )
  }
  
  return children
}
```

## Testing Integration

### Test Selectors

All dashboard components include `data-testid` attributes for reliable testing:

```typescript
const SELECTORS = {
  dashboard: '[data-testid="adaptive-dashboard"]',
  widget: '[data-widget-id]',
  settingsButton: '[data-testid="dashboard-settings"]',
  addWidgetButton: '[data-testid="add-widget"]',
  saveButton: '[data-testid="save-dashboard"]'
}
```

### Mock Data

Test utilities are available in `/src/utils/testing/`:

```typescript
import { createMockDashboardConfig } from '../utils/testing/dashboardMocks'

const mockConfig = createMockDashboardConfig({
  widgets: ['overview', 'projects'],
  layout: 'grid'
})
```

## Performance Considerations

### Lazy Loading

Widgets are loaded lazily to improve initial page load:

```tsx
const LazyWidget = React.lazy(() => import('./widgets/ComplexWidget'))

// In widget renderer
case 'complex-widget':
  return (
    <Suspense fallback={<WidgetSkeleton />}>
      <LazyWidget widget={widget} />
    </Suspense>
  )
```

### Memoization

Components use React.memo for optimal re-rendering:

```tsx
export const DashboardWidget = React.memo<DashboardWidgetProps>(
  ({ widget, ...props }) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    return prevProps.widget.id === nextProps.widget.id &&
           prevProps.widget.enabled === nextProps.widget.enabled
  }
)
```

### Analytics Batching

User interactions are batched for efficient analytics:

```typescript
// Batch analytics events
const batchAnalytics = debounce((events: AnalyticsEvent[]) => {
  fetch('/api/analytics/batch', {
    method: 'POST',
    body: JSON.stringify({ events })
  })
}, 1000)
```

## Configuration Examples

### Basic Dashboard Setup

```tsx
import { AdaptiveDashboard } from './components/dashboard'

function App() {
  return (
    <div className="app">
      <AdaptiveDashboard />
    </div>
  )
}
```

### Custom Widget Configuration

```typescript
const customConfig = {
  layout: 'grid',
  theme: 'light',
  density: 'comfortable',
  widgets: [
    {
      id: 'overview',
      type: 'overview',
      position: { x: 0, y: 0, w: 12, h: 4 },
      enabled: true
    },
    {
      id: 'projects',
      type: 'projects', 
      position: { x: 0, y: 4, w: 6, h: 6 },
      enabled: true,
      settings: {
        showCompleted: false,
        sortBy: 'priority'
      }
    }
  ]
}
```

### Role-Based Template

```typescript
const projectManagerTemplate = {
  layout: 'grid',
  theme: 'auto',
  density: 'comfortable',
  widgets: [
    { id: 'overview', type: 'overview', position: { x: 0, y: 0, w: 12, h: 3 }, enabled: true },
    { id: 'projects', type: 'projects', position: { x: 0, y: 3, w: 8, h: 6 }, enabled: true },
    { id: 'tasks', type: 'tasks', position: { x: 8, y: 3, w: 4, h: 6 }, enabled: true },
    { id: 'calendar', type: 'calendar', position: { x: 0, y: 9, w: 6, h: 4 }, enabled: true },
    { id: 'analytics', type: 'analytics', position: { x: 6, y: 9, w: 6, h: 4 }, enabled: true }
  ],
  roleBasedFeatures: {
    canManageProjects: true,
    canViewFinancials: true,
    canAccessAnalytics: true,
    canManageUsers: false
  }
}
```

## Migration Guide

### From Legacy Dashboard

1. **Component Replacement:**
```tsx
// Old
<LegacyDashboard config={config} />

// New
<AdaptiveDashboard />
```

2. **Store Migration:**
```typescript
// Old
const [dashboardState, setDashboardState] = useState(config)

// New
const { config, loadConfig, updateWidget } = useDashboardStore()
```

3. **Event Handling:**
```tsx
// Old
onWidgetChange={(id, data) => updateWidget(id, data)}

// New - automatic through store
// No manual event handling needed
```

This comprehensive API documentation provides developers with all the information needed to integrate, customise, and extend the Adaptive Dashboard system.
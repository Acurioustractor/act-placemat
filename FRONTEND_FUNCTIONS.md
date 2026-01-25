# 📋 Frontend - Key Functions & Components

## 🔥 Main Functions (by component)

### **App.tsx** - Main Application
```typescript
- App()                          # Main app component
- useEffect()                    # URL params handling
- renderContent()               # Content renderer
- setActiveTab()               # Tab state manager
```

### **GoalsDashboard.tsx** - Main Feature
```typescript
- GoalsDashboard()              # Main goals component
- renderLanes()                # Render lane columns
- handleDragStart()            # Handle drag start
- handleDragOver()             # Handle drag over
- handleDrop()                 # Handle drop
- handleMoveGoal()             # Move goal between lanes
- handleReorderLane()         # Reorder within lane
```

### **Dashboard.tsx** - Main Dashboard
```typescript
- Dashboard()                   # Main dashboard
- renderOverview()             # Render overview section
- renderProjects()              # Render projects
- renderContacts()             # Render contacts
- renderIntelligence()          # Render intelligence
```

### **useGoals.ts** - Goals Hook
```typescript
- useGoals()                   # Fetch goals data
- useGoalUpdate()              # Update goal
- useGoalMove()                # Move goal
- useGoalReorder()             # Reorder goals
- useGoalHistory()             # Goal history
```

### **api.ts** - API Service
```typescript
- ApiService.request()          # Generic request
- getDashboardOverview()        # Get dashboard data
- getDashboardProjects()        # Get projects
- getDirectionScorecard()       # Get scorecard
- pursueOpportunity()           # Pursue opportunity
- queryIntelligence()           # Query AI
- getProjectCommunications()     # Get communications
- createMonitoringStream()      # SSE stream
```

### **Intelligence.tsx** - AI Intelligence
```typescript
- Intelligence()                # Main intelligence component
- renderDashboard()             # Render dashboard
- renderInsights()               # Render insights
- renderRecommendations()        # Render recommendations
```

### **ACTBrainCenter.tsx** - Brain Center
```typescript
- ACTBrainCenter()              # Brain center main
- renderThinking()               # Render thinking
- renderInsights()               # Render insights
- renderKnowledge()              # Render knowledge base
```

### **Projects.tsx** - Project Management
```typescript
- Projects()                    # Projects main component
- renderProjects()               # Render projects grid
- renderFilters()                # Render filters
- renderProjectDetail()          # Render detail view
- handleProjectSelect()          # Handle selection
```

### **Contacts.tsx** - Contact Management
```typescript
- Contacts()                     # Contacts main
- renderContacts()               # Render contacts list
- renderContactDetail()          # Render detail
- handleContactSelect()          # Handle selection
- renderEnrichment()            # Render enrichment
```

### **SubscriptionsTab.tsx** - Subscription Tracker
```typescript
- SubscriptionsTab()             # Subscriptions main
- renderSubscriptions()          # Render subscriptions list
- renderConsolidation()          # Render consolidation
- renderSavings()               # Render savings
- handleAddSubscription()        # Add new
```

### **FinancialReports.tsx** - Financial Data
```typescript
- FinancialReports()             # Reports main
- renderCashFlow()              # Render cash flow
- renderProfitLoss()            # Render P&L
- renderBalanceSheet()          # Render balance sheet
- renderMetrics()                # Render key metrics
```

### **useRealData.ts** - Real-time Data
```typescript
- useRealData()                 # Real-time data hook
- useOperationsData()           # Operations metrics
- subscribeToUpdates()          # Subscribe to updates
```

### **useSubscriptions.ts** - Subscriptions Hook
```typescript
- useSubscriptions()            # Fetch subscriptions
- useSubscriptionAdd()          # Add subscription
- useSubscriptionUpdate()       # Update subscription
- useSubscriptionDelete()       # Delete subscription
- useConsolidation()            # Consolidation data
```

### **useNavigate.ts** - Navigation Hook
```typescript
- useNavigate()                 # Navigation logic
- navigateTo()                  # Navigate to path
- getCurrentTab()               # Get current tab
- setCurrentTab()               # Set current tab
```

### **supabase.ts** - Database Client
```typescript
- createClient()                # Create Supabase client
- from()                        # Query table
- select()                      # Select data
- insert()                      # Insert data
- update()                      # Update data
- delete()                      # Delete data
```

---

## 🎯 Top 10 Most Important Functions

### 1. **GoalsDashboard()**
**File:** `components/dashboard/GoalsDashboard.tsx`  
**Purpose:** Main goals interface with drag-and-drop  
**Key functions:**
- `handleDrop()` - Handle goal drops
- `handleMoveGoal()` - Move goals
- `handleReorderLane()` - Reorder within lane

### 2. **useGoals()**
**File:** `hooks/useGoals.ts`  
**Purpose:** Goals data management  
**Key functions:**
- `fetchGoals()` - Fetch goals from API
- `updateGoal()` - Update goal
- `moveGoal()` - Move goal
- `reorderGoal()` - Reorder within lane

### 3. **ApiService.request()**
**File:** `services/api.ts`  
**Purpose:** Generic API request handler  
**Key functions:**
- `request<T>()` - Make API request
- `handleResponse()` - Handle response
- `handleError()` - Handle errors

### 4. **App()**
**File:** `App.tsx`  
**Purpose:** Main application component  
**Key functions:**
- `renderContent()` - Render active tab
- `setActiveTab()` - Change tabs
- `useEffect()` - Handle URL params

### 5. **Dashboard()**
**File:** `components/Dashboard.tsx`  
**Purpose:** Main dashboard  
**Key functions:**
- `renderOverview()` - Render overview
- `renderMetrics()` - Render metrics
- `renderTabs()` - Render dashboard tabs

### 6. **Intelligence()**
**File:** `components/Intelligence.tsx`  
**Purpose:** AI intelligence hub  
**Key functions:**
- `renderDashboard()` - Render dashboard
- `queryIntelligence()` - Query AI
- `renderInsights()` - Render insights

### 7. **useRealData()**
**File:** `hooks/useRealData.ts`  
**Purpose:** Real-time data  
**Key functions:**
- `fetchData()` - Fetch data
- `subscribe()` - Subscribe to updates
- `refresh()` - Refresh data

### 8. **Projects()**
**File:** `components/Projects.tsx`  
**Purpose:** Project management  
**Key functions:**
- `renderProjects()` - Render projects grid
- `handleSelect()` - Handle selection
- `renderDetail()` - Render detail view

### 9. **createMonitoringStream()**
**File:** `services/api.ts`  
**Purpose:** Real-time monitoring  
**Key functions:**
- `createMonitoringStream()` - Create SSE connection
- `onMessage()` - Handle messages
- `onError()` - Handle errors

### 10. **SubscriptionsTab()**
**File:** `components/dashboard/SubscriptionsTab.tsx`  
**Purpose:** Subscription tracker  
**Key functions:**
- `renderSubscriptions()` - Render list
- `handleAdd()` - Add subscription
- `renderConsolidation()` - Render consolidation

---

## 🔌 API Functions

### **Main API Endpoints** (from `services/api.ts`)
```typescript
// Dashboard
getDashboardOverview()
getDashboardProjects(limit)
getDashboardContacts()

// Goals
getGoals()
createGoal(goal)
updateGoal(id, updates)
moveGoal(id, newLane, newPosition)
reorderGoal(id, newPosition)

// Intelligence
queryIntelligence(query)
queryBusinessIntelligence(query)
getDirectionScorecard()

// Projects
getProjects()
getProjectCommunications(projectId)
getProjectEmails(projectId)
getProjectCalendar(projectId)
getProjectContacts(projectId)

// Opportunities
getOpportunities()
discoverOpportunities(query)
matchOpportunitiesToProject(projectId)
pursueOpportunity(id, projectId)

// Contacts
getLinkedInContacts()
getCRMMetrics()
getProjectContactAlignment()

// Communications
getGmailCommunityEmails(limit)
getCalendarHighlights(limit, days)

// Integrations
getIntegrationStatus()
getAllIntegrationHealth()
triggerIntegrationSync(source)

// Monitoring
getMonitoringStatistics()
createMonitoringStream(callback)
```

---

## 🎣 Custom Hooks

### **useGoals.ts**
```typescript
export function useGoals()
export function useGoalUpdate()
export function useGoalMove()
export function useGoalReorder()
export function useGoalHistory()
```

### **useRealData.ts**
```typescript
export function useRealData()
export function useOperationsData()
```

### **useSubscriptions.ts**
```typescript
export function useSubscriptions()
export function useSubscriptionAdd()
export function useSubscriptionUpdate()
export function useSubscriptionDelete()
export function useConsolidation()
```

### **useBrainCenter.ts**
```typescript
export function useBrainCenter()
export function useInsights()
export function useKnowledge()
```

### **useNavigate.ts**
```typescript
export function useNavigate()
export function useTabNavigation()
```

### **useCommandCenter.ts**
```typescript
export function useCommandCenter()
export function useCommands()
export function useExecuteCommand()
```

---

## 🎨 UI Components Functions

### **Button.tsx**
```typescript
export function Button({ variant, size, children })
handleClick()
```

### **Card.tsx**
```typescript
export function Card({ children, className })
renderHeader()
renderBody()
renderFooter()
```

### **MetricCard.tsx**
```typescript
export function MetricCard({ title, value, trend })
renderMetric()
renderTrend()
```

### **StatusBadge.tsx**
```typescript
export function StatusBadge({ status })
getStatusColor()
```

### **LoadingSpinner.tsx**
```typescript
export function LoadingSpinner({ size })
renderSpinner()
```

---

## 📊 State Management

### **Zustand Stores** (if used)
```typescript
// Example store structure
interface Store {
  goals: Goal[]
  projects: Project[]
  contacts: Contact[]
  setGoals(goals: Goal[]): void
  updateGoal(id: string, updates: Partial<Goal>): void
  addGoal(goal: Goal): void
  deleteGoal(id: string): void
}
```

---

## 🔄 Event Handlers

### **Common Event Handlers**
```typescript
// Drag & Drop
handleDragStart(event)
handleDragOver(event)
handleDrop(event)
handleDragEnd(event)

// Form Handling
handleInputChange(event)
handleSubmit(event)
handleSelectChange(event)

// Navigation
handleTabChange(tab)
handleNavigate(path)
handleBack()
handleForward()
```

---

## 🎯 Most Used Utilities

### **From `utils/api.ts`**
```typescript
resolveApiUrl(endpoint)
formatDate(date)
formatCurrency(amount)
formatPercentage(value)
```

### **From `utils/projectStage.ts`**
```typescript
getProjectStage(stage)
getStageColor(stage)
getStageProgress(stage)
```

### **From `utils/moonPhase.ts`**
```typescript
getMoonPhase()
getMoonPhaseName()
getMoonPhaseEmoji()
```

---

## 📦 Export Summary

### **Total Exports by File Type**

| File | Exports | Type |
|------|---------|------|
| **Components** | 129 components | React components |
| **Hooks** | 50+ hook functions | Custom hooks |
| **Services** | 40+ API methods | API functions |
| **Utils** | 20+ utilities | Helper functions |
| **Types** | 100+ type definitions | TypeScript types |

---

## ✅ Key Takeaways

1. **Main Feature:** Goals Dashboard with drag-and-drop
2. **Data Flow:** Hooks → Services → API → Backend
3. **State:** React hooks + Context (Zustand if used)
4. **Architecture:** Component-based with custom hooks
5. **API:** RESTful with SSE for real-time updates

---

**Next:** Backend codebase navigation guide 🚀

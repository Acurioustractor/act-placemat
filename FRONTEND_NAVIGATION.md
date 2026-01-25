# 🎯 Frontend Codebase - Navigation Guide

## 📊 Overview
- **Location:** `/Users/benknight/Code/act-intelligence-platform/apps/frontend/`
- **Tech Stack:** React 19 + Vite + TypeScript
- **Total Files:** 172 TypeScript/TSX files
- **Architecture:** Component-based with hooks

---

## 📁 Directory Structure

### Core Structure
```
apps/frontend/src/
├── App.tsx              # Main application component
├── main.tsx            # Entry point
├── index.css           # Global styles
├── components/         # 129 React components
├── hooks/              # 10 custom hooks
├── services/           # 4 API services
├── types/              # TypeScript types
├── config/             # Configuration
├── constants/          # App constants
├── utils/              # Utility functions
└── assets/             # Static assets
```

---

## 🧩 Components (129 total)

### **Root Components** (Top-level pages)
```
components/
├── App.tsx                          # Main app with routing
├── Dashboard.tsx                     # Main dashboard
├── DashboardLanding.tsx              # Landing page
├── DashboardInsights.tsx            # Insights dashboard
├── EnhancedDashboard.tsx             # Enhanced dashboard
└── ...
```

### **Dashboard Tabs** (Major sections)
```
components/dashboard/
├── GoalsDashboard.tsx        # ⭐ Main goals interface
├── ACTBrainCenter.tsx       # Brain/AI center
├── CalendarTab.tsx          # Calendar view
├── ContentTab.tsx           # Content management
├── DevelopmentTab.tsx        # Development tracking
├── FinanceTab.tsx           # Financial overview
├── PeopleTab.tsx            # People/contacts
├── SubscriptionsTab.tsx      # Subscription tracker
├── TimeVisualsTab.tsx       # Time visualization
├── ProjectsTab.tsx          # Projects overview
└── ...
```

### **Business Features**
```
components/
├── Projects.tsx                    # Project management
├── Contacts.tsx                   # Contact management
├── Opportunities.tsx               # Opportunity tracking
├── Intelligence.tsx                # AI intelligence
├── VisualisationsHub.tsx           # Data visualizations
├── FinancialReports.tsx            # Financial reports
├── MoneyFlowDashboard.tsx          # Cash flow
├── WorldClassCRM.tsx               # CRM interface
└── ...
```

### **AI Agents**
```
components/
├── AIBusinessAgent.tsx            # AI agent
├── ACTBusinessAgent.tsx            # ACT-specific agent
├── AIAgentChat.tsx                # Chat interface
├── SimpleBusinessAgent.tsx         # Simplified agent
├── BusinessAgentDashboard.tsx      # Agent dashboard
├── BusinessAutopilot.tsx          # Autopilot mode
└── ...
```

### **Specialized Components**
```
components/
├── CuriousTractorResearch.tsx      # Research hub
├── StoryManagement.tsx             # Story management
├── ProjectPortfolio.tsx            # Portfolio view
├── CommunityNetwork.tsx             # Network visualization
├── ReceiptProcessor.tsx             # Receipt processing
├── ApiTester.tsx                   # API testing
└── ...
```

### **UI Components** (Reusable)
```
components/ui/
├── Button.tsx                      # Button component
├── Card.tsx                        # Card container
├── MetricCard.tsx                  # Metric display
├── StatusBadge.tsx                 # Status indicator
├── LoadingSpinner.tsx               # Loading state
├── SearchInput.tsx                 # Search field
└── ...
```

---

## 🎣 Custom Hooks (10 total)

### **Data Hooks**
```
hooks/
├── useGoals.ts             # ⭐ Goals data management
├── useRealData.ts         # Real-time data
├── useOperationsData.ts    # Operations metrics
└── ...
```

### **Feature Hooks**
```
hooks/
├── useNavigate.ts          # Navigation logic
├── useProjectDetail.ts    # Project details
├── useSubscriptions.ts     # Subscription tracking
├── useBrainCenter.ts      # Brain center state
├── useCommandCenter.ts     # Command center
└── ...
```

### **Utility Hooks**
```
hooks/
├── useMigration.ts         # Migration state
└── ...
```

---

## 🔌 Services (4 total)

### **API Services**
```
services/
├── api.ts                 # ⭐ Main API client
├── supabase.ts           # Supabase client
├── subscriptionApi.ts     # Subscription API
└── migrationApi.ts       # Migration API
```

---

## ⚙️ Configuration & Utils

### **Config**
```
config/
└── env.ts                # Environment variables
```

### **Types**
```
types/
├── project.ts            # Project types
└── subscription.ts       # Subscription types
```

### **Constants**
```
constants/
└── themeColors.ts       # Theme colors
```

### **Utils**
```
utils/
├── api.ts                # API utilities
├── projectStage.ts       # Project stage logic
└── moonPhase.ts          # Moon phase calculations
```

---

## 🎯 Main Features

### **1. Goals Dashboard** ⭐
**Location:** `components/dashboard/GoalsDashboard.tsx`  
**Hook:** `hooks/useGoals.ts`  
**Purpose:** Main goals interface with drag-and-drop

**Related Files:**
- `components/dashboard/GoalCard.tsx`
- `components/dashboard/GoalsCalendarView.tsx`
- `hooks/useGoals.ts`

### **2. Dashboard** ⭐
**Location:** `components/Dashboard.tsx`  
**Purpose:** Main landing dashboard

**Related Components:**
- `components/DashboardLanding.tsx`
- `components/DashboardInsights.tsx`
- `components/EnhancedDashboard.tsx`

### **3. Projects**
**Location:** `components/Projects.tsx`  
**Hook:** `hooks/useProjectDetail.ts`  
**Purpose:** Project management

### **4. Intelligence**
**Location:** `components/Intelligence.tsx`  
**Purpose:** AI intelligence hub

### **5. Brain Center**
**Location:** `components/dashboard/ACTBrainCenter.tsx`  
**Hook:** `hooks/useBrainCenter.ts`  
**Purpose:** AI brain center

### **6. Subscriptions**
**Location:** `components/dashboard/SubscriptionsTab.tsx`  
**Hook:** `hooks/useSubscriptions.ts`  
**Service:** `services/subscriptionApi.ts`  
**Purpose:** Track and manage subscriptions

---

## 🚀 Quick Navigation Commands

### Find Components by Name
```bash
# Find goals-related
find . -name "*goal*" -type f

# Find dashboard components
find . -name "*dashboard*" -type f

# Find all TypeScript files
find . -name "*.tsx" -o -name "*.ts" | sort
```

### Find Functions
```bash
# Search for function definitions
grep -r "function " src/
grep -r "const " src/ | grep "= ()"
```

### Find Hooks
```bash
# List all hooks
ls -la src/hooks/
```

---

## 📋 Common Tasks

### Adding a New Component
```bash
# 1. Create component
touch src/components/NewComponent.tsx

# 2. Add to App.tsx if needed
# Edit src/App.tsx

# 3. Create hook if needed
touch src/hooks/useNewComponent.ts
```

### Working on Goals Dashboard
```bash
# Main files
src/components/dashboard/GoalsDashboard.tsx      # Main component
src/components/dashboard/GoalCard.tsx            # Individual card
src/components/dashboard/GoalsCalendarView.tsx   # Calendar view
src/hooks/useGoals.ts                           # Data hook
```

### Working on API
```bash
# Main API
src/services/api.ts                             # API client
src/config/env.ts                               # Environment config

# Example usage in component
import { api } from '../services/api'
const data = await api.getDashboardOverview()
```

### Styling
```bash
# Global styles
src/index.css

# Component styles (CSS-in-JS or Tailwind)
# Most components use Tailwind classes
```

---

## 🎨 Architecture Patterns

### 1. Component Structure
```typescript
// Standard component pattern
import { useState } from 'react'

interface Props {
  title: string
}

export function ComponentName({ title }: Props) {
  const [state, setState] = useState()
  
  return (
    <div className="...">
      {/* JSX */}
    </div>
  )
}
```

### 2. Hook Pattern
```typescript
// Standard hook pattern
import { useState, useEffect } from 'react'

export function useHookName() {
  const [data, setData] = useState()
  
  useEffect(() => {
    // Fetch data
  }, [])
  
  return { data }
}
```

### 3. Service Pattern
```typescript
// API service pattern
export class ApiService {
  async request<T>(endpoint: string): Promise<T> {
    // API logic
  }
}

export const api = new ApiService()
```

---

## 🔍 Key Files to Know

### **Essential Files**
1. `src/App.tsx` - Main application, routing logic
2. `src/components/dashboard/GoalsDashboard.tsx` - Main feature
3. `src/services/api.ts` - API client
4. `src/hooks/useGoals.ts` - Goals data
5. `src/config/env.ts` - Environment config

### **Entry Points**
- `src/main.tsx` - Vite entry point
- `src/App.tsx` - React app entry
- `package.json` - Dependencies & scripts

---

## 💡 Development Tips

### 1. Finding Components
```bash
# Find component by feature
grep -r "Goals" src/components/

# Find by file type
find src/ -name "*.tsx" | grep -i goal
```

### 2. Understanding Data Flow
```bash
# Check hooks for data
cat src/hooks/useGoals.ts

# Check API calls
cat src/services/api.ts | grep goal
```

### 3. Component Dependencies
```bash
# Check imports in component
head -20 src/components/dashboard/GoalsDashboard.tsx
```

---

## 🗂️ Component Categories

### **Layout (2)**
- `components/layout/Layout.tsx`
- `components/layout/Sidebar.tsx`

### **Dashboard Tabs (25)**
- `components/dashboard/*.tsx` (25 files)

### **Business Logic (40)**
- `components/*.tsx` (Main feature components)

### **UI Components (13)**
- `components/ui/*.tsx` (Reusable UI)

### **Intelligence (3)**
- `components/intelligence/*.tsx`

### **Subscriptions (6)**
- `components/subscriptions/*.tsx`

### **Tabs (1)**
- `components/tabs/*.tsx`

---

## 📊 File Statistics

| Type | Count |
|------|-------|
| **Total Files** | 172 |
| Components | 129 |
| Hooks | 10 |
| Services | 4 |
| Utils | 3 |
| Types | 2 |

---

## ✅ Best Practices

### 1. File Organization
- One component per file
- Use descriptive names
- Group related components in folders
- Keep hooks with their features

### 2. Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts`
- Utils: `camelCase.ts`
- Types: `camelCase.ts`

### 3. Import Order
```typescript
// 1. React imports
import { useState } from 'react'

// 2. Library imports
import { SomeLib } from 'library'

// 3. Relative imports
import { api } from '../services/api'
import { Component } from './Component'
```

---

## 🎯 Quick Reference

### Most Important Components
1. **`App.tsx`** - Main app & routing
2. **`GoalsDashboard.tsx`** - Main goals feature
3. **`Dashboard.tsx`** - Main dashboard
4. **`Intelligence.tsx`** - AI intelligence
5. **`api.ts`** - API client

### Most Important Hooks
1. **`useGoals.ts`** - Goals data
2. **`useRealData.ts`** - Real-time data
3. **`useBrainCenter.ts`** - Brain center
4. **`useNavigate.ts`** - Navigation

### Key Services
1. **`api.ts`** - Main API
2. **`supabase.ts`** - Database client
3. **`subscriptionApi.ts`** - Subscriptions
4. **`migrationApi.ts`** - Migrations

---

**Happy Coding! 🚀**

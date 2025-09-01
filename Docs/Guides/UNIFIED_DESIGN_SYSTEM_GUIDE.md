# ACT Unified Design System Implementation Guide

## 🎯 **Goal: 100% Consistent UX Across All Dashboards**

Every dashboard should look, feel, and behave exactly the same way. Users should know exactly what to expect with every click.

## 🏗️ **Core System Components**

### 1. **Unified Theme** (`/src/theme/unified-design-system.ts`)
- **Single source of truth** for all colors, spacing, typography, shadows
- **Consistent color palette**: Primary blue, secondary green, status colors
- **Standardized spacing scale**: xs(4px) → 4xl(96px)
- **Typography hierarchy**: xs(12px) → 5xl(48px)

### 2. **Layout Wrapper** (`/src/components/layout/UnifiedDashboardLayout.tsx`)
- **StandardDashboard**: Standard layout with header
- **FullWidthDashboard**: For data visualizations
- **MinimalDashboard**: No header, just content
- **DashboardCard**: Consistent card pattern
- **DashboardGrid**: Responsive grid layouts
- **StatCard**: Standardized metrics display

### 3. **Global Navigation** (`/src/components/ui/DashboardNavigation.tsx`)
- **Floating menu button** (top-left) on ALL pages
- **Current location indicator** 
- **Categorized navigation** (Main, AI, Planning, Analysis, Tools)
- **25+ dashboard links** with descriptions

## 🔧 **How to Convert Any Dashboard**

### Step 1: Import Unified Components
```tsx
// REPLACE OLD IMPORTS:
import { Card, CardContent } from '../old-components';

// WITH UNIFIED IMPORTS:
import { 
  StandardDashboard, 
  DashboardCard, 
  DashboardGrid, 
  StatCard, 
  ActionButton, 
  StatusBadge 
} from '../components/layout/UnifiedDashboardLayout';
```

### Step 2: Replace Layout Structure
```tsx
// OLD PATTERN:
return (
  <div className="min-h-screen bg-some-color">
    <header className="custom-header">
      <h1>Custom Title</h1>
    </header>
    <main className="custom-content">
      {/* content */}
    </main>
  </div>
);

// NEW UNIFIED PATTERN:
return (
  <StandardDashboard
    title="Dashboard Title"
    description="Dashboard description"
    headerActions={<ActionButton>Action</ActionButton>}
  >
    {/* content */}
  </StandardDashboard>
);
```

### Step 3: Replace Cards and Components
```tsx
// OLD PATTERN:
<div className="bg-white p-4 rounded border">
  <h3>Card Title</h3>
  <p>Content</p>
</div>

// NEW UNIFIED PATTERN:
<DashboardCard title="Card Title" description="Card description">
  <p>Content</p>
</DashboardCard>
```

### Step 4: Use Standard Components
```tsx
// Buttons
<ActionButton variant="primary">Primary Action</ActionButton>
<ActionButton variant="secondary">Secondary Action</ActionButton>

// Status Badges
<StatusBadge variant="success">Active</StatusBadge>
<StatusBadge variant="warning">Pending</StatusBadge>

// Stat Cards
<StatCard 
  title="Active Projects" 
  value="52" 
  subtitle="Across 5 regions"
  icon={Target}
  trend="up"
  trendValue="+12%"
/>

// Grid Layouts
<DashboardGrid columns={3}>
  <DashboardCard>Content 1</DashboardCard>
  <DashboardCard>Content 2</DashboardCard>
  <DashboardCard>Content 3</DashboardCard>
</DashboardGrid>
```

## 📋 **Complete Conversion Checklist**

### ✅ **Visual Consistency**
- [ ] Uses StandardDashboard wrapper
- [ ] Consistent background gradient (blue-50 to green-50)  
- [ ] Unified header pattern with title/description
- [ ] Standard card styling (white background, subtle shadow)
- [ ] Consistent spacing using theme values
- [ ] Proper typography hierarchy

### ✅ **Navigation Consistency** 
- [ ] Global floating navigation menu available
- [ ] Current location indicator shows
- [ ] No custom sidebars or conflicting navigation
- [ ] Consistent menu behavior

### ✅ **Component Consistency**
- [ ] ActionButton for all buttons (primary/secondary variants)
- [ ] StatusBadge for all status indicators  
- [ ] DashboardCard for all content containers
- [ ] StatCard for all metrics displays
- [ ] DashboardGrid for responsive layouts

### ✅ **Interaction Consistency**
- [ ] Hover effects match design system
- [ ] Consistent transition timing (200ms)
- [ ] Focus states follow accessibility patterns
- [ ] Loading states use standard spinners

## 🎨 **Design System Rules**

### **Colors**
- **Primary Blue**: `#0ea5e9` for main actions
- **Secondary Green**: `#22c55e` for success/community
- **Status Colors**: Green (success), Yellow (warning), Red (error)
- **Cultural Safety**: Green (#22c55e) for safe, Yellow/Red for issues

### **Spacing**
- **Card padding**: `p-6` (24px)
- **Grid gaps**: `gap-6` (24px)  
- **Button padding**: `px-4 py-2` (16px/8px)
- **Page content**: Max-width 80rem, centered

### **Typography**
- **Page titles**: `text-3xl font-bold` (30px)
- **Card titles**: `text-lg font-semibold` (18px)
- **Body text**: `text-base` (16px)
- **Captions**: `text-sm text-gray-600` (14px)

### **Shadows**
- **Cards**: `shadow-sm` with `hover:shadow-md`
- **Floating elements**: `shadow-lg`
- **Modals**: `shadow-xl`

## 🚀 **Implementation Priority**

### **Phase 1: Core Dashboards**
1. ✅ Main Dashboard (`/dashboard`) - DONE
2. ✅ Calendar Planning (`/calendar-planning`) - IN PROGRESS  
3. ✅ Farmhand AI (`/farmhand`) - IN PROGRESS
4. Real Community Dashboard (`/real-dashboard`)
5. Ecosystem View (`/ecosystem`)

### **Phase 2: AI & Intelligence**
1. Intelligence Hub (`/intelligence`)
2. Gmail Intelligence (`/gmail-intelligence`)
3. Relationship Intelligence (`/relationship-intelligence`)
4. Decision Intelligence (`/decision-intelligence`)

### **Phase 3: Projects & Data**
1. Projects (`/projects`)
2. Opportunities (`/opportunities`)
3. Analytics (`/analytics`)
4. Network (`/network`)

### **Phase 4: Tools & Admin**
1. Daily Habits (`/daily-habits`)
2. Gmail Sync (`/gmail-sync`)
3. Testing pages
4. Media management

## 🔧 **Development Workflow**

1. **Before touching any dashboard:**
   - Import unified components
   - Replace layout wrapper
   - Update all cards and buttons
   - Test navigation consistency

2. **Testing checklist:**
   - Navigate between pages (should feel identical)
   - Test responsive behavior
   - Verify color consistency
   - Check spacing and typography

3. **Quality gates:**
   - No custom CSS classes for layout/spacing
   - All interactive elements use ActionButton
   - All status indicators use StatusBadge
   - Navigation menu works from every page

## 🎯 **Success Metrics**

- **Visual Consistency**: 100% of dashboards use unified layout
- **Navigation Consistency**: Floating menu available on 100% of pages
- **Component Consistency**: 0 custom buttons/cards outside design system
- **User Experience**: Users can navigate without learning new patterns

## 📝 **Quick Reference**

```tsx
// STANDARD DASHBOARD TEMPLATE
import { StandardDashboard, DashboardCard, DashboardGrid, StatCard, ActionButton, StatusBadge } from '../components/layout/UnifiedDashboardLayout';

const MyDashboard = () => (
  <StandardDashboard
    title="My Dashboard"
    description="Dashboard description"
    headerActions={
      <ActionButton variant="primary">
        Primary Action  
      </ActionButton>
    }
  >
    <DashboardGrid columns={3}>
      <StatCard title="Metric" value="123" icon={SomeIcon} />
      <DashboardCard title="Content">
        <p>Dashboard content</p>
      </DashboardCard>
    </DashboardGrid>
  </StandardDashboard>
);
```

## 🎉 **Result**

- **One design system** for all 25+ dashboards
- **Consistent UX** - users know what to expect
- **Easy maintenance** - change once, update everywhere  
- **Professional appearance** - cohesive platform experience
- **Accessible** - consistent focus states and interactions
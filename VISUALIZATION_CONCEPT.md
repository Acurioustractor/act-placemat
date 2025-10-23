# 🌊 ACT Impact Visualization - "The Flow of Capacity"

## Core Concept: Showing Obsolescence Through Impact

The visualization shows how ACT's work **flows through communities**, building capacity that makes ACT itself obsolete.

## Visual Design: Three-Layer Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHERE (Locations)                             │
│  [Palm Island] [Witta] [Brisbane] [Mount Isa] [Sydney]...      │
└────────────┬────────────────────────────────────────────────────┘
             │ Flows down to...
             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    WHAT (Themes & Work)                          │
│  [Storytelling] [Youth Justice] [Health] [Culture]...           │
└────────────┬────────────────────────────────────────────────────┘
             │ Flows down to...
             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    HOW (Values & Approach)                       │
│  [Decentralised Power] [Community Control] [Data Sovereignty]   │
└────────────┬────────────────────────────────────────────────────┘
             │ Results in...
             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    IMPACT (Community Capacity)                   │
│  👥 X Storytellers  🤝 X Partners  💰 $X Managed by Community  │
└─────────────────────────────────────────────────────────────────┘
```

## Visualization Components

### 1. **Sankey/Flow Diagram** (Primary)
Shows the flow from:
- **Locations** → **Themes** → **Values** → **Impact**
- Width of flow = number of projects
- Color = theme category
- Interactive: hover to see specific projects

### 2. **Impact Dashboard** (Below Map)
Four key metrics showing obsolescence in action:

```
┌──────────────────────────────────────────────────────────────┐
│  Community Capacity Built                                     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  📍 16 Places               🎭 52 Storytellers               │
│    Community-owned data       Trusted voices activated       │
│                                                               │
│  🤝 70 Partners             💰 $XXX,XXX                      │
│    Local organizations        In community hands             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3. **Thematic Intersection Matrix**
Shows how themes intersect across locations:

```
                Storytelling  Youth Justice  Health  Culture
Palm Island         ●●●            ○            ●       ●●
Witta               ●              ○            ●●●     ●
Brisbane            ●●             ●●           ●●      ○
Mount Isa           ○              ●●●          ●       ●
```

### 4. **Obsolescence Tracker**
Shows progress toward community independence:

```
Community Readiness Score
├─────────────────────────────────────┤
│ ████████████░░░░░░░░ 65%            │
│                                      │
│ ✅ Data owned locally                │
│ ✅ Stories self-managed              │
│ ⏳ Funding independence growing      │
│ ⏳ Technical capacity building       │
└──────────────────────────────────────┘
```

## Design Principles

### 1. **Flow Over Static**
- Data flows like water through the ecosystem
- Shows movement and transformation
- Represents capacity building as continuous

### 2. **Community at the Center**
- Every metric ends with "in community hands"
- Shows decentralization visually
- Highlights storytellers and local partners

### 3. **Obsolescence as Success**
- Higher "community readiness" = closer to obsolescence
- Shows ACT as scaffolding, not permanent structure
- Celebrates handover and independence

### 4. **Beautiful Simplicity**
- Clear, immediate visual impact
- No jargon, accessible to everyone
- Mobile-friendly, responsive

## Interactive Features

### Hover States
- **Location**: Highlights all projects in that location
- **Theme**: Shows all locations working on that theme
- **Project**: Displays full impact metrics

### Filter Modes
- **By Impact**: Show high-revenue or high-partner projects
- **By Status**: Active vs. complete (showing obsolescence)
- **By Theme**: Deep dive into one area

### Story Mode
Click "Tell the Story" → Animated walkthrough:
1. "We work in 16 communities..."
2. "Across 8 different themes..."
3. "Always building toward community control..."
4. "Here's the impact so far..."

## Technical Implementation

### Libraries to Use
- **D3.js** for Sankey diagram
- **Recharts** for simple bar/area charts
- **Framer Motion** for smooth animations
- **TailwindCSS** for styling

### Data Sources (Already Available!)
```javascript
projects.map(p => ({
  location: p.relatedPlaces,
  themes: p.themes,
  values: p.coreValues,
  impact: {
    storytellers: p.storytellerCount,
    partners: p.partnerCount,
    revenue: p.revenueActual + p.revenuePotential
  }
}))
```

## Example Output

```
ACT Community Impact Dashboard
═══════════════════════════════

[Interactive Map Above]

┌─────────────────────────────────────────────┐
│                                              │
│     THE FLOW OF CAPACITY BUILDING            │
│                                              │
│  [Palm Island]─────┐                         │
│  [Witta]──────────┼─→ [Storytelling]─┐      │
│  [Brisbane]────────┤                  │      │
│  [Mount Isa]───────┴─→ [Youth Justice]┼─→   │
│  [Sydney]─────────┬─→ [Health]────────┘      │
│  [Darwin]─────────┘                          │
│                                              │
│              ↓                               │
│                                              │
│  [Decentralised Power]                       │
│  [Community Control]                         │
│  [Data Sovereignty]                          │
│                                              │
│              ↓                               │
│                                              │
│  52 Storytellers | 70 Partners | $XXX,XXX   │
│     All in Community Hands                   │
│                                              │
└─────────────────────────────────────────────┘

Progress Toward Community Independence
├─────────────────────────────────────┤
█████████████░░░░░░░ 68%

✅ Communities own their data
✅ Stories self-managed
⏳ Building toward full independence
```

## Why This Works

1. **Tells the Story**: Visual narrative of capacity building
2. **Shows Interconnection**: How everything relates
3. **Celebrates Obsolescence**: Progress = independence
4. **Data-Driven**: All from existing Notion data
5. **Beautiful**: Inspiring and shareable
6. **Simple**: Anyone can understand in 10 seconds

## Next Steps

1. Build the Sankey flow component
2. Add impact metrics dashboard
3. Create intersection matrix
4. Add obsolescence progress tracker
5. Make it all interactive and animated

This visualization becomes your **impact story** - showing that ACT's success is measured by how quickly communities don't need ACT anymore.

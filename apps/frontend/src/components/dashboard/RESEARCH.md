# ACT Movement Dashboard - Research & Design Decisions

## v4 Research-Driven Implementation

This document captures the deep research that informed the Movement Dashboard v4 design.

---

## Part 1: World-Class Dashboard Research

### Bloomberg Terminal: Concealed Complexity
**Source**: [Bloomberg UX Design](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/)

- Command bar accesses 350,000+ functions
- Keyboard-driven navigation for power users
- Information-dense but clear hierarchy
- AI prioritizes communication in hundreds of chat windows

**Applied to ACT**: `CommandBar.tsx` with ⌘K universal access

---

### Humans of New York: Radical Simplicity
**Source**: [HONY Visual Storytelling](https://ijnet.org/en/story/visual-storytelling-lessons-humans-new-york)

- One portrait + a few hundred words
- No ads, newsletters, sponsored posts
- $20M+ raised through individual stories
- Minimal post-production ("keep attention on people")

**Applied to ACT**: `StoryHero.tsx` - stories are the hero, UI disappears

---

### Superhuman: The 100ms Rule
**Source**: Industry research on perceived speed

- Perceived "instant" = 34-137ms response
- Optimistic updates before server confirms
- Pre-fetch on hover
- Everything feels immediate

**Applied to ACT**:
- CSS transitions use 100-150ms duration
- Skeleton loading for >1s fetches
- Optimistic UI updates

---

### Framer Motion: Spring Physics
**Source**: Framer Motion documentation + animation research

Spring parameters for natural feel:
- **Snappy** (buttons): `stiffness: 200, damping: 20`
- **Smooth** (panels): `stiffness: 100, damping: 15`
- **Gentle** (pages): `stiffness: 60, damping: 15`
- **Bouncy** (celebrations): `stiffness: 300, damping: 10`

**Applied to ACT**: `motion.ts` exports spring presets

CSS approximation:
```css
transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

### Stripe: CIELAB Color System
**Source**: Stripe design system documentation

- Perceptually uniform color progression
- Design tokens for consistency
- Dark mode support built-in

**Applied to ACT**: Progress ring uses interpolated colors based on progress %

---

### Figma: Multiplayer Presence
**Source**: [Figma Multiplayer Technology](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)

- Cursors show colleagues working alongside
- "Created connection, especially vital for remote teams"
- 95% of edits saved within 600ms

**Applied to ACT**: `Presence.tsx` shows who's working in real-time

---

### Charity:Water: Personal Impact
**Source**: [Lifetime Impact Dashboard](https://www.charitywater.org/stories/lifetime-impact)

- Every dollar = 1,100 liters (concrete translation)
- Personal contribution tracking per supporter
- 19 standardized metrics across 35K+ households

**Applied to ACT**: `PersonalImpact.tsx` - "You've helped 12 storytellers..."

---

### HEY/Basecamp: Calm Technology
**Source**: [37signals - Designing HEY](https://37signals.com/podcast/designing-hey/)

- "Inbox Zero is a tyrannical scam" - reject anxiety-driven paradigms
- User controls what gets attention
- Async by default, real-time sometimes

**Applied to ACT**:
- No notification counts anywhere
- No urgency indicators
- Calm, focused attention

---

### Animikii: Indigenous Data Sovereignty
**Source**: [Animikii Indigenous Technology](https://animikii.com/)

- "Technology must be guided by values"
- Cultural protocols enforced, not suggested
- Connect people to culture, not replace connection

**Applied to ACT**: `ElderReviewQueue.tsx` - OCAP compliance is structural

---

## Part 2: Micro-Interaction Patterns

### Button Micro-Interactions
Research shows these create "juice" (game design term for abundant feedback):

```
Hover: scale(1.02), translateY(-1px), shadow-md
Press: scale(0.98), translateY(0), shadow-sm
```

**Timing**: 150ms with spring cubic-bezier

### Card Lift Effect
```
Hover: translateY(-2px), shadow-lg
Default: translateY(0), shadow-sm
```

### Skeleton Loading
**When to show**: Only for fetches >1 second
**Pattern**: Match final layout exactly, subtle pulse animation
**Color**: `bg-slate-200` with `animate-pulse`

### Celebration Moments
- Progress ring fills on Beautiful Obsolescence milestones
- Toast notification with achievement message
- Optional confetti burst (canvas-confetti)

---

## Part 3: Accessibility

### Reduced Motion Support
All animations respect `prefers-reduced-motion`:

```tsx
// Hook
useReducedMotion() → boolean

// CSS
motion-reduce:transition-none
motion-reduce:hover:translate-y-0
```

### Focus States
All interactive elements have:
```css
focus:outline-none
focus-visible:ring-2
focus-visible:ring-offset-2
```

---

## Part 4: v4 Component Architecture

### New in v4
| Component | Purpose | Research Basis |
|-----------|---------|----------------|
| `motion.ts` | Spring presets | Framer Motion |
| `useReducedMotion.ts` | Accessibility | Apple HIG |
| `Button.tsx` | Micro-interactions | UX research |
| `InteractiveCard.tsx` | Lift effects | Material Design |
| `Skeleton.tsx` | Loading states | Superhuman |
| `Celebration.tsx` | Milestones | GitHub psychology |

### Updated in v4
| Component | Enhancement |
|-----------|-------------|
| `BeautifulObsolescence.tsx` | Progress ring, journey indicator |
| `MovementDashboard.tsx` | Celebration system integration |

---

## Part 5: Design Principles Applied

### 1. Story-First
The first thing you see is a human story, not metrics.

### 2. Command Bar Mastery
Power users navigate entirely via ⌘K.

### 3. Presence Felt
Users feel part of a community, not alone.

### 4. Obsolescence Celebrated
Projects reaching 100% community get prominent celebration.

### 5. Calm Achieved
No urgency indicators, no anxiety, focused attention.

### 6. Cultural Protocols Honored
Elder review is structural, not optional.

### 7. Personal Impact Visible
Every user sees their concrete contribution.

---

## Part 6: The Test

> "Would someone who reads the ACT Development Philosophy look at this dashboard and say: 'Yes, this embodies our values'?"

If the dashboard could work for any nonprofit by changing the logo, it's not ACT enough.

**This dashboard should feel like:**
- Opening a book of stories (HONY)
- With Bloomberg's power via keyboard (⌘K)
- Linear's opinionated beauty
- HEY's calm focus
- Figma's multiplayer presence
- Charity:Water's personal impact
- Animikii's cultural sovereignty

**It should NOT feel like:**
- Salesforce
- Monday.com
- Generic SaaS dashboard
- Metrics overload
- Notification anxiety

---

*"The goal is not efficiency. The goal is transformation."*

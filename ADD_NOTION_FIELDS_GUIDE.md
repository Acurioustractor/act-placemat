# Adding Phase 1 Essential Fields to Notion

**Date**: October 25, 2025
**Purpose**: Step-by-step guide to add Beautiful Obsolescence tracking fields to Projects database

---

## 🎯 Fields to Add (in order)

### 1. Community Ownership %
**How to Add:**
1. Open your Notion Projects database
2. Click "+ Add a property" (top right of any column)
3. Name: `Community Ownership %`
4. Type: **Number**
5. Format: Click the number format dropdown → Select **Percent**
6. Description (optional): "What % of decision-making, operations, and resources does the community control? 80%+ = Ready for Beautiful Obsolescence"

**Why First**: This is THE core metric for Beautiful Obsolescence readiness.

---

### 2. Rocket Booster Stage
**How to Add:**
1. Click "+ Add a property"
2. Name: `Rocket Booster Stage`
3. Type: **Select**
4. Add these 5 options (in order):
   - 🚀 Launch (ACT-intensive, 0-6 months)
   - 🛸 Orbit (ACT-supported, 6-18 months)
   - ✈️ Cruising (ACT-adjacent, 18-36 months)
   - 🏠 Landed (Community-owned, 36+ months)
   - 🌅 Obsolete (Thriving independently)
5. Color coding suggestion:
   - 🚀 Launch: Red
   - 🛸 Orbit: Orange
   - ✈️ Cruising: Yellow
   - 🏠 Landed: Green
   - 🌅 Obsolete: Blue
6. Description: "Where is this project in the handover journey?"

---

### 3. Core Community Pod
**How to Add:**
1. Click "+ Add a property"
2. Name: `Core Community Pod`
3. Type: **Relation**
4. Relation to: **People** (or create a People database if you don't have one)
5. ✅ Check "Allow multiple relations"
6. Description: "The 3-5 people who would continue this project without ACT. Tag the OWNERS, not just participants."

**Note**: If you don't have a People database yet:
1. Create new database called "People"
2. Add fields: Name, Email, Skills, Projects Involved, Connection to ACT
3. Then come back and set up this relation

---

### 4. Connection to Witta
**How to Add:**
1. Click "+ Add a property"
2. Name: `Connection to Witta`
3. Type: **Select**
4. Add these 6 options (in order):
   - None
   - 🌱 Aware (knows about Witta)
   - 🌿 Visiting (has been once)
   - 🌳 Active (regular engagement)
   - 🌲 Rooted (deeply embedded)
   - 🏔️ Caretaking (now supports others)
5. Color coding:
   - None: Gray
   - 🌱 Aware: Light green
   - 🌿 Visiting: Green
   - 🌳 Active: Dark green
   - 🌲 Rooted: Blue
   - 🏔️ Caretaking: Purple
6. Description: "How integrated is this project with Witta ecosystem?"

---

### 5. Relationship Density
**How to Add:**
1. Click "+ Add a property"
2. Name: `Relationship Density`
3. Type: **Select**
4. Add these 4 options:
   - 🔴 Isolated (0-5 connections)
   - 🟡 Developing (6-15 connections)
   - 🟢 Resilient (16-30 connections)
   - 💚 Antifragile (31+ connections)
5. Description: "How many active relationships does this project have in the ecosystem? More = healthier network."

**How to Estimate**:
Count: partner orgs + supporters + related projects + core pod members + teaching relationships

---

### 6. Decision-Making Autonomy
**How to Add:**
1. Click "+ Add a property"
2. Name: `Decision-Making Autonomy`
3. Type: **Select**
4. Add these 4 options (in order):
   - ACT-led
   - Co-designed
   - Community-led (ACT advisor)
   - Fully Autonomous
5. Description: "Who makes the decisions? Target: Community-led or Autonomous = Beautiful Obsolescence ready"

---

### 7. Who They're Teaching
**How to Add:**
1. Click "+ Add a property"
2. Name: `Who They're Teaching`
3. Type: **Relation**
4. Relation to: **Projects** (same database - self-referential) OR **People**
5. ✅ Check "Allow multiple relations"
6. Description: "🔥 KEY METRIC: Are they teaching others? When projects become teachers = autonomy achieved!"

**This is THE Beautiful Obsolescence indicator**: If a project is teaching 3+ others, they've internalized the work and no longer need ACT.

---

## 📊 Create "Beautiful Obsolescence Pipeline" View

After adding all fields:

1. In your Projects database, click "+ New view" (top left)
2. Choose **Board** view
3. Name: `Beautiful Obsolescence Pipeline`
4. **Group by**: Rocket Booster Stage
5. **Sort**: Community Ownership % (descending)
6. **Properties to show**:
   - Name
   - Status
   - Community Ownership %
   - Core Community Pod
   - Connection to Witta
   - Relationship Density
   - Decision-Making Autonomy
   - Who They're Teaching

**Result**: You'll see projects organized by stage, with closest-to-obsolescence at top of each column!

---

## 🎯 Quick Start: Backfill Top 10 Projects

Once fields are added, fill in estimates for your most active projects:

### Example: BG Fit
```
Community Ownership %: 65%
Rocket Booster Stage: ✈️ Cruising
Core Community Pod: [Tag 3-5 key people]
Connection to Witta: 🌿 Visiting
Relationship Density: 🟢 Resilient (20+ connections)
Decision-Making Autonomy: Co-designed
Who They're Teaching: [Empty for now - they're still learning]
```

### Example: Goods. (if close to handover)
```
Community Ownership %: 95%
Rocket Booster Stage: 🌅 Obsolete
Core Community Pod: [Tag the community leaders]
Connection to Witta: 🌲 Rooted
Relationship Density: 💚 Antifragile
Decision-Making Autonomy: Fully Autonomous
Who They're Teaching: [Tag 2-3 projects they're mentoring]
```

### Example: New Project (just starting)
```
Community Ownership %: 10%
Rocket Booster Stage: 🚀 Launch
Core Community Pod: [Maybe 1-2 people]
Connection to Witta: None or 🌱 Aware
Relationship Density: 🔴 Isolated
Decision-Making Autonomy: ACT-led
Who They're Teaching: [Empty]
```

---

## ⚡ Pro Tips

### 1. Involve Community in Tagging
Don't fill these alone! Ask project leads:
- "Who's your core pod - the 3-5 people who'd keep this going without us?"
- "On a scale of 0-100%, how much do you control vs. how much do we control?"
- "Who are YOU teaching now?"

### 2. Start with Estimates
Don't get paralyzed by precision. Start with gut estimates and refine over time.

### 3. Use Formula for Revenue Independence
If you have `Budget` and `Actual Incoming` fields, add this formula field:

**Field Name**: `Revenue Independence %`
**Type**: Formula
**Formula**:
```
if(prop("Budget") > 0, prop("Actual Incoming") / prop("Budget") * 100, 0)
```

This auto-calculates financial independence!

---

## 🎉 Success Criteria

You'll know this is working when:

✅ All 65 projects have Community Ownership % filled in
✅ Beautiful Obsolescence Pipeline view shows clear stages
✅ You can instantly see which projects are closest to handover
✅ Team starts talking about "getting to 80% community ownership"
✅ You identify 3-5 projects ready for Beautiful Obsolescence celebration! 🌅

---

## 🔥 Next: Once Phase 1 is Complete

After adding these fields and backfilling data:

1. **Week 2**: Add Gift Economy fields (Value Given/Received)
2. **Week 3**: Add Ecosystem Role classifications
3. **Week 4**: Create Witta Learning Journeys database
4. **Week 5**: Launch first Witta residency cohort!

---

**Ready?** Start with field #1 (Community Ownership %) and work through the list. Should take about 30 minutes to add all fields. 🚀

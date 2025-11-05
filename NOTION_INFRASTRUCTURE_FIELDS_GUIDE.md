# Notion Infrastructure Tracking Fields Setup Guide

## Overview
This guide explains how to add the new infrastructure, storytelling, and grant dependency tracking fields to your ACT Projects Notion database.

## Fields to Add to Notion Projects Database

### 1. Project Type (Select)
**Property Name:** `Project Type`
**Type:** Select
**Options:**
- 🏗️ Infrastructure Building
- 📖 Storytelling
- 🌾 Regenerative Enterprise
- 🎓 Skills & Employment
- 🌟 Mixed

**Purpose:** Quickly identify what type of impact the project creates

---

### 2. Community Labor Metrics (JSON in Text field)
**Property Name:** `Community Labor Metrics`
**Type:** Text (will store JSON)

**Example JSON structure:**
```json
{
  "youngPeople": {
    "count": 27,
    "hoursContributed": 520
  },
  "communityMembers": {
    "count": 15,
    "hoursContributed": 380
  },
  "livedExperience": {
    "count": 12,
    "hoursContributed": 240,
    "description": "Previously incarcerated, long-term unemployed"
  },
  "unskilledLabor": {
    "count": 35,
    "hoursContributed": 780
  },
  "skilledLabor": {
    "count": 9,
    "hoursContributed": 140
  },
  "skillsTransferred": [
    {
      "skill": "Construction basics",
      "peopleTrained": 27,
      "certificationsEarned": 18
    },
    {
      "skill": "Scaffolding safety",
      "peopleTrained": 15,
      "certificationsEarned": 15
    },
    {
      "skill": "Tool handling",
      "peopleTrained": 27,
      "certificationsEarned": 0
    }
  ],
  "contractorEquivalentCost": 115000,
  "actualCost": 28000,
  "communityValueCreated": 87000,
  "employabilityOutcomes": "8 young people gained employment in construction",
  "physicalAssets": [
    {
      "type": "Covered gathering space",
      "quantity": 1,
      "unit": "structure"
    },
    {
      "type": "Seating",
      "quantity": 30,
      "unit": "seats"
    }
  ]
}
```

**Purpose:** Track the TRUE economics of community-built infrastructure

---

### 3. Storytelling Metrics (JSON in Text field)
**Property Name:** `Storytelling Metrics`
**Type:** Text (will store JSON)

**Example JSON structure:**
```json
{
  "activeStorytellers": 12,
  "potentialStorytellers": 128,
  "storiesCaptured": 47,
  "storyOpportunities": 450,
  "trainingGap": 116,
  "captureRate": 0.104,
  "averageStoryReach": 18000,
  "totalCurrentReach": 216000,
  "potentialReach": 2304000,
  "storytellersInTraining": 8,
  "storiesInProduction": 15
}
```

**Purpose:** Visualize the untapped storytelling potential and scale opportunity

---

### 4. Grant Dependency Metrics (JSON in Text field)
**Property Name:** `Grant Dependency Metrics`
**Type:** Text (will store JSON)

**Example JSON structure:**
```json
{
  "grantFunding": 175000,
  "marketRevenue": 82000,
  "totalRevenue": 257000,
  "grantDependencyPercentage": 68.1,
  "historicalData": [
    {"year": 2023, "grantPercentage": 90.0, "marketPercentage": 10.0},
    {"year": 2024, "grantPercentage": 75.0, "marketPercentage": 25.0},
    {"year": 2025, "grantPercentage": 68.1, "marketPercentage": 31.9}
  ],
  "targetGrantIndependenceDate": "2027-06-30",
  "targetGrantPercentage": 30,
  "socialImpactPerGrantDollar": 3.2,
  "socialImpactPerMarketDollar": 4.8
}
```

**Purpose:** Show the path from grant dependency to market viability

---

## Quick Setup Instructions

### Option 1: Manual Setup (5 minutes)
1. Open your ACT Projects database in Notion
2. Click "+" to add new properties
3. Add the 4 properties above with the correct types
4. For the 3 JSON fields, copy the example JSON into a text editor to use as a template

### Option 2: Start with Key Projects
You don't need to fill in all 65 projects immediately. Start with:
1. **Train Station - Townsville** (Infrastructure)
2. **Artnapa Homestead - Alice Springs** (Infrastructure + Storytelling)
3. **Mount Yarns - Mount Druitt** (Mixed)

Copy the example JSON from [INFRASTRUCTURE_STORYTELLING_IMPLEMENTATION.md](./INFRASTRUCTURE_STORYTELLING_IMPLEMENTATION.md) for these projects.

---

## What Happens After Setup

Once you add these fields to Notion and populate a few projects:

1. **Backend automatically syncs** - The next 5-minute cache refresh will pull the new fields
2. **Frontend displays badges** - Projects with a `Project Type` will show colored badges
3. **Metrics panels appear** - Projects with metrics will show quick stats on cards
4. **Detail pages expand** - Full component cards (CommunityLaborValueCard, etc.) can be added to detail pages

---

## Alternative: Backend Script to Populate Fields

If you'd prefer, we can create a script to:
1. Detect infrastructure projects based on keywords (Train, Homestead, Building, etc.)
2. Automatically add `Project Type` classifications
3. Create placeholder JSON structures for metrics to be filled in later

Would you like me to create this automation script?

---

## Files Reference

- [CommunityProjects.tsx](apps/frontend/src/components/CommunityProjects.tsx) - Main component reading these fields
- [types/project.ts](apps/frontend/src/types/project.ts) - TypeScript interfaces for all metrics
- [INFRASTRUCTURE_STORYTELLING_IMPLEMENTATION.md](./INFRASTRUCTURE_STORYTELLING_IMPLEMENTATION.md) - Complete implementation details with example data

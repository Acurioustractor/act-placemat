# Stories Integration Setup Guide

This guide explains how to integrate blog posts/stories into the ACT Project Portfolio using Notion as a CMS.

## Option 1: Notion as Primary CMS (Recommended for MVP)

### Step 1: Create Stories Database in Notion

Create a new database in Notion with the following properties:

**Required Fields:**
- **Title** (title) - Story title
- **Content** (rich text) - Full story content
- **Summary** (text) - Short description/excerpt
- **Project** (relation) - Link to Projects database
- **Published Date** (date) - When the story was published
- **Author** (person or text) - Story author
- **Cover Image** (files) - Hero image for the story
- **Status** (select) - Draft, Published, Archived

**Optional Fields:**
- **Tags** (multi-select) - Story categories/tags
- **Featured** (checkbox) - Highlight special stories
- **Slug** (text) - URL-friendly identifier
- **External URL** (URL) - Link to Webflow or external blog post

### Step 2: Backend Integration

Add to `apps/backend/server.js`:

```javascript
// Add Stories API endpoint
app.get('/api/real/stories', async (req, res) => {
  try {
    const { projectId } = req.query;

    const stories = await notionService.getStories({
      projectId,
      status: 'Published',
      sortBy: 'publishedDate',
      sortDirection: 'desc'
    });

    res.json({
      stories,
      count: stories.length
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});
```

### Step 3: Frontend Display

Stories will automatically appear on project detail pages with:
- Story title and excerpt
- Cover image
- Author and date
- Link to read more

### Step 4: Database Configuration

In your `.env`:
```
NOTION_STORIES_DATABASE_ID=your-stories-database-id-here
```

## Option 2: Hybrid Approach (Webflow + Notion)

If you prefer to write rich blog posts in Webflow but still link them to projects:

### In Notion Stories Database:
- Add **External URL** field
- Keep minimal metadata (title, summary, project link, Webflow URL)
- Display as "Featured Stories" section on project pages

### In Webflow CMS:
1. Create a "Blog" collection with rich content editing
2. Add a custom field: **Project ID** (text)
3. Use Webflow's publishing workflow

### Linking Process:
1. Publish story in Webflow
2. Copy the URL
3. Create entry in Notion Stories database
4. Link to project
5. Add Webflow URL as "External URL"

Portfolio will display:
- Story title, summary, image from Notion
- "Read More" button links to Webflow post

## Implementation Roadmap

### Phase 1: Basic Stories (Now)
- [ ] Create Notion Stories database
- [ ] Add NOTION_STORIES_DATABASE_ID to backend
- [ ] Create stories API endpoint
- [ ] Add stories section to project pages

### Phase 2: Rich Display
- [ ] Story detail pages in portfolio
- [ ] Story grid/list view
- [ ] Filter stories by theme/project
- [ ] Featured stories homepage widget

### Phase 3: Webflow Integration
- [ ] Webflow CMS setup for blogs
- [ ] Auto-sync between Webflow and Notion
- [ ] Embedded Webflow content in portfolio

## Quick Start

**Simplest path to get stories working:**

1. Create "Stories" database in Notion
2. Add relation to your Projects database
3. Create a few test stories
4. Get the database ID from Notion URL
5. Add to backend `.env`
6. Stories will appear on project pages!

---

## Example Story Entry

**Title:** "Bringing Indigenous Storytelling to Life in Mount Isa"

**Project:** Link to "BG Fit" project

**Summary:** How BG Fit is empowering Indigenous youth through fitness, cultural connection, and storytelling...

**Published Date:** March 15, 2025

**Author:** Benjamin Knight

**Cover Image:** [Upload image]

**Status:** Published

**External URL:** (Optional) https://act.place/blog/indigenous-storytelling-mount-isa

---

Once set up, stories automatically appear on:
- Individual project pages (related stories)
- Homepage (featured stories)
- Stories archive page (all published stories)

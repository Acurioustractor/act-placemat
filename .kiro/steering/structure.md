# ACT Placemat - Project Structure & Organization

## Root Directory Structure

```
ACT Placemat/
├── index.html              # Main application (HTML/CSS/JS all-in-one)
├── server.js               # Express server with Notion API proxy
├── notion-mcp.js           # Notion MCP integration classes
├── notion-integration.js   # Legacy integration (deprecated)
├── package.json            # Node.js dependencies and scripts
├── package-lock.json       # Dependency lock file
├── .env                    # Environment variables (not in git)
├── .env.example           # Environment template
├── .gitignore             # Git ignore rules
├── README.md              # Project documentation
└── Docs/                  # Documentation folder
    ├── Placemat code.md   # Original code documentation
    └── Placemat how.md    # Usage documentation
```

## File Responsibilities

### Core Application Files

- **`index.html`**: Single-file frontend application containing all HTML, CSS, and JavaScript
- **`server.js`**: Express.js server providing Notion API proxy and static file serving
- **`notion-mcp.js`**: Notion integration using Model Context Protocol pattern

### Configuration Files

- **`package.json`**: Node.js project configuration, dependencies, and npm scripts
- **`.env`**: Environment variables (Notion token, database ID) - never commit to git
- **`.env.example`**: Template showing required environment variables

### Documentation

- **`README.md`**: Comprehensive setup instructions, features, and troubleshooting
- **`Docs/`**: Additional documentation and code examples

## Code Organization Patterns

### Single-File Frontend (`index.html`)
```html
<!DOCTYPE html>
<html>
<head>
    <!-- Meta tags and title -->
    <style>
        /* All CSS embedded here */
        /* Organized by component: header, cards, projects, etc. */
    </style>
</head>
<body>
    <!-- HTML structure -->
    <script src="notion-mcp.js"></script>
    <script>
        /* All JavaScript embedded here */
        /* Functions organized by purpose: data, UI, events */
    </script>
</body>
</html>
```

### Notion Integration (`notion-mcp.js`)
```javascript
// Class-based organization
class NotionMCP { /* Core API integration */ }
class PlacematNotionIntegration { /* App-specific wrapper */ }

// Browser/Node.js compatibility
if (typeof window !== 'undefined') {
    window.NotionMCP = NotionMCP;
} else {
    module.exports = { NotionMCP };
}
```

### Server Structure (`server.js`)
```javascript
// Express setup and middleware
// API endpoints: /api/notion/query, /api/health
// Static file serving
// Error handling and logging
```

## Data Structure Conventions

### Project Object Schema
```javascript
{
    id: string,              // Unique identifier
    name: string,            // Project title
    area: string,            // One of 5 main areas
    description: string,     // Project description
    status: string,          // Active, Building, Harvest
    funding: string,         // Funded, Needs Funding, etc.
    lead: string,           // Project leader/organization
    beneficiaries: string,   // Who benefits from project
    practices: array,        // How the work is done
    tests: array,           // Specific experiments
    stories: string,        // Community stories available
    tags: array,            // Project tags/categories
    lastModified: string    // ISO timestamp
}
```

### Area Mapping
```javascript
const areaMapping = {
    'Story & Sovereignty': 'story-sovereignty',
    'Economic Freedom': 'economic-freedom',
    'Community Engagement': 'community-engagement',
    'Operations & Infrastructure': 'operations-infrastructure',
    'Research & Development': 'research-development'
};
```

## Naming Conventions

### Files
- Use kebab-case for multi-word files: `notion-mcp.js`
- Use descriptive names: `server.js`, not `app.js`
- Keep documentation in `Docs/` folder with descriptive names

### CSS Classes
- Use kebab-case: `.area-card`, `.project-item`
- Component-based naming: `.area-card .area-title`
- State classes: `.active`, `.show`, `.hidden`

### JavaScript
- Use camelCase for variables and functions: `toggleMainArea()`
- Use PascalCase for classes: `NotionMCP`, `PlacematNotionIntegration`
- Use descriptive function names: `parseNotionResponse()`, not `parse()`

### HTML IDs
- Use kebab-case: `#story-sovereignty-count`
- Include component context: `#refresh-btn`, `#projectsContainer`

## Environment Configuration

### Required Environment Variables
```bash
NOTION_TOKEN=secret_token_here
NOTION_DATABASE_ID=database_id_here
NOTION_API_VERSION=2022-06-28  # Optional, has default
PORT=3000                      # Optional, defaults to 3000
```

### Development vs Production
- Development: Use `npm run dev` with nodemon for auto-reload
- Production: Use `npm start` for stable server
- Environment files should never be committed to version control

## Extension Points

### Adding New Project Areas
1. Update `areaMapping` object in `index.html`
2. Add corresponding area card in HTML
3. Update Notion database select options
4. Test filtering and display logic

### Adding New Project Fields
1. Update `parseNotionPage()` method in `notion-mcp.js`
2. Modify `createProjectHTML()` function in `index.html`
3. Adjust CSS styles for new fields
4. Update Notion database schema
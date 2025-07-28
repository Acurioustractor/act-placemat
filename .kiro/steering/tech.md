# ACT Placemat - Technical Stack & Guidelines

## Tech Stack

### Frontend
- **HTML5** with embedded CSS and JavaScript (single-file architecture)
- **Vanilla JavaScript** - No frontend frameworks, keeping it simple and accessible
- **CSS Grid & Flexbox** for responsive layouts
- **Progressive Enhancement** - works without JavaScript for basic functionality

### Backend
- **Node.js** with Express.js server
- **Notion API** integration via Model Context Protocol (MCP)
- **CORS** enabled for cross-origin requests
- **dotenv** for environment configuration

### Key Dependencies
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5", 
  "node-fetch": "^2.7.0",
  "dotenv": "^16.3.1",
  "nodemon": "^3.0.1"
}
```

## Architecture Patterns

### Single-File Frontend
- All HTML, CSS, and JavaScript in `index.html` for simplicity
- Embedded styles and scripts to minimize HTTP requests
- Progressive disclosure UI pattern for project exploration

### Notion MCP Integration
- `NotionMCP` class handles API communication
- `PlacematNotionIntegration` provides application-specific wrapper
- Caching layer with 5-minute timeout
- Graceful fallback to mock data when Notion unavailable

### Data Flow
1. **Initialization**: Load fallback data, attempt Notion connection
2. **User Interaction**: Area selection triggers filtering and display
3. **Real-time Updates**: Periodic checks for database changes
4. **Client-side Filtering**: Live project counts and status updates

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Install dependencies (alternative)
npm run install-deps
```

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit with your Notion credentials
# NOTION_TOKEN=your_integration_token
# NOTION_DATABASE_ID=your_database_id
```

### Testing Notion Integration
```bash
# Check server health and configuration
curl http://localhost:3000/api/health

# Test Notion API proxy
curl -X POST http://localhost:3000/api/notion/query \
  -H "Content-Type: application/json" \
  -d '{"databaseId":"your_database_id"}'
```

## Code Style Guidelines

### JavaScript
- Use modern ES6+ features where supported
- Prefer `const` and `let` over `var`
- Use template literals for string interpolation
- Implement error handling with try/catch blocks
- Log meaningful error messages for debugging

### CSS
- Mobile-first responsive design
- Use CSS Grid for layout, Flexbox for alignment
- Consistent color palette based on community values
- Smooth transitions for interactive elements
- Accessible color contrast ratios

### HTML
- Semantic HTML5 elements
- Proper ARIA labels for accessibility
- Progressive enhancement approach
- Clean, readable structure

## Performance Considerations

- **Caching**: 5-minute cache for Notion data
- **Lazy Loading**: Projects load on area selection
- **Minimal Dependencies**: Keep bundle size small
- **Graceful Degradation**: Works without JavaScript for basic viewing
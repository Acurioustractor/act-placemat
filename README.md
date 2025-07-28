# ACT Placemat

A real-time dashboard for visualizing and managing community projects with Notion database integration, built on the Empathy Ledger foundation for ethical storytelling and community impact tracking.

## 📚 Documentation

**📖 [Complete Documentation](./Docs/README.md)** - Comprehensive project documentation organized by category

**⭐ [Main Implementation Plan](./Docs/Implementation/EMPATHY_LEDGER_ACT_IMPLEMENTATION_PLAN.md)** - Detailed roadmap for building the public dashboard on Empathy Ledger foundation

### Quick Links
- **[Strategy Documents](./Docs/Strategy/)** - Project alignment and strategic planning
- **[Implementation Guides](./Docs/Implementation/)** - Technical implementation roadmaps
- **[Setup Guide](./Docs/Guides/QUICKSTART.md)** - Quick start and configuration
- **[Architecture](./Docs/Architecture/)** - System design and data architecture
- **[Progress Reports](./Docs/Reports/)** - Development progress and analysis results

## Features

- Interactive area cards for top-level navigation
- Real-time Notion database synchronization
- Advanced filtering by status, funding type, and other criteria
- Responsive design for desktop and mobile
- Community-focused project visualization

## Setup Instructions

### Prerequisites

- Node.js 14+ and npm
- A Notion account with integration capabilities
- Notion databases for projects, opportunities, organizations, people, and artifacts

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/act-placemat.git
   cd act-placemat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

4. Configure your Notion integration:
   - Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Create a new integration
   - Copy the integration token to your `.env` file as `NOTION_TOKEN`

5. Share your Notion databases with the integration:
   - Open each database in Notion
   - Click "Share" in the top right
   - Add your integration by name
   - Copy the database ID from the URL (the part after notion.so/ and before the ?) to your `.env` file

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NOTION_TOKEN` | Your Notion integration token | Yes | - |
| `NOTION_DATABASE_ID` or `NOTION_PROJECTS_DB` | Projects database ID | Yes | - |
| `NOTION_OPPORTUNITIES_DB` | Opportunities database ID | No | - |
| `NOTION_ORGANIZATIONS_DB` | Organizations database ID | No | - |
| `NOTION_PEOPLE_DB` | People database ID | No | - |
| `NOTION_ARTIFACTS_DB` | Artifacts database ID | No | - |
| `NOTION_API_VERSION` | Notion API version | No | 2022-06-28 |
| `CACHE_TIMEOUT` | Cache timeout in milliseconds | No | 300000 (5 minutes) |
| `AUTO_REFRESH_INTERVAL` | Auto-refresh interval in milliseconds | No | 300000 (5 minutes) |
| `MAX_API_RETRIES` | Maximum API retry attempts | No | 3 |
| `API_RETRY_DELAY` | Base delay between retries in milliseconds | No | 1000 (1 second) |
| `LOG_LEVEL` | Logging level (ERROR, WARN, INFO, DEBUG) | No | INFO in production, DEBUG in development |

## Notion Database Structure

### Projects Database

Required properties:
- `Name` (title): Project name
- `Area` (select): One of the five main areas
- `Status` (select): Project status (Active, Building, Harvest, etc.)
- `Description` (rich text): Project description

Optional properties:
- `Funding` (select): Funding status
- `Project Lead` (rich text or people): Project leader
- `Team Members` (people): Team members
- `Tags` (multi-select): Project tags
- `Revenue Actual` (number): Actual revenue
- `Revenue Potential` (number): Potential revenue

### Opportunities Database

Required properties:
- `Name` (title): Opportunity name
- `Stage` (select): Opportunity stage
- `Amount` (number): Opportunity amount
- `Probability` (select or number): Success probability

### Organizations Database

Required properties:
- `Name` (title): Organization name
- `Type` (select): Organization type
- `Status` (select): Relationship status

### People Database

Required properties:
- `Name` (title): Person's name
- `Role` (rich text): Person's role

### Artifacts Database

Required properties:
- `Name` (title): Artifact name
- `Type` (select): Artifact type
- `Status` (select): Artifact status

## Development

### Available Scripts

- `npm run dev`: Start the development server with auto-reload
- `npm start`: Start the production server
- `npm test`: Run tests
- `npm run build`: Build the client for production

### Project Structure

- `server.js`: Express server with Notion API proxy
- `notion-mcp-enhanced.js`: Notion integration using Model Context Protocol
- `config.js`: Configuration management
- `utils/`: Utility functions for logging, error handling, and API requests
- `index.html`: Main application (HTML/CSS/JS all-in-one)

## Troubleshooting

### Common Issues

1. **"Notion API token not configured" error**
   - Check that you've added your Notion integration token to the `.env` file
   - Verify that the token is correct and not expired

2. **"Database ID is required" error**
   - Ensure you've added the correct database IDs to your `.env` file
   - Check that the database IDs are in the correct format

3. **"No access to database" error**
   - Make sure you've shared each database with your integration
   - Check that your integration has the necessary permissions

4. **Empty data or missing fields**
   - Verify that your database has the required properties
   - Check that the property names match what the application expects

### Getting Help

If you encounter issues not covered here, please:
1. Check the server logs for detailed error messages
2. Verify your Notion API token and database IDs
3. Ensure your databases have the required properties
4. Open an issue on GitHub with detailed information about the problem
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

// Import configuration and utilities
const { config, validateConfig } = require('./config');
const { logger, errorHandler } = require('../../utils/logger');
const { makeNotionRequest } = require('../../utils/apiUtils');
const NotionMCP = require('../integrations/notion-mcp');
const PlacematNotionIntegration = require('../integrations/notion-integration');

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Helper functions
function hasContent(obj) {
    if (obj === null || obj === undefined || obj === '') return false;
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return true;
    if (Array.isArray(obj)) return obj.length > 0 && obj.some(item => hasContent(item));
    if (typeof obj === 'object') {
        return Object.values(obj).some(value => hasContent(value));
    }
    return false;
}

function isEmptyFilter(filter) {
    if (!filter || typeof filter !== 'object') return true;
    if (Object.keys(filter).length === 0) return true;
    return !hasContent(filter);
}

async function debugEmptyResults(databaseId, filters) {
    console.log('⚠️ Filter applied but 0 results. Fetching sample data to debug...');
    
    const sampleResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.notion.token}`,
            'Notion-Version': config.notion.apiVersion,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page_size: 3 })
    });
    
    if (sampleResponse.ok) {
        const sampleData = await sampleResponse.json();
        const sampleStatuses = sampleData.results?.map(item => ({
            id: item.id.substring(0, 8),
            status: item.properties?.Status?.select?.name || 'No Status',
            area: item.properties?.['Project Area']?.select?.name || item.properties?.Area?.select?.name || 'No Area'
        }));
        console.log('📊 Sample data from database:', sampleStatuses);
    }
}

// Request logging middleware
app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.url}`, {
        query: req.query,
        body: req.method === 'POST' ? req.body : undefined,
    });
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        notion: {
            configured: !!config.notion.token,
            database_configured: !!config.notion.databases.projects
        }
    });
});


// Notion API proxy endpoint
app.post('/api/notion/query', async (req, res) => {
    try {
        const { databaseId, filters = {}, sorts = [] } = req.body;

        if (!databaseId) {
            return res.status(400).json({ error: 'Database ID is required' });
        }

        if (!config.notion.token) {
            return res.status(401).json({
                error: 'Notion API token not configured',
                message: 'Please set the NOTION_TOKEN environment variable',
                setup: 'See .env.example for configuration instructions'
            });
        }

        const requestBody = {
            page_size: 100 // Increase to handle larger datasets
        };

        // Only add filters if they have actual content and are not empty objects
        if (filters && Object.keys(filters).length > 0 && !isEmptyFilter(filters)) {
            requestBody.filter = filters;
        }

        // Only add sorts if array has content
        if (sorts && sorts.length > 0) {
            requestBody.sorts = sorts;
        }


        logger.info(`Proxying request to Notion database: ${databaseId.substring(0, 8)}...`);
        logger.debug('Notion query parameters', { filters, sorts });

        // Single fast request - no pagination for speed
        const data = await makeNotionRequest(
            async () => {
                const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.notion.token}`,
                        'Notion-Version': config.notion.apiVersion,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                    throw Object.assign(new Error(`Notion API error: ${response.status}`), {
                        response: {
                            status: response.status,
                            statusText: response.statusText,
                            data: errorData
                        }
                    });
                }

                return await response.json();
            },
            { operation: `query database ${databaseId.substring(0, 8)}... fast` }
        );

        logger.info(`Successfully fetched ${data.results?.length || 0} items from Notion database`);
        
        // Debug empty results if filters were applied
        if (filters && Object.keys(filters).length > 0 && data.results?.length === 0) {
            await debugEmptyResults(databaseId, filters);
        }
        
        res.json(data);

    } catch (error) {
        logger.error('Notion proxy error', error);
        
        // Send a user-friendly error response
        const statusCode = error.response?.status || 500;
        res.status(statusCode).json({
            error: error.code || 'NOTION_API_ERROR',
            message: error.message || 'An error occurred while communicating with Notion',
            details: error.details
        });
    }
});


// Configuration endpoint for frontend
app.get('/api/config', (req, res) => {
    res.json({
        databases: {
            projects: config.notion.databases.projects,
            opportunities: config.notion.databases.opportunities,
            organizations: config.notion.databases.organizations,
            people: config.notion.databases.people,
            artifacts: config.notion.databases.artifacts,
        },
        status: {
            notion_configured: config.notion.isConfigured,
            projects_available: Boolean(config.notion.databases.projects),
            opportunities_available: Boolean(config.notion.databases.opportunities),
            organizations_available: Boolean(config.notion.databases.organizations),
            people_available: Boolean(config.notion.databases.people),
            artifacts_available: Boolean(config.notion.databases.artifacts),
        }
    });
});

// Diagnostic routes for testing data flow
app.get('/api/debug/projects', async (req, res) => {
    try {
        logger.info('Debug: Testing projects data flow');
        
        const response = await fetch(`https://api.notion.com/v1/databases/${config.notion.databases.projects}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.notion.token}`,
                'Notion-Version': config.notion.apiVersion,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ page_size: 100 })
        });
        
        const data = await response.json();
        
        res.json({
            success: response.ok,
            database_id: config.notion.databases.projects,
            count: data.results?.length || 0,
            has_more: data.has_more,
            sample_titles: data.results?.slice(0, 5).map(r => 
                r.properties?.Name?.title?.[0]?.plain_text || 'Untitled'
            ) || [],
            raw_sample: data.results?.[0] ? {
                id: data.results[0].id,
                properties: Object.keys(data.results[0].properties || {})
            } : null
        });
        
    } catch (error) {
        logger.error('Debug projects error', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/debug/frontend-flow', async (req, res) => {
    try {
        logger.info('Debug: Testing full frontend data flow');
        
        // Simulate what the frontend does
        const projectsResponse = await fetch(`http://localhost:${config.server.port}/api/notion/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                databaseId: config.notion.databases.projects
            })
        });
        
        const projectsData = await projectsResponse.json();
        
        res.json({
            step: 'frontend_simulation',
            projects_endpoint: `http://localhost:${config.server.port}/api/notion/query`,
            request_body: {
                databaseId: config.notion.databases.projects
            },
            response: {
                success: projectsResponse.ok,
                status: projectsResponse.status,
                count: projectsData.results?.length || 0,
                has_more: projectsData.has_more,
                error: projectsData.error || null
            },
            sample_data: projectsData.results?.slice(0, 2) || []
        });
        
    } catch (error) {
        logger.error('Debug frontend flow error', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to fetch ALL database schemas
app.get('/api/debug/database-schemas', async (req, res) => {
    try {
        console.log('🔍 Fetching ALL database schemas...');
        
        const schemas = {};
        
        // Get all database IDs from config
        const databases = {
            projects: config.notion.databases.projects,
            opportunities: config.notion.databases.opportunities || config.notion.databases.projects, // fallback
            organizations: config.notion.databases.organizations || config.notion.databases.projects, // fallback  
            people: config.notion.databases.people || config.notion.databases.projects, // fallback
        };

        for (const [name, databaseId] of Object.entries(databases)) {
            if (!databaseId) continue;
            
            try {
                console.log(`📊 Fetching schema for ${name} database: ${databaseId.substring(0, 8)}...`);
                
                // Fetch database schema
                const schemaResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${config.notion.token}`,
                        'Notion-Version': config.notion.apiVersion,
                    }
                });

                if (schemaResponse.ok) {
                    const schemaData = await schemaResponse.json();
                    
                    // Extract property information
                    const properties = {};
                    for (const [propName, propData] of Object.entries(schemaData.properties || {})) {
                        properties[propName] = {
                            type: propData.type,
                            ...(propData.type === 'select' && propData.select?.options ? {
                                options: propData.select.options.map(opt => ({ name: opt.name, color: opt.color }))
                            } : {}),
                            ...(propData.type === 'multi_select' && propData.multi_select?.options ? {
                                options: propData.multi_select.options.map(opt => ({ name: opt.name, color: opt.color }))
                            } : {})
                        };
                    }
                    
                    schemas[name] = {
                        id: databaseId,
                        title: schemaData.title?.[0]?.plain_text || name,
                        properties
                    };
                    
                    console.log(`✅ Got ${Object.keys(properties).length} properties for ${name}`);
                } else {
                    console.warn(`⚠️ Failed to fetch schema for ${name}: ${schemaResponse.status}`);
                    schemas[name] = { error: `HTTP ${schemaResponse.status}` };
                }
            } catch (error) {
                console.error(`❌ Error fetching schema for ${name}:`, error.message);
                schemas[name] = { error: error.message };
            }
        }

        res.json({
            success: true,
            schemas,
            summary: Object.entries(schemas).map(([name, schema]) => ({
                database: name,
                properties: schema.properties ? Object.keys(schema.properties).length : 0,
                error: schema.error || null
            }))
        });

    } catch (error) {
        console.error('❌ Database schemas debug error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start server
app.listen(config.server.port, () => {
    console.log(`🚀 ACT Placemat server running on http://localhost:${config.server.port}`);
    
    // Debug environment variables (production-safe)
    console.log('\nEnvironment variables:');
    console.log('NOTION_TOKEN:', process.env.NOTION_TOKEN ? 'Present' : 'Missing');
    console.log('NOTION_DATABASE_ID:', process.env.NOTION_DATABASE_ID ? 'Present' : 'Missing');
    
    // Debug config object (production-safe)
    console.log('\nConfig object:');
    console.log('config.notion.token:', config.notion.token ? 'Present' : 'Missing');
    console.log('config.notion.databases.projects:', config.notion.databases.projects ? 'Present' : 'Missing');
    
    console.log(`\n📊 Notion integration: ${config.notion.token ? '✅ Token configured' : '❌ Token missing'}`);
    console.log(`🗄️  Database ID: ${config.notion.databases.projects ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🔧 Mode: ${config.server.isDevelopment ? 'Development' : 'Production'}`);
    
    // Validate configuration
    // validateConfig();
});

module.exports = app;
// Notion MCP (Model Context Protocol) Integration
// This provides a complete Notion database integration for the ACT Placemat

class NotionMCP {
    constructor(config = {}) {
        // Browser-compatible environment variable access
        this.token = config.token || this.getEnvVar('NOTION_TOKEN');
        this.databaseId = config.databaseId || this.getEnvVar('NOTION_DATABASE_ID');
        this.apiVersion = config.apiVersion || this.getEnvVar('NOTION_API_VERSION') || '2022-06-28';
        this.baseUrl = 'https://api.notion.com/v1';
        
        if (!this.token || !this.databaseId) {
            console.warn('Notion token or database ID not provided. Using mock data.');
            this.useMockData = true;
        }
    }

    // Browser-compatible environment variable getter
    getEnvVar(name) {
        // In browser, we can't access process.env directly
        // This is a placeholder - in production, you'd pass config directly
        if (typeof process !== 'undefined' && process.env) {
            return process.env[name];
        }
        return null;
    }

    async fetchProjects() {
        if (this.useMockData) {
            console.log('Using mock data - no valid Notion credentials');
            return this.getMockData();
        }

        try {
            console.log('Attempting to fetch from Notion database:', this.databaseId);
            const response = await this.queryDatabase();
            console.log('Notion API raw response:', response);
            
            if (response.results && response.results.length === 0) {
                console.warn('Notion database is empty or integration lacks access');
                console.log('Database URL: https://notion.so/your-workspace/' + this.databaseId);
                console.log('Make sure the integration has access to this database');
            }
            
            const projects = this.parseNotionResponse(response);
            console.log(`Parsed ${projects.length} projects from Notion`);
            return projects;
        } catch (error) {
            console.error('Error fetching from Notion:', error);
            console.error('Error details:', {
                status: error.status,
                message: error.message,
                token: this.token ? 'Present' : 'Missing',
                databaseId: this.databaseId
            });
            // Fallback to mock data if API fails
            return this.getMockData();
        }
    }

    async queryDatabase(filters = {}, sorts = []) {
        const requestBody = {
            databaseId: this.databaseId,
            filters: filters,
            sorts: sorts
        };

        console.log('Notion API request via proxy:', {
            url: '/api/notion/query',
            body: requestBody
        });

        const response = await fetch('/api/notion/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('Notion API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                errorData: errorData
            });
            
            // Provide specific error messages for common issues
            if (response.status === 401) {
                throw new Error('Notion API error: Invalid or expired token. Check your NOTION_TOKEN.');
            } else if (response.status === 404) {
                throw new Error('Notion API error: Database not found or integration lacks access. Check your NOTION_DATABASE_ID and ensure the integration is shared with the database.');
            } else if (response.status === 403) {
                throw new Error('Notion API error: Integration lacks permission to access this database. Share the database with your integration.');
            } else {
                throw new Error(`Notion API error: ${response.status} - ${errorData.message || response.statusText}`);
            }
        }

        return await response.json();
    }

    parseNotionResponse(response) {
        return response.results.map(page => this.parseNotionPage(page));
    }

    parseNotionPage(page) {
        const props = page.properties;
        
        // Extract all available data from your actual Notion structure
        const projectData = {
            id: page.id,
            name: this.extractText(props.Name || props.Title),
            description: this.extractText(props.Description),
            status: this.extractSelect(props.Status),
            funding: this.extractSelect(props.Funding),
            lead: this.extractText(props['Project Lead']) || this.extractPeople(props['Project Lead']),
            location: this.extractSelect(props.Location),
            state: this.extractSelect(props.State),
            themes: this.extractMultiSelect(props.Theme),
            tags: this.extractMultiSelect(props.Tags),
            coreValues: this.extractSelect(props['Core Values']),
            place: this.extractSelect(props.Place),
            revenueActual: this.extractNumber(props['Revenue Actual']),
            revenuePotential: this.extractNumber(props['Revenue Potential']),
            potentialIncoming: this.extractNumber(props['Potential Incoming']),
            actualIncoming: this.extractNumber(props['Actual Incoming']),
            aiSummary: this.extractText(props['AI summary']),
            nextMilestone: this.extractDate(props['Next Milestone Date']),
            lastModified: page.last_edited_time,
            url: page.url
        };

        // Use AI-powered categorization instead of manual area mapping
        projectData.area = this.categorizeProject(projectData);
        
        return projectData;
    }
    
    // Map Notion area values to local area names
    mapNotionAreaToLocal(notionArea) {
        if (!notionArea || notionArea.trim() === '') {
            return 'Operations & Infrastructure'; // Default area for empty values
        }
        
        // Direct mapping for exact matches
        const areaMapping = {
            'Story & Sovereignty': 'Story & Sovereignty',
            'Economic Freedom': 'Economic Freedom',
            'Community Engagement': 'Community Engagement', 
            'Operations & Infrastructure': 'Operations & Infrastructure',
            'Research & Development': 'Research & Development',
            // Add common variations
            'Story and Sovereignty': 'Story & Sovereignty',
            'Operations and Infrastructure': 'Operations & Infrastructure',
            'Research and Development': 'Research & Development',
            'R&D': 'Research & Development',
            'Ops': 'Operations & Infrastructure',
            'Infrastructure': 'Operations & Infrastructure',
            'Community': 'Community Engagement',
            'Economic': 'Economic Freedom',
            'Story': 'Story & Sovereignty'
        };
        
        return areaMapping[notionArea] || 'Operations & Infrastructure';
    }

    extractText(property) {
        if (!property) return '';
        
        switch (property.type) {
            case 'title':
                return property.title.map(t => t.plain_text).join('');
            case 'rich_text':
                return property.rich_text.map(t => t.plain_text).join('');
            default:
                return '';
        }
    }

    extractSelect(property) {
        if (!property || property.type !== 'select') return '';
        return property.select?.name || '';
    }

    extractMultiSelect(property) {
        if (!property) return [];
        
        if (property.type === 'multi_select') {
            return property.multi_select.map(item => item.name);
        } else if (property.type === 'rich_text') {
            const text = this.extractText(property);
            return text.split(',').map(item => item.trim()).filter(item => item);
        }
        
        return [];
    }

    extractNumber(property) {
        if (!property || property.type !== 'number') return 0;
        return property.number || 0;
    }

    extractDate(property) {
        if (!property || property.type !== 'date') return null;
        return property.date?.start || null;
    }

    extractPeople(property) {
        if (!property || property.type !== 'people') return '';
        return property.people.map(person => person.name).join(', ');
    }

    // AI-powered project categorization based on actual Notion data
    categorizeProject(projectData) {
        const categories = {
            'Story & Sovereignty': {
                keywords: ['storytelling', 'truth-telling', 'empathy', 'narrative', 'story', 'sovereignty', 'data sovereignty', 'indigenous'],
                themes: ['Storytelling', 'Truth-Telling', 'Indigenous', 'Data Sovereignty'],
                coreValues: ['Truth-Telling'],
                tags: ['Storytelling', 'Truth-Telling', 'Empathy Ledger'],
                projects: ['Empathy Ledger', 'Wilya Janta', 'ANAT SPECTRA', 'Barkly Backbone', 'Project Her Self', 'QFCC Empathy Ledger', 'Orange Sky Empathy Ledger', 'Indigenous Data Sovereignty']
            },
            'Economic Freedom': {
                keywords: ['economic', 'business', 'funding', 'revenue', 'financial', 'cooperative', 'ownership', 'community owned'],
                themes: ['Economic Freedom', 'Business'],
                coreValues: ['Economic Freedom'],
                tags: ['Business', 'Strategy', 'Economic'],
                projects: ['Community Ownership Models', 'Local Currency Initiative', 'Cooperative Development Program', 'Community Land Back Initiative', 'SEFA Partnership']
            },
            'Community Engagement': {
                keywords: ['community', 'engagement', 'participation', 'collaboration', 'mutual aid', 'democracy', 'participatory'],
                themes: ['Community Engagement', 'Global community'],
                coreValues: ['Community Ownership', 'Decentralised Power'],
                tags: ['Community', 'Collaboration', 'Connected'],
                projects: ['Community Engagement Platform', 'Youth Leadership Program', 'Mutual Aid Networks', 'Community Care Networks', 'Restorative Justice Circles']
            },
            'Operations & Infrastructure': {
                keywords: ['operations', 'infrastructure', 'systems', 'platform', 'technology', 'tools', 'business setup', 'legal'],
                themes: ['Operations', 'Technology'],
                coreValues: ['Operations'],
                tags: ['Operations', 'Technology', 'Strategy'],
                projects: ['ACT Business Setup', 'ACT Notion Tool Audit', 'DGR Community Category Application', 'SAF Foundation Master']
            },
            'Research & Development': {
                keywords: ['research', 'development', 'innovation', 'experiment', 'testing', 'creative', 'health', 'wellbeing'],
                themes: ['Research', 'Innovation', 'Health and wellbeing'],
                coreValues: ['Creativity', 'Radical Humility'],
                tags: ['Concept', 'Innovation', 'Research', 'Health'],
                projects: ['SMART Recovery', 'BG Fit', 'Goods', 'Witta Harvest HQ', 'BCV Reforest', 'Deadly Homes and Gardens']
            }
        };

        const scores = {};
        
        // Initialize scores
        Object.keys(categories).forEach(category => {
            scores[category] = 0;
        });

        // Analyze each category
        Object.entries(categories).forEach(([categoryName, categoryData]) => {
            // Check project name directly
            if (categoryData.projects.some(projName => 
                projectData.name.toLowerCase().includes(projName.toLowerCase()) ||
                projName.toLowerCase().includes(projectData.name.toLowerCase())
            )) {
                scores[categoryName] += 5; // High confidence for direct name match
            }

            // Check AI summary
            if (projectData.aiSummary) {
                const summaryText = projectData.aiSummary.toLowerCase();
                categoryData.keywords.forEach(keyword => {
                    if (summaryText.includes(keyword)) {
                        scores[categoryName] += 2;
                    }
                });
            }

            // Check themes
            if (projectData.themes && Array.isArray(projectData.themes)) {
                projectData.themes.forEach(theme => {
                    if (categoryData.themes.includes(theme)) {
                        scores[categoryName] += 3;
                    }
                });
            }

            // Check core values
            if (projectData.coreValues && categoryData.coreValues.includes(projectData.coreValues)) {
                scores[categoryName] += 2;
            }

            // Check tags
            if (projectData.tags && Array.isArray(projectData.tags)) {
                projectData.tags.forEach(tag => {
                    if (categoryData.tags.includes(tag)) {
                        scores[categoryName] += 1;
                    }
                });
            }

            // Check project name and description
            const projectText = `${projectData.name} ${projectData.description || ''}`.toLowerCase();
            categoryData.keywords.forEach(keyword => {
                if (projectText.includes(keyword)) {
                    scores[categoryName] += 1;
                }
            });
        });

        // Find the category with highest score
        const bestCategory = Object.entries(scores).reduce((a, b) => 
            scores[a[0]] > scores[b[0]] ? a : b
        )[0];

        // If no clear winner, use fallback logic
        if (scores[bestCategory] === 0) {
            // Fallback based on themes
            if (projectData.themes && projectData.themes.length > 0) {
                const theme = projectData.themes[0];
                if (theme.includes('Youth Justice') || theme.includes('Indigenous')) return 'Story & Sovereignty';
                if (theme.includes('Health') || theme.includes('wellbeing')) return 'Research & Development';
                if (theme.includes('Operations')) return 'Operations & Infrastructure';
                if (theme.includes('Economic')) return 'Economic Freedom';
            }
            
            // Final fallback
            return 'Operations & Infrastructure';
        }

        return bestCategory;
    }

    // Mock data for development/fallback
    getMockData() {
        return [
            {
                id: 'mock-1',
                name: 'Community Solar Network',
                area: 'Operations & Infrastructure',
                description: 'Distributed solar energy system connecting rural communities',
                status: 'Active',
                funding: 'Funded',
                lead: 'Maria Santos (Community Energy Collective)',
                beneficiaries: '15 rural households, 3 community centers',
                practices: ['Community ownership model', 'Peer-to-peer energy sharing', 'Local maintenance training'],
                tests: ['Grid-tie efficiency testing', 'Battery storage optimization', 'Community governance protocols'],
                stories: 'Available from participating households',
                tags: ['Energy', 'Community', 'Infrastructure'],
                lastModified: new Date().toISOString()
            },
            {
                id: 'mock-2',
                name: 'Empathy Ledger',
                area: 'Story & Sovereignty',
                description: 'Platform ensuring storytellers retain control and share in value created from their narratives',
                status: 'Active',
                funding: 'Funded',
                lead: 'Nicholas Herriman (ACT)',
                beneficiaries: 'Storytellers, communities sharing narratives',
                practices: ['Community-controlled storytelling', 'Value-sharing protocols', 'Consent management systems'],
                tests: ['Story ownership verification', 'Value distribution tracking', 'Community consent protocols'],
                stories: 'Storyteller empowerment testimonials available',
                tags: ['Truth-Telling', 'Community Ownership'],
                lastModified: new Date().toISOString()
            }
        ];
    }

    // Utility methods for filtering and sorting
    async getProjectsByArea(area) {
        const projects = await this.fetchProjects();
        return projects.filter(project => project.area === area);
    }

    async getProjectsByStatus(status) {
        const projects = await this.fetchProjects();
        return projects.filter(project => project.status === status);
    }

    async getProjectsByFunding(funding) {
        const projects = await this.fetchProjects();
        return projects.filter(project => project.funding === funding);
    }

    // Real-time updates (webhook simulation)
    setupRealTimeUpdates(callback, interval = 30000) {
        let lastUpdate = new Date();
        
        return setInterval(async () => {
            try {
                const projects = await this.fetchProjects();
                const recentlyUpdated = projects.filter(project => 
                    new Date(project.lastModified) > lastUpdate
                );
                
                if (recentlyUpdated.length > 0) {
                    lastUpdate = new Date();
                    callback(projects, recentlyUpdated);
                }
            } catch (error) {
                console.error('Error checking for updates:', error);
            }
        }, interval);
    }
}

// Integration with the main application
class PlacematNotionIntegration {
    constructor(config = {}) {
        this.notion = new NotionMCP(config);
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async getProjects(useCache = true) {
        const cacheKey = 'all_projects';
        
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const projects = await this.notion.fetchProjects();
        this.cache.set(cacheKey, {
            data: projects,
            timestamp: Date.now()
        });

        return projects;
    }

    async refreshProjects() {
        this.cache.clear();
        return await this.getProjects(false);
    }

    setupAutoRefresh(callback, interval = 5 * 60 * 1000) {
        return this.notion.setupRealTimeUpdates(callback, interval);
    }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
    window.NotionMCP = NotionMCP;
    window.PlacematNotionIntegration = PlacematNotionIntegration;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotionMCP, PlacematNotionIntegration };
}

// Configuration instructions
/*
SETUP INSTRUCTIONS:

1. Create Notion Integration:
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Name it "ACT Placemat Integration"
   - Copy the Internal Integration Token

2. Setup Database:
   - Create or use existing Notion database
   - Add these properties:
     * Name (Title)
     * Area (Select: Story & Sovereignty, Economic Freedom, Community Engagement, Operations & Infrastructure, Research & Development)
     * Description (Rich Text)
     * Status (Select: Active, Building, Harvest)
     * Funding (Select: Funded, Needs Funding, Self Funded, Community Owned)
     * Lead (Rich Text)
     * Beneficiaries (Rich Text)
     * Practices (Multi-select or Rich Text)
     * Tests (Multi-select or Rich Text)
     * Stories (Rich Text)
     * Tags (Multi-select)

3. Share Database:
   - Click "Share" on your database
   - Add your integration
   - Copy the database ID from the URL

4. Environment Variables:
   Set these in your environment or pass to constructor:
   - NOTION_TOKEN=your_integration_token
   - NOTION_DATABASE_ID=your_database_id

5. Usage:
   const integration = new PlacematNotionIntegration();
   const projects = await integration.getProjects();
*/
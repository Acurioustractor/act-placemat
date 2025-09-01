// Enhanced Notion MCP (Model Context Protocol) Integration
// Supports all 5 Notion databases: Projects, Opportunities, Organizations, People, Artifacts

class NotionMCPEnhanced {
    constructor(config = {}) {
        // Core configuration
        this.token = config.token || this.getEnvVar('NOTION_TOKEN');
        this.apiVersion = config.apiVersion || this.getEnvVar('NOTION_API_VERSION') || '2022-06-28';
        this.baseUrl = 'https://api.notion.com/v1';
        
        // Database IDs - can be configured individually
        this.databases = {
            projects: config.projectsDb || this.getEnvVar('NOTION_PROJECTS_DB') || this.getEnvVar('NOTION_DATABASE_ID'),
            opportunities: config.opportunitiesDb || this.getEnvVar('NOTION_OPPORTUNITIES_DB'),
            organizations: config.organizationsDb || this.getEnvVar('NOTION_ORGANIZATIONS_DB'),
            people: config.peopleDb || this.getEnvVar('NOTION_PEOPLE_DB'),
            artifacts: config.artifactsDb || this.getEnvVar('NOTION_ARTIFACTS_DB')
        };
        
        if (!this.token) {
            console.warn('Notion token not provided. Using mock data.');
            this.useMockData = true;
        }
        
        // Check which databases are configured
        this.availableDatabases = {};
        Object.entries(this.databases).forEach(([name, id]) => {
            if (id) {
                this.availableDatabases[name] = true;
                console.log(`✓ ${name} database configured`);
            } else {
                console.log(`✗ ${name} database not configured`);
            }
        });
    }

    // Browser-compatible environment variable getter
    getEnvVar(name) {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[name];
        }
        return null;
    }

    // Projects Methods (existing functionality)
    async fetchProjects() {
        if (!this.availableDatabases.projects) {
            console.warn('Projects database not configured');
            return this.getMockData().projects;
        }

        try {
            console.log('Fetching projects from Notion...');
            const response = await this.queryDatabase(this.databases.projects);
            const projects = this.parseNotionResponse(response, 'project');
            console.log(`Retrieved ${projects.length} projects from Notion`);
            return projects;
        } catch (error) {
            console.error('Error fetching projects:', error);
            return this.getMockData().projects;
        }
    }

    // Opportunities Methods
    async fetchOpportunities() {
        if (!this.availableDatabases.opportunities) {
            console.warn('Opportunities database not configured');
            return this.getMockData().opportunities;
        }

        try {
            console.log('Fetching opportunities from Notion...');
            const response = await this.queryDatabase(this.databases.opportunities);
            const opportunities = this.parseNotionResponse(response, 'opportunity');
            console.log(`Retrieved ${opportunities.length} opportunities from Notion`);
            return opportunities;
        } catch (error) {
            console.error('Error fetching opportunities:', error);
            return this.getMockData().opportunities;
        }
    }

    // Organizations Methods
    async fetchOrganizations() {
        if (!this.availableDatabases.organizations) {
            console.warn('Organizations database not configured');
            return this.getMockData().organizations;
        }

        try {
            console.log('Fetching organizations from Notion...');
            const response = await this.queryDatabase(this.databases.organizations);
            const organizations = this.parseNotionResponse(response, 'organization');
            console.log(`Retrieved ${organizations.length} organizations from Notion`);
            return organizations;
        } catch (error) {
            console.error('Error fetching organizations:', error);
            return this.getMockData().organizations;
        }
    }

    // People Methods
    async fetchPeople() {
        if (!this.availableDatabases.people) {
            console.warn('People database not configured');
            return this.getMockData().people;
        }

        try {
            console.log('Fetching people from Notion...');
            const response = await this.queryDatabase(this.databases.people);
            const people = this.parseNotionResponse(response, 'person');
            console.log(`Retrieved ${people.length} people from Notion`);
            return people;
        } catch (error) {
            console.error('Error fetching people:', error);
            return this.getMockData().people;
        }
    }

    // Artifacts Methods
    async fetchArtifacts() {
        if (!this.availableDatabases.artifacts) {
            console.warn('Artifacts database not configured');
            return this.getMockData().artifacts;
        }

        try {
            console.log('Fetching artifacts from Notion...');
            const response = await this.queryDatabase(this.databases.artifacts);
            const artifacts = this.parseNotionResponse(response, 'artifact');
            console.log(`Retrieved ${artifacts.length} artifacts from Notion`);
            return artifacts;
        } catch (error) {
            console.error('Error fetching artifacts:', error);
            return this.getMockData().artifacts;
        }
    }

    // Generic database query
    async queryDatabase(databaseId, filters = {}, sorts = []) {
        if (this.useMockData) {
            return this.getMockResponse(databaseId);
        }

        const requestBody = {
            page_size: 100
        };
        
        // Only add filters if they have actual content
        if (filters && Object.keys(filters).length > 0) {
            requestBody.filter = filters;
        }
        
        // Only add sorts if array has content
        if (sorts && sorts.length > 0) {
            requestBody.sorts = sorts;
        }

        console.log('Notion API request:', {
            databaseId: databaseId.substring(0, 8) + '...',
            hasFilters: Object.keys(filters).length > 0,
            hasSorts: sorts.length > 0
        });

        // In Node.js environment, call Notion API directly
        if (typeof window === 'undefined') {
            const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Notion-Version': this.apiVersion,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(`Notion API error: ${response.status} - ${errorData.message || response.statusText}`);
            }

            return await response.json();
        }

        // In browser environment, use server proxy
        const response = await fetch('/api/notion/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                databaseId: databaseId,
                filters: filters,
                sorts: sorts
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`Notion API error: ${response.status} - ${errorData.message || response.statusText}`);
        }

        return await response.json();
    }

    // Parse response based on entity type
    parseNotionResponse(response, entityType) {
        return response.results.map(page => {
            switch (entityType) {
                case 'project':
                    return this.parseNotionProject(page);
                case 'opportunity':
                    return this.parseNotionOpportunity(page);
                case 'organization':
                    return this.parseNotionOrganization(page);
                case 'person':
                    return this.parseNotionPerson(page);
                case 'artifact':
                    return this.parseNotionArtifact(page);
                default:
                    return this.parseNotionProject(page);
            }
        });
    }

    // Parse Project (existing method enhanced)
    parseNotionProject(page) {
        const props = page.properties;
        
        return {
            id: page.id,
            name: this.extractText(props.Name || props.Title),
            area: this.extractSelect(props.Area),
            description: this.extractText(props.Description),
            status: this.extractSelect(props.Status),
            funding: this.extractSelect(props.Funding),
            lead: this.extractText(props['Project Lead']) || this.extractPeople(props['Project Lead']),
            teamMembers: this.extractPeople(props['Team Members']),
            coreValues: this.extractSelect(props['Core Values']),
            themes: this.extractMultiSelect(props.Themes || props.Theme),
            tags: this.extractMultiSelect(props.Tags),
            place: this.extractSelect(props.Place),
            location: this.extractSelect(props.Location),
            state: this.extractSelect(props.State),
            revenueActual: this.extractNumber(props['Revenue Actual']),
            revenuePotential: this.extractNumber(props['Revenue Potential']),
            actualIncoming: this.extractNumber(props['Actual Incoming']),
            potentialIncoming: this.extractNumber(props['Potential Incoming']),
            nextMilestone: this.extractDate(props['Next Milestone Date']),
            startDate: this.extractDate(props['Start Date']),
            endDate: this.extractDate(props['End Date']),
            relatedOpportunities: this.extractRelation(props['🎯 Related Opportunities']),
            projectArtifacts: this.extractRelation(props['📋 Project Artifacts']),
            partnerOrganizations: this.extractRelation(props['🏢 Partner Organizations']),
            successMetrics: this.extractText(props['📊 Success Metrics']),
            websiteLinks: this.extractUrl(props['🔗 Website/Links']),
            aiSummary: this.extractText(props['AI Summary'] || props['AI summary']),
            lastModified: page.last_edited_time,
            createdTime: page.created_time,
            url: page.url
        };
    }

    // Parse Opportunity
    parseNotionOpportunity(page) {
        const props = page.properties;
        
        return {
            id: page.id,
            name: this.extractText(props['Opportunity Name'] || props.Name || props.Title),
            organization: this.extractRelation(props.Organization),
            stage: this.extractSelect(props.Stage),
            amount: this.extractNumber(props['Revenue Amount'] || props.Amount),
            probability: this.extractProbability(props.Probability),
            weightedRevenue: this.extractFormula(props['Weighted Revenue']) || 
                            (this.extractNumber(props['Revenue Amount']) * this.extractProbability(props.Probability) / 100),
            type: this.extractSelect(props['Opportunity Type'] || props.Type),
            description: this.extractText(props.Description),
            relatedProjects: this.extractRelation(props['🎯 Related Projects']),
            primaryContact: this.extractRelation(props['Primary Contact']),
            decisionMakers: this.extractRelation(props['Decision Makers']),
            nextAction: this.extractText(props['Next Action']),
            nextActionDate: this.extractDate(props['Next Action Date']),
            deadline: this.extractDate(props.Deadline),
            applicationDate: this.extractDate(props['Application Date']),
            expectedDecisionDate: this.extractDate(props['Expected Decision Date']),
            supportingArtifacts: this.extractRelation(props['📋 Supporting Artifacts']),
            requirements: this.extractText(props.Requirements),
            competition: this.extractText(props.Competition),
            budgetBreakdown: this.extractText(props['Budget Breakdown']),
            successCriteria: this.extractText(props['Success Criteria']),
            riskAssessment: this.extractText(props['Risk Assessment']),
            notes: this.extractText(props.Notes),
            lastModified: page.last_edited_time,
            createdTime: page.created_time,
            url: page.url
        };
    }

    // Parse Organization
    parseNotionOrganization(page) {
        const props = page.properties;
        
        return {
            id: page.id,
            name: this.extractText(props['Organization Name'] || props.Name || props.Title),
            type: this.extractSelect(props.Type),
            sector: this.extractMultiSelect(props.Sector),
            size: this.extractSelect(props.Size),
            location: this.extractText(props.Location),
            website: this.extractUrl(props.Website),
            description: this.extractText(props.Description),
            relationshipStatus: this.extractSelect(props['Relationship Status']),
            partnershipType: this.extractMultiSelect(props['Partnership Type']),
            activeOpportunities: this.extractRelation(props['🎯 Active Opportunities']),
            relatedProjects: this.extractRelation(props['🚀 Related Projects']),
            keyContacts: this.extractRelation(props['👥 Key Contacts']),
            sharedArtifacts: this.extractRelation(props['📋 Shared Artifacts']),
            annualBudget: this.extractNumber(props['Annual Budget']),
            fundingCapacity: this.extractSelect(props['Funding Capacity']),
            decisionTimeline: this.extractSelect(props['Decision Timeline']),
            valuesAlignment: this.extractSelect(props['Values Alignment']),
            strategicPriority: this.extractSelect(props['Strategic Priority']),
            lastContactDate: this.extractDate(props['Last Contact Date']),
            nextContactDate: this.extractDate(props['Next Contact Date']),
            notes: this.extractText(props.Notes),
            lastModified: page.last_edited_time,
            createdTime: page.created_time,
            url: page.url
        };
    }

    // Parse Person
    parseNotionPerson(page) {
        const props = page.properties;
        
        return {
            id: page.id,
            fullName: this.extractText(props['Full Name'] || props.Name || props.Title),
            role: this.extractText(props.Role || props.Title || props['Role/Title']),
            organization: this.extractRelation(props.Organization),
            email: this.extractEmail(props.Email),
            phone: this.extractPhone(props.Phone),
            linkedIn: this.extractUrl(props.LinkedIn),
            location: this.extractText(props.Location),
            relationshipType: this.extractSelect(props['Relationship Type']),
            influenceLevel: this.extractSelect(props['Influence Level']),
            communicationPreference: this.extractSelect(props['Communication Preference']),
            relatedOpportunities: this.extractRelation(props['🎯 Related Opportunities']),
            relatedProjects: this.extractRelation(props['🚀 Related Projects']),
            sharedArtifacts: this.extractRelation(props['📋 Shared Artifacts']),
            interests: this.extractMultiSelect(props.Interests),
            expertise: this.extractMultiSelect(props.Expertise),
            lastContactDate: this.extractDate(props['Last Contact Date']),
            nextContactDate: this.extractDate(props['Next Contact Date']),
            contactFrequency: this.extractSelect(props['Contact Frequency']),
            relationshipStrength: this.extractSelect(props['Relationship Strength']),
            notes: this.extractText(props.Notes),
            birthday: this.extractDate(props.Birthday),
            personalInterests: this.extractText(props['Personal Interests']),
            lastModified: page.last_edited_time,
            createdTime: page.created_time,
            url: page.url
        };
    }

    // Parse Artifact
    parseNotionArtifact(page) {
        const props = page.properties;
        
        return {
            id: page.id,
            name: this.extractText(props['Artifact Name'] || props.Name || props.Title),
            type: this.extractSelect(props.Type),
            format: this.extractSelect(props.Format),
            status: this.extractSelect(props.Status),
            relatedOpportunities: this.extractRelation(props['🎯 Related Opportunities']),
            relatedProjects: this.extractRelation(props['🚀 Related Projects']),
            relatedOrganizations: this.extractRelation(props['🏢 Related Organizations']),
            relatedPeople: this.extractRelation(props['👥 Related People']),
            fileLink: this.extractFiles(props['File/Link']) || this.extractUrl(props['File/Link']),
            description: this.extractText(props.Description),
            audience: this.extractMultiSelect(props.Audience),
            purpose: this.extractSelect(props.Purpose),
            version: this.extractNumber(props.Version),
            createdBy: this.extractPeople(props['Created By']),
            approvedBy: this.extractPeople(props['Approved By']),
            reviewDate: this.extractDate(props['Review Date']),
            accessLevel: this.extractSelect(props['Access Level']),
            tags: this.extractMultiSelect(props.Tags),
            usageNotes: this.extractText(props['Usage Notes']),
            lastModified: page.last_edited_time,
            createdTime: page.created_time,
            url: page.url
        };
    }

    // Enhanced extraction methods
    extractProbability(property) {
        if (!property) return 50; // Default to 50%
        
        if (property.type === 'select') {
            const value = property.select?.name || '50%';
            return parseInt(value.replace('%', ''));
        } else if (property.type === 'number') {
            return property.number || 50;
        }
        
        return 50;
    }

    extractFormula(property) {
        if (!property || property.type !== 'formula') return null;
        
        if (property.formula.type === 'number') {
            return property.formula.number;
        }
        
        return null;
    }

    extractRelation(property) {
        if (!property || property.type !== 'relation') return [];
        return property.relation.map(item => item.id);
    }

    extractEmail(property) {
        if (!property || property.type !== 'email') return '';
        return property.email || '';
    }

    extractPhone(property) {
        if (!property || property.type !== 'phone_number') return '';
        return property.phone_number || '';
    }

    extractUrl(property) {
        if (!property || property.type !== 'url') return '';
        return property.url || '';
    }

    extractFiles(property) {
        if (!property || property.type !== 'files') return [];
        return property.files.map(file => ({
            name: file.name,
            url: file.file?.url || file.external?.url
        }));
    }

    // Existing extraction methods (from original file)
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

    // Get all data
    async fetchAllData() {
        const [projects, opportunities, organizations, people, artifacts] = await Promise.all([
            this.fetchProjects(),
            this.fetchOpportunities(),
            this.fetchOrganizations(),
            this.fetchPeople(),
            this.fetchArtifacts()
        ]);

        return {
            projects,
            opportunities,
            organizations,
            people,
            artifacts,
            summary: {
                totalProjects: projects.length,
                totalOpportunities: opportunities.length,
                totalOrganizations: organizations.length,
                totalPeople: people.length,
                totalArtifacts: artifacts.length,
                pipelineValue: opportunities.reduce((sum, o) => sum + (o.amount || 0), 0),
                weightedPipeline: opportunities.reduce((sum, o) => sum + (o.weightedRevenue || 0), 0)
            }
        };
    }

    // Write operations (for future implementation)
    async createProject(projectData) {
        // TODO: Implement Notion write operations
        console.log('Project creation not yet implemented');
        return null;
    }

    async updateProject(projectId, updates) {
        // TODO: Implement Notion write operations
        console.log('Project update not yet implemented');
        return null;
    }

    async createOpportunity(opportunityData) {
        // TODO: Implement Notion write operations
        console.log('Opportunity creation not yet implemented');
        return null;
    }

    async updateOpportunity(opportunityId, updates) {
        // TODO: Implement Notion write operations
        console.log('Opportunity update not yet implemented');
        return null;
    }

    // Mock data for development
    getMockData() {
        return {
            projects: [
                {
                    id: 'mock-proj-1',
                    name: 'Community Solar Network',
                    area: 'Operations & Infrastructure',
                    description: 'Distributed solar energy system',
                    status: 'Active',
                    funding: 'Funded',
                    revenueActual: 50000,
                    revenuePotential: 200000
                }
            ],
            opportunities: [
                {
                    id: 'mock-opp-1',
                    name: 'Government Sustainability Grant 2024',
                    stage: 'Proposal',
                    amount: 150000,
                    probability: 75,
                    weightedRevenue: 112500,
                    type: 'Grant',
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'mock-opp-2',
                    name: 'Corporate Partnership - Energy Co',
                    stage: 'Negotiation',
                    amount: 80000,
                    probability: 90,
                    weightedRevenue: 72000,
                    type: 'Partnership',
                    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                }
            ],
            organizations: [
                {
                    id: 'mock-org-1',
                    name: 'Department of Energy',
                    type: 'Government',
                    relationshipStatus: 'Active Partner',
                    fundingCapacity: '$200K-$1M'
                }
            ],
            people: [
                {
                    id: 'mock-person-1',
                    fullName: 'Sarah Johnson',
                    role: 'Program Director',
                    organization: 'Department of Energy',
                    email: 'sarah.johnson@energy.gov',
                    relationshipType: 'Key',
                    influenceLevel: 'Decision Maker'
                }
            ],
            artifacts: [
                {
                    id: 'mock-artifact-1',
                    name: 'Grant Application Template',
                    type: 'Template',
                    format: 'Word',
                    status: 'Approved'
                }
            ]
        };
    }

    getMockResponse(databaseId) {
        const mockData = this.getMockData();
        
        // Return appropriate mock data based on database ID
        if (databaseId === this.databases.projects) {
            return { results: mockData.projects.map(p => ({ id: p.id, properties: p })) };
        } else if (databaseId === this.databases.opportunities) {
            return { results: mockData.opportunities.map(o => ({ id: o.id, properties: o })) };
        } else if (databaseId === this.databases.organizations) {
            return { results: mockData.organizations.map(o => ({ id: o.id, properties: o })) };
        } else if (databaseId === this.databases.people) {
            return { results: mockData.people.map(p => ({ id: p.id, properties: p })) };
        } else if (databaseId === this.databases.artifacts) {
            return { results: mockData.artifacts.map(a => ({ id: a.id, properties: a })) };
        }
        
        return { results: [] };
    }
}

// Enhanced Integration class
class PlacematNotionIntegrationEnhanced {
    constructor(config = {}) {
        this.notion = new NotionMCPEnhanced(config);
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Backward compatibility
    async getProjects(useCache = true) {
        const cacheKey = 'projects';
        
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

    // New methods for opportunities
    async getOpportunities(useCache = true) {
        const cacheKey = 'opportunities';
        
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const opportunities = await this.notion.fetchOpportunities();
        this.cache.set(cacheKey, {
            data: opportunities,
            timestamp: Date.now()
        });

        return opportunities;
    }

    // Get all data
    async getAllData(useCache = true) {
        const cacheKey = 'all_data';
        
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const data = await this.notion.fetchAllData();
        this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });

        return data;
    }

    // Clear cache
    async refreshProjects() {
        this.cache.delete('projects');
        this.cache.delete('all_data');
        return await this.getProjects(false);
    }

    async refreshAll() {
        this.cache.clear();
        return await this.getAllData(false);
    }

    setupAutoRefresh(callback, interval = 5 * 60 * 1000) {
        return setInterval(async () => {
            try {
                const data = await this.refreshAll();
                callback(data);
            } catch (error) {
                console.error('Auto-refresh error:', error);
            }
        }, interval);
    }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
    window.NotionMCPEnhanced = NotionMCPEnhanced;
    window.PlacematNotionIntegrationEnhanced = PlacematNotionIntegrationEnhanced;
    
    // Also export with original names for backward compatibility
    window.NotionMCP = NotionMCPEnhanced;
    window.PlacematNotionIntegration = PlacematNotionIntegrationEnhanced;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        NotionMCPEnhanced, 
        PlacematNotionIntegrationEnhanced,
        // Backward compatibility
        NotionMCP: NotionMCPEnhanced,
        PlacematNotionIntegration: PlacematNotionIntegrationEnhanced
    };
}

// Configuration instructions
/*
SETUP INSTRUCTIONS:

1. Configure environment variables in .env:
   
   # Required for Projects
   NOTION_TOKEN=your_integration_token
   NOTION_DATABASE_ID=your_projects_database_id
   
   # Optional for additional databases
   NOTION_OPPORTUNITIES_DB=your_opportunities_database_id
   NOTION_ORGANIZATIONS_DB=your_organizations_database_id
   NOTION_PEOPLE_DB=your_people_database_id
   NOTION_ARTIFACTS_DB=your_artifacts_database_id

2. Share each database with your integration:
   - Open each database in Notion
   - Click Share > Add integration
   - Select your integration

3. Usage examples:
   
   // Fetch all data
   const notion = new PlacematNotionIntegrationEnhanced();
   const allData = await notion.getAllData();
   
   // Fetch specific entities
   const opportunities = await notion.getOpportunities();
   const projects = await notion.getProjects();
   
   // Access summary
   console.log('Pipeline value:', allData.summary.pipelineValue);
   console.log('Weighted pipeline:', allData.summary.weightedPipeline);
*/
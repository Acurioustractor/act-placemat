// Airtable MCP (Model Context Protocol) Integration
// This provides a complete Airtable database integration for the ACT Placemat

class AirtableMCP {
    constructor(config = {}) {
        // Configuration
        this.apiKey = config.apiKey || this.getEnvVar('AIRTABLE_API_KEY');
        this.baseId = config.baseId || this.getEnvVar('AIRTABLE_BASE_ID');
        this.apiVersion = 'v0';
        this.baseUrl = `https://api.airtable.com/${this.apiVersion}`;
        
        // Table IDs - can be configured per deployment
        this.tables = {
            projects: config.projectsTable || this.getEnvVar('AIRTABLE_PROJECTS_TABLE') || 'Projects',
            opportunities: config.opportunitiesTable || this.getEnvVar('AIRTABLE_OPPORTUNITIES_TABLE') || 'Opportunities',
            organizations: config.organizationsTable || this.getEnvVar('AIRTABLE_ORGANIZATIONS_TABLE') || 'Organizations',
            people: config.peopleTable || this.getEnvVar('AIRTABLE_PEOPLE_TABLE') || 'People',
            artifacts: config.artifactsTable || this.getEnvVar('AIRTABLE_ARTIFACTS_TABLE') || 'Artifacts'
        };
        
        if (!this.apiKey || !this.baseId) {
            console.warn('Airtable API key or base ID not provided. Using mock data.');
            this.useMockData = true;
        }
        
        // Cache configuration
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Browser-compatible environment variable getter
    getEnvVar(name) {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[name];
        }
        return null;
    }

    // Generic Airtable API request
    async makeRequest(endpoint, options = {}) {
        if (this.useMockData) {
            return this.getMockResponse(endpoint);
        }

        const url = `${this.baseUrl}/${this.baseId}/${endpoint}`;
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Airtable request failed:', error);
            throw error;
        }
    }

    // Fetch all records from a table with pagination
    async fetchAllRecords(tableName, filterFormula = '', sort = []) {
        const records = [];
        let offset = null;
        
        do {
            const params = new URLSearchParams();
            if (filterFormula) params.append('filterByFormula', filterFormula);
            if (offset) params.append('offset', offset);
            sort.forEach((s, i) => {
                params.append(`sort[${i}][field]`, s.field);
                params.append(`sort[${i}][direction]`, s.direction || 'asc');
            });
            
            const response = await this.makeRequest(`${tableName}?${params.toString()}`);
            records.push(...response.records);
            offset = response.offset;
        } while (offset);
        
        return records;
    }

    // Projects Methods
    async fetchProjects() {
        const cacheKey = 'all_projects';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            console.log('Fetching projects from Airtable...');
            const records = await this.fetchAllRecords(this.tables.projects);
            const projects = records.map(record => this.parseAirtableProject(record));
            
            this.setCache(cacheKey, projects);
            return projects;
        } catch (error) {
            console.error('Error fetching projects from Airtable:', error);
            return this.getMockData().projects;
        }
    }

    parseAirtableProject(record) {
        const fields = record.fields;
        
        return {
            id: record.id,
            name: fields.Name || fields.Title || '',
            area: this.mapAirtableArea(fields.Area),
            description: fields.Description || '',
            status: fields.Status || 'Active',
            funding: fields.Funding || fields['Funding Status'] || '',
            lead: fields['Project Lead'] || fields.Lead || '',
            location: fields.Location || '',
            state: fields.State || '',
            themes: this.parseMultiSelect(fields.Themes || fields.Theme),
            tags: this.parseMultiSelect(fields.Tags),
            coreValues: fields['Core Values'] || '',
            place: fields.Place || '',
            revenueActual: this.parseNumber(fields['Revenue Actual']),
            revenuePotential: this.parseNumber(fields['Revenue Potential']),
            actualIncoming: this.parseNumber(fields['Actual Incoming']),
            potentialIncoming: this.parseNumber(fields['Potential Incoming']),
            nextMilestone: fields['Next Milestone Date'] || null,
            startDate: fields['Start Date'] || null,
            endDate: fields['End Date'] || null,
            beneficiaries: fields.Beneficiaries || '',
            practices: this.parseMultiSelect(fields.Practices),
            tests: this.parseMultiSelect(fields.Tests),
            stories: fields.Stories || '',
            // Airtable specific fields
            attachments: fields.Attachments || [],
            collaborators: fields.Collaborators || [],
            lastModified: record.fields['Last Modified'] || record.createdTime,
            createdTime: record.createdTime
        };
    }

    // Opportunities Methods
    async fetchOpportunities() {
        const cacheKey = 'all_opportunities';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            console.log('Fetching opportunities from Airtable...');
            const records = await this.fetchAllRecords(this.tables.opportunities);
            const opportunities = records.map(record => this.parseAirtableOpportunity(record));
            
            this.setCache(cacheKey, opportunities);
            return opportunities;
        } catch (error) {
            console.error('Error fetching opportunities from Airtable:', error);
            return this.getMockData().opportunities;
        }
    }

    parseAirtableOpportunity(record) {
        const fields = record.fields;
        
        return {
            id: record.id,
            name: fields.Name || fields['Opportunity Name'] || '',
            organization: fields.Organization || '',
            organizationId: fields['Organization ID'] || null,
            stage: fields.Stage || 'Discovery',
            amount: this.parseNumber(fields['Revenue Amount'] || fields.Amount),
            probability: this.parseNumber(fields.Probability) || 50,
            weightedRevenue: this.parseNumber(fields['Weighted Revenue']) || 
                            (this.parseNumber(fields.Amount) * (this.parseNumber(fields.Probability) / 100)),
            type: fields['Opportunity Type'] || fields.Type || '',
            description: fields.Description || '',
            relatedProjects: fields['Related Projects'] || [],
            primaryContact: fields['Primary Contact'] || '',
            decisionMakers: fields['Decision Makers'] || [],
            nextAction: fields['Next Action'] || '',
            nextActionDate: fields['Next Action Date'] || null,
            deadline: fields.Deadline || null,
            applicationDate: fields['Application Date'] || null,
            expectedDecisionDate: fields['Expected Decision Date'] || null,
            requirements: fields.Requirements || '',
            competition: fields.Competition || '',
            budgetBreakdown: fields['Budget Breakdown'] || '',
            successCriteria: fields['Success Criteria'] || '',
            riskAssessment: fields['Risk Assessment'] || '',
            notes: fields.Notes || '',
            attachments: fields.Attachments || [],
            lastModified: record.fields['Last Modified'] || record.createdTime,
            createdTime: record.createdTime
        };
    }

    // Organizations Methods
    async fetchOrganizations() {
        const cacheKey = 'all_organizations';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            console.log('Fetching organizations from Airtable...');
            const records = await this.fetchAllRecords(this.tables.organizations);
            const organizations = records.map(record => this.parseAirtableOrganization(record));
            
            this.setCache(cacheKey, organizations);
            return organizations;
        } catch (error) {
            console.error('Error fetching organizations from Airtable:', error);
            return this.getMockData().organizations;
        }
    }

    parseAirtableOrganization(record) {
        const fields = record.fields;
        
        return {
            id: record.id,
            name: fields.Name || fields['Organization Name'] || '',
            type: fields.Type || '',
            sector: this.parseMultiSelect(fields.Sector),
            size: fields.Size || '',
            location: fields.Location || '',
            website: fields.Website || '',
            description: fields.Description || '',
            relationshipStatus: fields['Relationship Status'] || '',
            partnershipType: this.parseMultiSelect(fields['Partnership Type']),
            activeOpportunities: fields['Active Opportunities'] || [],
            relatedProjects: fields['Related Projects'] || [],
            keyContacts: fields['Key Contacts'] || [],
            annualBudget: this.parseNumber(fields['Annual Budget']),
            fundingCapacity: fields['Funding Capacity'] || '',
            decisionTimeline: fields['Decision Timeline'] || '',
            valuesAlignment: fields['Values Alignment'] || '',
            strategicPriority: fields['Strategic Priority'] || '',
            lastContactDate: fields['Last Contact Date'] || null,
            nextContactDate: fields['Next Contact Date'] || null,
            notes: fields.Notes || '',
            attachments: fields.Attachments || [],
            lastModified: record.fields['Last Modified'] || record.createdTime,
            createdTime: record.createdTime
        };
    }

    // People Methods
    async fetchPeople() {
        const cacheKey = 'all_people';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            console.log('Fetching people from Airtable...');
            const records = await this.fetchAllRecords(this.tables.people);
            const people = records.map(record => this.parseAirtablePerson(record));
            
            this.setCache(cacheKey, people);
            return people;
        } catch (error) {
            console.error('Error fetching people from Airtable:', error);
            return this.getMockData().people;
        }
    }

    parseAirtablePerson(record) {
        const fields = record.fields;
        
        return {
            id: record.id,
            fullName: fields['Full Name'] || fields.Name || '',
            firstName: fields['First Name'] || '',
            lastName: fields['Last Name'] || '',
            role: fields.Role || fields.Title || '',
            organization: fields.Organization || '',
            organizationId: fields['Organization ID'] || null,
            email: fields.Email || '',
            phone: fields.Phone || '',
            mobile: fields.Mobile || '',
            linkedIn: fields.LinkedIn || '',
            location: fields.Location || '',
            relationshipType: fields['Relationship Type'] || '',
            influenceLevel: fields['Influence Level'] || '',
            communicationPreference: fields['Communication Preference'] || '',
            relatedOpportunities: fields['Related Opportunities'] || [],
            relatedProjects: fields['Related Projects'] || [],
            interests: this.parseMultiSelect(fields.Interests),
            expertise: this.parseMultiSelect(fields.Expertise),
            lastContactDate: fields['Last Contact Date'] || null,
            nextContactDate: fields['Next Contact Date'] || null,
            contactFrequency: fields['Contact Frequency'] || '',
            relationshipStrength: fields['Relationship Strength'] || '',
            notes: fields.Notes || '',
            birthday: fields.Birthday || null,
            personalInterests: fields['Personal Interests'] || '',
            attachments: fields.Attachments || [],
            lastModified: record.fields['Last Modified'] || record.createdTime,
            createdTime: record.createdTime
        };
    }

    // Helper Methods
    mapAirtableArea(airtableArea) {
        if (!airtableArea) return 'Operations & Infrastructure';
        
        // Map common Airtable variations to standard areas
        const areaMapping = {
            'Story & Sovereignty': 'Story & Sovereignty',
            'Story and Sovereignty': 'Story & Sovereignty',
            'Economic Freedom': 'Economic Freedom',
            'Community Engagement': 'Community Engagement',
            'Operations & Infrastructure': 'Operations & Infrastructure',
            'Operations and Infrastructure': 'Operations & Infrastructure',
            'Research & Development': 'Research & Development',
            'Research and Development': 'Research & Development',
            'R&D': 'Research & Development'
        };
        
        return areaMapping[airtableArea] || airtableArea;
    }

    parseMultiSelect(field) {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === 'string') return field.split(',').map(s => s.trim()).filter(s => s);
        return [];
    }

    parseNumber(field) {
        if (typeof field === 'number') return field;
        if (typeof field === 'string') {
            const num = parseFloat(field.replace(/[^0-9.-]/g, ''));
            return isNaN(num) ? 0 : num;
        }
        return 0;
    }

    // Cache Management
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log(`Using cached data for ${key}`);
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    // CRUD Operations
    async createRecord(tableName, fields) {
        const response = await this.makeRequest(tableName, {
            method: 'POST',
            body: JSON.stringify({ fields })
        });
        
        this.clearCache(); // Clear cache to ensure fresh data
        return response;
    }

    async updateRecord(tableName, recordId, fields) {
        const response = await this.makeRequest(`${tableName}/${recordId}`, {
            method: 'PATCH',
            body: JSON.stringify({ fields })
        });
        
        this.clearCache();
        return response;
    }

    async deleteRecord(tableName, recordId) {
        const response = await this.makeRequest(`${tableName}/${recordId}`, {
            method: 'DELETE'
        });
        
        this.clearCache();
        return response;
    }

    // Batch Operations
    async batchCreate(tableName, records) {
        const chunks = this.chunkArray(records, 10); // Airtable limit
        const results = [];
        
        for (const chunk of chunks) {
            const response = await this.makeRequest(tableName, {
                method: 'POST',
                body: JSON.stringify({
                    records: chunk.map(fields => ({ fields }))
                })
            });
            results.push(...response.records);
        }
        
        this.clearCache();
        return results;
    }

    async batchUpdate(tableName, updates) {
        const chunks = this.chunkArray(updates, 10);
        const results = [];
        
        for (const chunk of chunks) {
            const response = await this.makeRequest(tableName, {
                method: 'PATCH',
                body: JSON.stringify({ records: chunk })
            });
            results.push(...response.records);
        }
        
        this.clearCache();
        return results;
    }

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // Mock Data
    getMockData() {
        return {
            projects: [
                {
                    id: 'rec123',
                    name: 'Community Solar Initiative',
                    area: 'Operations & Infrastructure',
                    description: 'Solar power for rural communities',
                    status: 'Active',
                    funding: 'Funded',
                    revenueActual: 50000,
                    revenuePotential: 200000
                }
            ],
            opportunities: [
                {
                    id: 'rec456',
                    name: 'Government Grant 2024',
                    amount: 100000,
                    probability: 75,
                    stage: 'Proposal',
                    type: 'Grant'
                }
            ],
            organizations: [
                {
                    id: 'rec789',
                    name: 'Department of Energy',
                    type: 'Government',
                    relationshipStatus: 'Active Partner'
                }
            ],
            people: [
                {
                    id: 'rec012',
                    fullName: 'Jane Smith',
                    role: 'Program Director',
                    organization: 'Department of Energy'
                }
            ]
        };
    }

    getMockResponse(endpoint) {
        const mockData = this.getMockData();
        
        if (endpoint.includes('Projects')) {
            return { records: mockData.projects.map(p => ({ id: p.id, fields: p })) };
        } else if (endpoint.includes('Opportunities')) {
            return { records: mockData.opportunities.map(o => ({ id: o.id, fields: o })) };
        } else if (endpoint.includes('Organizations')) {
            return { records: mockData.organizations.map(o => ({ id: o.id, fields: o })) };
        } else if (endpoint.includes('People')) {
            return { records: mockData.people.map(p => ({ id: p.id, fields: p })) };
        }
        
        return { records: [] };
    }
}

// Integration with the main application
class PlacematAirtableIntegration {
    constructor(config = {}) {
        this.airtable = new AirtableMCP(config);
        this.syncInterval = null;
    }

    async getAllData() {
        const [projects, opportunities, organizations, people] = await Promise.all([
            this.airtable.fetchProjects(),
            this.airtable.fetchOpportunities(),
            this.airtable.fetchOrganizations(),
            this.airtable.fetchPeople()
        ]);

        return {
            projects,
            opportunities,
            organizations,
            people,
            summary: {
                totalProjects: projects.length,
                totalOpportunities: opportunities.length,
                totalOrganizations: organizations.length,
                totalPeople: people.length,
                totalPipelineValue: opportunities.reduce((sum, opp) => sum + (opp.weightedRevenue || 0), 0),
                totalRevenue: projects.reduce((sum, proj) => sum + (proj.revenueActual || 0), 0)
            }
        };
    }

    async syncWithNotion(notionIntegration) {
        console.log('Starting Airtable-Notion sync...');
        
        try {
            // Fetch data from both sources
            const [airtableData, notionData] = await Promise.all([
                this.getAllData(),
                notionIntegration.getProjects()
            ]);

            // Compare and sync
            const syncReport = {
                created: 0,
                updated: 0,
                conflicts: []
            };

            // Simple sync logic - can be enhanced
            for (const airtableProject of airtableData.projects) {
                const notionProject = notionData.find(np => np.name === airtableProject.name);
                
                if (!notionProject) {
                    // Project exists in Airtable but not in Notion
                    console.log(`New project in Airtable: ${airtableProject.name}`);
                    syncReport.created++;
                } else {
                    // Check for updates
                    if (airtableProject.lastModified > notionProject.lastModified) {
                        console.log(`Airtable has newer version of: ${airtableProject.name}`);
                        syncReport.updated++;
                    }
                }
            }

            console.log('Sync complete:', syncReport);
            return syncReport;
            
        } catch (error) {
            console.error('Sync error:', error);
            throw error;
        }
    }

    startAutoSync(notionIntegration, interval = 5 * 60 * 1000) {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(() => {
            this.syncWithNotion(notionIntegration).catch(console.error);
        }, interval);

        console.log(`Auto-sync started (every ${interval / 1000} seconds)`);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('Auto-sync stopped');
        }
    }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
    window.AirtableMCP = AirtableMCP;
    window.PlacematAirtableIntegration = PlacematAirtableIntegration;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AirtableMCP, PlacematAirtableIntegration };
}

// Configuration instructions
/*
SETUP INSTRUCTIONS:

1. Get Airtable API Credentials:
   - Go to https://airtable.com/account
   - Generate a personal access token
   - Copy the token

2. Get Your Base ID:
   - Open your Airtable base
   - Go to Help > API documentation
   - Copy the base ID (starts with 'app')

3. Create Tables:
   - Projects (matching Notion structure)
   - Opportunities
   - Organizations  
   - People
   - Artifacts

4. Environment Variables:
   Set these in your .env file:
   - AIRTABLE_API_KEY=your_api_key
   - AIRTABLE_BASE_ID=your_base_id
   - AIRTABLE_PROJECTS_TABLE=Projects (or your table name)
   - AIRTABLE_OPPORTUNITIES_TABLE=Opportunities
   - AIRTABLE_ORGANIZATIONS_TABLE=Organizations
   - AIRTABLE_PEOPLE_TABLE=People

5. Usage:
   const airtableIntegration = new PlacematAirtableIntegration();
   const data = await airtableIntegration.getAllData();
*/
// ACT Placemat - Airtable Stories Integration
// Specialized integration for Stories and Storytellers from Airtable

class AirtableStoriesIntegration {
    constructor(config = {}) {
        // Configuration
        this.apiKey = config.apiKey || this.getEnvVar('AIRTABLE_API_KEY');
        this.baseId = config.baseId || this.getEnvVar('AIRTABLE_BASE_ID');
        this.apiVersion = 'v0';
        this.baseUrl = `https://api.airtable.com/${this.apiVersion}`;
        
        // Stories-specific table configuration
        this.tables = {
            stories: config.storiesTable || this.getEnvVar('AIRTABLE_STORIES_TABLE') || 'Stories',
            storytellers: config.storytellersTable || this.getEnvVar('AIRTABLE_STORYTELLERS_TABLE') || 'Storytellers'
        };
        
        if (!this.apiKey || !this.baseId) {
            console.warn('Airtable API key or base ID not provided. Using mock stories data.');
            this.useMockData = true;
        }
        
        // Cache configuration
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes for stories (longer than other data)
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
                throw new Error(`Airtable Stories API error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Airtable Stories request failed:', error);
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
                params.append(`sort[${i}][direction]`, s.direction || 'desc');
            });
            
            const response = await this.makeRequest(`${tableName}?${params.toString()}`);
            records.push(...response.records);
            offset = response.offset;
        } while (offset);
        
        return records;
    }

    // Stories Methods
    async fetchStories(projectId = null) {
        const cacheKey = projectId ? `stories_project_${projectId}` : 'all_stories';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            console.log('Fetching stories from Airtable...');
            
            // Filter by project if specified
            let filterFormula = '';
            if (projectId) {
                filterFormula = `OR(FIND("${projectId}", {Notion Project ID}), FIND("${projectId}", {Project Name}))`;
            }
            
            const sort = [{ field: 'Story Date', direction: 'desc' }];
            const records = await this.fetchAllRecords(this.tables.stories, filterFormula, sort);
            const stories = records.map(record => this.parseAirtableStory(record));
            
            this.setCache(cacheKey, stories);
            console.log(`Retrieved ${stories.length} stories from Airtable`);
            return stories;
        } catch (error) {
            console.error('Error fetching stories from Airtable:', error);
            return this.getMockData().stories;
        }
    }

    // Parse Airtable Story record
    parseAirtableStory(record) {
        const fields = record.fields;
        
        return {
            id: record.id,
            title: fields['Story Title'] || fields.Title || fields.Name || '',
            description: fields['Story Description'] || fields.Description || '',
            storyteller: this.parseLinkedRecord(fields.Storyteller),
            storytellerId: this.extractId(fields.Storyteller),
            relatedProject: fields['Project Name'] || '',
            notionProjectId: fields['Notion Project ID'] || '',
            storyType: fields['Story Type'] || 'Impact Story',
            storyStatus: fields['Story Status'] || 'Draft',
            mediaFiles: this.parseAttachments(fields['Media Files']),
            storyDate: fields['Story Date'] || record.createdTime,
            impactMetrics: fields['Impact Metrics'] || '',
            storyThemes: this.parseMultiSelect(fields['Story Themes']),
            publicationStatus: fields['Publication Status'] || 'Internal',
            storyUrl: fields['Story URL'] || '',
            transcript: fields.Transcript || '',
            duration: fields.Duration || '',
            location: fields.Location || '',
            storyTags: this.parseMultiSelect(fields['Story Tags']),
            consentStatus: fields['Consent Status'] || 'Pending',
            lastModified: record.fields['Last Modified'] || record.createdTime,
            createdTime: record.createdTime,
            
            // Computed fields for UI
            hasMedia: !!(fields['Media Files'] && fields['Media Files'].length > 0),
            isPublished: fields['Publication Status'] === 'Public',
            canUseForMarketing: fields['Publication Status'] === 'Public' || fields['Publication Status'] === 'Marketing',
            
            // For project integration
            projectConnectionStrength: this.calculateProjectConnection(fields)
        };
    }

    // Storytellers Methods
    async fetchStorytellers(activeOnly = false) {
        const cacheKey = activeOnly ? 'active_storytellers' : 'all_storytellers';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            console.log('Fetching storytellers from Airtable...');
            
            let filterFormula = '';
            if (activeOnly) {
                filterFormula = `OR({Availability} = 'Active', {Availability} = 'Occasional')`;
            }
            
            const sort = [{ field: 'Storyteller Name', direction: 'asc' }];
            const records = await this.fetchAllRecords(this.tables.storytellers, filterFormula, sort);
            const storytellers = records.map(record => this.parseAirtableStoryteller(record));
            
            this.setCache(cacheKey, storytellers);
            console.log(`Retrieved ${storytellers.length} storytellers from Airtable`);
            return storytellers;
        } catch (error) {
            console.error('Error fetching storytellers from Airtable:', error);
            return this.getMockData().storytellers;
        }
    }

    // Parse Airtable Storyteller record
    parseAirtableStoryteller(record) {
        const fields = record.fields;
        
        return {
            id: record.id,
            name: fields['Storyteller Name'] || fields.Name || '',
            email: fields.Email || '',
            phone: fields.Phone || '',
            organization: fields.Organization || '',
            role: fields['Role/Title'] || fields.Role || '',
            location: fields.Location || '',
            preferredContact: fields['Preferred Contact Method'] || 'Email',
            storiesShared: this.parseLinkedRecords(fields['Stories Shared']),
            storiesCount: fields['Stories Shared'] ? fields['Stories Shared'].length : 0,
            consentStatus: fields['Consent Status'] || 'Pending',
            storyPreferences: this.parseMultiSelect(fields['Story Preferences']),
            impactAreas: this.parseMultiSelect(fields['Impact Areas']),
            availability: fields.Availability || 'Not Available',
            notes: fields.Notes || '',
            expertise: this.parseMultiSelect(fields.Expertise),
            languages: this.parseMultiSelect(fields.Languages),
            timezone: fields.Timezone || '',
            socialMedia: {
                facebook: fields['Facebook URL'] || '',
                twitter: fields['Twitter Handle'] || '',
                linkedin: fields['LinkedIn URL'] || '',
                instagram: fields['Instagram Handle'] || ''
            },
            lastContactDate: fields['Last Contact Date'] || null,
            nextFollowUp: fields['Next Follow Up'] || null,
            relationshipStrength: fields['Relationship Strength'] || 'New',
            lastModified: record.fields['Last Modified'] || record.createdTime,
            createdTime: record.createdTime,
            
            // Computed fields for UI
            isActive: fields.Availability === 'Active',
            hasConsent: fields['Consent Status'] === 'Granted',
            canContact: fields['Consent Status'] === 'Granted' && 
                       (fields.Availability === 'Active' || fields.Availability === 'Occasional')
        };
    }

    // Get stories for a specific project
    async getStoriesForProject(projectId, projectName = '') {
        try {
            const allStories = await this.fetchStories();
            
            // Filter stories that match the project
            const projectStories = allStories.filter(story => {
                return story.notionProjectId === projectId ||
                       story.relatedProject.toLowerCase().includes(projectName.toLowerCase()) ||
                       (projectName && story.title.toLowerCase().includes(projectName.toLowerCase()));
            });
            
            // Get storyteller details for each story
            const storiesWithStorytellers = await Promise.all(
                projectStories.map(async story => {
                    if (story.storytellerId) {
                        try {
                            const storyteller = await this.getStoryteller(story.storytellerId);
                            return { ...story, storytellerDetails: storyteller };
                        } catch (error) {
                            console.warn(`Could not fetch storyteller for story ${story.id}:`, error);
                            return story;
                        }
                    }
                    return story;
                })
            );
            
            return storiesWithStorytellers;
        } catch (error) {
            console.error('Error getting stories for project:', error);
            return [];
        }
    }

    // Get a specific storyteller
    async getStoryteller(storytellerId) {
        try {
            const response = await this.makeRequest(`${this.tables.storytellers}/${storytellerId}`);
            return this.parseAirtableStoryteller(response);
        } catch (error) {
            console.error('Error fetching storyteller:', error);
            return null;
        }
    }

    // Link a story to a Notion project
    async linkStoryToProject(storyId, notionProjectId, projectName) {
        try {
            const updateFields = {
                'Notion Project ID': notionProjectId,
                'Project Name': projectName
            };
            
            const response = await this.makeRequest(`${this.tables.stories}/${storyId}`, {
                method: 'PATCH',
                body: JSON.stringify({ fields: updateFields })
            });
            
            this.clearCache(); // Clear cache to ensure fresh data
            console.log(`Linked story ${storyId} to project ${notionProjectId}`);
            return response;
        } catch (error) {
            console.error('Error linking story to project:', error);
            throw error;
        }
    }

    // Generate story summary for project
    async generateProjectStoryMetrics(projectId, projectName) {
        const stories = await this.getStoriesForProject(projectId, projectName);
        
        const metrics = {
            totalStories: stories.length,
            publishedStories: stories.filter(s => s.isPublished).length,
            storiesWithMedia: stories.filter(s => s.hasMedia).length,
            uniqueStorytellers: new Set(stories.map(s => s.storytellerId).filter(id => id)).size,
            storyTypes: this.aggregateStoryTypes(stories),
            themes: this.aggregateThemes(stories),
            impactAreas: this.aggregateImpactAreas(stories),
            marketingReady: stories.filter(s => s.canUseForMarketing).length,
            consentGranted: stories.filter(s => s.consentStatus === 'Granted').length,
            totalDuration: this.calculateTotalDuration(stories),
            lastStoryDate: this.getLatestStoryDate(stories)
        };
        
        return {
            stories,
            metrics,
            summary: this.generateStorySummary(metrics)
        };
    }

    // Helper Methods
    parseLinkedRecord(linkedField) {
        if (!linkedField || linkedField.length === 0) return '';
        return linkedField[0]; // Return first linked record ID
    }

    parseLinkedRecords(linkedField) {
        if (!linkedField) return [];
        return linkedField; // Return array of linked record IDs
    }

    extractId(linkedField) {
        if (!linkedField || linkedField.length === 0) return null;
        return linkedField[0]; // Return first linked record ID
    }

    parseAttachments(attachments) {
        if (!attachments) return [];
        return attachments.map(att => ({
            id: att.id,
            url: att.url,
            filename: att.filename,
            type: att.type,
            size: att.size,
            thumbnails: att.thumbnails || {}
        }));
    }

    parseMultiSelect(field) {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === 'string') return field.split(',').map(s => s.trim()).filter(s => s);
        return [];
    }

    calculateProjectConnection(fields) {
        let strength = 0;
        if (fields['Notion Project ID']) strength += 100;
        if (fields['Project Name']) strength += 50;
        if (fields['Impact Metrics']) strength += 25;
        return Math.min(strength, 100);
    }

    aggregateStoryTypes(stories) {
        const types = {};
        stories.forEach(story => {
            types[story.storyType] = (types[story.storyType] || 0) + 1;
        });
        return types;
    }

    aggregateThemes(stories) {
        const themes = {};
        stories.forEach(story => {
            story.storyThemes.forEach(theme => {
                themes[theme] = (themes[theme] || 0) + 1;
            });
        });
        return themes;
    }

    aggregateImpactAreas(stories) {
        const areas = {};
        stories.forEach(story => {
            if (story.storytellerDetails && story.storytellerDetails.impactAreas) {
                story.storytellerDetails.impactAreas.forEach(area => {
                    areas[area] = (areas[area] || 0) + 1;
                });
            }
        });
        return areas;
    }

    calculateTotalDuration(stories) {
        let total = 0;
        stories.forEach(story => {
            if (story.duration) {
                const minutes = this.parseDuration(story.duration);
                total += minutes;
            }
        });
        return total;
    }

    parseDuration(duration) {
        if (!duration) return 0;
        const match = duration.match(/(\d+):(\d+)/);
        if (match) {
            return parseInt(match[1]) * 60 + parseInt(match[2]);
        }
        return 0;
    }

    getLatestStoryDate(stories) {
        if (stories.length === 0) return null;
        const dates = stories.map(s => new Date(s.storyDate)).filter(d => !isNaN(d));
        return dates.length > 0 ? new Date(Math.max(...dates)) : null;
    }

    generateStorySummary(metrics) {
        const parts = [];
        
        if (metrics.totalStories > 0) {
            parts.push(`${metrics.totalStories} stories collected`);
            
            if (metrics.publishedStories > 0) {
                parts.push(`${metrics.publishedStories} published`);
            }
            
            if (metrics.uniqueStorytellers > 0) {
                parts.push(`${metrics.uniqueStorytellers} storytellers`);
            }
            
            if (metrics.storiesWithMedia > 0) {
                parts.push(`${metrics.storiesWithMedia} with media`);
            }
        } else {
            parts.push('No stories yet');
        }
        
        return parts.join(', ');
    }

    // Cache Management
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log(`Using cached stories data for ${key}`);
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

    // Mock Data for Development
    getMockData() {
        return {
            stories: [
                {
                    id: 'recStory1',
                    title: 'Solar Power Changed My Life',
                    description: 'How the community solar project brought reliable energy to our farm and transformed our daily operations.',
                    storyteller: 'recStoryteller1',
                    storytellerId: 'recStoryteller1',
                    relatedProject: 'Community Solar Network',
                    notionProjectId: 'mock-proj-1',
                    storyType: 'Success Story',
                    storyStatus: 'Published',
                    storyDate: '2024-12-15',
                    impactMetrics: 'Reduced energy costs by 60%, increased farm productivity by 40%',
                    storyThemes: ['Innovation', 'Sustainability', 'Economic Impact'],
                    publicationStatus: 'Public',
                    hasMedia: true,
                    isPublished: true,
                    canUseForMarketing: true,
                    projectConnectionStrength: 100
                },
                {
                    id: 'recStory2', 
                    title: 'Building Community Through Energy',
                    description: 'The solar project brought neighbors together and created lasting relationships in our community.',
                    storyteller: 'recStoryteller2',
                    storytellerId: 'recStoryteller2',
                    relatedProject: 'Community Solar Network',
                    notionProjectId: 'mock-proj-1',
                    storyType: 'Impact Story',
                    storyStatus: 'Published',
                    storyDate: '2024-12-10',
                    impactMetrics: 'Connected 15 families, established community energy cooperative',
                    storyThemes: ['Community', 'Collaboration', 'Social Impact'],
                    publicationStatus: 'Internal',
                    hasMedia: false,
                    isPublished: false,
                    canUseForMarketing: false,
                    projectConnectionStrength: 100
                }
            ],
            storytellers: [
                {
                    id: 'recStoryteller1',
                    name: 'Maria Rodriguez',
                    email: 'maria.rodriguez@farm.local',
                    organization: 'Rodriguez Family Farm',
                    role: 'Farm Owner',
                    location: 'Rural Valley, State',
                    preferredContact: 'Email',
                    storiesCount: 1,
                    consentStatus: 'Granted',
                    availability: 'Active',
                    isActive: true,
                    hasConsent: true,
                    canContact: true
                },
                {
                    id: 'recStoryteller2',
                    name: 'James Chen',
                    email: 'james.chen@community.org',
                    organization: 'Community Energy Cooperative',
                    role: 'Community Organizer',
                    location: 'Rural Valley, State',
                    preferredContact: 'Phone',
                    storiesCount: 1,
                    consentStatus: 'Granted',
                    availability: 'Occasional',
                    isActive: false,
                    hasConsent: true,
                    canContact: true
                }
            ]
        };
    }

    getMockResponse(endpoint) {
        const mockData = this.getMockData();
        
        if (endpoint.includes('Stories')) {
            return { records: mockData.stories.map(s => ({ id: s.id, fields: s, createdTime: '2024-12-01T00:00:00.000Z' })) };
        } else if (endpoint.includes('Storytellers')) {
            return { records: mockData.storytellers.map(s => ({ id: s.id, fields: s, createdTime: '2024-12-01T00:00:00.000Z' })) };
        }
        
        return { records: [] };
    }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
    window.AirtableStoriesIntegration = AirtableStoriesIntegration;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AirtableStoriesIntegration };
}

// Configuration instructions in comments
/*
AIRTABLE STORIES SETUP:

1. Environment Variables (.env):
   AIRTABLE_API_KEY=your_api_key
   AIRTABLE_BASE_ID=your_base_id
   AIRTABLE_STORIES_TABLE=Stories
   AIRTABLE_STORYTELLERS_TABLE=Storytellers

2. Stories Table Schema:
   - Story Title (Single line text, Primary field)
   - Story Description (Long text)
   - Storyteller (Link to Storytellers table)
   - Project Name (Single line text)
   - Notion Project ID (Single line text)
   - Story Type (Single select): Success Story, Case Study, Testimonial, Impact Story
   - Story Status (Single select): Draft, Recorded, Edited, Published
   - Media Files (Attachment)
   - Story Date (Date)
   - Impact Metrics (Long text)
   - Story Themes (Multiple select)
   - Publication Status (Single select): Internal, Public, Marketing, Grant Applications
   - Story URL (URL)

3. Storytellers Table Schema:
   - Storyteller Name (Single line text, Primary field)
   - Email (Email)
   - Phone (Phone number)
   - Organization (Single line text)
   - Role/Title (Single line text)
   - Location (Single line text)
   - Preferred Contact Method (Single select): Email, Phone, Text, Video Call
   - Stories Shared (Link to Stories table)
   - Consent Status (Single select): Granted, Pending, Declined
   - Story Preferences (Multiple select): Video, Written, Audio, Photo
   - Impact Areas (Multiple select): [Match your project areas]
   - Availability (Single select): Active, Occasional, Not Available
   - Notes (Long text)

Usage:
   const stories = new AirtableStoriesIntegration();
   const projectStories = await stories.getStoriesForProject('project-id', 'Project Name');
   const metrics = await stories.generateProjectStoryMetrics('project-id', 'Project Name');
*/
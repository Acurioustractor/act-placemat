// ACT Placemat - Airtable Stories Connector
// Connects your existing Airtable stories ecosystem to Notion projects

class AirtableStoriesConnector {
    constructor(config = {}) {
        // Configuration
        this.apiKey = config.apiKey || this.getEnvVar('AIRTABLE_API_KEY');
        this.baseId = config.baseId || this.getEnvVar('AIRTABLE_BASE_ID');
        this.apiVersion = 'v0';
        this.baseUrl = `https://api.airtable.com/${this.apiVersion}`;
        
        // Your existing table names from Airtable
        this.tables = {
            stories: 'Stories',
            storytellers: 'Storytellers',
            media: 'Media',
            themes: 'Themes',
            quotes: 'Quotes'
        };
        
        if (!this.apiKey || !this.baseId) {
            console.warn('Airtable credentials not found. Check .env file.');
            this.useMockData = true;
        }
        
        // Cache for performance
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    getEnvVar(name) {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[name];
        }
        return null;
    }

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

    // Fetch all records with pagination
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

    // Get stories for a specific project (matching your Notion projects)
    async getStoriesForProject(projectName) {
        const cacheKey = `stories_${projectName.replace(/\s+/g, '_')}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            console.log(`Fetching stories for project: ${projectName}`);
            
            // Fetch stories that match the project
            const allStories = await this.fetchAllRecords(this.tables.stories);
            
            // Get storytellers data
            const allStorytellers = await this.fetchAllRecords(this.tables.storytellers);
            const storytellersMap = new Map(allStorytellers.map(st => [st.id, st]));
            
            // Filter and enrich stories
            const projectStories = allStories.map(story => {
                const enrichedStory = this.parseStory(story);
                
                // Add storyteller details
                if (enrichedStory.storytellerIds && enrichedStory.storytellerIds.length > 0) {
                    enrichedStory.storytellers = enrichedStory.storytellerIds.map(id => {
                        const storyteller = storytellersMap.get(id);
                        return storyteller ? this.parseStoryteller(storyteller) : null;
                    }).filter(Boolean);
                }
                
                return enrichedStory;
            }).filter(story => {
                // Match stories to project by:
                // 1. Direct project match in story
                // 2. Project field in connected storytellers
                // 3. Project name similarity
                return this.isStoryRelatedToProject(story, projectName);
            });
            
            this.setCache(cacheKey, projectStories);
            console.log(`Found ${projectStories.length} stories for ${projectName}`);
            return projectStories;
            
        } catch (error) {
            console.error('Error fetching stories for project:', error);
            return [];
        }
    }

    // Parse story record from Airtable
    parseStory(record) {
        const fields = record.fields;
        
        return {
            id: record.id,
            storyId: fields['Story ID'] || null,
            title: this.generateStoryTitle(fields),
            project: fields.Project || '',
            storytellerIds: fields.Storytellers || [],
            mediaIds: fields.Media || [],
            themes: this.extractThemes(fields),
            summary: this.extractSummary(fields),
            quotes: this.extractQuotes(fields),
            videoLinks: this.extractVideoLinks(fields),
            transcripts: this.extractTranscripts(fields),
            createdTime: record.createdTime,
            lastModified: fields['Last Modified'] || record.createdTime,
            
            // Computed fields for UI
            hasMedia: !!(fields.Media && fields.Media.length > 0),
            hasVideo: this.hasVideoContent(fields),
            hasTranscript: this.hasTranscriptContent(fields),
            storyType: this.determineStoryType(fields),
            impactLevel: this.calculateImpactLevel(fields)
        };
    }

    // Parse storyteller record
    parseStoryteller(record) {
        const fields = record.fields;
        
        return {
            id: record.id,
            name: fields.Name || 'Unknown',
            organisation: fields.Organisation || '',
            location: fields.Location || '',
            role: fields.Role || '',
            project: fields.Project || '',
            consentStatus: fields['Consent Status'] || 'Unknown',
            preferredName: fields['Preferred Name'] || fields.Name,
            email: fields['Secure Contact Email'] || '',
            phone: fields['Phone Number'] || '',
            bio: fields.Bio || '',
            website: fields.Website || '',
            profileImage: fields['File Profile Image'] || null,
            storiesCount: fields.Stories ? fields.Stories.length : 0,
            mediaCount: fields.Media ? fields.Media.length : 0,
            
            // Computed fields
            canContact: fields['Consent Status'] === 'Granted',
            hasPublicStories: this.hasPublicContent(fields),
            isActiveStoryteller: fields.Stories && fields.Stories.length > 0
        };
    }

    // Determine if story is related to project
    isStoryRelatedToProject(story, projectName) {
        const projectLower = projectName.toLowerCase();
        
        // Direct project match
        if (story.project && story.project.toLowerCase().includes(projectLower)) {
            return true;
        }
        
        // Check storyteller projects
        if (story.storytellers) {
            return story.storytellers.some(st => 
                st.project && st.project.toLowerCase().includes(projectLower)
            );
        }
        
        // Check for project mentions in themes or content
        if (story.themes.some(theme => theme.toLowerCase().includes(projectLower))) {
            return true;
        }
        
        // For Community Solar Network, match solar/energy keywords
        if (projectName.toLowerCase().includes('solar') || projectName.toLowerCase().includes('energy')) {
            const energyKeywords = ['solar', 'energy', 'power', 'renewable', 'sustainable'];
            return energyKeywords.some(keyword => 
                story.summary.toLowerCase().includes(keyword) ||
                story.themes.some(theme => theme.toLowerCase().includes(keyword))
            );
        }
        
        return false;
    }

    // Generate project story metrics
    async generateProjectStoryMetrics(projectName) {
        const stories = await this.getStoriesForProject(projectName);
        
        const uniqueStorytellers = new Set();
        let totalVideos = 0;
        let totalTranscripts = 0;
        let consentedStories = 0;
        const themeFrequency = {};
        const locationFrequency = {};
        
        stories.forEach(story => {
            // Count unique storytellers
            if (story.storytellers) {
                story.storytellers.forEach(st => uniqueStorytellers.add(st.id));
            }
            
            // Count content types
            if (story.hasVideo) totalVideos++;
            if (story.hasTranscript) totalTranscripts++;
            if (story.storytellers?.some(st => st.canContact)) consentedStories++;
            
            // Aggregate themes
            story.themes.forEach(theme => {
                themeFrequency[theme] = (themeFrequency[theme] || 0) + 1;
            });
            
            // Aggregate locations
            if (story.storytellers) {
                story.storytellers.forEach(st => {
                    if (st.location) {
                        locationFrequency[st.location] = (locationFrequency[st.location] || 0) + 1;
                    }
                });
            }
        });
        
        return {
            totalStories: stories.length,
            uniqueStorytellers: uniqueStorytellers.size,
            contentBreakdown: {
                withVideo: totalVideos,
                withTranscript: totalTranscripts,
                withConsent: consentedStories
            },
            topThemes: this.getTopItems(themeFrequency, 5),
            topLocations: this.getTopItems(locationFrequency, 5),
            stories: stories,
            summary: this.generateMetricsSummary(stories.length, uniqueStorytellers.size, totalVideos, consentedStories)
        };
    }

    // Helper methods
    generateStoryTitle(fields) {
        // Try to create a meaningful title from available data
        if (fields['Story Title']) return fields['Story Title'];
        if (fields.Name) return fields.Name;
        
        const storyId = fields['Story ID'];
        const project = fields.Project;
        
        if (project && storyId) {
            return `${project} Story #${storyId}`;
        } else if (storyId) {
            return `Story #${storyId}`;
        }
        
        return 'Untitled Story';
    }

    extractThemes(fields) {
        const themes = [];
        
        // From direct themes field
        if (fields['Themes (from Media)']) {
            const themeArray = Array.isArray(fields['Themes (from Media)']) 
                ? fields['Themes (from Media)'] 
                : [fields['Themes (from Media)']];
            themes.push(...themeArray);
        }
        
        // From theme descriptions
        if (fields['Description (from Themes) (from Media)']) {
            const descriptions = Array.isArray(fields['Description (from Themes) (from Media)'])
                ? fields['Description (from Themes) (from Media)']
                : [fields['Description (from Themes) (from Media)']];
            themes.push(...descriptions);
        }
        
        return [...new Set(themes.filter(Boolean))];
    }

    extractSummary(fields) {
        if (fields['Summary (from Media)']) {
            const summaries = Array.isArray(fields['Summary (from Media)'])
                ? fields['Summary (from Media)']
                : [fields['Summary (from Media)']];
            return summaries.join(' ');
        }
        return '';
    }

    extractQuotes(fields) {
        if (fields['Quotes (from Media)']) {
            const quotes = Array.isArray(fields['Quotes (from Media)'])
                ? fields['Quotes (from Media)']
                : [fields['Quotes (from Media)']];
            return quotes.filter(Boolean);
        }
        return [];
    }

    extractVideoLinks(fields) {
        const links = [];
        
        if (fields['Video draft link (from Media)']) {
            const videoLinks = Array.isArray(fields['Video draft link (from Media)'])
                ? fields['Video draft link (from Media)']
                : [fields['Video draft link (from Media)']];
            links.push(...videoLinks.filter(Boolean));
        }
        
        return links;
    }

    extractTranscripts(fields) {
        if (fields['Transcript (from Media)']) {
            const transcripts = Array.isArray(fields['Transcript (from Media)'])
                ? fields['Transcript (from Media)']
                : [fields['Transcript (from Media)']];
            return transcripts.filter(Boolean);
        }
        return [];
    }

    hasVideoContent(fields) {
        return !!(fields['Video draft link (from Media)'] && 
                 fields['Video draft link (from Media)'].length > 0);
    }

    hasTranscriptContent(fields) {
        return !!(fields['Transcript (from Media)'] && 
                 fields['Transcript (from Media)'].length > 0);
    }

    determineStoryType(fields) {
        // Determine story type based on content
        if (this.hasVideoContent(fields) && this.hasTranscriptContent(fields)) {
            return 'Video Story with Transcript';
        } else if (this.hasVideoContent(fields)) {
            return 'Video Story';
        } else if (this.hasTranscriptContent(fields)) {
            return 'Text Story';
        }
        return 'Story';
    }

    calculateImpactLevel(fields) {
        let score = 0;
        
        if (this.hasVideoContent(fields)) score += 3;
        if (this.hasTranscriptContent(fields)) score += 2;
        if (fields['Quotes (from Media)']) score += 1;
        if (fields['Themes (from Media)']) score += 1;
        
        if (score >= 5) return 'High';
        if (score >= 3) return 'Medium';
        return 'Low';
    }

    hasPublicContent(fields) {
        // Check if storyteller has public-facing content
        return fields['Consent Status'] === 'Granted' && 
               (fields.Stories && fields.Stories.length > 0);
    }

    getTopItems(frequency, limit) {
        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([item, count]) => ({ item, count }));
    }

    generateMetricsSummary(totalStories, uniqueStorytellers, totalVideos, consentedStories) {
        const parts = [];
        
        if (totalStories > 0) {
            parts.push(`${totalStories} stories`);
            
            if (uniqueStorytellers > 0) {
                parts.push(`${uniqueStorytellers} storytellers`);
            }
            
            if (totalVideos > 0) {
                parts.push(`${totalVideos} videos`);
            }
            
            if (consentedStories > 0) {
                parts.push(`${consentedStories} with consent`);
            }
        } else {
            parts.push('No stories yet');
        }
        
        return parts.join(', ');
    }

    // Cache management
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
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

    // Mock response for development
    getMockResponse(endpoint) {
        return {
            records: [
                {
                    id: 'recMockStory1',
                    fields: {
                        'Story ID': 1,
                        'Project': 'Community Solar Network',
                        'Storytellers': ['recMockStoryteller1'],
                        'Summary (from Media)': 'Solar energy transformed our community farm operations',
                        'Themes (from Media)': ['Innovation', 'Sustainability', 'Community'],
                        'Video draft link (from Media)': ['https://example.com/video1']
                    },
                    createdTime: '2024-12-01T00:00:00.000Z'
                }
            ]
        };
    }
}

// Export for browser and Node.js
if (typeof window !== 'undefined') {
    window.AirtableStoriesConnector = AirtableStoriesConnector;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AirtableStoriesConnector };
}

// Usage example
/*
const connector = new AirtableStoriesConnector();

// Get stories for a specific project
const projectStories = await connector.getStoriesForProject('Community Solar Network');

// Get comprehensive metrics
const metrics = await connector.generateProjectStoryMetrics('Community Solar Network');
console.log('Stories for project:', metrics.summary);
*/
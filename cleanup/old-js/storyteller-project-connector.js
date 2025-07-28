// Enhanced Storyteller-Project Connector for ACT Placemat
const { createClient } = require('@supabase/supabase-js');

class StorytellerProjectConnector {
    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_ANON_KEY;
        
        if (!this.supabaseUrl || !this.supabaseKey) {
            console.warn('⚠️ Supabase credentials not found in environment variables');
            return;
        }
        
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        console.log('✅ Storyteller-Project Connector initialized');
    }

    // Get all storytellers with their rich data
    async getAllStorytellers() {
        try {
            const { data, error } = await this.supabase
                .from('storytellers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            console.log(`👥 Found ${data?.length || 0} storytellers in Supabase`);
            return data || [];
        } catch (error) {
            console.error('Error fetching storytellers:', error);
            return [];
        }
    }

    // Get storytellers with their stories
    async getStorytellersWithStories() {
        try {
            const { data, error } = await this.supabase
                .from('storytellers')
                .select(`
                    *,
                    stories (
                        id,
                        title,
                        story_copy,
                        primary_themes,
                        tags,
                        transcript,
                        image_url,
                        video_url,
                        audio_url,
                        primary_media_url,
                        date_occurred,
                        status
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error fetching storytellers with stories:', error);
            return [];
        }
    }

    // Get storytellers for a specific project
    async getStorytellersForProject(projectNotionId) {
        try {
            // First get the project UUID from Notion ID
            const { data: project } = await this.supabase
                .from('projects')
                .select('id')
                .eq('notion_id', projectNotionId)
                .single();

            if (!project) {
                console.log(`No project found for Notion ID: ${projectNotionId}`);
                return [];
            }

            const { data, error } = await this.supabase
                .from('storyteller_project_links')
                .select(`
                    *,
                    storytellers (
                        id,
                        full_name,
                        preferred_name,
                        bio,
                        community_affiliation,
                        cultural_background,
                        location,
                        signature_quotes,
                        profile_image_url,
                        expertise_areas,
                        interest_themes,
                        lived_experiences,
                        core_values,
                        life_lessons
                    )
                `)
                .eq('project_id', project.id);

            if (error) throw error;
            
            return data?.map(link => ({
                ...link.storytellers,
                relevance_score: link.relevance_score,
                tag_reason: link.tag_reason,
                connection_type: link.connection_type
            })) || [];
        } catch (error) {
            console.error('Error fetching project storytellers:', error);
            return [];
        }
    }

    // Link a storyteller to a project
    async linkStorytellerToProject(storytellerId, projectNotionId, relevanceScore = 5, reason = '', connectionType = 'community_member') {
        try {
            // First, ensure project exists in our local mirror
            await this.ensureProjectExists(projectNotionId);
            
            // Get project UUID
            const { data: project } = await this.supabase
                .from('projects')
                .select('id')
                .eq('notion_id', projectNotionId)
                .single();

            if (!project) {
                throw new Error(`Project not found: ${projectNotionId}`);
            }

            // Create the link
            const { data, error } = await this.supabase
                .from('storyteller_project_links')
                .upsert({
                    storyteller_id: storytellerId,
                    project_id: project.id,
                    relevance_score: relevanceScore,
                    tag_reason: reason,
                    connection_type: connectionType,
                    tagged_by: 'user'
                })
                .select();

            if (error) throw error;
            
            console.log(`🔗 Linked storyteller ${storytellerId} to project ${projectNotionId}`);
            return data[0];
        } catch (error) {
            console.error('Error linking storyteller to project:', error);
            throw error;
        }
    }

    // Get rich project insights from storytellers
    async getProjectStorytellerInsights(projectNotionId) {
        try {
            const storytellers = await this.getStorytellersForProject(projectNotionId);
            
            // Get stories from linked storytellers
            const storytellerIds = storytellers.map(s => s.id);
            let allStories = [];
            
            if (storytellerIds.length > 0) {
                const { data: stories } = await this.supabase
                    .from('stories')
                    .select('*')
                    .in('storyteller_id', storytellerIds);
                
                allStories = stories || [];
            }
            
            // Extract rich insights
            const insights = {
                totalStorytellers: storytellers.length,
                totalStories: allStories.length,
                
                // People insights
                locations: [...new Set(storytellers.map(s => s.location).filter(Boolean))],
                communities: [...new Set(storytellers.map(s => s.community_affiliation).filter(Boolean))],
                culturalBackgrounds: [...new Set(storytellers.map(s => s.cultural_background).filter(Boolean))],
                
                // Story insights
                themes: this.extractThemesFromStories(allStories),
                quotes: this.extractQuotesFromStorytellers(storytellers, allStories),
                mediaAssets: this.extractMediaAssets(allStories),
                
                // Connection insights
                connectionTypes: this.analyzeConnectionTypes(storytellers),
                expertiseAreas: this.extractExpertiseAreas(storytellers),
                
                // Recent content
                recentStories: allStories
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 5),
                
                // For grants/reporting
                impactQuotes: this.extractImpactQuotes(storytellers, allStories),
                diversityMetrics: this.calculateDiversityMetrics(storytellers)
            };

            return insights;
        } catch (error) {
            console.error('Error getting project storyteller insights:', error);
            return {
                totalStorytellers: 0,
                totalStories: 0,
                locations: [],
                communities: [],
                themes: [],
                quotes: [],
                mediaAssets: { images: 0, videos: 0, audio: 0 },
                recentStories: []
            };
        }
    }

    // Search storytellers by various criteria
    async searchStorytellers(query, filters = {}) {
        try {
            let queryBuilder = this.supabase
                .from('storytellers')
                .select('*');

            // Text search across multiple fields
            if (query) {
                queryBuilder = queryBuilder.or(
                    `full_name.ilike.%${query}%,bio.ilike.%${query}%,community_affiliation.ilike.%${query}%,location.ilike.%${query}%,expertise_areas.cs.{${query}},interest_themes.cs.{${query}}`
                );
            }

            // Apply filters
            if (filters.location) {
                queryBuilder = queryBuilder.ilike('location', `%${filters.location}%`);
            }
            if (filters.community) {
                queryBuilder = queryBuilder.ilike('community_affiliation', `%${filters.community}%`);
            }
            if (filters.cultural_background) {
                queryBuilder = queryBuilder.ilike('cultural_background', `%${filters.cultural_background}%`);
            }

            const { data, error } = await queryBuilder
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error searching storytellers:', error);
            return [];
        }
    }

    // Helper methods for extracting insights
    extractThemesFromStories(stories) {
        const allThemes = stories.flatMap(s => s.primary_themes || s.tags || []);
        const themeCounts = {};
        allThemes.forEach(theme => {
            if (theme && typeof theme === 'string') {
                themeCounts[theme] = (themeCounts[theme] || 0) + 1;
            }
        });
        
        return Object.entries(themeCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15)
            .map(([theme, count]) => ({ theme, count }));
    }

    extractQuotesFromStorytellers(storytellers, stories) {
        const quotes = [];
        
        // From signature quotes
        storytellers.forEach(storyteller => {
            if (storyteller.signature_quotes && Array.isArray(storyteller.signature_quotes)) {
                storyteller.signature_quotes.forEach(quote => {
                    quotes.push({
                        text: quote,
                        speaker: storyteller.full_name || storyteller.preferred_name,
                        location: storyteller.location,
                        community: storyteller.community_affiliation,
                        source: 'signature_quote',
                        profile_image: storyteller.profile_image_url
                    });
                });
            }
        });
        
        // From story transcripts
        stories.forEach(story => {
            const storyteller = storytellers.find(s => s.id === story.storyteller_id);
            if (story.transcript && storyteller) {
                // Simple quote extraction from transcript
                const sentences = story.transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
                sentences.slice(0, 2).forEach(sentence => {
                    quotes.push({
                        text: sentence.trim(),
                        speaker: storyteller.full_name || storyteller.preferred_name,
                        location: storyteller.location,
                        community: storyteller.community_affiliation,
                        source: 'transcript',
                        story_title: story.title,
                        profile_image: storyteller.profile_image_url
                    });
                });
            }
        });
        
        return quotes.slice(0, 20);
    }

    extractMediaAssets(stories) {
        return {
            images: stories.filter(s => s.image_url || s.primary_media_url?.includes('image')).length,
            videos: stories.filter(s => s.video_url || s.primary_media_url?.includes('video')).length,
            audio: stories.filter(s => s.audio_url || s.primary_media_url?.includes('audio')).length,
            totalAssets: stories.filter(s => s.image_url || s.video_url || s.audio_url || s.primary_media_url).length
        };
    }

    analyzeConnectionTypes(storytellers) {
        const connections = {};
        storytellers.forEach(s => {
            const type = s.connection_type || 'community_member';
            connections[type] = (connections[type] || 0) + 1;
        });
        return connections;
    }

    extractExpertiseAreas(storytellers) {
        const allExpertise = storytellers.flatMap(s => s.expertise_areas || []);
        const expertiseCounts = {};
        allExpertise.forEach(area => {
            if (area && typeof area === 'string') {
                expertiseCounts[area] = (expertiseCounts[area] || 0) + 1;
            }
        });
        
        return Object.entries(expertiseCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([area, count]) => ({ area, count }));
    }

    extractImpactQuotes(storytellers, stories) {
        // Focus on quotes that show impact, change, or outcomes
        const impactKeywords = ['changed', 'improved', 'helped', 'impact', 'difference', 'better', 'transformed'];
        
        return this.extractQuotesFromStorytellers(storytellers, stories)
            .filter(quote => 
                impactKeywords.some(keyword => 
                    quote.text.toLowerCase().includes(keyword)
                )
            )
            .slice(0, 10);
    }

    calculateDiversityMetrics(storytellers) {
        return {
            uniqueLocations: [...new Set(storytellers.map(s => s.location).filter(Boolean))].length,
            uniqueCommunities: [...new Set(storytellers.map(s => s.community_affiliation).filter(Boolean))].length,
            uniqueCulturalBackgrounds: [...new Set(storytellers.map(s => s.cultural_background).filter(Boolean))].length,
            totalRepresented: storytellers.length
        };
    }

    // Ensure project exists (same as before)
    async ensureProjectExists(notionId, projectData = {}) {
        try {
            const { data, error } = await this.supabase
                .from('projects')
                .upsert({
                    notion_id: notionId,
                    name: projectData.name || 'Unknown Project',
                    description: projectData.description || '',
                    status: projectData.status || 'Unknown',
                    last_synced: new Date().toISOString()
                })
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error ensuring project exists:', error);
            throw error;
        }
    }
}

module.exports = StorytellerProjectConnector;
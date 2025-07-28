// Supabase Stories Connector for ACT Placemat
const { createClient } = require('@supabase/supabase-js');

class SupabaseStoriesConnector {
    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
        
        if (!this.supabaseUrl || !this.supabaseKey) {
            console.warn('⚠️ Supabase credentials not found in environment variables');
            return;
        }
        
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        console.log('✅ Supabase Stories Connector initialized');
    }

    // Get all stories
    async getAllStories() {
        try {
            const { data, error } = await this.supabase
                .from('stories')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            console.log(`📚 Found ${data?.length || 0} stories in Supabase`);
            return data || [];
        } catch (error) {
            console.error('Error fetching stories:', error);
            return [];
        }
    }

    // Get stories for a specific project
    async getStoriesForProject(projectNotionId) {
        try {
            const { data, error } = await this.supabase
                .from('story_project_links')
                .select(`
                    *,
                    stories (
                        id,
                        title,
                        summary,
                        storyteller_name,
                        storyteller_organisation,
                        story_date,
                        themes,
                        quotes
                    )
                `)
                .eq('projects.notion_id', projectNotionId);

            if (error) throw error;
            
            return data?.map(link => ({
                ...link.stories,
                relevance_score: link.relevance_score,
                tag_reason: link.tag_reason
            })) || [];
        } catch (error) {
            console.error('Error fetching project stories:', error);
            return [];
        }
    }

    // Link a story to a project
    async linkStoryToProject(storyId, projectNotionId, relevanceScore = 5, reason = '') {
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
                .from('story_project_links')
                .upsert({
                    story_id: storyId,
                    project_id: project.id,
                    relevance_score: relevanceScore,
                    tag_reason: reason,
                    tagged_by: 'user'
                })
                .select();

            if (error) throw error;
            
            console.log(`🔗 Linked story ${storyId} to project ${projectNotionId}`);
            return data[0];
        } catch (error) {
            console.error('Error linking story to project:', error);
            throw error;
        }
    }

    // Ensure project exists in our mirror table
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

    // Get project insights (quotes, themes, etc.)
    async getProjectInsights(projectNotionId) {
        try {
            const stories = await this.getStoriesForProject(projectNotionId);
            
            // Extract insights
            const insights = {
                totalStories: stories.length,
                storytellers: [...new Set(stories.map(s => s.storyteller_name).filter(Boolean))],
                organisations: [...new Set(stories.map(s => s.storyteller_organisation).filter(Boolean))],
                themes: this.extractThemes(stories),
                quotes: this.extractQuotes(stories),
                recentStories: stories.slice(0, 3)
            };

            return insights;
        } catch (error) {
            console.error('Error getting project insights:', error);
            return {
                totalStories: 0,
                storytellers: [],
                organisations: [],
                themes: [],
                quotes: [],
                recentStories: []
            };
        }
    }

    // Search stories by content
    async searchStories(query, limit = 20) {
        try {
            const { data, error } = await this.supabase
                .from('stories')
                .select('*')
                .or(`title.ilike.%${query}%,summary.ilike.%${query}%,content.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error searching stories:', error);
            return [];
        }
    }

    // Find potential project matches for a story
    async suggestProjectsForStory(storyId) {
        try {
            const { data: story } = await this.supabase
                .from('stories')
                .select('*')
                .eq('id', storyId)
                .single();

            if (!story) return [];

            // Simple keyword matching for now - can enhance with AI later
            const keywords = this.extractKeywords(story.title + ' ' + story.summary);
            
            const { data: projects } = await this.supabase
                .from('projects')
                .select('*');

            const suggestions = projects
                .map(project => ({
                    project,
                    score: this.calculateRelevanceScore(story, project, keywords)
                }))
                .filter(s => s.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

            return suggestions;
        } catch (error) {
            console.error('Error suggesting projects:', error);
            return [];
        }
    }

    // Helper methods
    extractThemes(stories) {
        const allThemes = stories.flatMap(s => s.themes || []);
        const themeCounts = {};
        allThemes.forEach(theme => {
            themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        });
        
        return Object.entries(themeCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([theme, count]) => ({ theme, count }));
    }

    extractQuotes(stories) {
        return stories
            .flatMap(story => {
                if (story.quotes && Array.isArray(story.quotes)) {
                    return story.quotes.map(quote => ({
                        text: quote.text || quote,
                        speaker: story.storyteller_name,
                        organisation: story.storyteller_organisation,
                        story_id: story.id,
                        story_title: story.title
                    }));
                }
                return [];
            })
            .slice(0, 10);
    }

    extractKeywords(text) {
        // Simple keyword extraction - can enhance with NLP
        return text.toLowerCase()
            .split(/\W+/)
            .filter(word => word.length > 3)
            .filter(word => !['this', 'that', 'with', 'from', 'they', 'were', 'been', 'have'].includes(word));
    }

    calculateRelevanceScore(story, project, keywords) {
        let score = 0;
        const projectText = (project.name + ' ' + project.description).toLowerCase();
        
        keywords.forEach(keyword => {
            if (projectText.includes(keyword)) {
                score += 1;
            }
        });
        
        return score;
    }

    // Sync methods for keeping data in sync
    async syncProjectFromNotion(notionProject) {
        return await this.ensureProjectExists(notionProject.id, {
            name: notionProject.name,
            description: notionProject.description || notionProject.aiSummary,
            status: notionProject.status
        });
    }
}

module.exports = SupabaseStoriesConnector;
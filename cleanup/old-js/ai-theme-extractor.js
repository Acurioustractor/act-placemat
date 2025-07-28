// AI Theme Extractor for Storyteller-Project Alignment
// ACT Placemat Intelligence Platform

const OpenAI = require('openai');

class AIThemeExtractor {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.themeCategories = {
            expertise: [
                'housing', 'youth work', 'community development', 'cultural preservation',
                'addiction recovery', 'mental health', 'education', 'employment',
                'justice system', 'healthcare', 'elder care', 'childcare',
                'emergency response', 'disaster recovery', 'arts & culture'
            ],
            demographics: [
                'indigenous', 'elder', 'youth', 'women', 'men', 'families',
                'children', 'adults', 'seniors', 'traditional owners'
            ],
            impact_areas: [
                'healing', 'empowerment', 'connection', 'justice', 'equity',
                'sovereignty', 'self-determination', 'reconciliation', 'truth-telling',
                'capacity building', 'leadership development'
            ],
            geographic_scope: [
                'local', 'regional', 'state', 'national', 'remote', 'urban',
                'rural', 'community-specific'
            ]
        };
    }

    async analyzeStoryteller(storyteller) {
        const prompt = this.buildStorytellerAnalysisPrompt(storyteller);
        
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are an AI assistant specialized in analyzing community member profiles to identify expertise areas, impact themes, and project alignment opportunities. Focus on authentic community voice and cultural sensitivity."
                    },
                    {
                        role: "user", 
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 800
            });

            const analysis = this.parseAIResponse(response.choices[0].message.content);
            return {
                storytellerId: storyteller.id,
                name: storyteller.full_name,
                analysis,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error analyzing storyteller:', error);
            return this.getFallbackAnalysis(storyteller);
        }
    }

    buildStorytellerAnalysisPrompt(storyteller) {
        return `
Analyze this community member's profile and extract key themes for project alignment:

**Personal Information:**
- Name: ${storyteller.full_name || 'Not provided'}
- Location: ${storyteller.location || 'Not provided'}
- Community Affiliation: ${storyteller.community_affiliation || 'Not provided'}
- Cultural Background: ${storyteller.cultural_background || 'Not provided'}
- Storyteller Type: ${storyteller.storyteller_type || 'Not provided'}

**Biography:**
${storyteller.bio || 'No biography provided'}

**Expertise Areas (if provided):**
${storyteller.expertise_areas ? storyteller.expertise_areas.join(', ') : 'Not specified'}

**Interest Themes (if provided):**
${storyteller.interest_themes ? storyteller.interest_themes.join(', ') : 'Not specified'}

**Lived Experiences (if provided):**
${storyteller.lived_experiences ? storyteller.lived_experiences.join(', ') : 'Not specified'}

**Analysis Required:**
Extract and categorize the following in JSON format:

{
  "expertise_areas": ["list of 3-5 main areas of expertise or experience"],
  "impact_themes": ["list of 2-4 key impact areas they could contribute to"],
  "demographic_alignment": ["relevant demographic groups they represent or serve"],
  "geographic_focus": ["geographic scope of their work/influence"],
  "project_fit_types": ["types of projects they would be best suited for"],
  "connection_strength": ["areas where they could be team_member, partner, stakeholder, beneficiary, or community_member"],
  "cultural_assets": ["specific cultural knowledge, protocols, or connections they bring"],
  "quotes_potential": ["themes where their voice would be most powerful"],
  "collaboration_style": ["how they likely prefer to engage - leadership, support, advisory, etc."]
}

Focus on:
1. Authentic lived experience over assumptions
2. Cultural and community connections
3. Specific skills and knowledge areas
4. Potential project contribution types
5. Community representation value

Be specific and avoid generic terms. If information is limited, indicate with "insufficient_data".
`;
    }

    parseAIResponse(responseText) {
        try {
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback: parse structured text
            return this.parseStructuredText(responseText);
        } catch (error) {
            console.error('Error parsing AI response:', error);
            return this.getEmptyAnalysis();
        }
    }

    parseStructuredText(text) {
        const analysis = this.getEmptyAnalysis();
        
        // Simple keyword extraction as fallback
        const lines = text.split('\n');
        lines.forEach(line => {
            const lower = line.toLowerCase();
            
            if (lower.includes('expertise') || lower.includes('experience')) {
                this.extractListItems(line, analysis.expertise_areas);
            } else if (lower.includes('impact') || lower.includes('theme')) {
                this.extractListItems(line, analysis.impact_themes);
            } else if (lower.includes('demographic')) {
                this.extractListItems(line, analysis.demographic_alignment);
            }
        });
        
        return analysis;
    }

    extractListItems(text, targetArray) {
        // Extract items from lists in various formats
        const patterns = [
            /[-•]\s*([^,\n]+)/g,
            /"([^"]+)"/g,
            /:\s*([^,\n]+)/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const item = match[1].trim();
                if (item.length > 2 && !targetArray.includes(item)) {
                    targetArray.push(item);
                }
            }
        });
    }

    async suggestProjectConnections(storytellerId, maxSuggestions = 5) {
        try {
            // Get storyteller analysis
            const storyteller = await this.getStoryteller(storytellerId);
            const analysis = await this.analyzeStoryteller(storyteller);
            
            // Get all projects
            const projects = await this.getProjects();
            
            // Score each project
            const scoredProjects = projects.map(project => ({
                project,
                score: this.calculateAlignmentScore(analysis.analysis, project),
                reasoning: this.generateAlignmentReasoning(analysis.analysis, project)
            }));
            
            // Return top suggestions
            return scoredProjects
                .sort((a, b) => b.score - a.score)
                .slice(0, maxSuggestions)
                .map(item => ({
                    projectId: item.project.id,
                    projectName: item.project.name,
                    alignmentScore: item.score,
                    suggestedConnectionType: this.suggestConnectionType(analysis.analysis, item.project),
                    reasoning: item.reasoning,
                    relevanceScore: Math.min(10, Math.max(1, Math.round(item.score * 10)))
                }));
        } catch (error) {
            console.error('Error suggesting project connections:', error);
            return [];
        }
    }

    calculateAlignmentScore(analysis, project) {
        let score = 0;
        const projectText = `${project.name} ${project.description} ${project.coreValues || ''}`.toLowerCase();
        
        // Expertise alignment (40% of score)
        if (analysis.expertise_areas) {
            const expertiseMatches = analysis.expertise_areas.filter(expertise =>
                projectText.includes(expertise.toLowerCase())
            ).length;
            score += (expertiseMatches / Math.max(1, analysis.expertise_areas.length)) * 0.4;
        }
        
        // Impact theme alignment (30% of score)
        if (analysis.impact_themes) {
            const themeMatches = analysis.impact_themes.filter(theme =>
                projectText.includes(theme.toLowerCase())
            ).length;
            score += (themeMatches / Math.max(1, analysis.impact_themes.length)) * 0.3;
        }
        
        // Geographic alignment (15% of score)
        if (analysis.geographic_focus && project.state) {
            const geoMatches = analysis.geographic_focus.filter(geo =>
                project.state.toLowerCase().includes(geo.toLowerCase()) ||
                geo.toLowerCase().includes(project.state.toLowerCase())
            ).length;
            score += (geoMatches > 0 ? 1 : 0) * 0.15;
        }
        
        // Cultural asset alignment (15% of score)
        if (analysis.cultural_assets && project.coreValues) {
            const culturalKeywords = ['truth-telling', 'decentralised power', 'radical humility', 'creativity'];
            const culturalMatches = culturalKeywords.filter(keyword =>
                project.coreValues.toLowerCase().includes(keyword)
            ).length;
            score += (culturalMatches > 0 ? 1 : 0) * 0.15;
        }
        
        return Math.min(1.0, score);
    }

    generateAlignmentReasoning(analysis, project) {
        const reasons = [];
        
        // Check expertise alignment
        if (analysis.expertise_areas) {
            const projectText = `${project.name} ${project.description}`.toLowerCase();
            const matchingExpertise = analysis.expertise_areas.filter(expertise =>
                projectText.includes(expertise.toLowerCase())
            );
            
            if (matchingExpertise.length > 0) {
                reasons.push(`Expertise match: ${matchingExpertise.join(', ')}`);
            }
        }
        
        // Check impact theme alignment
        if (analysis.impact_themes) {
            const projectText = `${project.name} ${project.description}`.toLowerCase();
            const matchingThemes = analysis.impact_themes.filter(theme =>
                projectText.includes(theme.toLowerCase())
            );
            
            if (matchingThemes.length > 0) {
                reasons.push(`Impact alignment: ${matchingThemes.join(', ')}`);
            }
        }
        
        // Geographic reasoning
        if (analysis.geographic_focus && project.state) {
            reasons.push(`Geographic relevance: ${project.state}`);
        }
        
        return reasons.length > 0 ? reasons.join('. ') : 'General thematic alignment identified';
    }

    suggestConnectionType(analysis, project) {
        // Leadership indicators
        if (analysis.collaboration_style && 
            analysis.collaboration_style.some(style => 
                style.toLowerCase().includes('leadership') || 
                style.toLowerCase().includes('coordinator')
            )) {
            return 'team_member';
        }
        
        // Partnership indicators
        if (analysis.expertise_areas && 
            analysis.expertise_areas.length > 2) {
            return 'partner';
        }
        
        // Stakeholder indicators (Elders, Traditional Owners)
        if (analysis.cultural_assets && 
            analysis.cultural_assets.length > 0) {
            return 'stakeholder';
        }
        
        // Beneficiary indicators
        if (analysis.lived_experiences && 
            analysis.lived_experiences.some(exp => 
                exp.toLowerCase().includes('service user') ||
                exp.toLowerCase().includes('client')
            )) {
            return 'beneficiary';
        }
        
        // Default
        return 'community_member';
    }

    getFallbackAnalysis(storyteller) {
        const analysis = this.getEmptyAnalysis();
        
        // Basic keyword extraction from bio and community affiliation
        const text = `${storyteller.bio || ''} ${storyteller.community_affiliation || ''}`.toLowerCase();
        
        // Simple theme extraction
        this.themeCategories.expertise.forEach(theme => {
            if (text.includes(theme)) {
                analysis.expertise_areas.push(theme);
            }
        });
        
        // Add community affiliation as expertise
        if (storyteller.community_affiliation) {
            analysis.expertise_areas.push(storyteller.community_affiliation);
        }
        
        // Add location as geographic focus
        if (storyteller.location) {
            analysis.geographic_focus.push(storyteller.location);
        }
        
        return analysis;
    }

    getEmptyAnalysis() {
        return {
            expertise_areas: [],
            impact_themes: [],
            demographic_alignment: [],
            geographic_focus: [],
            project_fit_types: [],
            connection_strength: [],
            cultural_assets: [],
            quotes_potential: [],
            collaboration_style: []
        };
    }

    // Integration methods
    async getStoryteller(storytellerId) {
        const response = await fetch(`http://localhost:4000/api/storytellers`);
        const data = await response.json();
        return data.storytellers.find(s => s.id === storytellerId);
    }

    async getProjects() {
        const response = await fetch('http://localhost:4000/api/notion/real-projects');
        const data = await response.json();
        return data.projects;
    }

    // Batch processing for multiple storytellers
    async batchAnalyze(storytellerIds, options = {}) {
        const { batchSize = 5, delayMs = 1000 } = options;
        const results = [];
        
        for (let i = 0; i < storytellerIds.length; i += batchSize) {
            const batch = storytellerIds.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (id) => {
                try {
                    const storyteller = await this.getStoryteller(id);
                    return await this.analyzeStoryteller(storyteller);
                } catch (error) {
                    console.error(`Error analyzing storyteller ${id}:`, error);
                    return null;
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.filter(r => r !== null));
            
            // Rate limiting
            if (i + batchSize < storytellerIds.length) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
        return results;
    }
}

module.exports = { AIThemeExtractor };

// Usage example
if (require.main === module) {
    const extractor = new AIThemeExtractor();
    
    // Test with a specific storyteller
    const testStorytellerId = '2ed213dd-82f8-4efb-82bd-6defee67fdec'; // ZERO
    
    extractor.analyzeStoryteller({ id: testStorytellerId })
        .then(analysis => {
            console.log('🤖 AI Analysis Result:');
            console.log(JSON.stringify(analysis, null, 2));
            
            return extractor.suggestProjectConnections(testStorytellerId);
        })
        .then(suggestions => {
            console.log('\n🎯 Project Connection Suggestions:');
            suggestions.forEach((suggestion, i) => {
                console.log(`\n${i + 1}. ${suggestion.projectName}`);
                console.log(`   Score: ${(suggestion.alignmentScore * 100).toFixed(1)}%`);
                console.log(`   Connection: ${suggestion.suggestedConnectionType}`);
                console.log(`   Reasoning: ${suggestion.reasoning}`);
            });
        })
        .catch(console.error);
}
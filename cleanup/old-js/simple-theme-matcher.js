// Simple Theme Matching System (No AI Dependencies)
// ACT Placemat Intelligence Platform

class SimpleThemeMatcher {
    constructor() {
        this.themes = {
            expertise: [
                'housing', 'youth work', 'community development', 'cultural preservation',
                'addiction recovery', 'mental health', 'education', 'employment',
                'justice system', 'healthcare', 'elder care', 'childcare',
                'emergency response', 'disaster recovery', 'arts', 'music', 'culture'
            ],
            demographics: [
                'indigenous', 'aboriginal', 'elder', 'youth', 'women', 'men', 'families',
                'children', 'adults', 'seniors', 'traditional owners'
            ],
            impact_areas: [
                'healing', 'empowerment', 'connection', 'justice', 'equity',
                'sovereignty', 'self-determination', 'reconciliation', 'truth-telling',
                'capacity building', 'leadership development', 'storytelling'
            ],
            organizations: [
                'orange sky', 'picc', 'pcyc', 'youth service', 'wilya janta',
                'ferdy', 'tcyc', 'community company'
            ]
        };
    }

    analyzeStoryteller(storyteller) {
        const text = `${storyteller.bio || ''} ${storyteller.community_affiliation || ''} ${storyteller.location || ''}`.toLowerCase();
        
        const analysis = {
            id: storyteller.id,
            name: storyteller.full_name,
            location: storyteller.location,
            community: storyteller.community_affiliation,
            
            expertise_areas: this.extractThemes(text, this.themes.expertise),
            demographic_alignment: this.extractThemes(text, this.themes.demographics),
            impact_themes: this.extractThemes(text, this.themes.impact_areas),
            organization_connections: this.extractThemes(text, this.themes.organizations),
            
            // Calculated fields
            leadership_indicators: this.detectLeadership(text),
            cultural_assets: this.detectCulturalAssets(storyteller),
            geographic_scope: this.determineGeographicScope(storyteller)
        };
        
        return analysis;
    }

    extractThemes(text, themeList) {
        return themeList.filter(theme => 
            text.includes(theme.toLowerCase())
        );
    }

    detectLeadership(text) {
        const leadershipKeywords = [
            'coordinator', 'chairperson', 'manager', 'leader', 'director',
            'responsible for', 'overseeing', 'leading', 'managing', 'coordinating'
        ];
        
        return leadershipKeywords.filter(keyword => 
            text.includes(keyword.toLowerCase())
        );
    }

    detectCulturalAssets(storyteller) {
        const culturalIndicators = [];
        
        if (storyteller.storyteller_type === 'elder') {
            culturalIndicators.push('elder_knowledge');
        }
        
        if (storyteller.cultural_background) {
            culturalIndicators.push('cultural_background');
        }
        
        const text = (storyteller.bio || '').toLowerCase();
        if (text.includes('traditional owner') || text.includes('aboriginal') || text.includes('indigenous')) {
            culturalIndicators.push('indigenous_expertise');
        }
        
        if (text.includes('stolen generation')) {
            culturalIndicators.push('historical_witness');
        }
        
        return culturalIndicators;
    }

    determineGeographicScope(storyteller) {
        const location = storyteller.location || '';
        
        if (location.includes('Palm Island')) return 'palm_island_specific';
        if (location.includes('Tennant Creek')) return 'tennant_creek_specific';
        if (location.includes('Hobart')) return 'hobart_specific';
        if (location.includes('Queensland')) return 'queensland_wide';
        if (location.includes('Northern Territory')) return 'nt_wide';
        
        return 'regional';
    }

    suggestProjectConnections(storyteller, projects) {
        const analysis = this.analyzeStoryteller(storyteller);
        
        const scoredProjects = projects.map(project => {
            const score = this.calculateMatchScore(analysis, project);
            const connectionType = this.suggestConnectionType(analysis, project);
            const reasoning = this.generateReasoning(analysis, project, score);
            
            return {
                projectId: project.id,
                projectName: project.name,
                matchScore: score,
                connectionType,
                reasoning,
                relevanceScore: Math.min(10, Math.max(1, Math.round(score * 10)))
            };
        });
        
        return scoredProjects
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 5);
    }

    calculateMatchScore(analysis, project) {
        let score = 0;
        const projectText = `${project.name} ${project.description || ''} ${project.coreValues || ''}`.toLowerCase();
        
        // Geographic alignment (25%)
        if (analysis.location && project.state) {
            if (analysis.location.toLowerCase().includes(project.state.toLowerCase()) ||
                project.state.toLowerCase().includes(analysis.location.toLowerCase())) {
                score += 0.25;
            }
        }
        
        // Organization alignment (30%)
        if (analysis.community && projectText.includes(analysis.community.toLowerCase())) {
            score += 0.3;
        }
        
        // Expertise alignment (25%)
        const expertiseMatches = analysis.expertise_areas.filter(expertise =>
            projectText.includes(expertise.toLowerCase())
        ).length;
        score += (expertiseMatches / Math.max(1, analysis.expertise_areas.length)) * 0.25;
        
        // Impact theme alignment (20%)
        const impactMatches = analysis.impact_themes.filter(theme =>
            projectText.includes(theme.toLowerCase())
        ).length;
        score += (impactMatches / Math.max(1, analysis.impact_themes.length)) * 0.2;
        
        return Math.min(1.0, score);
    }

    suggestConnectionType(analysis, project) {
        // Leadership roles
        if (analysis.leadership_indicators.length > 0) {
            return 'team_member';
        }
        
        // Cultural assets = stakeholder
        if (analysis.cultural_assets.length > 0) {
            return 'stakeholder';
        }
        
        // Multiple expertise areas = partner
        if (analysis.expertise_areas.length > 2) {
            return 'partner';
        }
        
        // Service user indicators = beneficiary
        if (analysis.community === 'Orange Sky' && 
            project.name.toLowerCase().includes('orange sky')) {
            return 'beneficiary';
        }
        
        return 'community_member';
    }

    generateReasoning(analysis, project, score) {
        const reasons = [];
        
        // Geographic reasoning
        if (analysis.location && project.state && 
            analysis.location.toLowerCase().includes(project.state.toLowerCase())) {
            reasons.push(`Geographic alignment: ${analysis.location}`);
        }
        
        // Organization reasoning
        if (analysis.community && 
            project.name.toLowerCase().includes(analysis.community.toLowerCase())) {
            reasons.push(`Direct organizational connection: ${analysis.community}`);
        }
        
        // Expertise reasoning
        if (analysis.expertise_areas.length > 0) {
            const projectText = project.name.toLowerCase() + ' ' + (project.description || '').toLowerCase();
            const matchingExpertise = analysis.expertise_areas.filter(expertise =>
                projectText.includes(expertise.toLowerCase())
            );
            
            if (matchingExpertise.length > 0) {
                reasons.push(`Expertise match: ${matchingExpertise.join(', ')}`);
            }
        }
        
        // Cultural assets reasoning
        if (analysis.cultural_assets.length > 0) {
            reasons.push(`Cultural expertise: ${analysis.cultural_assets.join(', ')}`);
        }
        
        // Leadership reasoning
        if (analysis.leadership_indicators.length > 0) {
            reasons.push(`Leadership experience: ${analysis.leadership_indicators.join(', ')}`);
        }
        
        return reasons.length > 0 ? reasons.join('. ') : 'General thematic alignment';
    }

    // Bulk analysis for multiple storytellers
    analyzeMultipleStorytellers(storytellers) {
        return storytellers.map(storyteller => this.analyzeStoryteller(storyteller));
    }

    // Generate connection recommendations for all storytellers
    generateConnectionMatrix(storytellers, projects) {
        const results = [];
        
        storytellers.forEach(storyteller => {
            const suggestions = this.suggestProjectConnections(storyteller, projects);
            
            suggestions.forEach(suggestion => {
                if (suggestion.matchScore > 0.4) { // Only good matches
                    results.push({
                        storyteller: {
                            id: storyteller.id,
                            name: storyteller.full_name,
                            community: storyteller.community_affiliation
                        },
                        project: {
                            id: suggestion.projectId,
                            name: suggestion.projectName
                        },
                        matchScore: suggestion.matchScore,
                        connectionType: suggestion.connectionType,
                        relevanceScore: suggestion.relevanceScore,
                        reasoning: suggestion.reasoning
                    });
                }
            });
        });
        
        return results.sort((a, b) => b.matchScore - a.matchScore);
    }
}

// Test the system
async function testMatcher() {
    const matcher = new SimpleThemeMatcher();
    
    // Sample storytellers
    const storytellers = [
        {
            id: '2ed213dd-82f8-4efb-82bd-6defee67fdec',
            full_name: 'ZERO',
            location: 'Hobart',
            community_affiliation: 'Orange Sky',
            bio: "Zero, a musician, artist and psychology graduate currently experiencing houselessness in Hobart, articulates a profound philosophy on community, connection, and the distinction between house and home."
        },
        {
            id: 'ecb6116c-8de3-4d0d-8456-5986f9e2a4a2',
            full_name: 'Roy Prior',
            location: 'Palm Island',
            community_affiliation: 'PICC',
            bio: "Roy Prior is a lifelong Palm Island local and key figure at PICC. With over a decade of service, Roy coordinated community support efforts during recent floods."
        },
        {
            id: '60360a86-7ff5-49f6-8ef3-17d454d5774c',
            full_name: 'Henry Doyle',
            location: 'Palm Island',
            community_affiliation: 'Youth Service',
            bio: "Henry Doyle works with disengaged young people through community programs focused on education, sport, and skills development."
        }
    ];
    
    // Sample projects
    const projects = [
        {
            id: '219ebcf9-81cf-8049-9bff-e17b58792c96',
            name: 'Orange Sky Empathy Ledger',
            description: 'Ethical storytelling and volunteer engagement',
            state: 'National'
        },
        {
            id: '22eebcf9-81cf-808f-bad4-f9e0a6640252',
            name: 'PICC Annual Report',
            description: 'Annual report includes project scope and impact vision',
            state: 'Queensland'
        },
        {
            id: '228ebcf9-81cf-809e-8368-f9dae2a41129',
            name: 'Contained',
            description: 'Youth detention system reform and restorative justice',
            state: 'NSW'
        }
    ];
    
    console.log('🔍 ACT Placemat Simple Theme Matcher\n');
    
    // Analyze each storyteller
    storytellers.forEach((storyteller, i) => {
        console.log(`${i + 1}. ${storyteller.full_name} (${storyteller.community_affiliation})`);
        
        const analysis = matcher.analyzeStoryteller(storyteller);
        console.log(`   📍 Location: ${analysis.location}`);
        console.log(`   🎯 Expertise: ${analysis.expertise_areas.join(', ') || 'None detected'}`);
        console.log(`   🌟 Impact Themes: ${analysis.impact_themes.join(', ') || 'None detected'}`);
        console.log(`   👑 Leadership: ${analysis.leadership_indicators.join(', ') || 'None detected'}`);
        console.log(`   🏛️ Cultural Assets: ${analysis.cultural_assets.join(', ') || 'None detected'}`);
        
        // Get project suggestions
        const suggestions = matcher.suggestProjectConnections(storyteller, projects);
        console.log('\n   🎯 Top Project Suggestions:');
        
        suggestions.slice(0, 3).forEach((suggestion, j) => {
            console.log(`      ${j + 1}. ${suggestion.projectName}`);
            console.log(`         Score: ${(suggestion.matchScore * 100).toFixed(1)}%`);
            console.log(`         Connection: ${suggestion.connectionType}`);
            console.log(`         Relevance: ${suggestion.relevanceScore}/10`);
            console.log(`         Reasoning: ${suggestion.reasoning}`);
        });
        
        console.log('\n');
    });
    
    // Generate connection matrix
    console.log('📊 Connection Matrix (All High-Quality Matches):\n');
    const matrix = matcher.generateConnectionMatrix(storytellers, projects);
    
    matrix.slice(0, 10).forEach((connection, i) => {
        console.log(`${i + 1}. ${connection.storyteller.name} → ${connection.project.name}`);
        console.log(`   Score: ${(connection.matchScore * 100).toFixed(1)}% | ${connection.connectionType} | ${connection.relevanceScore}/10`);
        console.log(`   Reasoning: ${connection.reasoning}\n`);
    });
}

module.exports = { SimpleThemeMatcher };

// Run test if called directly
if (require.main === module) {
    testMatcher().catch(console.error);
}
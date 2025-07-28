// ACT Project Analysis Tool
// This analyzes your Notion data to create better categorization

class ACTProjectAnalyzer {
    constructor() {
        this.categories = {
            'Story & Sovereignty': {
                keywords: ['storytelling', 'truth-telling', 'empathy', 'narrative', 'story', 'sovereignty', 'data sovereignty', 'indigenous'],
                themes: ['Storytelling', 'Truth-Telling', 'Indigenous', 'Data Sovereignty'],
                coreValues: ['Truth-Telling'],
                tags: ['Storytelling', 'Truth-Telling', 'Empathy Ledger']
            },
            'Economic Freedom': {
                keywords: ['economic', 'business', 'funding', 'revenue', 'financial', 'cooperative', 'ownership'],
                themes: ['Economic Freedom', 'Business'],
                coreValues: ['Economic Freedom'],
                tags: ['Business', 'Strategy', 'Economic']
            },
            'Community Engagement': {
                keywords: ['community', 'engagement', 'participation', 'collaboration', 'mutual aid'],
                themes: ['Community Engagement', 'Global community'],
                coreValues: ['Community Ownership', 'Decentralised Power'],
                tags: ['Community', 'Collaboration', 'Connected']
            },
            'Operations & Infrastructure': {
                keywords: ['operations', 'infrastructure', 'systems', 'platform', 'technology', 'tools'],
                themes: ['Operations', 'Technology'],
                coreValues: ['Operations'],
                tags: ['Operations', 'Technology', 'Strategy']
            },
            'Research & Development': {
                keywords: ['research', 'development', 'innovation', 'experiment', 'testing', 'creative'],
                themes: ['Research', 'Innovation'],
                coreValues: ['Creativity', 'Radical Humility'],
                tags: ['Concept', 'Innovation', 'Research']
            }
        };
    }

    categorizeProject(project) {
        const scores = {};
        
        // Initialize scores
        Object.keys(this.categories).forEach(category => {
            scores[category] = 0;
        });

        // Analyze each category
        Object.entries(this.categories).forEach(([categoryName, categoryData]) => {
            // Check AI summary
            if (project.aiSummary) {
                const summaryText = project.aiSummary.toLowerCase();
                categoryData.keywords.forEach(keyword => {
                    if (summaryText.includes(keyword)) {
                        scores[categoryName] += 2;
                    }
                });
            }

            // Check themes
            if (project.themes && Array.isArray(project.themes)) {
                project.themes.forEach(theme => {
                    if (categoryData.themes.includes(theme)) {
                        scores[categoryName] += 3;
                    }
                });
            }

            // Check core values
            if (project.coreValues && categoryData.coreValues.includes(project.coreValues)) {
                scores[categoryName] += 2;
            }

            // Check tags
            if (project.tags && Array.isArray(project.tags)) {
                project.tags.forEach(tag => {
                    if (categoryData.tags.includes(tag)) {
                        scores[categoryName] += 1;
                    }
                });
            }

            // Check project name and description
            const projectText = `${project.name} ${project.description || ''}`.toLowerCase();
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

        return {
            category: bestCategory,
            scores: scores,
            confidence: scores[bestCategory]
        };
    }

    analyzeAllProjects(projects) {
        return projects.map(project => {
            const analysis = this.categorizeProject(project);
            return {
                ...project,
                suggestedArea: analysis.category,
                categoryScores: analysis.scores,
                confidence: analysis.confidence
            };
        });
    }

    generateCategoryReport(projects) {
        const categorized = this.analyzeAllProjects(projects);
        const report = {
            'Story & Sovereignty': [],
            'Economic Freedom': [],
            'Community Engagement': [],
            'Operations & Infrastructure': [],
            'Research & Development': []
        };

        categorized.forEach(project => {
            report[project.suggestedArea].push({
                name: project.name,
                confidence: project.confidence,
                themes: project.themes || [],
                tags: project.tags || [],
                status: project.status,
                funding: project.funding
            });
        });

        return report;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.ACTProjectAnalyzer = ACTProjectAnalyzer;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ACTProjectAnalyzer };
}
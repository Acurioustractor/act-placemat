// Grant Opportunity Scanner Prototype
// ACT Placemat Intelligence Platform

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

class GrantOpportunityScanner {
    constructor() {
        this.sources = [
            {
                name: 'Australian Government Grants',
                url: 'https://www.grants.gov.au/Go/List',
                type: 'government',
                selectors: {
                    title: '.grant-title',
                    description: '.grant-description', 
                    deadline: '.closing-date',
                    value: '.grant-value',
                    category: '.grant-category'
                }
            },
            {
                name: 'Ford Foundation',
                url: 'https://www.fordfoundation.org/work/our-grants/grants-database/',
                type: 'foundation',
                selectors: {
                    title: '.grant-title',
                    description: '.grant-summary',
                    themes: '.grant-themes'
                }
            },
            {
                name: 'Philanthropy Australia',
                url: 'https://www.philanthropy.org.au/funding-opportunities/',
                type: 'directory',
                selectors: {
                    title: '.opportunity-title',
                    description: '.opportunity-description',
                    deadline: '.deadline'
                }
            }
        ];
        
        this.projectThemes = [
            'indigenous communities',
            'youth justice',
            'housing',
            'community development',
            'storytelling',
            'cultural preservation',
            'social innovation',
            'truth telling',
            'reconciliation'
        ];
    }

    async scanAllSources() {
        console.log('🔍 Starting grant opportunity scan...');
        const opportunities = [];
        
        for (const source of this.sources) {
            try {
                console.log(`📊 Scanning ${source.name}...`);
                const grants = await this.scanSource(source);
                const matched = await this.matchToProjects(grants, source.name);
                opportunities.push(...matched);
                
                // Rate limiting
                await this.delay(2000);
            } catch (error) {
                console.error(`❌ Error scanning ${source.name}:`, error.message);
            }
        }
        
        return this.rankOpportunities(opportunities);
    }

    async scanSource(source) {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        try {
            await page.goto(source.url, { waitUntil: 'networkidle2' });
            await page.waitForSelector('body', { timeout: 10000 });
            
            const content = await page.content();
            const $ = cheerio.load(content);
            
            const grants = [];
            
            // Extract grant information based on source type
            if (source.name === 'Australian Government Grants') {
                grants.push(...await this.parseAustralianGovGrants($));
            } else if (source.name === 'Ford Foundation') {
                grants.push(...await this.parseFordFoundation($));
            } else {
                grants.push(...await this.parseGenericGrants($, source.selectors));
            }
            
            return grants;
        } finally {
            await browser.close();
        }
    }

    async parseAustralianGovGrants($) {
        const grants = [];
        
        $('.grant-item, .opportunity-item').each((i, elem) => {
            const $elem = $(elem);
            
            const grant = {
                title: $elem.find('h3, .title, .grant-title').first().text().trim(),
                description: $elem.find('.description, .summary').text().trim(),
                deadline: this.parseDate($elem.find('.closing-date, .deadline').text()),
                value: this.parseValue($elem.find('.value, .amount').text()),
                category: $elem.find('.category, .theme').text().trim(),
                url: $elem.find('a').attr('href'),
                source: 'Australian Government'
            };
            
            if (grant.title && grant.description) {
                grants.push(grant);
            }
        });
        
        return grants;
    }

    async parseFordFoundation($) {
        const grants = [];
        
        $('.grant-item, .funding-opportunity').each((i, elem) => {
            const $elem = $(elem);
            
            const grant = {
                title: $elem.find('h2, h3, .title').first().text().trim(),
                description: $elem.find('.description, .summary, p').first().text().trim(),
                themes: $elem.find('.themes, .tags').text().trim(),
                value: this.parseValue($elem.find('.amount, .value').text()),
                url: $elem.find('a').attr('href'),
                source: 'Ford Foundation'
            };
            
            if (grant.title && grant.description) {
                grants.push(grant);
            }
        });
        
        return grants;
    }

    async parseGenericGrants($, selectors) {
        const grants = [];
        
        $('.grant, .opportunity, .funding-item').each((i, elem) => {
            const $elem = $(elem);
            
            const grant = {
                title: $elem.find(selectors.title || 'h3, .title').first().text().trim(),
                description: $elem.find(selectors.description || '.description, .summary').text().trim(),
                deadline: selectors.deadline ? this.parseDate($elem.find(selectors.deadline).text()) : null,
                value: selectors.value ? this.parseValue($elem.find(selectors.value).text()) : null,
                url: $elem.find('a').attr('href')
            };
            
            if (grant.title && grant.description) {
                grants.push(grant);
            }
        });
        
        return grants;
    }

    async matchToProjects(grants, sourceName) {
        const projects = await this.getProjectsWithStorytellers();
        const matched = [];
        
        for (const grant of grants) {
            const matches = projects.map(project => {
                const score = this.calculateMatchScore(grant, project);
                return {
                    grant: {
                        ...grant,
                        source: sourceName
                    },
                    project: {
                        id: project.id,
                        name: project.name,
                        description: project.description
                    },
                    matchScore: score,
                    reasoning: this.generateMatchReasoning(grant, project, score),
                    storytellerEvidence: this.getRelevantStorytellers(grant, project.storytellers)
                };
            });
            
            const bestMatch = matches.sort((a, b) => b.matchScore - a.matchScore)[0];
            
            if (bestMatch.matchScore > 0.4) { // Only include reasonable matches
                matched.push(bestMatch);
            }
        }
        
        return matched;
    }

    calculateMatchScore(grant, project) {
        let score = 0;
        const grantText = `${grant.title} ${grant.description} ${grant.category || ''} ${grant.themes || ''}`.toLowerCase();
        const projectText = `${project.name} ${project.description} ${project.coreValues || ''}`.toLowerCase();
        
        // Theme matching
        for (const theme of this.projectThemes) {
            if (grantText.includes(theme) && projectText.includes(theme)) {
                score += 0.15;
            }
        }
        
        // Indigenous/community focus
        const indigenousKeywords = ['indigenous', 'aboriginal', 'first nations', 'traditional owners', 'community'];
        const indigenousMatches = indigenousKeywords.filter(keyword => 
            grantText.includes(keyword) && projectText.includes(keyword)
        ).length;
        score += indigenousMatches * 0.1;
        
        // Social impact keywords
        const impactKeywords = ['social', 'justice', 'equity', 'empowerment', 'innovation'];
        const impactMatches = impactKeywords.filter(keyword =>
            grantText.includes(keyword) && projectText.includes(keyword)
        ).length;
        score += impactMatches * 0.08;
        
        // Location matching (if available)
        if (grant.location && project.state) {
            if (grant.location.toLowerCase().includes(project.state.toLowerCase())) {
                score += 0.1;
            }
        }
        
        return Math.min(score, 1.0); // Cap at 1.0
    }

    generateMatchReasoning(grant, project, score) {
        const reasons = [];
        
        if (score > 0.7) {
            reasons.push("Strong thematic alignment");
        } else if (score > 0.5) {
            reasons.push("Good thematic match");
        } else {
            reasons.push("Moderate alignment");
        }
        
        const grantText = `${grant.title} ${grant.description}`.toLowerCase();
        const projectText = `${project.name} ${project.description}`.toLowerCase();
        
        // Identify specific matching themes
        const matchingThemes = this.projectThemes.filter(theme =>
            grantText.includes(theme) && projectText.includes(theme)
        );
        
        if (matchingThemes.length > 0) {
            reasons.push(`Shared focus: ${matchingThemes.join(', ')}`);
        }
        
        return reasons.join('. ');
    }

    getRelevantStorytellers(grant, storytellers) {
        if (!storytellers || storytellers.length === 0) return [];
        
        const grantThemes = `${grant.title} ${grant.description}`.toLowerCase();
        
        return storytellers
            .filter(storyteller => {
                const storytellerText = `${storyteller.bio || ''} ${storyteller.community_affiliation || ''}`.toLowerCase();
                
                // Check for theme relevance
                return this.projectThemes.some(theme =>
                    grantThemes.includes(theme) && storytellerText.includes(theme)
                );
            })
            .map(storyteller => ({
                id: storyteller.id,
                name: storyteller.full_name,
                community: storyteller.community_affiliation,
                relevance: storyteller.relevance_score || 5,
                quote: storyteller.signature_quotes?.[0] || null
            }))
            .slice(0, 5); // Top 5 most relevant
    }

    rankOpportunities(opportunities) {
        return opportunities
            .sort((a, b) => b.matchScore - a.matchScore)
            .map((opp, index) => ({
                ...opp,
                rank: index + 1,
                priority: this.calculatePriority(opp)
            }));
    }

    calculatePriority(opportunity) {
        const { grant, matchScore, storytellerEvidence } = opportunity;
        
        let priority = matchScore;
        
        // Boost priority for grants with deadlines
        if (grant.deadline && this.isDeadlineSoon(grant.deadline)) {
            priority += 0.1;
        }
        
        // Boost for high-value grants
        if (grant.value && grant.value > 100000) {
            priority += 0.1;
        }
        
        // Boost for strong storyteller evidence
        if (storytellerEvidence && storytellerEvidence.length > 3) {
            priority += 0.1;
        }
        
        if (priority > 0.8) return 'HIGH';
        if (priority > 0.6) return 'MEDIUM';
        return 'LOW';
    }

    // Helper methods
    parseDate(dateString) {
        if (!dateString) return null;
        const cleanDate = dateString.replace(/[^\d\/\-\s]/g, '').trim();
        const date = new Date(cleanDate);
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }

    parseValue(valueString) {
        if (!valueString) return null;
        const matches = valueString.match(/[\d,]+/);
        return matches ? parseInt(matches[0].replace(/,/g, '')) : null;
    }

    isDeadlineSoon(deadline, days = 30) {
        const deadlineDate = new Date(deadline);
        const today = new Date();
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= days && diffDays > 0;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Integration with existing ACT Placemat system
    async getProjectsWithStorytellers() {
        try {
            const response = await fetch('http://localhost:4000/api/notion/real-projects');
            const data = await response.json();
            
            // For each project, get connected storytellers
            const projectsWithStorytellers = await Promise.all(
                data.projects.map(async (project) => {
                    try {
                        const storytellersResponse = await fetch(`http://localhost:4000/api/projects/${project.id}/storytellers`);
                        const storytellersData = await storytellersResponse.json();
                        
                        return {
                            ...project,
                            storytellers: storytellersData.storytellers || []
                        };
                    } catch (error) {
                        console.error(`Error fetching storytellers for project ${project.id}:`, error);
                        return { ...project, storytellers: [] };
                    }
                })
            );
            
            return projectsWithStorytellers;
        } catch (error) {
            console.error('Error fetching projects:', error);
            return [];
        }
    }

    // Generate report for manual review
    generateReport(opportunities) {
        const report = {
            timestamp: new Date().toISOString(),
            totalOpportunities: opportunities.length,
            highPriority: opportunities.filter(o => o.priority === 'HIGH').length,
            mediumPriority: opportunities.filter(o => o.priority === 'MEDIUM').length,
            lowPriority: opportunities.filter(o => o.priority === 'LOW').length,
            opportunities: opportunities.slice(0, 10) // Top 10
        };
        
        return report;
    }
}

// Usage example
async function runGrantScan() {
    const scanner = new GrantOpportunityScanner();
    
    try {
        console.log('🚀 Starting automated grant opportunity scan...');
        const opportunities = await scanner.scanAllSources();
        const report = scanner.generateReport(opportunities);
        
        console.log(`✅ Scan complete! Found ${report.totalOpportunities} opportunities`);
        console.log(`📊 Priority breakdown: ${report.highPriority} high, ${report.mediumPriority} medium, ${report.lowPriority} low`);
        
        // Save to file for review
        const fs = require('fs');
        fs.writeFileSync(
            `grant-opportunities-${Date.now()}.json`,
            JSON.stringify(report, null, 2)
        );
        
        return report;
    } catch (error) {
        console.error('❌ Grant scan failed:', error);
        throw error;
    }
}

module.exports = { GrantOpportunityScanner, runGrantScan };

// Test the scanner
if (require.main === module) {
    runGrantScan()
        .then(report => {
            console.log('\n🎯 Top opportunities:');
            report.opportunities.slice(0, 3).forEach((opp, i) => {
                console.log(`\n${i + 1}. ${opp.grant.title}`);
                console.log(`   Match Score: ${(opp.matchScore * 100).toFixed(1)}%`);
                console.log(`   Priority: ${opp.priority}`);
                console.log(`   Project: ${opp.project.name}`);
                console.log(`   Reasoning: ${opp.reasoning}`);
                if (opp.storytellerEvidence.length > 0) {
                    console.log(`   Storyteller Evidence: ${opp.storytellerEvidence.length} connected storytellers`);
                }
            });
        })
        .catch(console.error);
}
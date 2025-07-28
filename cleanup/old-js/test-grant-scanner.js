// Test Grant Scanner (Mock Mode - No Web Scraping)
const { GrantOpportunityScanner } = require('./grant-scanner-prototype');

class MockGrantScanner extends GrantOpportunityScanner {
    // Override web scraping with mock data for testing
    async scanSource(source) {
        console.log(`🔍 Mock scanning ${source.name}...`);
        
        // Return mock grant data based on source
        if (source.name === 'Australian Government Grants') {
            return [
                {
                    title: 'Indigenous Community Development Grants',
                    description: 'Funding for Indigenous-led community development projects focusing on housing, education, and cultural preservation. Priority given to remote communities.',
                    deadline: '2025-03-15',
                    value: 150000,
                    category: 'Community Development',
                    url: 'https://grants.gov.au/indigenous-community',
                    source: 'Australian Government'
                },
                {
                    title: 'Youth Justice Innovation Fund',
                    description: 'Supporting innovative approaches to youth justice, including restorative justice programs and community-based alternatives to detention.',
                    deadline: '2025-04-30',
                    value: 200000,
                    category: 'Justice',
                    url: 'https://grants.gov.au/youth-justice',
                    source: 'Australian Government'
                }
            ];
        } else if (source.name === 'Ford Foundation') {
            return [
                {
                    title: 'Voices for Change: Community Storytelling Initiative',
                    description: 'Supporting grassroots organizations that amplify community voices through storytelling and narrative change work.',
                    themes: 'storytelling, community voices, social justice',
                    value: 75000,
                    url: 'https://fordfoundation.org/storytelling-grants',
                    source: 'Ford Foundation'
                }
            ];
        }
        
        return [];
    }
    
    // Mock project data
    async getProjectsWithStorytellers() {
        return [
            {
                id: '219ebcf9-81cf-8049-9bff-e17b58792c96',
                name: 'Orange Sky Empathy Ledger',
                description: 'The Empathy Ledger project collected 108 stories, focusing on ethical storytelling and volunteer engagement.',
                state: 'National',
                coreValues: 'Truth-Telling',
                storytellers: [
                    {
                        id: '2ed213dd-82f8-4efb-82bd-6defee67fdec',
                        full_name: 'ZERO',
                        community_affiliation: 'Orange Sky',
                        bio: 'Artist and musician experiencing houselessness',
                        signature_quotes: ['Creating organic community bonds through art and music']
                    }
                ]
            },
            {
                id: '22eebcf9-81cf-808f-bad4-f9e0a6640252',
                name: 'PICC Annual Report',
                description: 'Annual report includes project scope, impact vision, and links to various project resources and documentation.',
                state: 'Queensland',
                storytellers: [
                    {
                        id: 'ecb6116c-8de3-4d0d-8456-5986f9e2a4a2',
                        full_name: 'Roy Prior',
                        community_affiliation: 'PICC',
                        bio: 'Community coordinator with over a decade of service'
                    }
                ]
            },
            {
                id: '228ebcf9-81cf-809e-8368-f9dae2a41129',
                name: 'Contained',
                description: 'A 15-year-old from Mount Isa highlights the failures of the youth detention system and the need for restorative justice.',
                state: 'NSW',
                coreValues: 'Truth-Telling',
                storytellers: [
                    {
                        id: '60360a86-7ff5-49f6-8ef3-17d454d5774c',
                        full_name: 'Henry Doyle',
                        community_affiliation: 'Youth Service',
                        bio: 'Works with disengaged young people through community programs'
                    }
                ]
            }
        ];
    }
}

async function testGrantScanner() {
    console.log('🚀 Testing Grant Opportunity Scanner (Mock Mode)\n');
    
    const scanner = new MockGrantScanner();
    
    try {
        const opportunities = await scanner.scanAllSources();
        const report = scanner.generateReport(opportunities);
        
        console.log(`✅ Scan Complete!`);
        console.log(`📊 Found ${report.totalOpportunities} grant opportunities`);
        console.log(`🎯 Priority Breakdown:`);
        console.log(`   HIGH: ${report.highPriority}`);
        console.log(`   MEDIUM: ${report.mediumPriority}`);
        console.log(`   LOW: ${report.lowPriority}\n`);
        
        console.log('🏆 Top Grant Opportunities:\n');
        
        report.opportunities.forEach((opp, i) => {
            console.log(`${i + 1}. ${opp.grant.title}`);
            console.log(`   Source: ${opp.grant.source}`);
            console.log(`   Value: $${opp.grant.value ? opp.grant.value.toLocaleString() : 'Not specified'}`);
            console.log(`   Deadline: ${opp.grant.deadline || 'Not specified'}`);
            console.log(`   Match Score: ${(opp.matchScore * 100).toFixed(1)}%`);
            console.log(`   Priority: ${opp.priority}`);
            console.log(`   Best Project Match: ${opp.project.name}`);
            console.log(`   Reasoning: ${opp.reasoning}`);
            
            if (opp.storytellerEvidence && opp.storytellerEvidence.length > 0) {
                console.log(`   📝 Storyteller Evidence (${opp.storytellerEvidence.length} available):`);
                opp.storytellerEvidence.forEach(storyteller => {
                    console.log(`      • ${storyteller.name} (${storyteller.community})`);
                    if (storyteller.quote) {
                        console.log(`        Quote: "${storyteller.quote.substring(0, 100)}..."`);
                    }
                });
            }
            console.log('\n');
        });
        
        // Test grant application generation
        console.log('📝 Testing Grant Application Generation:\n');
        
        const bestMatch = opportunities[0];
        if (bestMatch) {
            console.log(`Generating application for: ${bestMatch.grant.title}`);
            console.log(`Project: ${bestMatch.project.name}`);
            
            const applicationTemplate = generateMockApplication(bestMatch);
            console.log('\n📄 Sample Application Content:');
            console.log(applicationTemplate);
        }
        
        return report;
        
    } catch (error) {
        console.error('❌ Error testing grant scanner:', error);
    }
}

function generateMockApplication(opportunity) {
    const { grant, project, storytellerEvidence } = opportunity;
    
    return `
GRANT APPLICATION: ${grant.title}

PROJECT: ${project.name}

COMMUNITY ENGAGEMENT:
This project directly engages ${storytellerEvidence.length} community members, providing authentic voices and lived experience perspectives.

STORYTELLER EVIDENCE:
${storytellerEvidence.map(s => 
    `• ${s.name} (${s.community}): Brings ${s.relevance}/10 relevance to project goals`
).join('\n')}

PROJECT ALIGNMENT:
${opportunity.reasoning}

FUNDING REQUEST: $${grant.value ? grant.value.toLocaleString() : '[Amount]'}

IMPACT METRICS:
- Community members directly engaged: ${storytellerEvidence.length}
- Organizations represented: ${[...new Set(storytellerEvidence.map(s => s.community))].length}
- Authentic voices available for testimony: ${storytellerEvidence.filter(s => s.quote).length}

This application leverages authentic community relationships built over time, ensuring genuine impact and accountability to the communities we serve.
`;
}

// Run test
testGrantScanner().catch(console.error);
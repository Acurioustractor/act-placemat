// Test Fallback Analysis (no API key needed)
const { AIThemeExtractor } = require('./ai-theme-extractor');

function testFallbackAnalysis() {
    const extractor = new AIThemeExtractor();
    
    // Test storytellers with rich bios
    const testStorytellers = [
        {
            id: '2ed213dd-82f8-4efb-82bd-6defee67fdec',
            full_name: 'ZERO',
            location: 'Hobart',
            community_affiliation: 'Orange Sky',
            bio: "Zero, a musician, artist and psychology graduate currently experiencing houselessness in Hobart, articulates a profound philosophy on community, connection, and the distinction between house and home. Living between tents, shelters, and hostels for two years, he advocates for third spaces where people can simply exist without economic pressure, creating organic community bonds through art, music, and free exchange."
        },
        {
            id: 'ecb6116c-8de3-4d0d-8456-5986f9e2a4a2',
            full_name: 'Roy Prior',
            location: 'Palm Island',
            community_affiliation: 'PICC',
            bio: "Roy Prior is a lifelong Palm Island local with deep roots across the region. After working across both mainland and island roles, he returned home to care for family and became a key figure at the Palm Island Community Company (PICC). With over a decade of service, Roy has helped grow PICC's reach into areas like health, wellbeing, and emergency response. During recent floods, Roy coordinated community support efforts—ensuring elders and families were safe, fed, and connected."
        },
        {
            id: '60360a86-7ff5-49f6-8ef3-17d454d5774c',
            full_name: 'Henry Doyle',
            location: 'Palm Island',
            community_affiliation: 'Youth Service',
            bio: "Henry Doyle is a proud Aboriginal man born and raised on Palm Island. Deeply involved in youth services, he works with disengaged young people through community programs focused on education, sport, and skills development like license support and community service. A passionate footy player and mentor, Henry helps lead initiatives like the Christmas Cup and youth camps, aiming to create pathways for local kids to thrive."
        }
    ];
    
    console.log('🔍 Testing Fallback Analysis (Keyword Extraction)...\n');
    
    testStorytellers.forEach((storyteller, i) => {
        console.log(`${i + 1}. ${storyteller.full_name} (${storyteller.community_affiliation})`);
        
        const analysis = extractor.getFallbackAnalysis(storyteller);
        
        console.log(`   📍 Location: ${storyteller.location}`);
        console.log(`   🎯 Expertise Areas: ${analysis.expertise_areas.join(', ') || 'None detected'}`);
        console.log(`   🌍 Geographic Focus: ${analysis.geographic_focus.join(', ') || 'None detected'}`);
        
        // Calculate potential project alignments
        const themes = [...analysis.expertise_areas, ...analysis.geographic_focus];
        console.log(`   🔗 Potential Themes: ${themes.join(', ')}`);
        console.log('');
    });
    
    // Test theme matching logic
    console.log('🎯 Testing Theme Matching Logic...\n');
    
    const sampleProjects = [
        {
            name: 'Orange Sky Empathy Ledger',
            description: 'Ethical storytelling and volunteer engagement project',
            state: 'National'
        },
        {
            name: 'PICC Annual Report',
            description: 'Annual report includes project scope, impact vision, and community documentation',
            state: 'Queensland'
        },
        {
            name: 'Youth Justice Innovation',
            description: 'Youth detention system reform and restorative justice programs',
            state: 'Queensland'
        }
    ];
    
    testStorytellers.forEach((storyteller, i) => {
        console.log(`${storyteller.full_name} - Project Alignments:`);
        
        sampleProjects.forEach(project => {
            const score = calculateSimpleAlignment(storyteller, project);
            console.log(`   ${project.name}: ${(score * 100).toFixed(1)}% match`);
        });
        console.log('');
    });
}

function calculateSimpleAlignment(storyteller, project) {
    let score = 0;
    const storytellerText = `${storyteller.bio} ${storyteller.community_affiliation} ${storyteller.location}`.toLowerCase();
    const projectText = `${project.name} ${project.description}`.toLowerCase();
    
    // Location matching
    if (storyteller.location && project.state) {
        if (storyteller.location.toLowerCase().includes('queensland') && project.state.toLowerCase().includes('queensland')) {
            score += 0.2;
        }
        if (project.state.toLowerCase() === 'national') {
            score += 0.1;
        }
    }
    
    // Organization matching
    if (storyteller.community_affiliation) {
        const org = storyteller.community_affiliation.toLowerCase();
        if (projectText.includes(org)) {
            score += 0.3;
        }
    }
    
    // Theme matching
    const themes = ['youth', 'community', 'housing', 'justice', 'storytelling', 'art', 'music', 'emergency', 'health'];
    themes.forEach(theme => {
        if (storytellerText.includes(theme) && projectText.includes(theme)) {
            score += 0.1;
        }
    });
    
    return Math.min(score, 1.0);
}

// Run test
testFallbackAnalysis();
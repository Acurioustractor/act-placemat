// Test AI Theme Extractor
const { AIThemeExtractor } = require('./ai-theme-extractor');

async function testExtractor() {
    const extractor = new AIThemeExtractor();
    
    // Test with ZERO - rich bio, clear themes
    const testStoryteller = {
        id: '2ed213dd-82f8-4efb-82bd-6defee67fdec',
        full_name: 'ZERO',
        location: 'Hobart',
        community_affiliation: 'Orange Sky',
        bio: "Zero, a musician, artist and psychology graduate currently experiencing houselessness in Hobart, articulates a profound philosophy on community, connection, and the distinction between house and home. Living between tents, shelters, and hostels for two years, he advocates for third spaces where people can simply exist without economic pressure, creating organic community bonds through art, music, and free exchange.",
        storyteller_type: 'other'
    };
    
    console.log('🤖 Testing AI Theme Extractor...');
    console.log(`Analyzing: ${testStoryteller.full_name} from ${testStoryteller.location}`);
    
    try {
        const analysis = await extractor.analyzeStoryteller(testStoryteller);
        console.log('\n✅ Analysis Complete:');
        console.log(JSON.stringify(analysis.analysis, null, 2));
        
        // Test project suggestions
        console.log('\n🎯 Testing project connection suggestions...');
        const suggestions = await extractor.suggestProjectConnections(testStoryteller.id);
        
        console.log(`\nFound ${suggestions.length} project suggestions:`);
        suggestions.forEach((suggestion, i) => {
            console.log(`\n${i + 1}. ${suggestion.projectName}`);
            console.log(`   Score: ${(suggestion.alignmentScore * 100).toFixed(1)}%`);
            console.log(`   Connection: ${suggestion.suggestedConnectionType}`);
            console.log(`   Relevance: ${suggestion.relevanceScore}/10`);
            console.log(`   Reasoning: ${suggestion.reasoning}`);
        });
        
    } catch (error) {
        console.error('❌ Error testing AI extractor:', error.message);
        
        // Test fallback analysis
        console.log('\n🔄 Testing fallback analysis...');
        const fallback = extractor.getFallbackAnalysis(testStoryteller);
        console.log(JSON.stringify(fallback, null, 2));
    }
}

// Run test
testExtractor().catch(console.error);
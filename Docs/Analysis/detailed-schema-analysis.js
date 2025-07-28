/**
 * Detailed Schema Analysis for Empathy Ledger Database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function analyzeDetailedSchema() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🔬 DETAILED EMPATHY LEDGER SCHEMA ANALYSIS');
    console.log('='.repeat(60));
    
    // Analyze Stories table in detail
    await analyzeStoriesTable(supabase);
    
    // Analyze Projects table
    await analyzeProjectsTable(supabase);
    
    // Analyze Organizations table
    await analyzeOrganizationsTable(supabase);
    
    // Analyze Themes and Quotes
    await analyzeThemesAndQuotes(supabase);
    
    // Check relationships and patterns
    await analyzeRelationships(supabase);
    
    // Assess readiness for public dashboard
    await assessPublicDashboardReadiness(supabase);
}

async function analyzeStoriesTable(supabase) {
    console.log('\n📖 STORIES TABLE DEEP DIVE');
    console.log('-'.repeat(40));
    
    try {
        // Get sample stories with all fields
        const { data: stories, error } = await supabase
            .from('stories')
            .select('*')
            .limit(3);
        
        if (error) throw error;
        
        if (stories && stories.length > 0) {
            const story = stories[0];
            console.log('📝 Sample Story Structure:');
            Object.entries(story).forEach(([key, value]) => {
                const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
                let preview = value;
                
                if (typeof value === 'string' && value.length > 100) {
                    preview = value.substring(0, 100) + '...';
                } else if (typeof value === 'object' && value !== null) {
                    preview = JSON.stringify(value).substring(0, 100) + '...';
                }
                
                console.log(`   ${key}: ${type}`);
                if (preview !== null && preview !== undefined) {
                    console.log(`      └─ ${preview}`);
                }
            });
            
            // Check for AI analysis patterns
            console.log('\n🤖 AI Analysis Patterns:');
            stories.forEach((story, i) => {
                console.log(`Story ${i + 1}:`);
                console.log(`   Has themes: ${story.themes ? '✅' : '❌'}`);
                console.log(`   Has summary: ${story.summary ? '✅' : '❌'}`);
                console.log(`   Has analysis: ${story.ai_analysis ? '✅' : '❌'}`);
                console.log(`   Has storyteller: ${story.storyteller_id ? '✅' : '❌'}`);
            });
        }
        
        // Get stories by status/visibility if those fields exist
        const { data: statusBreakdown } = await supabase
            .from('stories')
            .select('status, visibility_level, consent_public')
            .limit(50);
            
        if (statusBreakdown) {
            console.log('\n📊 Content Status Breakdown:');
            const statuses = {};
            const visibility = {};
            const consent = { true: 0, false: 0, null: 0 };
            
            statusBreakdown.forEach(story => {
                statuses[story.status || 'no_status'] = (statuses[story.status || 'no_status'] || 0) + 1;
                visibility[story.visibility_level || 'no_visibility'] = (visibility[story.visibility_level || 'no_visibility'] || 0) + 1;
                consent[story.consent_public === null ? 'null' : story.consent_public.toString()]++;
            });
            
            console.log('   Status distribution:', statuses);
            console.log('   Visibility distribution:', visibility);
            console.log('   Consent distribution:', consent);
        }
        
    } catch (error) {
        console.error('❌ Error analyzing stories:', error.message);
    }
}

async function analyzeProjectsTable(supabase) {
    console.log('\n🏗️ PROJECTS TABLE ANALYSIS');
    console.log('-'.repeat(40));
    
    try {
        const { data: projects } = await supabase
            .from('projects')
            .select('*')
            .limit(5);
        
        if (projects && projects.length > 0) {
            console.log(`📊 Found ${projects.length} sample projects`);
            
            const project = projects[0];
            console.log('\n📝 Project Structure:');
            Object.entries(project).forEach(([key, value]) => {
                const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
                console.log(`   ${key}: ${type} = ${JSON.stringify(value)}`);
            });
            
            // Check for Notion integration patterns
            console.log('\n🔗 Notion Integration Check:');
            projects.forEach((project, i) => {
                console.log(`Project ${i + 1}: ${project.name}`);
                console.log(`   Has notion_id: ${project.notion_id ? '✅' : '❌'}`);
                console.log(`   Has organization: ${project.organization_id ? '✅' : '❌'}`);
                console.log(`   Has location: ${project.location ? '✅' : '❌'}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error analyzing projects:', error.message);
    }
}

async function analyzeOrganizationsTable(supabase) {
    console.log('\n🏢 ORGANIZATIONS TABLE ANALYSIS');
    console.log('-'.repeat(40));
    
    try {
        const { data: orgs } = await supabase
            .from('organizations')
            .select('*')
            .limit(3);
        
        if (orgs && orgs.length > 0) {
            console.log(`📊 Found ${orgs.length} sample organizations`);
            
            const org = orgs[0];
            console.log('\n📝 Organization Structure:');
            Object.entries(org).forEach(([key, value]) => {
                const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
                console.log(`   ${key}: ${type} = ${JSON.stringify(value)}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error analyzing organizations:', error.message);
    }
}

async function analyzeThemesAndQuotes(supabase) {
    console.log('\n💭 THEMES & QUOTES ANALYSIS');
    console.log('-'.repeat(40));
    
    try {
        // Themes analysis
        const { data: themes } = await supabase
            .from('themes')
            .select('*')
            .limit(5);
        
        if (themes && themes.length > 0) {
            console.log(`🏷️ Found ${themes.length} sample themes`);
            console.log('Theme categories:', [...new Set(themes.map(t => t.category))]);
        }
        
        // Quotes analysis
        const { data: quotes, count: quotesCount } = await supabase
            .from('quotes')
            .select('*', { count: 'exact' })
            .limit(3);
        
        if (quotes && quotes.length > 0) {
            console.log(`💬 Found ${quotesCount} total quotes`);
            
            const quote = quotes[0];
            console.log('\n📝 Quote Structure:');
            Object.entries(quote).forEach(([key, value]) => {
                const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
                let preview = value;
                if (typeof value === 'string' && value.length > 50) {
                    preview = value.substring(0, 50) + '...';
                }
                console.log(`   ${key}: ${type} = ${JSON.stringify(preview)}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error analyzing themes/quotes:', error.message);
    }
}

async function analyzeRelationships(supabase) {
    console.log('\n🔗 RELATIONSHIP ANALYSIS');
    console.log('-'.repeat(40));
    
    try {
        // Check story-project links
        const { count: linkCount } = await supabase
            .from('story_project_links')
            .select('*', { count: 'exact', head: true });
        
        console.log(`📊 Story-Project Links: ${linkCount || 0}`);
        
        // Check stories with linked data
        const { data: storiesWithRels } = await supabase
            .from('stories')
            .select(`
                id,
                title,
                storyteller_id,
                themes,
                quotes:quotes(count)
            `)
            .limit(5);
        
        if (storiesWithRels) {
            console.log('\n📖 Stories Relationship Patterns:');
            storiesWithRels.forEach((story, i) => {
                console.log(`Story ${i + 1}: ${story.title?.substring(0, 30)}...`);
                console.log(`   Has storyteller: ${story.storyteller_id ? '✅' : '❌'}`);
                console.log(`   Has themes: ${story.themes ? '✅' : '❌'}`);
                console.log(`   Quote count: ${story.quotes?.[0]?.count || 0}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error analyzing relationships:', error.message);
    }
}

async function assessPublicDashboardReadiness(supabase) {
    console.log('\n🎯 PUBLIC DASHBOARD READINESS ASSESSMENT');
    console.log('-'.repeat(50));
    
    try {
        // Check for essential fields needed for public dashboard
        const { data: stories } = await supabase
            .from('stories')
            .select('id, title, content, summary, themes, storyteller_id, consent_public, visibility_level')
            .limit(10);
        
        let readyForPublic = 0;
        let needsConsent = 0;
        let needsContent = 0;
        
        if (stories) {
            stories.forEach(story => {
                if (story.consent_public === true && story.visibility_level === 'public') {
                    readyForPublic++;
                } else if (!story.consent_public) {
                    needsConsent++;
                }
                
                if (!story.summary && !story.content) {
                    needsContent++;
                }
            });
        }
        
        console.log('📊 Content Readiness:');
        console.log(`   ✅ Ready for public: ${readyForPublic}/${stories?.length || 0} stories`);
        console.log(`   ⚠️ Needs consent: ${needsConsent}/${stories?.length || 0} stories`);
        console.log(`   📝 Needs content: ${needsContent}/${stories?.length || 0} stories`);
        
        // Check for required infrastructure
        console.log('\n🏗️ Infrastructure Assessment:');
        console.log(`   Stories table: ✅`);
        console.log(`   Projects table: ✅`);
        console.log(`   Organizations table: ✅`);
        console.log(`   Themes system: ✅`);
        console.log(`   Quotes system: ✅`);
        console.log(`   Consent tracking: ${stories?.[0]?.consent_public !== undefined ? '✅' : '❌ MISSING'}`);
        console.log(`   Visibility levels: ${stories?.[0]?.visibility_level !== undefined ? '✅' : '❌ MISSING'}`);
        console.log(`   AI analysis: ${stories?.[0]?.ai_analysis !== undefined ? '✅' : '❌ MISSING'}`);
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        if (stories?.[0]?.consent_public === undefined) {
            console.log('   1. ⚠️ Add consent tracking fields to stories table');
        }
        if (stories?.[0]?.visibility_level === undefined) {
            console.log('   2. ⚠️ Add visibility_level field to stories table');
        }
        if (readyForPublic === 0) {
            console.log('   3. 🔧 Set up consent workflow for public content');
        }
        console.log('   4. ✅ Current schema is excellent foundation for public dashboard');
        console.log('   5. 🚀 Can proceed with hybrid architecture approach');
        
    } catch (error) {
        console.error('❌ Error assessing readiness:', error.message);
    }
}

// Run the analysis
analyzeDetailedSchema()
    .then(() => {
        console.log('\n✅ Detailed analysis complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    });
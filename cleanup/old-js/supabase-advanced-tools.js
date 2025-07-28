// Advanced Supabase Data Management Tools
// ACT Placemat - Complete Supabase-based system

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class SupabaseAdvancedTools {
    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_ANON_KEY;
        
        if (!this.supabaseUrl || !this.supabaseKey) {
            throw new Error('Supabase credentials missing. Check SUPABASE_URL and SUPABASE_ANON_KEY in .env');
        }
        
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        
        // Table configurations
        this.tables = {
            storytellers: {
                name: 'storytellers',
                keyFields: ['full_name', 'email', 'community_affiliation', 'location'],
                mediaFields: ['profile_image_url', 'signature_quotes'],
                contentFields: ['bio', 'expertise_areas', 'interest_themes', 'lived_experiences'],
                metaFields: ['storyteller_type', 'cultural_background', 'birth_year']
            },
            stories: {
                name: 'stories',
                keyFields: ['title', 'storyteller_id', 'status', 'medium'],
                mediaFields: ['image_url', 'video_url', 'audio_url', 'primary_media_url'],
                contentFields: ['story_copy', 'transcript', 'primary_themes', 'tags'],
                metaFields: ['date_occurred', 'location', 'language', 'privacy_level']
            },
            projects: {
                name: 'projects',
                keyFields: ['notion_id', 'name', 'status'],
                metaFields: ['description', 'last_synced']
            },
            storyteller_project_links: {
                name: 'storyteller_project_links',
                keyFields: ['storyteller_id', 'project_id', 'relevance_score'],
                metaFields: ['connection_type', 'tag_reason', 'tagged_by']
            }
        };
        
        console.log('✅ Supabase Advanced Tools initialized');
    }

    // Advanced query builder with complex filtering
    async queryWithFilters(tableName, options = {}) {
        const {
            filters = {},
            search = null,
            sort = null,
            limit = 100,
            offset = 0,
            select = '*',
            joins = []
        } = options;

        try {
            let query = this.supabase.from(tableName).select(select);

            // Apply filters
            Object.entries(filters).forEach(([field, criteria]) => {
                if (typeof criteria === 'string' || typeof criteria === 'number') {
                    query = query.eq(field, criteria);
                } else if (typeof criteria === 'object') {
                    const { operator, value } = criteria;
                    
                    switch (operator) {
                        case 'eq':
                            query = query.eq(field, value);
                            break;
                        case 'neq':
                            query = query.neq(field, value);
                            break;
                        case 'gt':
                            query = query.gt(field, value);
                            break;
                        case 'gte':
                            query = query.gte(field, value);
                            break;
                        case 'lt':
                            query = query.lt(field, value);
                            break;
                        case 'lte':
                            query = query.lte(field, value);
                            break;
                        case 'like':
                            query = query.like(field, `%${value}%`);
                            break;
                        case 'ilike':
                            query = query.ilike(field, `%${value}%`);
                            break;
                        case 'in':
                            query = query.in(field, value);
                            break;
                        case 'not_in':
                            query = query.not(field, 'in', value);
                            break;
                        case 'is_null':
                            query = query.is(field, null);
                            break;
                        case 'not_null':
                            query = query.not(field, 'is', null);
                            break;
                        case 'contains':
                            if (Array.isArray(value)) {
                                query = query.contains(field, value);
                            } else {
                                query = query.ilike(field, `%${value}%`);
                            }
                            break;
                    }
                }
            });

            // Apply text search across multiple fields
            if (search) {
                const searchableFields = this.getSearchableFields(tableName);
                if (searchableFields.length > 0) {
                    const searchConditions = searchableFields.map(field => 
                        `${field}.ilike.%${search}%`
                    ).join(',');
                    query = query.or(searchConditions);
                }
            }

            // Apply sorting
            if (sort) {
                const { field, ascending = true } = sort;
                query = query.order(field, { ascending });
            }

            // Apply pagination
            if (limit) {
                query = query.limit(limit);
            }
            if (offset) {
                query = query.range(offset, offset + limit - 1);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                data: data || [],
                count: data?.length || 0,
                totalCount: count,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`Error querying ${tableName}:`, error);
            throw error;
        }
    }

    getSearchableFields(tableName) {
        const searchableFields = {
            storytellers: ['full_name', 'bio', 'community_affiliation', 'location', 'cultural_background'],
            stories: ['title', 'story_copy', 'transcript', 'primary_themes', 'tags'],
            projects: ['name', 'description'],
            storyteller_project_links: ['tag_reason']
        };
        
        return searchableFields[tableName] || [];
    }

    // Advanced storyteller filtering
    async getFilteredStorytellers(criteria = {}) {
        const {
            hasProfileImage = null,
            hasBio = null,
            hasStories = null,
            communities = [],
            locations = [],
            storytellerTypes = [],
            culturalBackgrounds = [],
            hasQuotes = null,
            createdAfter = null,
            search = null,
            limit = 100,
            offset = 0
        } = criteria;

        const filters = {};

        // Profile image filter
        if (hasProfileImage === true) {
            filters.profile_image_url = { operator: 'not_null' };
        } else if (hasProfileImage === false) {
            filters.profile_image_url = { operator: 'is_null' };
        }

        // Bio filter
        if (hasBio === true) {
            filters.bio = { operator: 'not_null' };
        } else if (hasBio === false) {
            filters.bio = { operator: 'is_null' };
        }

        // Quotes filter (signature_quotes is JSONB array)
        if (hasQuotes === true) {
            filters.signature_quotes = { operator: 'not_null' };
        }

        // Community filter
        if (communities.length > 0) {
            filters.community_affiliation = { operator: 'in', value: communities };
        }

        // Location filter
        if (locations.length > 0) {
            filters.location = { operator: 'in', value: locations };
        }

        // Storyteller type filter
        if (storytellerTypes.length > 0) {
            filters.storyteller_type = { operator: 'in', value: storytellerTypes };
        }

        // Cultural background filter
        if (culturalBackgrounds.length > 0) {
            filters.cultural_background = { operator: 'in', value: culturalBackgrounds };
        }

        // Date filter
        if (createdAfter) {
            filters.created_at = { operator: 'gte', value: createdAfter };
        }

        const options = {
            filters,
            search,
            sort: { field: 'created_at', ascending: false },
            limit,
            offset
        };

        return await this.queryWithFilters('storytellers', options);
    }

    // Advanced story filtering
    async getFilteredStories(criteria = {}) {
        const {
            hasVideo = null,
            hasAudio = null,
            hasImage = null,
            hasTranscript = null,
            status = [],
            themes = [],
            storytellers = [],
            projects = [],
            mediums = [],
            languages = [],
            dateRange = null,
            search = null,
            limit = 100,
            offset = 0
        } = criteria;

        const filters = {};

        // Media filters
        if (hasVideo === true) {
            filters.video_url = { operator: 'not_null' };
        }
        if (hasAudio === true) {
            filters.audio_url = { operator: 'not_null' };
        }
        if (hasImage === true) {
            filters.image_url = { operator: 'not_null' };
        }
        if (hasTranscript === true) {
            filters.transcript = { operator: 'not_null' };
        }

        // Status filter
        if (status.length > 0) {
            filters.status = { operator: 'in', value: status };
        }

        // Medium filter
        if (mediums.length > 0) {
            filters.medium = { operator: 'in', value: mediums };
        }

        // Language filter
        if (languages.length > 0) {
            filters.language = { operator: 'in', value: languages };
        }

        // Storyteller filter
        if (storytellers.length > 0) {
            filters.storyteller_id = { operator: 'in', value: storytellers };
        }

        // Date range filter
        if (dateRange) {
            const { start, end } = dateRange;
            if (start) {
                filters.date_occurred = { operator: 'gte', value: start };
            }
            if (end) {
                filters.date_occurred = { operator: 'lte', value: end };
            }
        }

        const options = {
            filters,
            search,
            sort: { field: 'created_at', ascending: false },
            limit,
            offset,
            select: `
                *,
                storytellers (
                    id,
                    full_name,
                    community_affiliation,
                    profile_image_url
                )
            `
        };

        return await this.queryWithFilters('stories', options);
    }

    // Data quality analysis
    async analyzeTableQuality(tableName) {
        console.log(`🔍 Analyzing data quality for ${tableName}...`);

        try {
            // Get total count
            const { count: totalCount } = await this.supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });

            if (!totalCount || totalCount === 0) {
                return { error: `No records found in ${tableName}` };
            }

            // Get sample data for analysis
            const { data: sampleData } = await this.supabase
                .from(tableName)
                .select('*')
                .limit(Math.min(500, totalCount));

            if (!sampleData || sampleData.length === 0) {
                return { error: 'No sample data available' };
            }

            // Get all unique fields
            const allFields = new Set();
            sampleData.forEach(record => {
                Object.keys(record).forEach(field => allFields.add(field));
            });

            const fieldAnalysis = {};
            const sampleSize = sampleData.length;

            // Analyze each field
            Array.from(allFields).forEach(fieldName => {
                const values = sampleData.map(record => record[fieldName]);
                const nonNullValues = values.filter(v => 
                    v !== null && 
                    v !== undefined && 
                    v !== '' && 
                    !(Array.isArray(v) && v.length === 0) &&
                    !(typeof v === 'object' && Object.keys(v).length === 0)
                );

                fieldAnalysis[fieldName] = {
                    completeness: ((nonNullValues.length / sampleSize) * 100).toFixed(1),
                    totalValues: sampleSize,
                    filledValues: nonNullValues.length,
                    uniqueValues: new Set(nonNullValues.map(v => 
                        typeof v === 'object' ? JSON.stringify(v) : String(v)
                    )).size,
                    dataTypes: [...new Set(nonNullValues.map(v => {
                        if (Array.isArray(v)) return 'array';
                        if (v === null) return 'null';
                        return typeof v;
                    }))],
                    nullCount: values.filter(v => v === null || v === undefined).length,
                    emptyStringCount: values.filter(v => v === '').length
                };
            });

            // Calculate overall quality score
            const completenessScores = Object.values(fieldAnalysis)
                .filter(field => !['id', 'created_at', 'updated_at'].includes(field))
                .map(field => parseFloat(field.completeness));
            
            const overallScore = completenessScores.length > 0 
                ? (completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length).toFixed(1)
                : 0;

            // Generate recommendations
            const recommendations = [];
            Object.entries(fieldAnalysis).forEach(([field, analysis]) => {
                if (['id', 'created_at', 'updated_at'].includes(field)) return;
                
                if (analysis.completeness < 20) {
                    recommendations.push(`❌ ${field}: Very low completeness (${analysis.completeness}%)`);
                } else if (analysis.completeness < 50) {
                    recommendations.push(`⚠️ ${field}: Low completeness (${analysis.completeness}%)`);
                } else if (analysis.completeness > 90) {
                    recommendations.push(`✅ ${field}: Excellent completeness (${analysis.completeness}%)`);
                }

                if (analysis.uniqueValues === 1 && analysis.filledValues > 10) {
                    recommendations.push(`🔄 ${field}: All values are identical - check data variety`);
                }
            });

            return {
                tableName,
                totalRecords: totalCount,
                sampleSize,
                totalFields: allFields.size,
                overallQualityScore: overallScore,
                fieldAnalysis,
                recommendations,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`Error analyzing ${tableName}:`, error);
            return { error: error.message };
        }
    }

    // Get unique values for filter options
    async getUniqueFieldValues(tableName, fieldName, limit = 100) {
        try {
            const { data } = await this.supabase
                .from(tableName)
                .select(fieldName)
                .not(fieldName, 'is', null)
                .limit(1000);

            if (!data) return [];

            const values = new Set();
            
            data.forEach(record => {
                const value = record[fieldName];
                if (value) {
                    if (Array.isArray(value)) {
                        value.forEach(v => values.add(v));
                    } else if (typeof value === 'string' && value.trim() !== '') {
                        values.add(value.trim());
                    } else if (typeof value !== 'object') {
                        values.add(value);
                    }
                }
            });

            return Array.from(values).sort().slice(0, limit);

        } catch (error) {
            console.error(`Error getting unique values for ${tableName}.${fieldName}:`, error);
            return [];
        }
    }

    // Get filter options for UI
    async getFilterOptions(tableName) {
        console.log(`📋 Getting filter options for ${tableName}...`);

        const fieldMappings = {
            storytellers: [
                'community_affiliation',
                'location',
                'storyteller_type',
                'cultural_background'
            ],
            stories: [
                'status',
                'medium',
                'language',
                'privacy_level'
            ],
            projects: [
                'status'
            ]
        };

        const fields = fieldMappings[tableName] || [];
        const options = {};

        for (const field of fields) {
            try {
                const values = await this.getUniqueFieldValues(tableName, field, 50);
                options[field] = values;
            } catch (error) {
                console.error(`Error getting options for ${field}:`, error);
                options[field] = [];
            }
        }

        return options;
    }

    // Bulk operations
    async bulkInsert(tableName, records, batchSize = 100) {
        console.log(`📥 Bulk inserting ${records.length} records into ${tableName}...`);
        
        const results = [];
        const errors = [];

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            try {
                const { data, error } = await this.supabase
                    .from(tableName)
                    .insert(batch)
                    .select();

                if (error) throw error;

                results.push(...(data || []));
                console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.length/batchSize)}`);
                
            } catch (error) {
                console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error);
                errors.push({
                    batchIndex: Math.floor(i/batchSize) + 1,
                    error: error.message,
                    records: batch
                });
            }

            // Rate limiting
            if (i + batchSize < records.length) {
                await this.delay(100);
            }
        }

        return {
            successful: results.length,
            errors: errors.length,
            errorDetails: errors,
            insertedRecords: results
        };
    }

    async bulkUpdate(tableName, updates, batchSize = 100) {
        console.log(`🔄 Bulk updating ${updates.length} records in ${tableName}...`);
        
        const results = [];
        const errors = [];

        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            
            try {
                const { data, error } = await this.supabase
                    .from(tableName)
                    .upsert(batch)
                    .select();

                if (error) throw error;

                results.push(...(data || []));
                console.log(`✅ Updated batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(updates.length/batchSize)}`);
                
            } catch (error) {
                console.error(`❌ Error updating batch ${Math.floor(i/batchSize) + 1}:`, error);
                errors.push({
                    batchIndex: Math.floor(i/batchSize) + 1,
                    error: error.message,
                    records: batch
                });
            }

            await this.delay(100);
        }

        return {
            successful: results.length,
            errors: errors.length,
            errorDetails: errors,
            updatedRecords: results
        };
    }

    // Export utilities
    async exportTableToJSON(tableName, filters = {}, limit = 1000) {
        console.log(`📤 Exporting ${tableName} to JSON...`);
        
        const data = await this.queryWithFilters(tableName, {
            filters,
            limit
        });

        const exportData = {
            metadata: {
                table: tableName,
                exportDate: new Date().toISOString(),
                totalRecords: data.count,
                filters
            },
            records: data.data
        };

        return exportData;
    }

    // Storyteller-Project relationship tools
    async getStorytellersWithProjectConnections(limit = 100) {
        try {
            const { data } = await this.supabase
                .from('storytellers')
                .select(`
                    *,
                    storyteller_project_links (
                        id,
                        relevance_score,
                        connection_type,
                        tag_reason,
                        projects (
                            id,
                            notion_id,
                            name,
                            status
                        )
                    )
                `)
                .limit(limit);

            return data || [];
        } catch (error) {
            console.error('Error getting storytellers with connections:', error);
            return [];
        }
    }

    async getProjectsWithStorytellers(limit = 100) {
        try {
            const { data } = await this.supabase
                .from('projects')
                .select(`
                    *,
                    storyteller_project_links (
                        id,
                        relevance_score,
                        connection_type,
                        tag_reason,
                        storytellers (
                            id,
                            full_name,
                            community_affiliation,
                            profile_image_url,
                            bio
                        )
                    )
                `)
                .limit(limit);

            return data || [];
        } catch (error) {
            console.error('Error getting projects with storytellers:', error);
            return [];
        }
    }

    // Performance monitoring
    async performanceTest(tableName, testSizes = [10, 50, 100, 500]) {
        console.log(`⚡ Running performance test on ${tableName}...`);
        
        const results = {};

        for (const size of testSizes) {
            const startTime = Date.now();
            
            await this.queryWithFilters(tableName, { limit: size });
            
            const endTime = Date.now();
            const duration = endTime - startTime;

            results[size] = {
                duration,
                recordsPerSecond: (size / (duration / 1000)).toFixed(2)
            };

            console.log(`📊 ${size} records: ${duration}ms (${results[size].recordsPerSecond} records/sec)`);
        }

        return results;
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Generate comprehensive system report
    async generateSystemReport() {
        console.log('📊 Generating comprehensive system report...\n');
        
        const report = {
            timestamp: new Date().toISOString(),
            system: 'ACT Placemat - Supabase',
            tables: {}
        };

        const tables = ['storytellers', 'stories', 'projects', 'storyteller_project_links'];

        for (const tableName of tables) {
            try {
                console.log(`Analyzing ${tableName}...`);
                
                const qualityAnalysis = await this.analyzeTableQuality(tableName);
                const filterOptions = await this.getFilterOptions(tableName);
                
                report.tables[tableName] = {
                    ...qualityAnalysis,
                    filterOptions
                };
                
            } catch (error) {
                console.error(`Error analyzing ${tableName}:`, error);
                report.tables[tableName] = { error: error.message };
            }
        }

        return report;
    }
}

module.exports = { SupabaseAdvancedTools };

// Test the tools
if (require.main === module) {
    async function testTools() {
        try {
            const tools = new SupabaseAdvancedTools();
            
            console.log('🔍 Testing Supabase Advanced Tools...\n');
            
            // Test basic connection and data quality
            console.log('📊 Analyzing storytellers table...');
            const storytellerQuality = await tools.analyzeTableQuality('storytellers');
            
            if (storytellerQuality.error) {
                console.log(`❌ ${storytellerQuality.error}`);
            } else {
                console.log(`✅ ${storytellerQuality.totalRecords} storytellers, ${storytellerQuality.overallQualityScore}% quality score`);
                console.log('Top recommendations:', storytellerQuality.recommendations.slice(0, 3));
            }
            
            // Test filter options
            console.log('\n📋 Getting filter options...');
            const storytellerOptions = await tools.getFilterOptions('storytellers');
            console.log('Available filters:');
            Object.entries(storytellerOptions).forEach(([field, values]) => {
                console.log(`  ${field}: ${values.slice(0, 5).join(', ')}${values.length > 5 ? ` (+${values.length - 5} more)` : ''}`);
            });
            
            // Test advanced filtering
            console.log('\n🎯 Testing advanced filtering...');
            const storytellersWithBios = await tools.getFilteredStorytellers({
                hasBio: true,
                limit: 10
            });
            console.log(`Found ${storytellersWithBios.count} storytellers with bios`);
            
            // Test relationship queries
            console.log('\n🔗 Testing relationship queries...');
            const storytellersWithConnections = await tools.getStorytellersWithProjectConnections(5);
            console.log(`Found ${storytellersWithConnections.length} storytellers with project connections`);
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            
            if (error.message.includes('credentials')) {
                console.log('\n🔧 To enable Supabase features, check these environment variables:');
                console.log('SUPABASE_URL=your_supabase_url');
                console.log('SUPABASE_ANON_KEY=your_supabase_anon_key');
            }
        }
    }
    
    testTools();
}
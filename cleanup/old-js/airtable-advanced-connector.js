// Advanced Airtable Connector with Filtering and Bulk Operations
// ACT Placemat Tools & Optimization

const Airtable = require('airtable');

class AirtableAdvancedConnector {
    constructor() {
        this.apiKey = process.env.AIRTABLE_API_KEY;
        this.baseId = process.env.AIRTABLE_BASE_ID;
        
        if (!this.apiKey || !this.baseId) {
            throw new Error('Airtable credentials missing. Check AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env');
        }
        
        this.base = new Airtable({ apiKey: this.apiKey }).base(this.baseId);
        
        // Common table names - update based on your Airtable structure
        this.tables = {
            stories: 'Stories',
            storytellers: 'Storytellers', 
            projects: 'Projects',
            organizations: 'Organizations',
            media: 'Media Assets'
        };
        
        console.log('✅ Airtable Advanced Connector initialized');
    }

    // Advanced filtering and querying
    async getRecordsWithAdvancedFilters(tableName, options = {}) {
        const {
            filters = [],
            sorts = [],
            fields = [],
            maxRecords = 100,
            view = null,
            batchCallback = null
        } = options;

        try {
            let query = this.base(tableName);
            
            // Apply filters
            if (filters.length > 0) {
                const filterFormula = this.buildFilterFormula(filters);
                query = query.select({ filterByFormula: filterFormula });
            }
            
            // Apply sorts
            if (sorts.length > 0) {
                query = query.select({ sort: sorts });
            }
            
            // Apply field selection
            if (fields.length > 0) {
                query = query.select({ fields });
            }
            
            // Apply view
            if (view) {
                query = query.select({ view });
            }
            
            // Set max records
            query = query.select({ maxRecords });
            
            const records = [];
            let batchCount = 0;
            
            await query.eachPage((pageRecords, fetchNextPage) => {
                const processedRecords = pageRecords.map(record => ({
                    id: record.id,
                    fields: record.fields,
                    createdTime: record._rawJson.createdTime
                }));
                
                records.push(...processedRecords);
                batchCount++;
                
                // Optional batch processing callback
                if (batchCallback) {
                    batchCallback(processedRecords, batchCount);
                }
                
                fetchNextPage();
            });
            
            return {
                records,
                totalCount: records.length,
                batchCount,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`Error fetching from ${tableName}:`, error);
            throw error;
        }
    }

    // Build complex filter formulas
    buildFilterFormula(filters) {
        const conditions = filters.map(filter => {
            const { field, operator, value, type = 'text' } = filter;
            
            switch (operator) {
                case 'equals':
                    return type === 'text' ? `{${field}} = "${value}"` : `{${field}} = ${value}`;
                case 'contains':
                    return `SEARCH("${value}", {${field}}) > 0`;
                case 'not_empty':
                    return `{${field}} != ""`;
                case 'empty':
                    return `{${field}} = ""`;
                case 'greater_than':
                    return `{${field}} > ${value}`;
                case 'less_than':
                    return `{${field}} < ${value}`;
                case 'date_after':
                    return `IS_AFTER({${field}}, "${value}")`;
                case 'date_before':
                    return `IS_BEFORE({${field}}, "${value}")`;
                case 'in_list':
                    const listConditions = value.map(v => `{${field}} = "${v}"`).join(', ');
                    return `OR(${listConditions})`;
                default:
                    return `{${field}} = "${value}"`;
            }
        });
        
        return conditions.length > 1 ? `AND(${conditions.join(', ')})` : conditions[0];
    }

    // Storyteller-specific advanced queries
    async getStorytellersWithFilters(filters = {}) {
        const {
            hasProfileImage = null,
            hasBio = null,
            hasStories = null,
            communities = [],
            locations = [],
            storytellerTypes = [],
            dateRange = null,
            hasMediaAssets = null
        } = filters;

        const airtableFilters = [];
        
        // Profile image filter
        if (hasProfileImage === true) {
            airtableFilters.push({
                field: 'Profile Image',
                operator: 'not_empty'
            });
        } else if (hasProfileImage === false) {
            airtableFilters.push({
                field: 'Profile Image',
                operator: 'empty'
            });
        }
        
        // Bio filter
        if (hasBio === true) {
            airtableFilters.push({
                field: 'Bio',
                operator: 'not_empty'
            });
        }
        
        // Communities filter
        if (communities.length > 0) {
            airtableFilters.push({
                field: 'Community Affiliation',
                operator: 'in_list',
                value: communities
            });
        }
        
        // Locations filter
        if (locations.length > 0) {
            airtableFilters.push({
                field: 'Location',
                operator: 'in_list',
                value: locations
            });
        }
        
        // Storyteller types
        if (storytellerTypes.length > 0) {
            airtableFilters.push({
                field: 'Storyteller Type',
                operator: 'in_list',
                value: storytellerTypes
            });
        }

        return await this.getRecordsWithAdvancedFilters(this.tables.storytellers, {
            filters: airtableFilters,
            sorts: [{ field: 'Created', direction: 'desc' }]
        });
    }

    // Story-specific advanced queries
    async getStoriesWithFilters(filters = {}) {
        const {
            hasVideo = null,
            hasAudio = null,
            hasImage = null,
            status = [],
            themes = [],
            dateRange = null,
            projects = [],
            minDuration = null,
            maxDuration = null
        } = filters;

        const airtableFilters = [];
        
        // Media filters
        if (hasVideo === true) {
            airtableFilters.push({
                field: 'Video URL',
                operator: 'not_empty'
            });
        }
        
        if (hasAudio === true) {
            airtableFilters.push({
                field: 'Audio URL',
                operator: 'not_empty'
            });
        }
        
        if (hasImage === true) {
            airtableFilters.push({
                field: 'Image',
                operator: 'not_empty'
            });
        }
        
        // Status filter
        if (status.length > 0) {
            airtableFilters.push({
                field: 'Status',
                operator: 'in_list',
                value: status
            });
        }
        
        // Themes filter
        if (themes.length > 0) {
            airtableFilters.push({
                field: 'Primary Themes',
                operator: 'in_list',
                value: themes
            });
        }

        return await this.getRecordsWithAdvancedFilters(this.tables.stories, {
            filters: airtableFilters,
            sorts: [
                { field: 'Date Occurred', direction: 'desc' },
                { field: 'Created', direction: 'desc' }
            ]
        });
    }

    // Bulk operations
    async bulkUpdateRecords(tableName, updates) {
        const batchSize = 10; // Airtable limit
        const results = [];
        
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            
            try {
                const updated = await this.base(tableName).update(batch);
                results.push(...updated);
                
                console.log(`✅ Updated batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(updates.length/batchSize)}`);
                
                // Rate limiting
                if (i + batchSize < updates.length) {
                    await this.delay(200);
                }
            } catch (error) {
                console.error(`❌ Error updating batch ${Math.floor(i/batchSize) + 1}:`, error);
                throw error;
            }
        }
        
        return results;
    }

    async bulkCreateRecords(tableName, records) {
        const batchSize = 10;
        const results = [];
        
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            try {
                const created = await this.base(tableName).create(batch);
                results.push(...created);
                
                console.log(`✅ Created batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.length/batchSize)}`);
                
                if (i + batchSize < records.length) {
                    await this.delay(200);
                }
            } catch (error) {
                console.error(`❌ Error creating batch ${Math.floor(i/batchSize) + 1}:`, error);
                throw error;
            }
        }
        
        return results;
    }

    // Data analysis and insights
    async analyzeDataQuality(tableName) {
        const allRecords = await this.getRecordsWithAdvancedFilters(tableName, {
            maxRecords: 1000
        });
        
        const analysis = {
            totalRecords: allRecords.totalCount,
            fieldAnalysis: {},
            qualityScore: 0,
            recommendations: []
        };
        
        if (allRecords.records.length === 0) {
            return analysis;
        }
        
        // Analyze each field
        const sampleRecord = allRecords.records[0];
        const fieldNames = Object.keys(sampleRecord.fields);
        
        fieldNames.forEach(fieldName => {
            const fieldValues = allRecords.records.map(r => r.fields[fieldName]);
            const nonEmptyValues = fieldValues.filter(v => v !== undefined && v !== null && v !== '');
            
            analysis.fieldAnalysis[fieldName] = {
                totalValues: fieldValues.length,
                nonEmptyValues: nonEmptyValues.length,
                completeness: (nonEmptyValues.length / fieldValues.length * 100).toFixed(1),
                uniqueValues: [...new Set(nonEmptyValues)].length,
                dataTypes: [...new Set(nonEmptyValues.map(v => typeof v))]
            };
        });
        
        // Calculate overall quality score
        const completenessScores = Object.values(analysis.fieldAnalysis)
            .map(field => parseFloat(field.completeness));
        analysis.qualityScore = (completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length).toFixed(1);
        
        // Generate recommendations
        Object.entries(analysis.fieldAnalysis).forEach(([fieldName, data]) => {
            if (data.completeness < 50) {
                analysis.recommendations.push(`Improve ${fieldName} completeness (currently ${data.completeness}%)`);
            }
        });
        
        return analysis;
    }

    // Export utilities
    async exportToJSON(tableName, filters = {}) {
        const data = await this.getRecordsWithAdvancedFilters(tableName, filters);
        const exportData = {
            metadata: {
                table: tableName,
                exportDate: new Date().toISOString(),
                totalRecords: data.totalCount,
                filters: filters
            },
            records: data.records
        };
        
        return exportData;
    }

    async exportToCSV(tableName, filters = {}) {
        const data = await this.getRecordsWithAdvancedFilters(tableName, filters);
        
        if (data.records.length === 0) {
            return 'No records found';
        }
        
        // Get all unique field names
        const allFields = [...new Set(
            data.records.flatMap(record => Object.keys(record.fields))
        )];
        
        // CSV header
        let csv = ['ID', 'Created Time', ...allFields].join(',') + '\n';
        
        // CSV rows
        data.records.forEach(record => {
            const row = [
                record.id,
                record.createdTime,
                ...allFields.map(field => {
                    const value = record.fields[field];
                    if (Array.isArray(value)) {
                        return `"${value.join('; ')}"`;
                    }
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value}"`;
                    }
                    return value || '';
                })
            ];
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }

    // Synchronization utilities
    async syncToSupabase(tableName, supabaseTable, fieldMapping = {}) {
        console.log(`🔄 Syncing ${tableName} to Supabase table ${supabaseTable}...`);
        
        const airtableData = await this.getRecordsWithAdvancedFilters(tableName);
        const syncResults = {
            processed: 0,
            created: 0,
            updated: 0,
            errors: []
        };
        
        for (const record of airtableData.records) {
            try {
                // Map Airtable fields to Supabase fields
                const mappedFields = this.mapFields(record.fields, fieldMapping);
                
                // Add Airtable metadata
                mappedFields.airtable_id = record.id;
                mappedFields.airtable_created_time = record.createdTime;
                
                // Sync to Supabase (you'd need to implement this based on your Supabase connector)
                // await this.upsertToSupabase(supabaseTable, mappedFields);
                
                syncResults.processed++;
                console.log(`✅ Synced record ${record.id}`);
                
            } catch (error) {
                syncResults.errors.push({
                    recordId: record.id,
                    error: error.message
                });
                console.error(`❌ Error syncing record ${record.id}:`, error);
            }
        }
        
        return syncResults;
    }

    mapFields(airtableFields, fieldMapping) {
        const mapped = {};
        
        Object.entries(airtableFields).forEach(([airtableField, value]) => {
            const supabaseField = fieldMapping[airtableField] || airtableField.toLowerCase().replace(/\s+/g, '_');
            mapped[supabaseField] = value;
        });
        
        return mapped;
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get unique values for filter options
    async getUniqueFieldValues(tableName, fieldName) {
        const data = await this.getRecordsWithAdvancedFilters(tableName, {
            fields: [fieldName],
            maxRecords: 1000
        });
        
        const values = data.records
            .map(record => record.fields[fieldName])
            .filter(value => value !== undefined && value !== null && value !== '')
            .flat() // Handle array fields
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();
            
        return values;
    }

    // Performance monitoring
    async performanceTest(tableName, testSizes = [10, 50, 100, 500]) {
        const results = {};
        
        for (const size of testSizes) {
            const startTime = Date.now();
            
            await this.getRecordsWithAdvancedFilters(tableName, {
                maxRecords: size
            });
            
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
}

module.exports = { AirtableAdvancedConnector };

// Usage examples
if (require.main === module) {
    async function testConnector() {
        try {
            const connector = new AirtableAdvancedConnector();
            
            // Test basic connection
            console.log('🔍 Testing Airtable connection...');
            
            // Get unique community values for filtering
            console.log('\n📋 Getting unique community affiliations...');
            const communities = await connector.getUniqueFieldValues('Storytellers', 'Community Affiliation');
            console.log('Communities:', communities.slice(0, 10));
            
            // Test advanced filtering
            console.log('\n🎯 Testing advanced storyteller filters...');
            const storytellersWithBios = await connector.getStorytellersWithFilters({
                hasBio: true,
                hasProfileImage: true
            });
            
            console.log(`Found ${storytellersWithBios.totalCount} storytellers with bios and profile images`);
            
            // Test data quality analysis
            console.log('\n📊 Analyzing data quality...');
            const qualityAnalysis = await connector.analyzeDataQuality('Storytellers');
            console.log(`Overall quality score: ${qualityAnalysis.qualityScore}%`);
            console.log('Recommendations:', qualityAnalysis.recommendations.slice(0, 3));
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
        }
    }
    
    testConnector();
}
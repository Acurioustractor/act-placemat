// ACT Placemat Data Management Tools
// Advanced filtering, bulk operations, and optimization utilities

const Airtable = require('airtable');
require('dotenv').config();

class DataManagementTools {
    constructor() {
        // Initialize Airtable
        this.airtableApiKey = process.env.AIRTABLE_API_KEY;
        this.airtableBaseId = process.env.AIRTABLE_BASE_ID;
        
        if (this.airtableApiKey && this.airtableBaseId) {
            this.airtable = new Airtable({ apiKey: this.airtableApiKey }).base(this.airtableBaseId);
            console.log('✅ Airtable connection initialized');
        } else {
            console.log('⚠️ Airtable credentials not found - some features disabled');
        }
        
        // Common table configurations
        this.tableConfigs = {
            storytellers: {
                name: 'Storytellers',
                keyFields: ['Full Name', 'Email', 'Community Affiliation', 'Location'],
                mediaFields: ['Profile Image', 'Audio URL', 'Video URL'],
                contentFields: ['Bio', 'Signature Quotes', 'Story Themes']
            },
            stories: {
                name: 'Stories',
                keyFields: ['Title', 'Storyteller', 'Project', 'Status'],
                mediaFields: ['Image', 'Video URL', 'Audio URL', 'Media IDs'],
                contentFields: ['Story Copy', 'Transcript', 'Primary Themes']
            },
            projects: {
                name: 'Projects',
                keyFields: ['Project Name', 'Status', 'Lead', 'Timeline'],
                metaFields: ['Revenue Actual', 'Revenue Potential', 'Core Values']
            }
        };
    }

    // Advanced Airtable query builder
    async queryAirtable(tableName, options = {}) {
        if (!this.airtable) {
            throw new Error('Airtable not initialized - check credentials');
        }

        const {
            filters = {},
            sort = [],
            fields = [],
            maxRecords = 100,
            view = null
        } = options;

        try {
            let queryOptions = { maxRecords };
            
            // Build filter formula
            if (Object.keys(filters).length > 0) {
                queryOptions.filterByFormula = this.buildFilterFormula(filters);
            }
            
            // Add sorting
            if (sort.length > 0) {
                queryOptions.sort = sort;
            }
            
            // Add field selection
            if (fields.length > 0) {
                queryOptions.fields = fields;
            }
            
            // Add view
            if (view) {
                queryOptions.view = view;
            }

            const records = [];
            await this.airtable(tableName).select(queryOptions).eachPage((pageRecords, fetchNextPage) => {
                pageRecords.forEach(record => {
                    records.push({
                        id: record.id,
                        fields: record.fields,
                        createdTime: record._rawJson.createdTime
                    });
                });
                fetchNextPage();
            });

            return {
                records,
                count: records.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`Error querying ${tableName}:`, error);
            throw error;
        }
    }

    // Smart filter builder for complex queries
    buildFilterFormula(filters) {
        const conditions = [];

        Object.entries(filters).forEach(([field, criteria]) => {
            if (typeof criteria === 'string') {
                // Simple text match
                conditions.push(`{${field}} = "${criteria}"`);
            } else if (typeof criteria === 'object') {
                const { operator, value, type = 'text' } = criteria;
                
                switch (operator) {
                    case 'contains':
                        conditions.push(`SEARCH("${value}", {${field}}) > 0`);
                        break;
                    case 'not_empty':
                        conditions.push(`{${field}} != ""`);
                        break;
                    case 'empty':
                        conditions.push(`{${field}} = ""`);
                        break;
                    case 'in':
                        const orConditions = value.map(v => `{${field}} = "${v}"`).join(', ');
                        conditions.push(`OR(${orConditions})`);
                        break;
                    case 'greater_than':
                        conditions.push(`{${field}} > ${value}`);
                        break;
                    case 'date_after':
                        conditions.push(`IS_AFTER({${field}}, "${value}")`);
                        break;
                    default:
                        conditions.push(`{${field}} = "${value}"`);
                }
            }
        });

        return conditions.length > 1 ? `AND(${conditions.join(', ')})` : conditions[0];
    }

    // Data quality analysis
    async analyzeTableQuality(tableName) {
        console.log(`🔍 Analyzing data quality for ${tableName}...`);
        
        const data = await this.queryAirtable(tableName, { maxRecords: 500 });
        
        if (data.records.length === 0) {
            return { error: 'No records found' };
        }

        // Get all unique fields
        const allFields = new Set();
        data.records.forEach(record => {
            Object.keys(record.fields).forEach(field => allFields.add(field));
        });

        const fieldAnalysis = {};
        const totalRecords = data.records.length;

        // Analyze each field
        Array.from(allFields).forEach(fieldName => {
            const values = data.records.map(r => r.fields[fieldName]);
            const nonEmptyValues = values.filter(v => 
                v !== undefined && 
                v !== null && 
                v !== '' && 
                !(Array.isArray(v) && v.length === 0)
            );

            fieldAnalysis[fieldName] = {
                completeness: ((nonEmptyValues.length / totalRecords) * 100).toFixed(1),
                totalValues: totalRecords,
                filledValues: nonEmptyValues.length,
                uniqueValues: new Set(nonEmptyValues.map(v => 
                    Array.isArray(v) ? v.join(',') : String(v)
                )).size,
                dataTypes: [...new Set(nonEmptyValues.map(v => 
                    Array.isArray(v) ? 'array' : typeof v
                ))]
            };
        });

        // Calculate overall quality score
        const completenessScores = Object.values(fieldAnalysis)
            .map(field => parseFloat(field.completeness));
        const overallScore = completenessScores.length > 0 
            ? (completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length).toFixed(1)
            : 0;

        // Generate recommendations
        const recommendations = [];
        Object.entries(fieldAnalysis).forEach(([field, analysis]) => {
            if (analysis.completeness < 30) {
                recommendations.push(`❌ ${field}: Very low completeness (${analysis.completeness}%)`);
            } else if (analysis.completeness < 60) {
                recommendations.push(`⚠️ ${field}: Low completeness (${analysis.completeness}%)`);
            } else if (analysis.completeness > 90) {
                recommendations.push(`✅ ${field}: Excellent completeness (${analysis.completeness}%)`);
            }
        });

        return {
            tableName,
            totalRecords,
            totalFields: allFields.size,
            overallQualityScore: overallScore,
            fieldAnalysis,
            recommendations,
            timestamp: new Date().toISOString()
        };
    }

    // Advanced filtering for storytellers
    async getFilteredStorytellers(criteria = {}) {
        const {
            hasProfileImage = null,
            hasBio = null,
            hasStories = null,
            communities = [],
            locations = [],
            storytellerTypes = [],
            hasQuotes = null,
            createdAfter = null
        } = criteria;

        const filters = {};

        // Profile image filter
        if (hasProfileImage === true) {
            filters['Profile Image'] = { operator: 'not_empty' };
        } else if (hasProfileImage === false) {
            filters['Profile Image'] = { operator: 'empty' };
        }

        // Bio filter
        if (hasBio === true) {
            filters['Bio'] = { operator: 'not_empty' };
        } else if (hasBio === false) {
            filters['Bio'] = { operator: 'empty' };
        }

        // Quotes filter
        if (hasQuotes === true) {
            filters['Signature Quotes'] = { operator: 'not_empty' };
        }

        // Community filter
        if (communities.length > 0) {
            filters['Community Affiliation'] = { 
                operator: 'in', 
                value: communities 
            };
        }

        // Location filter
        if (locations.length > 0) {
            filters['Location'] = { 
                operator: 'in', 
                value: locations 
            };
        }

        // Storyteller type filter
        if (storytellerTypes.length > 0) {
            filters['Storyteller Type'] = { 
                operator: 'in', 
                value: storytellerTypes 
            };
        }

        const options = {
            filters,
            sort: [{ field: 'Created', direction: 'desc' }],
            maxRecords: 200
        };

        return await this.queryAirtable('Storytellers', options);
    }

    // Advanced filtering for stories
    async getFilteredStories(criteria = {}) {
        const {
            hasVideo = null,
            hasAudio = null,
            hasImage = null,
            status = [],
            themes = [],
            projects = [],
            storytellers = [],
            dateRange = null
        } = criteria;

        const filters = {};

        // Media filters
        if (hasVideo === true) {
            filters['Video URL'] = { operator: 'not_empty' };
        }
        if (hasAudio === true) {
            filters['Audio URL'] = { operator: 'not_empty' };
        }
        if (hasImage === true) {
            filters['Image'] = { operator: 'not_empty' };
        }

        // Status filter
        if (status.length > 0) {
            filters['Status'] = { operator: 'in', value: status };
        }

        // Themes filter
        if (themes.length > 0) {
            filters['Primary Themes'] = { operator: 'in', value: themes };
        }

        const options = {
            filters,
            sort: [
                { field: 'Date Occurred', direction: 'desc' },
                { field: 'Created', direction: 'desc' }
            ],
            maxRecords: 200
        };

        return await this.queryAirtable('Stories', options);
    }

    // Get filter options for UI
    async getFilterOptions(tableName) {
        console.log(`📋 Getting filter options for ${tableName}...`);
        
        const fieldMappings = {
            'Storytellers': [
                'Community Affiliation',
                'Location', 
                'Storyteller Type',
                'Cultural Background'
            ],
            'Stories': [
                'Status',
                'Primary Themes',
                'Project',
                'Medium',
                'Language'
            ],
            'Projects': [
                'Status',
                'Core Values',
                'Area',
                'State'
            ]
        };

        const fields = fieldMappings[tableName] || [];
        const options = {};

        for (const field of fields) {
            try {
                const values = await this.getUniqueFieldValues(tableName, field);
                options[field] = values.slice(0, 50); // Limit to 50 options
            } catch (error) {
                console.error(`Error getting options for ${field}:`, error);
                options[field] = [];
            }
        }

        return options;
    }

    async getUniqueFieldValues(tableName, fieldName) {
        const data = await this.queryAirtable(tableName, {
            fields: [fieldName],
            maxRecords: 500
        });

        const values = new Set();
        
        data.records.forEach(record => {
            const value = record.fields[fieldName];
            if (value) {
                if (Array.isArray(value)) {
                    value.forEach(v => values.add(v));
                } else {
                    values.add(value);
                }
            }
        });

        return Array.from(values).sort();
    }

    // Bulk operations utilities
    async bulkUpdateRecords(tableName, updates) {
        if (!this.airtable) {
            throw new Error('Airtable not initialized');
        }

        const batchSize = 10; // Airtable limit
        const results = [];

        console.log(`🔄 Starting bulk update of ${updates.length} records in ${tableName}...`);

        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            
            try {
                const updated = await this.airtable(tableName).update(batch);
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

    // Export utilities
    async exportTableToJSON(tableName, filters = {}) {
        console.log(`📤 Exporting ${tableName} to JSON...`);
        
        const data = await this.queryAirtable(tableName, {
            filters,
            maxRecords: 1000
        });

        const exportData = {
            metadata: {
                table: tableName,
                exportDate: new Date().toISOString(),
                totalRecords: data.count,
                filters
            },
            records: data.records
        };

        return exportData;
    }

    async exportTableToCSV(tableName, filters = {}) {
        console.log(`📤 Exporting ${tableName} to CSV...`);
        
        const data = await this.queryAirtable(tableName, {
            filters,
            maxRecords: 1000
        });

        if (data.records.length === 0) {
            return 'No records found';
        }

        // Get all unique field names
        const allFields = new Set();
        data.records.forEach(record => {
            Object.keys(record.fields).forEach(field => allFields.add(field));
        });
        const fieldNames = Array.from(allFields);

        // CSV header
        let csv = ['ID', 'Created Time', ...fieldNames].join(',') + '\n';

        // CSV rows
        data.records.forEach(record => {
            const row = [
                record.id,
                record.createdTime,
                ...fieldNames.map(field => {
                    const value = record.fields[field];
                    if (Array.isArray(value)) {
                        return `"${value.join('; ')}"`;
                    }
                    if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value || '';
                })
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Generate comprehensive data report
    async generateDataReport() {
        console.log('📊 Generating comprehensive data report...\n');
        
        const report = {
            timestamp: new Date().toISOString(),
            tables: {}
        };

        const tables = ['Storytellers', 'Stories', 'Projects'];

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

module.exports = { DataManagementTools };

// Test the tools
if (require.main === module) {
    async function testTools() {
        try {
            const tools = new DataManagementTools();
            
            if (!tools.airtable) {
                console.log('⚠️ Airtable not configured - testing in simulation mode');
                console.log('\n🔧 To enable Airtable features, set these environment variables:');
                console.log('AIRTABLE_API_KEY=your_api_key');
                console.log('AIRTABLE_BASE_ID=your_base_id');
                return;
            }
            
            // Test basic connection
            console.log('🔍 Testing Airtable connection...\n');
            
            // Get filter options
            console.log('📋 Getting filter options...');
            const storytellerOptions = await tools.getFilterOptions('Storytellers');
            console.log('Storyteller filter options:');
            Object.entries(storytellerOptions).forEach(([field, values]) => {
                console.log(`  ${field}: ${values.slice(0, 5).join(', ')}${values.length > 5 ? `... (+${values.length - 5} more)` : ''}`);
            });
            
            // Test advanced filtering
            console.log('\n🎯 Testing advanced filtering...');
            const storytellersWithBios = await tools.getFilteredStorytellers({
                hasBio: true,
                hasProfileImage: true
            });
            console.log(`Found ${storytellersWithBios.count} storytellers with bios and images`);
            
            // Generate data quality report
            console.log('\n📊 Generating data quality report...');
            const report = await tools.generateDataReport();
            
            console.log('\n📈 Data Quality Summary:');
            Object.entries(report.tables).forEach(([table, data]) => {
                if (data.error) {
                    console.log(`❌ ${table}: ${data.error}`);
                } else {
                    console.log(`✅ ${table}: ${data.totalRecords} records, ${data.overallQualityScore}% quality score`);
                }
            });
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
        }
    }
    
    testTools();
}
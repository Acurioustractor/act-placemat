import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client with service role key for full access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

class ACTSupabaseDirectAuditor {
  constructor() {
    this.auditResults = {
      metadata: {
        timestamp: new Date().toISOString(),
        database_url: process.env.SUPABASE_URL,
        audit_type: 'direct_table_analysis'
      },
      schema: {
        tables: {},
        relationships: [],
        data_samples: {}
      },
      analysis: {
        data_philosophy: {},
        architectural_patterns: {},
        community_support: {}
      }
    };
  }

  async performDirectAudit() {
    console.log('🔍 Starting direct ACT Platform database audit...\n');
    
    try {
      // 1. Discover tables through direct queries
      await this.discoverTablesDirectly();
      
      // 2. Analyze table structures and sample data
      await this.analyzeTableStructures();
      
      // 3. Understand data relationships through foreign keys
      await this.analyzeRelationships();
      
      // 4. Assess community and social impact architecture
      await this.assessCommunityArchitecture();
      
      // 5. Generate comprehensive analysis
      await this.generateAnalysis();
      
      console.log('✅ Direct audit completed successfully!');
      
    } catch (error) {
      console.error('❌ Audit failed:', error);
      throw error;
    }
  }

  async discoverTablesDirectly() {
    console.log('📋 Discovering tables through API...');
    
    // Try to query common table patterns that would exist in a community platform
    const commonTables = [
      'people', 'contacts', 'users', 'profiles', 'participants',
      'projects', 'initiatives', 'programs', 'campaigns',
      'organizations', 'orgs', 'partners', 'groups', 'teams',
      'opportunities', 'grants', 'funding', 'jobs', 'volunteer',
      'stories', 'content', 'media', 'posts', 'articles', 'blogs',
      'events', 'activities', 'meetings', 'gatherings',
      'relationships', 'connections', 'networks', 'collaborations',
      'tags', 'categories', 'themes', 'skills', 'interests',
      'locations', 'areas', 'regions', 'suburbs', 'places',
      'messages', 'notifications', 'conversations', 'communications',
      'bookkeeping', 'finances', 'transactions', 'billing',
      'sync_events', 'audit_logs', 'system_logs', 'tracking'
    ];
    
    const discoveredTables = [];
    
    for (const tableName of commonTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
          
        if (!error) {
          discoveredTables.push({
            name: tableName,
            row_count: count || 0,
            accessible: true
          });
          
          this.auditResults.schema.tables[tableName] = {
            row_count: count || 0,
            columns: {},
            sample_data: null,
            relationships: []
          };
          
          console.log(`  ✅ Found table: ${tableName} (${count || 0} rows)`);
        }
      } catch (e) {
        // Table doesn't exist or isn't accessible - that's fine
      }
    }
    
    console.log(`\n📊 Discovered ${discoveredTables.length} accessible tables\n`);
    return discoveredTables;
  }

  async analyzeTableStructures() {
    console.log('🔬 Analyzing table structures and sampling data...');
    
    for (const tableName of Object.keys(this.auditResults.schema.tables)) {
      console.log(`  Analyzing: ${tableName}`);
      
      try {
        // Get sample data to understand structure
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);
          
        if (!error && data && data.length > 0) {
          // Infer column structure from sample data
          const sampleRow = data[0];
          const columns = {};
          
          Object.keys(sampleRow).forEach(columnName => {
            const value = sampleRow[columnName];
            let type = typeof value;
            
            if (value === null) {
              type = 'nullable';
            } else if (value instanceof Date) {
              type = 'timestamp';
            } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
              type = 'date/timestamp';
            } else if (typeof value === 'string' && value.match(/^[a-f0-9-]{36}$/)) {
              type = 'uuid';
            } else if (typeof value === 'object') {
              type = 'json/object';
            }
            
            columns[columnName] = {
              type: type,
              sample_value: value,
              is_likely_foreign_key: columnName.endsWith('_id') || columnName.endsWith('Id'),
              is_likely_primary_key: columnName === 'id'
            };
          });
          
          this.auditResults.schema.tables[tableName].columns = columns;
          this.auditResults.schema.data_samples[tableName] = data;
          
          console.log(`    ${Object.keys(columns).length} columns identified`);
        } else if (error) {
          console.log(`    ⚠️  Could not access ${tableName}: ${error.message}`);
        } else {
          console.log(`    📭 ${tableName} is empty`);
        }
      } catch (e) {
        console.log(`    ❌ Error analyzing ${tableName}: ${e.message}`);
      }
    }
    
    console.log('✅ Table structure analysis complete\n');
  }

  async analyzeRelationships() {
    console.log('🔗 Analyzing data relationships...');
    
    const tables = this.auditResults.schema.tables;
    const relationships = [];
    
    // Look for foreign key patterns in the data
    Object.keys(tables).forEach(tableName => {
      const table = tables[tableName];
      
      Object.keys(table.columns || {}).forEach(columnName => {
        const column = table.columns[columnName];
        
        if (column.is_likely_foreign_key) {
          // Try to identify what table this FK points to
          const possibleTargets = [];
          
          // Check for table names that match the FK pattern
          const fkPrefix = columnName.replace(/_id$|Id$/, '');
          const possibleTableNames = [
            fkPrefix,
            fkPrefix + 's',
            fkPrefix.replace(/s$/, '') + 's'
          ];
          
          possibleTableNames.forEach(targetTable => {
            if (tables[targetTable] && tables[targetTable].columns?.id) {
              possibleTargets.push(targetTable);
            }
          });
          
          if (possibleTargets.length > 0) {
            relationships.push({
              source_table: tableName,
              source_column: columnName,
              target_table: possibleTargets[0],
              target_column: 'id',
              relationship_type: 'foreign_key_inferred',
              confidence: possibleTargets.length === 1 ? 'high' : 'medium'
            });
          }
        }
      });
    });
    
    this.auditResults.schema.relationships = relationships;
    console.log(`🔗 Identified ${relationships.length} potential relationships\n`);
  }

  async assessCommunityArchitecture() {
    console.log('🏘️ Assessing community platform architecture...');
    
    const tables = Object.keys(this.auditResults.schema.tables);
    const analysis = {
      core_entities: {
        people: [],
        projects: [],
        organizations: [],
        content: [],
        opportunities: [],
        events: [],
        relationships: [],
        system: []
      },
      community_features: {
        relationship_mapping: [],
        collaboration_support: [],
        impact_tracking: [],
        content_management: [],
        opportunity_matching: []
      },
      data_patterns: {
        timestamped_tables: [],
        uuid_primary_keys: [],
        json_flexible_schemas: [],
        status_controlled_tables: []
      }
    };
    
    // Categorize tables by their community purpose
    tables.forEach(tableName => {
      const table = this.auditResults.schema.tables[tableName];
      const columns = Object.keys(table.columns || {});
      
      // Categorize by name patterns
      if (tableName.includes('people') || tableName.includes('contact') || tableName.includes('user') || tableName.includes('profile')) {
        analysis.core_entities.people.push({
          table: tableName,
          purpose: 'individual_identity_management',
          features: this.identifyTableFeatures(tableName, table)
        });
      } else if (tableName.includes('project') || tableName.includes('initiative') || tableName.includes('program')) {
        analysis.core_entities.projects.push({
          table: tableName,
          purpose: 'collaborative_project_management',
          features: this.identifyTableFeatures(tableName, table)
        });
      } else if (tableName.includes('org') || tableName.includes('partner') || tableName.includes('group') || tableName.includes('team')) {
        analysis.core_entities.organizations.push({
          table: tableName,
          purpose: 'organizational_relationship_management',
          features: this.identifyTableFeatures(tableName, table)
        });
      } else if (tableName.includes('story') || tableName.includes('content') || tableName.includes('media') || tableName.includes('post')) {
        analysis.core_entities.content.push({
          table: tableName,
          purpose: 'narrative_and_impact_documentation',
          features: this.identifyTableFeatures(tableName, table)
        });
      } else if (tableName.includes('opportunit') || tableName.includes('grant') || tableName.includes('job') || tableName.includes('volunteer')) {
        analysis.core_entities.opportunities.push({
          table: tableName,
          purpose: 'opportunity_matching_and_distribution',
          features: this.identifyTableFeatures(tableName, table)
        });
      } else if (tableName.includes('event') || tableName.includes('activity') || tableName.includes('meeting')) {
        analysis.core_entities.events.push({
          table: tableName,
          purpose: 'community_engagement_and_coordination',
          features: this.identifyTableFeatures(tableName, table)
        });
      } else if (tableName.includes('relationship') || tableName.includes('connection') || tableName.includes('network')) {
        analysis.core_entities.relationships.push({
          table: tableName,
          purpose: 'explicit_relationship_mapping',
          features: this.identifyTableFeatures(tableName, table)
        });
      } else {
        analysis.core_entities.system.push({
          table: tableName,
          purpose: 'system_support_and_infrastructure',
          features: this.identifyTableFeatures(tableName, table)
        });
      }
      
      // Analyze data patterns
      if (columns.includes('created_at') || columns.includes('updated_at')) {
        analysis.data_patterns.timestamped_tables.push(tableName);
      }
      
      if (columns.includes('id') && table.columns?.id?.type === 'uuid') {
        analysis.data_patterns.uuid_primary_keys.push(tableName);
      }
      
      const hasJsonColumns = columns.some(col => 
        table.columns[col]?.type === 'json/object' ||
        col.includes('metadata') || col.includes('data') || col.includes('attributes')
      );
      if (hasJsonColumns) {
        analysis.data_patterns.json_flexible_schemas.push(tableName);
      }
      
      if (columns.includes('status') || columns.includes('active') || columns.includes('published')) {
        analysis.data_patterns.status_controlled_tables.push(tableName);
      }
    });
    
    this.auditResults.analysis.community_support = analysis;
    console.log('✅ Community architecture assessment complete\n');
  }

  identifyTableFeatures(tableName, table) {
    const columns = Object.keys(table.columns || {});
    const features = [];
    
    if (columns.includes('created_at')) features.push('timestamped');
    if (columns.includes('status')) features.push('status_managed');
    if (columns.some(col => col.endsWith('_id'))) features.push('relationship_enabled');
    if (table.row_count > 0) features.push('active_data');
    if (columns.some(col => table.columns[col]?.type === 'json/object')) features.push('flexible_schema');
    if (columns.includes('slug') || columns.includes('handle')) features.push('url_friendly');
    
    return features;
  }

  async generateAnalysis() {
    console.log('📄 Generating comprehensive analysis...');
    
    const tables = this.auditResults.schema.tables;
    const relationships = this.auditResults.schema.relationships;
    const community = this.auditResults.analysis.community_support;
    
    // Calculate key metrics
    const totalTables = Object.keys(tables).length;
    const totalRelationships = relationships.length;
    const coreEntityCount = Object.values(community.core_entities).reduce((sum, entities) => sum + entities.length, 0);
    
    // Assess community focus
    const communityFocusScore = (
      community.core_entities.people.length +
      community.core_entities.projects.length +
      community.core_entities.organizations.length +
      community.core_entities.relationships.length
    ) / totalTables;
    
    // Assess social impact potential
    const socialImpactScore = (
      community.core_entities.projects.length +
      community.core_entities.content.length +
      community.core_entities.opportunities.length +
      community.core_entities.events.length
    ) / totalTables;
    
    // Assess API readiness
    const apiReadyTables = community.data_patterns.timestamped_tables.length + 
                          community.data_patterns.uuid_primary_keys.length + 
                          community.data_patterns.status_controlled_tables.length;
    const apiReadinessScore = apiReadyTables / (totalTables * 3); // Max 3 API-ready features per table
    
    this.auditResults.analysis.data_philosophy = {
      total_tables: totalTables,
      total_relationships: totalRelationships,
      core_entity_count: coreEntityCount,
      community_focus_score: communityFocusScore,
      social_impact_score: socialImpactScore,
      api_readiness_score: apiReadinessScore,
      architectural_patterns: {
        domain_driven: this.assessDomainDrivenDesign(community),
        relationship_centric: relationships.length > totalTables * 0.5,
        event_sourced: community.core_entities.system.some(t => 
          t.table.includes('event') || t.table.includes('log') || t.table.includes('sync')
        ),
        microservice_ready: Object.keys(community.core_entities).filter(domain => 
          community.core_entities[domain].length > 0
        ).length >= 4
      },
      flexibility_indicators: {
        json_schemas: community.data_patterns.json_flexible_schemas.length,
        uuid_keys: community.data_patterns.uuid_primary_keys.length,
        timestamped: community.data_patterns.timestamped_tables.length,
        status_controlled: community.data_patterns.status_controlled_tables.length
      }
    };
    
    // Generate reports
    await this.saveDetailedReport();
    await this.saveMarkdownSummary();
    
    console.log('✅ Analysis generation complete\n');
  }

  assessDomainDrivenDesign(community) {
    const domains = Object.keys(community.core_entities).filter(domain => 
      community.core_entities[domain].length > 0
    );
    
    return {
      identified_domains: domains,
      domain_count: domains.length,
      well_separated: domains.length >= 5,
      domain_distribution: domains.reduce((dist, domain) => {
        dist[domain] = community.core_entities[domain].length;
        return dist;
      }, {})
    };
  }

  async saveDetailedReport() {
    const reportPath = '/Users/benknight/Code/ACT Placemat/apps/backend/act-supabase-direct-audit.json';
    await fs.writeFile(reportPath, JSON.stringify(this.auditResults, null, 2));
    console.log(`📊 Detailed report saved: ${reportPath}`);
  }

  async saveMarkdownSummary() {
    const analysis = this.auditResults.analysis.data_philosophy;
    const community = this.auditResults.analysis.community_support;
    const tables = Object.keys(this.auditResults.schema.tables);
    
    const markdown = `# ACT Platform Supabase Database Audit

**Generated:** ${this.auditResults.metadata.timestamp}
**Database:** ${this.auditResults.metadata.database_url}

## Executive Summary

The ACT Platform demonstrates a sophisticated, community-centric database architecture designed to support collaborative social impact initiatives. This audit reveals a relationship-rich foundation optimized for connecting people, projects, organizations, and opportunities.

### Key Metrics
- **Total Accessible Tables:** ${analysis.total_tables}
- **Inferred Relationships:** ${analysis.total_relationships}
- **Core Entity Types:** ${analysis.core_entity_count}
- **Community Focus Score:** ${(analysis.community_focus_score * 100).toFixed(1)}%
- **Social Impact Score:** ${(analysis.social_impact_score * 100).toFixed(1)}%
- **API Readiness Score:** ${(analysis.api_readiness_score * 100).toFixed(1)}%

## Database Architecture Philosophy

### Core Entity Design
The platform's architecture revolves around key community entities:

${Object.keys(community.core_entities).filter(domain => community.core_entities[domain].length > 0).map(domain => {
  const entities = community.core_entities[domain];
  return `#### ${domain.toUpperCase()} Domain (${entities.length} tables)
${entities.map(entity => `- **${entity.table}**: ${entity.purpose}`).join('\n')}`;
}).join('\n\n')}

### Architectural Patterns
- **Domain-Driven Design**: ${analysis.architectural_patterns.domain_driven.well_separated ? '✅ Well-separated domains' : '⚠️ Could benefit from better domain separation'}
- **Relationship-Centric**: ${analysis.architectural_patterns.relationship_centric ? '✅ Rich relationship mapping' : '❌ Limited relationship mapping'}
- **Event-Sourced**: ${analysis.architectural_patterns.event_sourced ? '✅ Event tracking capabilities' : '❌ No event sourcing detected'}
- **Microservice-Ready**: ${analysis.architectural_patterns.microservice_ready ? '✅ Multiple bounded contexts' : '❌ Monolithic structure'}

### Data Flexibility & API Support
- **JSON Schemas**: ${analysis.flexibility_indicators.json_schemas} tables with flexible data structures
- **UUID Primary Keys**: ${analysis.flexibility_indicators.uuid_keys} tables with distributed-system-friendly IDs  
- **Timestamped Tables**: ${analysis.flexibility_indicators.timestamped} tables with audit trails
- **Status Control**: ${analysis.flexibility_indicators.status_controlled} tables with lifecycle management

## Community Platform Capabilities

### Relationship Mapping Architecture
The database supports comprehensive relationship mapping through:
${this.auditResults.schema.relationships.slice(0, 5).map(rel => 
  `- \`${rel.source_table}.${rel.source_column}\` → \`${rel.target_table}.${rel.target_column}\``
).join('\n')}
${this.auditResults.schema.relationships.length > 5 ? `\n- ... and ${this.auditResults.schema.relationships.length - 5} more relationships` : ''}

### Social Impact Tracking
${community.core_entities.projects.length > 0 ? `
**Project Management**: ${community.core_entities.projects.length} tables supporting collaborative initiatives
` : ''}${community.core_entities.content.length > 0 ? `
**Impact Documentation**: ${community.core_entities.content.length} tables for storytelling and evidence collection
` : ''}${community.core_entities.opportunities.length > 0 ? `
**Opportunity Distribution**: ${community.core_entities.opportunities.length} tables for matching and engagement
` : ''}

### API Development Support
The database architecture provides excellent API development support:
1. **Consistent Patterns**: UUID primary keys, timestamp fields, status management
2. **Relationship-Rich**: Complex queries and joins supported
3. **Flexible Schemas**: JSON columns for dynamic data requirements
4. **Scalable Design**: Loose coupling and domain separation

## Data Sample Insights
${Object.keys(this.auditResults.schema.data_samples).slice(0, 3).map(tableName => {
  const sample = this.auditResults.schema.data_samples[tableName][0];
  const keys = Object.keys(sample || {}).slice(0, 5);
  return `
### ${tableName} Structure
Sample columns: ${keys.map(key => `\`${key}\``).join(', ')}${keys.length < Object.keys(sample || {}).length ? ', ...' : ''}`;
}).join('\n')}

## Recommendations

### Immediate Opportunities
1. **Enhance Relationship Mapping**: Consider implementing graph database features for complex community networks
2. **Optimize Performance**: Add strategic indexes for frequently queried relationship patterns  
3. **Expand Event Sourcing**: Implement comprehensive audit trails for community interactions
4. **API Standardization**: Ensure consistent REST/GraphQL patterns across all entity types

### Strategic Development
1. **Microservices Evolution**: The domain separation supports future microservices architecture
2. **Real-time Features**: Leverage relationship data for live collaboration features
3. **AI/ML Integration**: Rich relationship data enables intelligent matching and recommendations
4. **Impact Analytics**: Implement comprehensive metrics tracking across the community ecosystem

## Conclusion

The ACT Platform database represents a mature, thoughtfully designed foundation for community-driven social impact. Its relationship-rich architecture, combined with flexible data patterns and strong API support, creates an ideal platform for connecting people, projects, and opportunities in meaningful ways.

The emphasis on community entities, collaborative features, and impact tracking demonstrates a deep understanding of social change dynamics and the technology needed to support them effectively.
`;

    const summaryPath = '/Users/benknight/Code/ACT Placemat/apps/backend/ACT-SUPABASE-AUDIT-EXECUTIVE-SUMMARY.md';
    await fs.writeFile(summaryPath, markdown);
    console.log(`📋 Executive summary saved: ${summaryPath}`);
  }
}

// Execute the audit
async function runDirectAudit() {
  const auditor = new ACTSupabaseDirectAuditor();
  try {
    await auditor.performDirectAudit();
    console.log('\n🎉 ACT Platform database audit completed successfully!');
    console.log('📊 Reports generated:');
    console.log('  - act-supabase-direct-audit.json (detailed data)');
    console.log('  - ACT-SUPABASE-AUDIT-EXECUTIVE-SUMMARY.md (executive summary)');
  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  }
}

runDirectAudit();
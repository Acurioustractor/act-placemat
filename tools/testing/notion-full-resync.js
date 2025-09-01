// Full Notion Data Resync and Relationship Analysis
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs/promises';
dotenv.config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_API_VERSION = '2022-06-28';

const DATABASES = {
  projects: '177ebcf981cf80dd9514f1ec32f3314c',
  opportunities: '234ebcf981cf804e873ff352f03c36da', 
  organizations: '948f39467d1c42f2bd7e1317a755e67b',
  people: '47bdc1c4df994ddc81c4a0214c919d69',
  artifacts: '234ebcf981cf8015878deadb337662e4'
};

class NotionDataAnalyzer {
  constructor() {
    this.allData = {};
    this.relationships = {};
    this.analysis = {
      totalRecords: 0,
      recordsByType: {},
      relationshipCounts: {},
      missingConnections: [],
      strongConnections: [],
      contentPatterns: {}
    };
  }

  async queryDatabase(databaseId, databaseName) {
    console.log(`📊 Syncing ${databaseName} database...`);
    
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_API_VERSION
        },
        body: JSON.stringify({
          page_size: 100
        })
      });

      if (!response.ok) {
        console.log(`   ❌ Error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      console.log(`   ✅ Found ${data.results.length} records`);
      
      this.allData[databaseName] = data.results;
      this.analysis.recordsByType[databaseName] = data.results.length;
      this.analysis.totalRecords += data.results.length;
      
      return data.results;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return [];
    }
  }

  extractPropertyValue(property) {
    if (!property) return null;
    
    switch (property.type) {
      case 'title':
        return property.title?.[0]?.plain_text || '';
      case 'rich_text':
        return property.rich_text?.[0]?.plain_text || '';
      case 'select':
        return property.select?.name || null;
      case 'multi_select':
        return property.multi_select?.map(item => item.name) || [];
      case 'number':
        return property.number || null;
      case 'date':
        return property.date?.start || null;
      case 'people':
        return property.people?.map(person => person.name || person.id) || [];
      case 'relation':
        return property.relation?.map(rel => rel.id) || [];
      case 'url':
        return property.url || null;
      case 'email':
        return property.email || null;
      case 'phone_number':
        return property.phone_number || null;
      case 'checkbox':
        return property.checkbox || false;
      case 'formula':
        return this.extractPropertyValue(property.formula) || null;
      case 'rollup':
        return property.rollup?.array?.map(item => this.extractPropertyValue(item)) || null;
      default:
        return null;
    }
  }

  analyzeRecord(record, databaseName) {
    const analyzed = {
      id: record.id,
      database: databaseName,
      properties: {},
      relations: [],
      lastEdited: record.last_edited_time
    };

    // Extract all properties
    for (const [key, property] of Object.entries(record.properties)) {
      const value = this.extractPropertyValue(property);
      analyzed.properties[key] = value;
      
      // Track relations
      if (property.type === 'relation' && value && value.length > 0) {
        analyzed.relations.push({
          property: key,
          targets: value
        });
      }

      // Track people connections
      if (property.type === 'people' && value && value.length > 0) {
        analyzed.relations.push({
          property: key,
          targets: value,
          type: 'people'
        });
      }
    }

    return analyzed;
  }

  findCrossReferences() {
    console.log('\\n🔗 Analyzing Cross-Database Relationships...');
    
    const allRecords = Object.values(this.allData).flat();
    const idToRecord = {};
    
    // Create ID lookup
    for (const [dbName, records] of Object.entries(this.allData)) {
      for (const record of records) {
        const analyzed = this.analyzeRecord(record, dbName);
        idToRecord[record.id] = analyzed;
      }
    }

    // Find relationships
    for (const record of Object.values(idToRecord)) {
      for (const relation of record.relations) {
        for (const targetId of relation.targets) {
          const target = idToRecord[targetId];
          if (target) {
            const connectionKey = `${record.database}->${target.database}`;
            if (!this.analysis.relationshipCounts[connectionKey]) {
              this.analysis.relationshipCounts[connectionKey] = 0;
            }
            this.analysis.relationshipCounts[connectionKey]++;
            
            this.analysis.strongConnections.push({
              from: {
                database: record.database,
                id: record.id,
                name: record.properties.Name || record.properties.Title || 'Unnamed'
              },
              to: {
                database: target.database,
                id: target.id,
                name: target.properties.Name || target.properties.Title || 'Unnamed'
              },
              relationship: relation.property
            });
          }
        }
      }
    }

    return idToRecord;
  }

  analyzeContentPatterns() {
    console.log('\\n📈 Analyzing Content Patterns...');
    
    for (const [dbName, records] of Object.entries(this.allData)) {
      const patterns = {
        totalRecords: records.length,
        propertyTypes: {},
        commonValues: {},
        statusDistribution: {},
        recentActivity: 0
      };

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const record of records) {
        // Track recent activity
        if (new Date(record.last_edited_time) > oneWeekAgo) {
          patterns.recentActivity++;
        }

        // Analyze properties
        for (const [propName, property] of Object.entries(record.properties)) {
          if (!patterns.propertyTypes[propName]) {
            patterns.propertyTypes[propName] = {
              type: property.type,
              populated: 0,
              unique_values: new Set()
            };
          }

          const value = this.extractPropertyValue(property);
          if (value !== null && value !== '' && (Array.isArray(value) ? value.length > 0 : true)) {
            patterns.propertyTypes[propName].populated++;
            
            if (typeof value === 'string') {
              patterns.propertyTypes[propName].unique_values.add(value);
            }
          }

          // Special handling for status-like fields
          if (propName.toLowerCase().includes('status') && value) {
            if (!patterns.statusDistribution[propName]) {
              patterns.statusDistribution[propName] = {};
            }
            if (!patterns.statusDistribution[propName][value]) {
              patterns.statusDistribution[propName][value] = 0;
            }
            patterns.statusDistribution[propName][value]++;
          }
        }
      }

      // Convert Sets to arrays for JSON serialization
      for (const prop of Object.values(patterns.propertyTypes)) {
        prop.unique_values = Array.from(prop.unique_values);
      }

      this.analysis.contentPatterns[dbName] = patterns;
    }
  }

  generateRelationalInsights() {
    console.log('\\n🧠 Generating Relational Insights...');
    
    const insights = {
      mostConnectedDatabases: [],
      isolatedRecords: [],
      hubRecords: [],
      relationshipGaps: [],
      publicShowcaseOpportunities: []
    };

    // Find most connected databases
    const dbConnections = {};
    for (const [connection, count] of Object.entries(this.analysis.relationshipCounts)) {
      const [from, to] = connection.split('->');
      if (!dbConnections[from]) dbConnections[from] = 0;
      if (!dbConnections[to]) dbConnections[to] = 0;
      dbConnections[from] += count;
      dbConnections[to] += count;
    }

    insights.mostConnectedDatabases = Object.entries(dbConnections)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    // Identify showcase opportunities
    for (const [dbName, records] of Object.entries(this.allData)) {
      for (const record of records) {
        const analyzed = this.analyzeRecord(record, dbName);
        const name = analyzed.properties.Name || analyzed.properties.Title || 'Unnamed';
        
        // Look for projects with high impact indicators
        if (dbName === 'projects') {
          const status = analyzed.properties.Status;
          const hasRevenue = analyzed.properties['Revenue Actual'] || analyzed.properties['Revenue Potential'];
          const hasTeam = analyzed.properties['Team Members'] || analyzed.properties['Project Lead'];
          
          if (status === 'Active' && (hasRevenue || hasTeam)) {
            insights.publicShowcaseOpportunities.push({
              name,
              id: record.id,
              database: dbName,
              showcaseFactors: {
                status,
                hasRevenue: !!hasRevenue,
                hasTeam: !!hasTeam,
                relationshipCount: analyzed.relations.length
              }
            });
          }
        }
      }
    }

    return insights;
  }

  async generateReport() {
    const insights = this.generateRelationalInsights();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.analysis,
      insights,
      rawData: this.allData,
      strongConnections: this.analysis.strongConnections.slice(0, 20), // Top 20 connections
      recommendations: {
        publicWebsite: [],
        dashboardEnhancements: [],
        dataQuality: []
      }
    };

    // Generate recommendations
    if (insights.publicShowcaseOpportunities.length > 0) {
      report.recommendations.publicWebsite.push(
        `🎬 ${insights.publicShowcaseOpportunities.length} projects ready for public showcase`,
        `🌟 Focus on projects with active status and team/revenue data`,
        `🔗 Leverage ${this.analysis.strongConnections.length} existing relationships for storytelling`
      );
    }

    if (this.analysis.relationshipCounts) {
      report.recommendations.dashboardEnhancements.push(
        `🕸️ Build relationship visualization for ${Object.keys(this.analysis.relationshipCounts).length} connection types`,
        `📊 Create cross-database analytics dashboard`,
        `🎯 Focus on ${insights.mostConnectedDatabases[0]?.[0] || 'projects'} as central hub`
      );
    }

    // Save detailed report
    await fs.writeFile('notion-full-analysis.json', JSON.stringify(report, null, 2));
    
    return report;
  }

  printSummary(report) {
    console.log('\\n🎯 NOTION DATA RESYNC COMPLETE');
    console.log('=====================================');
    console.log(`📊 Total Records: ${this.analysis.totalRecords}`);
    console.log('\\n📋 Records by Database:');
    for (const [db, count] of Object.entries(this.analysis.recordsByType)) {
      console.log(`   ${db}: ${count} records`);
    }
    
    console.log('\\n🔗 Relationship Summary:');
    for (const [connection, count] of Object.entries(this.analysis.relationshipCounts)) {
      console.log(`   ${connection}: ${count} connections`);
    }

    console.log('\\n🌟 Public Showcase Opportunities:');
    report.insights.publicShowcaseOpportunities.slice(0, 10).forEach(opp => {
      console.log(`   🎬 ${opp.name} (${opp.showcaseFactors.relationshipCount} connections)`);
    });

    console.log('\\n📈 Next Steps:');
    report.recommendations.publicWebsite.forEach(rec => console.log(`   ${rec}`));
    report.recommendations.dashboardEnhancements.forEach(rec => console.log(`   ${rec}`));
    
    console.log('\\n💾 Detailed analysis saved to: notion-full-analysis.json');
  }

  async run() {
    console.log('🚀 STARTING FULL NOTION DATA RESYNC');
    console.log('====================================\\n');

    // Sync all databases
    for (const [dbName, dbId] of Object.entries(DATABASES)) {
      await this.queryDatabase(dbId, dbName);
    }

    // Analyze relationships and content
    this.findCrossReferences();
    this.analyzeContentPatterns();
    
    // Generate comprehensive report
    const report = await this.generateReport();
    this.printSummary(report);
    
    return report;
  }
}

// Run the analysis
const analyzer = new NotionDataAnalyzer();
analyzer.run().catch(console.error);
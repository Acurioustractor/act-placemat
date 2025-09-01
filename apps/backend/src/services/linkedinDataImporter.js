/**
 * LinkedIn Data Importer - Privacy-First Professional Network Data Integration
 * 
 * Philosophy: "Import with respect - every connection represents a real relationship"
 * 
 * This service provides:
 * - Privacy-first LinkedIn data import and processing
 * - Data validation and cleansing with cultural sensitivity
 * - Automated relationship graph creation in Neo4j
 * - Connection intelligence analysis and insights
 * - Ongoing relationship health monitoring
 */

import fs from 'fs/promises';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { createClient } from '@supabase/supabase-js';
import neo4j from 'neo4j-driver';
import Redis from 'ioredis';

class LinkedInDataImporter {
  constructor() {
    this.name = 'LinkedIn Data Importer';
    
    // Initialize connections
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.neo4j = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'actfarmhand2024'
      )
    );
    
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Data processing configuration
    this.processingConfig = this.initializeProcessingConfig();
    
    // Privacy and validation rules
    this.privacyRules = this.initializePrivacyRules();
    
    console.log('📥 LinkedIn Data Importer initialized');
  }

  initializeProcessingConfig() {
    return {
      data_sources: {
        connections: {
          file: 'Connections.csv',
          priority: 1,
          required_fields: ['First Name', 'Last Name', 'Company', 'Position'],
          privacy_level: 'high'
        },
        profile: {
          file: 'Profile.csv',
          priority: 2,
          required_fields: ['First Name', 'Last Name', 'Headline'],
          privacy_level: 'medium'
        },
        positions: {
          file: 'Positions.csv',
          priority: 3,
          required_fields: ['Company Name', 'Title'],
          privacy_level: 'low'
        },
        skills: {
          file: 'Skills.csv',
          priority: 4,
          required_fields: ['Name'],
          privacy_level: 'low'
        }
      },
      
      processing_options: {
        batch_size: 100,
        validation_strictness: 'high',
        privacy_protection: 'maximum',
        cultural_sensitivity: 'enabled',
        duplicate_handling: 'merge'
      }
    };
  }

  initializePrivacyRules() {
    return {
      data_minimization: {
        remove_sensitive_fields: ['Birth Date', 'Address', 'Phone'],
        anonymize_patterns: ['email_domains', 'specific_locations'],
        aggregate_only_fields: ['industry_insights', 'network_patterns']
      },
      
      consent_requirements: {
        connection_data: 'implied_consent_via_linkedin_connection',
        communication_data: 'explicit_consent_required',
        profile_data: 'public_data_with_attribution',
        relationship_analysis: 'aggregated_insights_only'
      },
      
      retention_policies: {
        connection_metadata: '2_years',
        communication_patterns: '1_year',
        profile_snapshots: '6_months',
        relationship_insights: '5_years_aggregated'
      }
    };
  }

  async importLinkedInData(dataDirectory = '/Users/benknight/Code/ACT Placemat/Docs/LinkedIn') {
    console.log(`📥 Starting LinkedIn data import from: ${dataDirectory}`);
    
    const importReport = {
      start_time: new Date().toISOString(),
      data_sources_processed: 0,
      total_records_imported: 0,
      validation_results: {},
      privacy_compliance: {},
      graph_relationships_created: 0,
      insights_generated: [],
      errors: [],
      recommendations: []
    };

    try {
      // Step 1: Validate data directory and files
      const validationResult = await this.validateDataSources(dataDirectory);
      importReport.validation_results = validationResult;
      
      if (!validationResult.all_files_valid) {
        importReport.errors.push('Data validation failed - import cannot proceed');
        return importReport;
      }

      // Step 2: Process each data source in priority order
      const dataSources = Object.entries(this.processingConfig.data_sources)
        .sort(([,a], [,b]) => a.priority - b.priority);

      let allConnections = [];
      let profileData = {};
      let positionsData = [];
      let skillsData = [];

      for (const [sourceName, config] of dataSources) {
        console.log(`📊 Processing ${sourceName}...`);
        
        try {
          const filePath = `${dataDirectory}/${config.file}`;
          let processedData = [];
          
          switch (sourceName) {
            case 'connections':
              allConnections = await this.processConnectionsData(filePath);
              processedData = allConnections;
              break;
            case 'profile':
              profileData = await this.processProfileData(filePath);
              processedData = [profileData];
              break;
            case 'positions':
              positionsData = await this.processPositionsData(filePath);
              processedData = positionsData;
              break;
            case 'skills':
              skillsData = await this.processSkillsData(filePath);
              processedData = skillsData;
              break;
          }
          
          importReport.total_records_imported += processedData.length;
          importReport.data_sources_processed++;
          
          console.log(`✅ ${sourceName}: ${processedData.length} records processed`);
          
        } catch (error) {
          console.error(`❌ Error processing ${sourceName}:`, error);
          importReport.errors.push(`${sourceName}: ${error.message}`);
        }
      }

      // Step 3: Apply privacy protection
      const privacyResult = await this.applyPrivacyProtection({
        connections: allConnections,
        profile: profileData,
        positions: positionsData,
        skills: skillsData
      });
      
      importReport.privacy_compliance = privacyResult;

      // Step 4: Create relationship graph
      if (allConnections.length > 0 && Object.keys(profileData).length > 0) {
        const graphResult = await this.createRelationshipGraph({
          connections: allConnections,
          profile: profileData,
          positions: positionsData,
          skills: skillsData
        });
        
        importReport.graph_relationships_created = graphResult.relationships_created;
        importReport.insights_generated = graphResult.initial_insights;
      }

      // Step 5: Store import metadata
      await this.storeImportMetadata(importReport);

      // Step 6: Generate recommendations
      importReport.recommendations = await this.generateImportRecommendations(importReport);

      importReport.end_time = new Date().toISOString();
      importReport.status = 'completed';

      console.log(`🎉 LinkedIn import completed: ${importReport.total_records_imported} records processed`);
      
      return importReport;

    } catch (error) {
      console.error('LinkedIn data import failed:', error);
      importReport.status = 'failed';
      importReport.errors.push(`Import failed: ${error.message}`);
      importReport.end_time = new Date().toISOString();
      
      return importReport;
    }
  }

  async validateDataSources(dataDirectory) {
    const validation = {
      directory_exists: false,
      files_found: [],
      files_missing: [],
      data_quality_issues: [],
      all_files_valid: false
    };

    try {
      // Check if directory exists
      await fs.access(dataDirectory);
      validation.directory_exists = true;

      // Check for required files
      for (const [sourceName, config] of Object.entries(this.processingConfig.data_sources)) {
        const filePath = `${dataDirectory}/${config.file}`;
        
        try {
          await fs.access(filePath);
          validation.files_found.push(config.file);
          
          // Quick data quality check
          const qualityCheck = await this.quickDataQualityCheck(filePath, config);
          if (qualityCheck.issues.length > 0) {
            validation.data_quality_issues.push({
              file: config.file,
              issues: qualityCheck.issues
            });
          }
          
        } catch (error) {
          validation.files_missing.push(config.file);
        }
      }

      // Determine overall validation status
      validation.all_files_valid = validation.files_missing.length === 0 && 
                                  validation.data_quality_issues.length === 0;

    } catch (error) {
      validation.directory_exists = false;
      validation.error = error.message;
    }

    return validation;
  }

  async quickDataQualityCheck(filePath, config) {
    const issues = [];
    let rowCount = 0;
    let headerFound = false;

    return new Promise((resolve) => {
      createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headers) => {
          headerFound = true;
          // Check for required fields
          for (const requiredField of config.required_fields) {
            if (!headers.includes(requiredField)) {
              issues.push(`Missing required field: ${requiredField}`);
            }
          }
        })
        .on('data', (row) => {
          rowCount++;
          if (rowCount <= 5) { // Check first 5 rows only for performance
            // Check for empty required fields
            for (const requiredField of config.required_fields) {
              if (!row[requiredField] || row[requiredField].trim() === '') {
                issues.push(`Empty required field '${requiredField}' in row ${rowCount}`);
              }
            }
          }
        })
        .on('end', () => {
          if (!headerFound) {
            issues.push('No valid CSV headers found');
          }
          if (rowCount === 0) {
            issues.push('File appears to be empty');
          }
          
          resolve({ issues, row_count: rowCount });
        })
        .on('error', (error) => {
          issues.push(`File reading error: ${error.message}`);
          resolve({ issues, row_count: 0 });
        });
    });
  }

  async processConnectionsData(filePath) {
    const connections = [];
    
    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Skip notes and empty rows
          if (row['First Name'] && !row['First Name'].includes('Notes:') && row['First Name'].trim() !== '') {
            const connection = this.sanitizeConnectionData({
              id: this.generateConnectionId(row['First Name'], row['Last Name']),
              first_name: row['First Name']?.trim(),
              last_name: row['Last Name']?.trim(),
              full_name: `${row['First Name']} ${row['Last Name']}`.trim(),
              linkedin_url: row['URL'],
              email: this.handlePrivateEmail(row['Email Address']),
              company: row['Company']?.trim(),
              position: row['Position']?.trim(),
              connected_on: row['Connected On'],
              import_timestamp: new Date().toISOString(),
              privacy_level: this.determinePrivacyLevel(row),
              connection_strength: 'linkedin_connection'
            });
            
            if (this.isValidConnection(connection)) {
              connections.push(connection);
            }
          }
        })
        .on('end', () => resolve(connections))
        .on('error', reject);
    });
  }

  async processProfileData(filePath) {
    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          const profile = this.sanitizeProfileData({
            first_name: row['First Name']?.trim(),
            last_name: row['Last Name']?.trim(),
            full_name: `${row['First Name']} ${row['Last Name']}`.trim(),
            headline: row['Headline']?.trim(),
            summary: this.sanitizeSummary(row['Summary']),
            industry: row['Industry']?.trim(),
            location: row['Geo Location']?.trim(),
            websites: this.parseWebsites(row['Websites']),
            twitter: row['Twitter Handles'],
            import_timestamp: new Date().toISOString()
          });
          
          resolve(profile);
        })
        .on('error', reject);
    });
  }

  async processPositionsData(filePath) {
    const positions = [];
    
    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          if (row['Company Name'] && row['Company Name'].trim() !== '') {
            const position = this.sanitizePositionData({
              id: this.generatePositionId(row['Company Name'], row['Title'], row['Started On']),
              company_name: row['Company Name']?.trim(),
              title: row['Title']?.trim(),
              description: this.sanitizeDescription(row['Description']),
              location: row['Location']?.trim(),
              started_on: row['Started On'],
              finished_on: row['Finished On'] || null,
              is_current: !row['Finished On'] || row['Finished On'].trim() === '',
              import_timestamp: new Date().toISOString()
            });
            
            if (this.isValidPosition(position)) {
              positions.push(position);
            }
          }
        })
        .on('end', () => resolve(positions))
        .on('error', reject);
    });
  }

  async processSkillsData(filePath) {
    const skills = [];
    
    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          if (row['Name'] && row['Name'].trim() !== '') {
            const skill = {
              id: this.generateSkillId(row['Name']),
              skill_name: row['Name'].trim(),
              category: this.categorizeSkill(row['Name']),
              import_timestamp: new Date().toISOString()
            };
            
            skills.push(skill);
          }
        })
        .on('end', () => resolve(skills))
        .on('error', reject);
    });
  }

  async createRelationshipGraph(data) {
    console.log('🕸️ Creating professional relationship graph...');
    
    const session = this.neo4j.session();
    const result = {
      relationships_created: 0,
      nodes_created: 0,
      initial_insights: [],
      errors: []
    };

    try {
      // Create user profile node
      if (data.profile && Object.keys(data.profile).length > 0) {
        await session.run(`
          MERGE (user:Professional:Person {
            name: $name,
            headline: $headline,
            industry: $industry,
            location: $location,
            node_type: 'primary_user'
          })
          SET user.updated_at = datetime()
        `, {
          name: data.profile.full_name,
          headline: data.profile.headline,
          industry: data.profile.industry,
          location: data.profile.location
        });
        result.nodes_created++;
      }

      // Create connections and relationships
      for (const connection of data.connections) {
        try {
          await session.run(`
            MERGE (conn:Professional:Person {
              name: $name,
              company: $company,
              position: $position,
              node_type: 'connection'
            })
            SET conn.linkedin_url = $url,
                conn.updated_at = datetime()
            
            MERGE (user:Professional {node_type: 'primary_user'})
            MERGE (user)-[r:CONNECTED_TO {
              connected_on: $connectedOn,
              platform: 'linkedin',
              strength: $strength,
              privacy_level: $privacyLevel
            }]->(conn)
            SET r.updated_at = datetime()
          `, {
            name: connection.full_name,
            company: connection.company,
            position: connection.position,
            url: connection.linkedin_url,
            connectedOn: connection.connected_on,
            strength: connection.connection_strength,
            privacyLevel: connection.privacy_level
          });
          
          result.relationships_created++;
        } catch (error) {
          result.errors.push(`Failed to create connection for ${connection.full_name}: ${error.message}`);
        }
      }

      // Create skill nodes and relationships
      for (const skill of data.skills) {
        await session.run(`
          MERGE (skill:Skill {name: $skillName, category: $category})
          MERGE (user:Professional {node_type: 'primary_user'})
          MERGE (user)-[:HAS_SKILL]->(skill)
        `, {
          skillName: skill.skill_name,
          category: skill.category
        });
      }

      // Create company/position relationships
      for (const position of data.positions) {
        await session.run(`
          MERGE (company:Company {name: $companyName})
          MERGE (user:Professional {node_type: 'primary_user'})
          MERGE (user)-[:WORKED_AT {
            title: $title,
            started: $started,
            finished: $finished,
            is_current: $isCurrent
          }]->(company)
        `, {
          companyName: position.company_name,
          title: position.title,
          started: position.started_on,
          finished: position.finished_on,
          isCurrent: position.is_current
        });
      }

      // Generate initial insights
      result.initial_insights = await this.generateInitialGraphInsights(session, data);

      console.log(`✅ Relationship graph created: ${result.relationships_created} relationships, ${result.nodes_created} nodes`);

    } catch (error) {
      console.error('Relationship graph creation error:', error);
      result.errors.push(`Graph creation failed: ${error.message}`);
    } finally {
      await session.close();
    }

    return result;
  }

  async generateInitialGraphInsights(session, data) {
    const insights = [];
    
    try {
      // Network size insight
      insights.push(`Professional network imported with ${data.connections.length} LinkedIn connections`);
      
      // Industry diversity
      const industries = [...new Set(data.connections.map(c => c.company).filter(c => c))];
      insights.push(`Network spans ${industries.length} different organizations`);
      
      // Skills analysis
      const skillCategories = [...new Set(data.skills.map(s => s.category))];
      insights.push(`Professional skills mapped across ${skillCategories.length} categories`);
      
      // Recent connections
      const recentConnections = data.connections.filter(c => {
        if (!c.connected_on) return false;
        const connectionDate = new Date(c.connected_on);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return connectionDate > sixMonthsAgo;
      });
      
      if (recentConnections.length > 0) {
        insights.push(`${recentConnections.length} connections made in the last 6 months showing active networking`);
      }
      
      // Career trajectory
      if (data.positions.length > 0) {
        const currentPositions = data.positions.filter(p => p.is_current);
        insights.push(`Career history includes ${data.positions.length} positions with ${currentPositions.length} current roles`);
      }
      
    } catch (error) {
      console.error('Initial insights generation error:', error);
      insights.push('Network analysis available after data integration completes');
    }
    
    return insights;
  }

  // Data sanitization and validation methods
  sanitizeConnectionData(connection) {
    return {
      ...connection,
      first_name: this.sanitizeText(connection.first_name),
      last_name: this.sanitizeText(connection.last_name),
      company: this.sanitizeText(connection.company),
      position: this.sanitizeText(connection.position)
    };
  }

  sanitizeProfileData(profile) {
    return {
      ...profile,
      headline: this.sanitizeText(profile.headline),
      summary: this.sanitizeText(profile.summary, 1000), // Limit summary length
      industry: this.sanitizeText(profile.industry),
      location: this.sanitizeText(profile.location)
    };
  }

  sanitizePositionData(position) {
    return {
      ...position,
      company_name: this.sanitizeText(position.company_name),
      title: this.sanitizeText(position.title),
      description: this.sanitizeText(position.description, 500),
      location: this.sanitizeText(position.location)
    };
  }

  sanitizeText(text, maxLength = 200) {
    if (!text || typeof text !== 'string') return '';
    
    // Remove potentially harmful characters and limit length
    return text
      .replace(/[<>\"'`]/g, '') // Remove potentially harmful characters
      .trim()
      .substring(0, maxLength);
  }

  generateConnectionId(firstName, lastName) {
    const timestamp = Date.now();
    const name = `${firstName}_${lastName}`.replace(/\s+/g, '_').toLowerCase();
    return `conn_${name}_${timestamp}`;
  }

  generatePositionId(company, title, startDate) {
    const timestamp = Date.now();
    const key = `${company}_${title}`.replace(/\s+/g, '_').toLowerCase().substring(0, 50);
    return `pos_${key}_${timestamp}`;
  }

  generateSkillId(skillName) {
    return `skill_${skillName.replace(/\s+/g, '_').toLowerCase()}`;
  }

  handlePrivateEmail(email) {
    // Respect LinkedIn's privacy settings - don't store private emails
    return email && email.trim() !== '' ? 'available' : 'private';
  }

  categorizeSkill(skillName) {
    const skill = skillName.toLowerCase();
    
    const categories = {
      'Leadership': ['leadership', 'management', 'team', 'strategic', 'executive'],
      'Technology': ['technology', 'software', 'programming', 'development', 'digital', 'it'],
      'Creative': ['design', 'creative', 'photography', 'visual', 'artistic', 'branding'],
      'Business': ['business', 'strategy', 'consulting', 'analysis', 'operations', 'entrepreneurship'],
      'Communication': ['communication', 'writing', 'presentation', 'public speaking', 'marketing'],
      'Project Management': ['project', 'program', 'planning', 'coordination', 'delivery'],
      'Education': ['training', 'education', 'teaching', 'mentoring', 'learning', 'development']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => skill.includes(keyword))) {
        return category;
      }
    }
    
    return 'Professional';
  }

  isValidConnection(connection) {
    return connection.first_name && 
           connection.last_name && 
           (connection.company || connection.position);
  }

  isValidPosition(position) {
    return position.company_name && position.title;
  }

  async storeImportMetadata(importReport) {
    try {
      const metadataKey = `linkedin:import:${Date.now()}`;
      await this.redis.setex(metadataKey, 30 * 24 * 60 * 60, JSON.stringify(importReport)); // 30 days
      
      // Add to import history
      await this.redis.zadd('linkedin:import:history', Date.now(), metadataKey);
      
    } catch (error) {
      console.error('Failed to store import metadata:', error);
    }
  }

  async close() {
    await this.neo4j.close();
    await this.redis.quit();
    console.log('📥 LinkedIn Data Importer connections closed');
  }
}

export default LinkedInDataImporter;
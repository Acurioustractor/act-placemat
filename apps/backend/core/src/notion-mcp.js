/**
 * NotionMCP - Notion Model Context Protocol Integration
 * 
 * This class provides a standardized interface for interacting with Notion databases
 * using the Model Context Protocol pattern.
 */

const fetch = require('node-fetch');
const { config } = require('../server/config');
const { logger, errorHandler } = require('../../utils/logger');
const { makeNotionRequest } = require('../../utils/apiUtils');

/**
 * NotionMCP class for interacting with Notion API
 */
class NotionMCP {
  /**
   * Create a new NotionMCP instance
   * @param {Object} [config={}] Configuration options
   * @param {string} [config.token] Notion API token
   * @param {string} [config.apiVersion] Notion API version
   * @param {string} [config.projectsDb] Projects database ID
   * @param {string} [config.opportunitiesDb] Opportunities database ID
   * @param {string} [config.organizationsDb] Organizations database ID
   * @param {string} [config.peopleDb] People database ID
   * @param {string} [config.artifactsDb] Artifacts database ID
   */
  constructor(customConfig = {}) {
    // Core configuration
    this.token = customConfig.token || this.getEnvVar('NOTION_TOKEN');
    this.apiVersion = customConfig.apiVersion || this.getEnvVar('NOTION_API_VERSION') || '2022-06-28';
    this.baseUrl = 'https://api.notion.com/v1';
    
    // Database IDs - can be configured individually
    this.databases = {
      projects: customConfig.projectsDb || this.getEnvVar('NOTION_PROJECTS_DB') || this.getEnvVar('NOTION_DATABASE_ID'),
      opportunities: customConfig.opportunitiesDb || this.getEnvVar('NOTION_OPPORTUNITIES_DB'),
      organizations: customConfig.organizationsDb || this.getEnvVar('NOTION_ORGANIZATIONS_DB'),
      people: customConfig.peopleDb || this.getEnvVar('NOTION_PEOPLE_DB'),
      artifacts: customConfig.artifactsDb || this.getEnvVar('NOTION_ARTIFACTS_DB')
    };
    
    // Check if token is provided
    if (!this.token) {
      logger.warn('Notion token not provided. Using mock data.');
      this.useMockData = true;
    }
    
    // Check which databases are configured
    this.availableDatabases = {};
    Object.entries(this.databases).forEach(([name, id]) => {
      if (id) {
        this.availableDatabases[name] = true;
        logger.info(`✓ ${name} database configured`);
      } else {
        logger.info(`✗ ${name} database not configured`);
      }
    });
    
    // Validate required configuration
    this.validateConfig();
  }

  /**
   * Validate the configuration
   * @private
   */
  validateConfig() {
    if (!this.token && !this.useMockData) {
      logger.error('Notion token is required for API access');
    }
    
    if (!this.databases.projects) {
      logger.error('Projects database ID is required');
    }
    
    // Log warnings for missing optional databases
    if (!this.databases.opportunities) {
      logger.warn('Opportunities database not configured');
    }
    
    if (!this.databases.organizations) {
      logger.warn('Organizations database not configured');
    }
    
    if (!this.databases.people) {
      logger.warn('People database not configured');
    }
    
    if (!this.databases.artifacts) {
      logger.warn('Artifacts database not configured');
    }
  }

  /**
   * Get an environment variable
   * @param {string} name Environment variable name
   * @returns {string|undefined} Environment variable value
   * @private
   */
  getEnvVar(name) {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[name];
    }
    return undefined;
  }
  
  /**
   * Check if a database is available
   * @param {string} databaseType Database type (projects, opportunities, etc.)
   * @returns {boolean} True if the database is available
   */
  isDatabaseAvailable(databaseType) {
    return Boolean(this.availableDatabases[databaseType]);
  }
  
  /**
   * Get a database ID
   * @param {string} databaseType Database type (projects, opportunities, etc.)
   * @returns {string|undefined} Database ID
   */
  getDatabaseId(databaseType) {
    return this.databases[databaseType];
  }
  
  /**
   * Query a Notion database
   * @param {string} databaseId Notion database ID
   * @param {Object} [filters={}] Filters to apply
   * @param {Array} [sorts=[]] Sorting options
   * @param {number} [pageSize=100] Number of results per page
   * @param {string} [startCursor] Pagination cursor
   * @returns {Promise<Object>} Notion API response
   */
  async queryDatabase(databaseId, filters = {}, sorts = [], pageSize = 100, startCursor = undefined) {
    if (this.useMockData) {
      logger.info(`Using mock data for database: ${databaseId}`);
      return this.getMockResponse(databaseId);
    }

    if (!databaseId) {
      throw new Error('Database ID is required');
    }

    if (!this.token) {
      throw new Error('Notion token is required');
    }

    const requestBody = {
      page_size: pageSize
    };
    
    // Add start cursor for pagination if provided
    if (startCursor) {
      requestBody.start_cursor = startCursor;
    }
    
    // Only add filters if they have actual content
    if (filters && Object.keys(filters).length > 0) {
      requestBody.filter = filters;
    }
    
    // Only add sorts if array has content
    if (sorts && sorts.length > 0) {
      requestBody.sorts = sorts;
    }

    logger.info(`Querying Notion database: ${databaseId.substring(0, 8)}...`, {
      hasFilters: Object.keys(filters).length > 0,
      hasSorts: sorts.length > 0,
      pageSize,
      hasCursor: Boolean(startCursor)
    });

    try {
      // Use makeNotionRequest utility for retry logic
      return await makeNotionRequest(
        async () => {
          // In Node.js environment, call Notion API directly
          if (typeof window === 'undefined') {
            const response = await fetch(`${this.baseUrl}/databases/${databaseId}/query`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.token}`,
                'Notion-Version': this.apiVersion,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
              throw Object.assign(new Error(`Notion API error: ${response.status}`), {
                response: {
                  status: response.status,
                  statusText: response.statusText,
                  data: errorData
                }
              });
            }

            return await response.json();
          }

          // In browser environment, use server proxy
          const response = await fetch('/api/notion/query', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              databaseId: databaseId,
              filters: filters,
              sorts: sorts,
              pageSize: pageSize,
              startCursor: startCursor
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw Object.assign(new Error(`Notion API error: ${response.status}`), {
              response: {
                status: response.status,
                statusText: response.statusText,
                data: errorData
              }
            });
          }

          return await response.json();
        },
        { operation: `query database ${databaseId.substring(0, 8)}...` }
      );
    } catch (error) {
      logger.error(`Error querying database ${databaseId.substring(0, 8)}...`, error);
      throw error;
    }
  }
  
  /**
   * Query all pages from a database (handles pagination)
   * @param {string} databaseId Notion database ID
   * @param {Object} [filters={}] Filters to apply
   * @param {Array} [sorts=[]] Sorting options
   * @returns {Promise<Array>} All results from the database
   */
  async queryDatabaseAll(databaseId, filters = {}, sorts = []) {
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;
    
    while (hasMore) {
      const response = await this.queryDatabase(databaseId, filters, sorts, 100, startCursor);
      
      if (response.results) {
        allResults = allResults.concat(response.results);
      }
      
      hasMore = response.has_more || false;
      startCursor = response.next_cursor;
      
      if (hasMore) {
        logger.debug(`Fetching next page of results for ${databaseId.substring(0, 8)}...`);
      }
    }
    
    logger.info(`Retrieved ${allResults.length} total results from database ${databaseId.substring(0, 8)}...`);
    return allResults;
  }
  
  /**
   * Fetch projects from Notion
   * @param {Object} [filters={}] Filters to apply
   * @param {Array} [sorts=[]] Sorting options
   * @returns {Promise<Array<Object>>} Array of projects
   */
  async fetchProjects(filters = {}, sorts = []) {
    if (!this.availableDatabases.projects) {
      logger.warn('Projects database not configured');
      return this.getMockData().projects;
    }

    try {
      logger.info('Fetching projects from Notion...');
      const response = await this.queryDatabase(this.databases.projects, filters, sorts);
      const projects = this.parseNotionResponse(response, 'project');
      logger.info(`Retrieved ${projects.length} projects from Notion`);
      return projects;
    } catch (error) {
      logger.error('Error fetching projects:', error);
      return this.getMockData().projects;
    }
  }

  /**
   * Fetch opportunities from Notion
   * @param {Object} [filters={}] Filters to apply
   * @param {Array} [sorts=[]] Sorting options
   * @returns {Promise<Array<Object>>} Array of opportunities
   */
  async fetchOpportunities(filters = {}, sorts = []) {
    if (!this.availableDatabases.opportunities) {
      logger.warn('Opportunities database not configured');
      return this.getMockData().opportunities;
    }

    try {
      logger.info('Fetching opportunities from Notion...');
      const response = await this.queryDatabase(this.databases.opportunities, filters, sorts);
      const opportunities = this.parseNotionResponse(response, 'opportunity');
      logger.info(`Retrieved ${opportunities.length} opportunities from Notion`);
      return opportunities;
    } catch (error) {
      logger.error('Error fetching opportunities:', error);
      return this.getMockData().opportunities;
    }
  }

  /**
   * Fetch organizations from Notion
   * @param {Object} [filters={}] Filters to apply
   * @param {Array} [sorts=[]] Sorting options
   * @returns {Promise<Array<Object>>} Array of organizations
   */
  async fetchOrganizations(filters = {}, sorts = []) {
    if (!this.availableDatabases.organizations) {
      logger.warn('Organizations database not configured');
      return this.getMockData().organizations;
    }

    try {
      logger.info('Fetching organizations from Notion...');
      const response = await this.queryDatabase(this.databases.organizations, filters, sorts);
      const organizations = this.parseNotionResponse(response, 'organization');
      logger.info(`Retrieved ${organizations.length} organizations from Notion`);
      return organizations;
    } catch (error) {
      logger.error('Error fetching organizations:', error);
      return this.getMockData().organizations;
    }
  }

  /**
   * Fetch people from Notion
   * @param {Object} [filters={}] Filters to apply
   * @param {Array} [sorts=[]] Sorting options
   * @returns {Promise<Array<Object>>} Array of people
   */
  async fetchPeople(filters = {}, sorts = []) {
    if (!this.availableDatabases.people) {
      logger.warn('People database not configured');
      return this.getMockData().people;
    }

    try {
      logger.info('Fetching people from Notion...');
      const response = await this.queryDatabase(this.databases.people, filters, sorts);
      const people = this.parseNotionResponse(response, 'person');
      logger.info(`Retrieved ${people.length} people from Notion`);
      return people;
    } catch (error) {
      logger.error('Error fetching people:', error);
      return this.getMockData().people;
    }
  }

  /**
   * Fetch artifacts from Notion
   * @param {Object} [filters={}] Filters to apply
   * @param {Array} [sorts=[]] Sorting options
   * @returns {Promise<Array<Object>>} Array of artifacts
   */
  async fetchArtifacts(filters = {}, sorts = []) {
    if (!this.availableDatabases.artifacts) {
      logger.warn('Artifacts database not configured');
      return this.getMockData().artifacts;
    }

    try {
      logger.info('Fetching artifacts from Notion...');
      const response = await this.queryDatabase(this.databases.artifacts, filters, sorts);
      const artifacts = this.parseNotionResponse(response, 'artifact');
      logger.info(`Retrieved ${artifacts.length} artifacts from Notion`);
      return artifacts;
    } catch (error) {
      logger.error('Error fetching artifacts:', error);
      return this.getMockData().artifacts;
    }
  }
  
  /**
   * Fetch all data from all configured databases
   * @returns {Promise<Object>} Object containing all data and summary
   */
  async fetchAllData() {
    try {
      logger.info('Fetching all data from Notion...');
      
      const [projects, opportunities, organizations, people, artifacts] = await Promise.all([
        this.fetchProjects(),
        this.fetchOpportunities(),
        this.fetchOrganizations(),
        this.fetchPeople(),
        this.fetchArtifacts()
      ]);

      logger.info('Successfully fetched all data from Notion');
      
      return {
        projects,
        opportunities,
        organizations,
        people,
        artifacts,
        summary: {
          totalProjects: projects.length,
          totalOpportunities: opportunities.length,
          totalOrganizations: organizations.length,
          totalPeople: people.length,
          totalArtifacts: artifacts.length,
          pipelineValue: opportunities.reduce((sum, o) => sum + (o.amount || 0), 0),
          weightedPipeline: opportunities.reduce((sum, o) => sum + (o.weightedRevenue || 0), 0)
        }
      };
    } catch (error) {
      logger.error('Error fetching all data:', error);
      
      // Return mock data as fallback
      const mockData = this.getMockData();
      return {
        projects: mockData.projects,
        opportunities: mockData.opportunities,
        organizations: mockData.organizations,
        people: mockData.people,
        artifacts: mockData.artifacts,
        summary: {
          totalProjects: mockData.projects.length,
          totalOpportunities: mockData.opportunities.length,
          totalOrganizations: mockData.organizations.length,
          totalPeople: mockData.people.length,
          totalArtifacts: mockData.artifacts.length,
          pipelineValue: mockData.opportunities.reduce((sum, o) => sum + (o.amount || 0), 0),
          weightedPipeline: mockData.opportunities.reduce((sum, o) => sum + (o.weightedRevenue || 0), 0)
        }
      };
    }
  }
  
  /**
   * Get a mock response for a database query
   * @param {string} databaseId Database ID
   * @returns {Object} Mock response
   * @private
   */
  getMockResponse(databaseId) {
    const mockData = this.getMockData();
    
    // Return appropriate mock data based on database ID
    if (databaseId === this.databases.projects) {
      return { 
        results: mockData.projects.map(p => ({ 
          id: p.id, 
          properties: this.convertToNotionProperties(p),
          last_edited_time: new Date().toISOString(),
          created_time: new Date().toISOString(),
          url: `https://notion.so/${p.id}`
        })),
        has_more: false
      };
    } else if (databaseId === this.databases.opportunities) {
      return { 
        results: mockData.opportunities.map(o => ({ 
          id: o.id, 
          properties: this.convertToNotionProperties(o),
          last_edited_time: new Date().toISOString(),
          created_time: new Date().toISOString(),
          url: `https://notion.so/${o.id}`
        })),
        has_more: false
      };
    } else if (databaseId === this.databases.organizations) {
      return { 
        results: mockData.organizations.map(o => ({ 
          id: o.id, 
          properties: this.convertToNotionProperties(o),
          last_edited_time: new Date().toISOString(),
          created_time: new Date().toISOString(),
          url: `https://notion.so/${o.id}`
        })),
        has_more: false
      };
    } else if (databaseId === this.databases.people) {
      return { 
        results: mockData.people.map(p => ({ 
          id: p.id, 
          properties: this.convertToNotionProperties(p),
          last_edited_time: new Date().toISOString(),
          created_time: new Date().toISOString(),
          url: `https://notion.so/${p.id}`
        })),
        has_more: false
      };
    } else if (databaseId === this.databases.artifacts) {
      return { 
        results: mockData.artifacts.map(a => ({ 
          id: a.id, 
          properties: this.convertToNotionProperties(a),
          last_edited_time: new Date().toISOString(),
          created_time: new Date().toISOString(),
          url: `https://notion.so/${a.id}`
        })),
        has_more: false
      };
    }
    
    return { results: [], has_more: false };
  }
  
  /**
   * Convert a plain object to Notion properties format for mock data
   * @param {Object} obj Plain object
   * @returns {Object} Notion properties object
   * @private
   */
  convertToNotionProperties(obj) {
    const properties = {};
    
    Object.entries(obj).forEach(([key, value]) => {
      if (key === 'id') return; // Skip ID field
      
      if (key === 'name' || key === 'fullName' || key.includes('Name')) {
        properties[key] = {
          type: 'title',
          title: [{ type: 'text', text: { content: value }, plain_text: value }]
        };
      } else if (typeof value === 'string' && (key === 'area' || key === 'status' || key === 'funding' || key === 'type')) {
        properties[key] = {
          type: 'select',
          select: { name: value }
        };
      } else if (Array.isArray(value) && (key === 'tags' || key === 'themes')) {
        properties[key] = {
          type: 'multi_select',
          multi_select: value.map(item => ({ name: item }))
        };
      } else if (typeof value === 'number') {
        properties[key] = {
          type: 'number',
          number: value
        };
      } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
        properties[key] = {
          type: 'date',
          date: { start: value }
        };
      } else if (typeof value === 'string') {
        properties[key] = {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: value }, plain_text: value }]
        };
      } else if (Array.isArray(value) && key.includes('related')) {
        properties[key] = {
          type: 'relation',
          relation: value.map(id => ({ id }))
        };
      }
    });
    
    return properties;
  }
  
  /**
   * Extract text from a Notion property
   * @param {Object} property Notion property object
   * @returns {string} Extracted text
   */
  extractText(property) {
    if (!property) return '';
    
    try {
      switch (property.type) {
        case 'title':
          return property.title?.map(t => t.plain_text).join('') || '';
        case 'rich_text':
          return property.rich_text?.map(t => t.plain_text).join('') || '';
        case 'text':
          return property.text?.content || '';
        default:
          return '';
      }
    } catch (error) {
      logger.warn(`Error extracting text from property`, { error: error.message });
      return '';
    }
  }
  
  /**
   * Extract a select value from a Notion property
   * @param {Object} property Notion property object
   * @returns {string} Extracted select value
   */
  extractSelect(property) {
    if (!property || property.type !== 'select') return '';
    
    try {
      return property.select?.name || '';
    } catch (error) {
      logger.warn(`Error extracting select from property`, { error: error.message });
      return '';
    }
  }
  
  /**
   * Extract multi-select values from a Notion property
   * @param {Object} property Notion property object
   * @returns {Array<string>} Extracted multi-select values
   */
  extractMultiSelect(property) {
    if (!property) return [];
    
    try {
      if (property.type === 'multi_select') {
        return property.multi_select?.map(item => item.name) || [];
      } else if (property.type === 'rich_text') {
        const text = this.extractText(property);
        return text.split(',').map(item => item.trim()).filter(item => item);
      }
      
      return [];
    } catch (error) {
      logger.warn(`Error extracting multi-select from property`, { error: error.message });
      return [];
    }
  }
  
  /**
   * Extract a number from a Notion property
   * @param {Object} property Notion property object
   * @param {number} [defaultValue=0] Default value if property is null or undefined
   * @returns {number} Extracted number
   */
  extractNumber(property, defaultValue = 0) {
    if (!property || property.type !== 'number') return defaultValue;
    
    try {
      return property.number !== null && property.number !== undefined ? property.number : defaultValue;
    } catch (error) {
      logger.warn(`Error extracting number from property`, { error: error.message });
      return defaultValue;
    }
  }
  
  /**
   * Extract a date from a Notion property
   * @param {Object} property Notion property object
   * @returns {string|null} Extracted date as ISO string or null
   */
  extractDate(property) {
    if (!property || property.type !== 'date') return null;
    
    try {
      return property.date?.start || null;
    } catch (error) {
      logger.warn(`Error extracting date from property`, { error: error.message });
      return null;
    }
  }
  
  /**
   * Extract people from a Notion property
   * @param {Object} property Notion property object
   * @returns {string} Comma-separated list of people names
   */
  extractPeople(property) {
    if (!property || property.type !== 'people') return '';
    
    try {
      return property.people?.map(person => person.name || person.id).join(', ') || '';
    } catch (error) {
      logger.warn(`Error extracting people from property`, { error: error.message });
      return '';
    }
  }
  
  /**
   * Extract relation IDs from a Notion property
   * @param {Object} property Notion property object
   * @returns {Array<string>} Array of related page IDs
   */
  extractRelation(property) {
    if (!property || property.type !== 'relation') return [];
    
    try {
      return property.relation?.map(item => item.id) || [];
    } catch (error) {
      logger.warn(`Error extracting relation from property`, { error: error.message });
      return [];
    }
  }
  
  /**
   * Extract an email from a Notion property
   * @param {Object} property Notion property object
   * @returns {string} Extracted email
   */
  extractEmail(property) {
    if (!property || property.type !== 'email') return '';
    
    try {
      return property.email || '';
    } catch (error) {
      logger.warn(`Error extracting email from property`, { error: error.message });
      return '';
    }
  }
  
  /**
   * Extract a phone number from a Notion property
   * @param {Object} property Notion property object
   * @returns {string} Extracted phone number
   */
  extractPhone(property) {
    if (!property || property.type !== 'phone_number') return '';
    
    try {
      return property.phone_number || '';
    } catch (error) {
      logger.warn(`Error extracting phone from property`, { error: error.message });
      return '';
    }
  }
  
  /**
   * Extract a URL from a Notion property
   * @param {Object} property Notion property object
   * @returns {string} Extracted URL
   */
  extractUrl(property) {
    if (!property || property.type !== 'url') return '';
    
    try {
      return property.url || '';
    } catch (error) {
      logger.warn(`Error extracting URL from property`, { error: error.message });
      return '';
    }
  }
  
  /**
   * Extract files from a Notion property
   * @param {Object} property Notion property object
   * @returns {Array<Object>} Array of file objects with name and URL
   */
  extractFiles(property) {
    if (!property || property.type !== 'files') return [];
    
    try {
      return property.files?.map(file => ({
        name: file.name,
        url: file.file?.url || file.external?.url
      })) || [];
    } catch (error) {
      logger.warn(`Error extracting files from property`, { error: error.message });
      return [];
    }
  }
  
  /**
   * Extract a checkbox value from a Notion property
   * @param {Object} property Notion property object
   * @returns {boolean} Extracted checkbox value
   */
  extractCheckbox(property) {
    if (!property || property.type !== 'checkbox') return false;
    
    try {
      return property.checkbox || false;
    } catch (error) {
      logger.warn(`Error extracting checkbox from property`, { error: error.message });
      return false;
    }
  }
  
  /**
   * Extract a formula result from a Notion property
   * @param {Object} property Notion property object
   * @returns {any} Extracted formula result
   */
  extractFormula(property) {
    if (!property || property.type !== 'formula') return null;
    
    try {
      const formula = property.formula;
      switch (formula.type) {
        case 'string':
          return formula.string;
        case 'number':
          return formula.number;
        case 'boolean':
          return formula.boolean;
        case 'date':
          return formula.date?.start;
        default:
          return null;
      }
    } catch (error) {
      logger.warn(`Error extracting formula from property`, { error: error.message });
      return null;
    }
  }
  
  /**
   * Extract a probability value from a Notion property (handles both select and number types)
   * @param {Object} property Notion property object
   * @returns {number} Probability as a number (0-100)
   */
  extractProbability(property) {
    if (!property) return 50; // Default to 50%
    
    try {
      if (property.type === 'select') {
        const value = property.select?.name || '50%';
        return parseInt(value.replace('%', ''), 10) || 50;
      } else if (property.type === 'number') {
        return property.number !== null && property.number !== undefined ? property.number : 50;
      }
      
      return 50;
    } catch (error) {
      logger.warn(`Error extracting probability from property`, { error: error.message });
      return 50;
    }
  }
  
  /**
   * Parse Notion API response based on entity type
   * @param {Object} response Notion API response
   * @param {string} entityType Entity type (project, opportunity, organization, person, artifact)
   * @returns {Array<Object>} Parsed entities
   */
  parseNotionResponse(response, entityType) {
    if (!response || !response.results) {
      logger.warn(`Invalid Notion response for ${entityType}`);
      return [];
    }
    
    try {
      return response.results.map(page => {
        switch (entityType) {
          case 'project':
            return this.parseNotionProject(page);
          case 'opportunity':
            return this.parseNotionOpportunity(page);
          case 'organization':
            return this.parseNotionOrganization(page);
          case 'person':
            return this.parseNotionPerson(page);
          case 'artifact':
            return this.parseNotionArtifact(page);
          default:
            logger.warn(`Unknown entity type: ${entityType}`);
            return this.parseNotionProject(page);
        }
      });
    } catch (error) {
      logger.error(`Error parsing Notion response for ${entityType}`, error);
      return [];
    }
  }
  
  /**
   * Parse a Notion project page
   * @param {Object} page Notion page object
   * @returns {Object} Parsed project
   */
  parseNotionProject(page) {
    try {
      const props = page.properties || {};
      
      return {
        id: page.id,
        name: this.extractText(props.Name || props.Title),
        area: this.extractSelect(props.Area),
        description: this.extractText(props.Description),
        status: this.extractSelect(props.Status),
        funding: this.extractSelect(props.Funding),
        lead: this.extractText(props['Project Lead']) || this.extractPeople(props['Project Lead']),
        teamMembers: this.extractPeople(props['Team Members']),
        coreValues: this.extractSelect(props['Core Values']),
        themes: this.extractMultiSelect(props.Themes || props.Theme),
        tags: this.extractMultiSelect(props.Tags),
        place: this.extractSelect(props.Place),
        location: this.extractSelect(props.Location),
        state: this.extractSelect(props.State),
        revenueActual: this.extractNumber(props['Revenue Actual']),
        revenuePotential: this.extractNumber(props['Revenue Potential']),
        actualIncoming: this.extractNumber(props['Actual Incoming']),
        potentialIncoming: this.extractNumber(props['Potential Incoming']),
        nextMilestone: this.extractDate(props['Next Milestone Date']),
        startDate: this.extractDate(props['Start Date']),
        endDate: this.extractDate(props['End Date']),
        relatedOpportunities: this.extractRelation(props['🎯 Related Opportunities']),
        projectArtifacts: this.extractRelation(props['📋 Project Artifacts']),
        partnerOrganizations: this.extractRelation(props['🏢 Partner Organizations']),
        successMetrics: this.extractText(props['📊 Success Metrics']),
        websiteLinks: this.extractUrl(props['🔗 Website/Links']),
        aiSummary: this.extractText(props['AI Summary'] || props['AI summary']),
        lastModified: page.last_edited_time,
        createdTime: page.created_time,
        url: page.url
      };
    } catch (error) {
      logger.error('Error parsing Notion project', error);
      return {
        id: page.id,
        name: 'Error parsing project',
        error: error.message
      };
    }
  }
  
  /**
   * Parse a Notion opportunity page
   * @param {Object} page Notion page object
   * @returns {Object} Parsed opportunity
   */
  parseNotionOpportunity(page) {
    try {
      const props = page.properties || {};
      
      return {
        id: page.id,
        name: this.extractText(props['Opportunity Name'] || props.Name || props.Title),
        organization: this.extractRelation(props.Organization),
        stage: this.extractSelect(props.Stage),
        amount: this.extractNumber(props['Revenue Amount'] || props.Amount),
        probability: this.extractProbability(props.Probability),
        weightedRevenue: this.extractFormula(props['Weighted Revenue']) || 
                        (this.extractNumber(props['Revenue Amount'] || props.Amount) * this.extractProbability(props.Probability) / 100),
        type: this.extractSelect(props['Opportunity Type'] || props.Type),
        description: this.extractText(props.Description),
        relatedProjects: this.extractRelation(props['🎯 Related Projects']),
        primaryContact: this.extractRelation(props['Primary Contact']),
        decisionMakers: this.extractRelation(props['Decision Makers']),
        nextAction: this.extractText(props['Next Action']),
        nextActionDate: this.extractDate(props['Next Action Date']),
        deadline: this.extractDate(props.Deadline),
        applicationDate: this.extractDate(props['Application Date']),
        expectedDecisionDate: this.extractDate(props['Expected Decision Date']),
        supportingArtifacts: this.extractRelation(props['📋 Supporting Artifacts']),
        requirements: this.extractText(props.Requirements),
        competition: this.extractText(props.Competition),
        budgetBreakdown: this.extractText(props['Budget Breakdown']),
        successCriteria: this.extractText(props['Success Criteria']),
        riskAssessment: this.extractText(props['Risk Assessment']),
        notes: this.extractText(props.Notes),
        lastModified: page.last_edited_time,
        createdTime: page.created_time,
        url: page.url
      };
    } catch (error) {
      logger.error('Error parsing Notion opportunity', error);
      return {
        id: page.id,
        name: 'Error parsing opportunity',
        error: error.message
      };
    }
  }
  
  /**
   * Parse a Notion organization page
   * @param {Object} page Notion page object
   * @returns {Object} Parsed organization
   */
  parseNotionOrganization(page) {
    try {
      const props = page.properties || {};
      
      return {
        id: page.id,
        name: this.extractText(props['Organization Name'] || props.Name || props.Title),
        type: this.extractSelect(props.Type),
        sector: this.extractMultiSelect(props.Sector),
        size: this.extractSelect(props.Size),
        location: this.extractText(props.Location),
        website: this.extractUrl(props.Website),
        description: this.extractText(props.Description),
        relationshipStatus: this.extractSelect(props['Relationship Status']),
        partnershipType: this.extractMultiSelect(props['Partnership Type']),
        activeOpportunities: this.extractRelation(props['🎯 Active Opportunities']),
        relatedProjects: this.extractRelation(props['🚀 Related Projects']),
        keyContacts: this.extractRelation(props['👥 Key Contacts']),
        sharedArtifacts: this.extractRelation(props['📋 Shared Artifacts']),
        annualBudget: this.extractNumber(props['Annual Budget']),
        fundingCapacity: this.extractSelect(props['Funding Capacity']),
        decisionTimeline: this.extractSelect(props['Decision Timeline']),
        valuesAlignment: this.extractSelect(props['Values Alignment']),
        strategicPriority: this.extractSelect(props['Strategic Priority']),
        lastContactDate: this.extractDate(props['Last Contact Date']),
        nextContactDate: this.extractDate(props['Next Contact Date']),
        notes: this.extractText(props.Notes),
        lastModified: page.last_edited_time,
        createdTime: page.created_time,
        url: page.url
      };
    } catch (error) {
      logger.error('Error parsing Notion organization', error);
      return {
        id: page.id,
        name: 'Error parsing organization',
        error: error.message
      };
    }
  }
  
  /**
   * Parse a Notion person page
   * @param {Object} page Notion page object
   * @returns {Object} Parsed person
   */
  parseNotionPerson(page) {
    try {
      const props = page.properties || {};
      
      return {
        id: page.id,
        fullName: this.extractText(props['Full Name'] || props.Name || props.Title),
        role: this.extractText(props.Role || props.Title || props['Role/Title']),
        organization: this.extractRelation(props.Organization),
        email: this.extractEmail(props.Email),
        phone: this.extractPhone(props.Phone),
        linkedIn: this.extractUrl(props.LinkedIn),
        location: this.extractText(props.Location),
        relationshipType: this.extractSelect(props['Relationship Type']),
        influenceLevel: this.extractSelect(props['Influence Level']),
        communicationPreference: this.extractSelect(props['Communication Preference']),
        relatedOpportunities: this.extractRelation(props['🎯 Related Opportunities']),
        relatedProjects: this.extractRelation(props['🚀 Related Projects']),
        sharedArtifacts: this.extractRelation(props['📋 Shared Artifacts']),
        interests: this.extractMultiSelect(props.Interests),
        expertise: this.extractMultiSelect(props.Expertise),
        lastContactDate: this.extractDate(props['Last Contact Date']),
        nextContactDate: this.extractDate(props['Next Contact Date']),
        contactFrequency: this.extractSelect(props['Contact Frequency']),
        relationshipStrength: this.extractSelect(props['Relationship Strength']),
        notes: this.extractText(props.Notes),
        birthday: this.extractDate(props.Birthday),
        personalInterests: this.extractText(props['Personal Interests']),
        lastModified: page.last_edited_time,
        createdTime: page.created_time,
        url: page.url
      };
    } catch (error) {
      logger.error('Error parsing Notion person', error);
      return {
        id: page.id,
        name: 'Error parsing person',
        error: error.message
      };
    }
  }
  
  /**
   * Parse a Notion artifact page
   * @param {Object} page Notion page object
   * @returns {Object} Parsed artifact
   */
  parseNotionArtifact(page) {
    try {
      const props = page.properties || {};
      
      return {
        id: page.id,
        name: this.extractText(props['Artifact Name'] || props.Name || props.Title),
        type: this.extractSelect(props.Type),
        format: this.extractSelect(props.Format),
        status: this.extractSelect(props.Status),
        relatedOpportunities: this.extractRelation(props['🎯 Related Opportunities']),
        relatedProjects: this.extractRelation(props['🚀 Related Projects']),
        relatedOrganizations: this.extractRelation(props['🏢 Related Organizations']),
        relatedPeople: this.extractRelation(props['👥 Related People']),
        fileLink: this.extractFiles(props['File/Link']) || this.extractUrl(props['File/Link']),
        description: this.extractText(props.Description),
        audience: this.extractMultiSelect(props.Audience),
        purpose: this.extractSelect(props.Purpose),
        version: this.extractNumber(props.Version),
        createdBy: this.extractPeople(props['Created By']),
        approvedBy: this.extractPeople(props['Approved By']),
        reviewDate: this.extractDate(props['Review Date']),
        accessLevel: this.extractSelect(props['Access Level']),
        tags: this.extractMultiSelect(props.Tags),
        usageNotes: this.extractText(props['Usage Notes']),
        lastModified: page.last_edited_time,
        createdTime: page.created_time,
        url: page.url
      };
    } catch (error) {
      logger.error('Error parsing Notion artifact', error);
      return {
        id: page.id,
        name: 'Error parsing artifact',
        error: error.message
      };
    }
  }
  
  /**
   * Get mock data for development and testing
   * @returns {Object} Mock data
   */
  getMockData() {
    return {
      projects: [
        {
          id: 'mock-proj-1',
          name: 'Community Solar Network',
          area: 'Operations & Infrastructure',
          description: 'Distributed solar energy system for community power generation and distribution.',
          status: 'Active',
          funding: 'Funded',
          lead: 'Energy Cooperative',
          teamMembers: 'Sarah Johnson, Michael Chen',
          tags: ['renewable', 'infrastructure', 'community-owned'],
          revenueActual: 50000,
          revenuePotential: 200000,
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'mock-proj-2',
          name: 'Indigenous Data Sovereignty Initiative',
          area: 'Story & Sovereignty',
          description: 'Creating protocols and systems for Indigenous communities to maintain control over their data and stories.',
          status: 'Building',
          funding: 'Needs Funding',
          lead: 'First Nations Tech Council',
          teamMembers: 'James Running Deer, Lisa Whitefeather',
          tags: ['indigenous', 'data-sovereignty', 'protocols'],
          revenueActual: 15000,
          revenuePotential: 75000,
          startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'mock-proj-3',
          name: 'Community Currency Platform',
          area: 'Economic Freedom',
          description: 'Digital platform for local community currencies and mutual credit systems.',
          status: 'Active',
          funding: 'Partially Funded',
          lead: 'Local Economy Alliance',
          teamMembers: 'David Rodriguez, Aisha Nkosi',
          tags: ['local-economy', 'currency', 'mutual-credit'],
          revenueActual: 30000,
          revenuePotential: 120000,
          startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      opportunities: [
        {
          id: 'mock-opp-1',
          name: 'Government Sustainability Grant 2024',
          stage: 'Proposal',
          amount: 150000,
          probability: 75,
          weightedRevenue: 112500,
          type: 'Grant',
          description: 'Federal grant for community sustainability initiatives',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'mock-opp-2',
          name: 'Corporate Partnership - Energy Co',
          stage: 'Negotiation',
          amount: 80000,
          probability: 90,
          weightedRevenue: 72000,
          type: 'Partnership',
          description: 'Strategic partnership with renewable energy company',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      organizations: [
        {
          id: 'mock-org-1',
          name: 'Department of Energy',
          type: 'Government',
          sector: ['Energy', 'Public Sector'],
          relationshipStatus: 'Active Partner',
          description: 'Federal department overseeing energy policy and funding',
          fundingCapacity: '$200K-$1M'
        },
        {
          id: 'mock-org-2',
          name: 'First Nations Tech Council',
          type: 'Non-profit',
          sector: ['Indigenous', 'Technology', 'Education'],
          relationshipStatus: 'Strategic Partner',
          description: 'Indigenous-led organization supporting technology capacity in First Nations communities',
          fundingCapacity: '$50K-$200K'
        }
      ],
      people: [
        {
          id: 'mock-person-1',
          fullName: 'Sarah Johnson',
          role: 'Program Director',
          organization: 'Department of Energy',
          email: 'sarah.johnson@energy.gov',
          relationshipType: 'Key',
          influenceLevel: 'Decision Maker'
        },
        {
          id: 'mock-person-2',
          fullName: 'James Running Deer',
          role: 'Executive Director',
          organization: 'First Nations Tech Council',
          email: 'james@fntc.org',
          relationshipType: 'Partner',
          influenceLevel: 'Influencer'
        }
      ],
      artifacts: [
        {
          id: 'mock-artifact-1',
          name: 'Grant Application Template',
          type: 'Template',
          format: 'Word',
          status: 'Approved',
          description: 'Standard template for government grant applications'
        },
        {
          id: 'mock-artifact-2',
          name: 'Community Solar Network Proposal',
          type: 'Proposal',
          format: 'PDF',
          status: 'Final',
          description: 'Project proposal for the Community Solar Network initiative'
        }
      ]
    };
  }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
  window.NotionMCP = NotionMCP;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotionMCP;
}
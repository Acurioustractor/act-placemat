/**
 * Notion Data Fetchers Module
 * Handles data retrieval methods for all Notion database types
 */

import {
  queryNotion,
  buildEnhancedFilter,
  getCacheKey,
  isCacheValid,
  setCache,
  getCache,
} from './queryBuilder.js';

import {
  extractTitle,
  extractSelect,
  extractMultiSelect,
  extractPlainText,
  extractCheckbox,
  extractUrl,
  extractDate,
  extractNumber,
  extractRelation,
} from './extractors.js';

/**
 * Fetch partners from Notion
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Partners data
 */
export async function getPartners(options = {}) {
  const {
    useCache = true,
    filter = {},
    databaseConfigs,
    cache,
    cacheStats,
    notion,
  } = options;

  const cacheKey = getCacheKey('partners', filter);

  if (useCache && isCacheValid(cache, cacheKey)) {
    cacheStats.hits++;
    return getCache(cache, cacheKey);
  }

  cacheStats.misses++;
  cacheStats.totalQueries++;

  try {
    if (!databaseConfigs.partners?.id) {
      console.warn('⚠️ Notion partners database ID not configured - partner list disabled');
      return [];
    }

    const notionFilter = {
      property: 'Status',
      select: { equals: 'Active' },
      ...filter,
    };

    // Remove sorts for partners database due to schema validation errors
    const sorts = [];

    const results = await queryNotion({
      notion,
      databaseId: databaseConfigs.partners.id,
      filter: notionFilter,
      sorts,
    });

    const formattedPartners = results.map(page => ({
      id: page.id,
      name: extractTitle(page.properties.Name?.title || []),
      type: extractSelect(page.properties.Type?.select),
      category: extractSelect(page.properties.Category?.select),
      description: extractPlainText(page.properties.Description?.rich_text || []),
      contributionType: extractPlainText(page.properties['Contribution Type']?.rich_text || []),
      relationshipStrength: extractSelect(page.properties['Relationship Strength']?.select),
      collaborationFocus: extractMultiSelect(page.properties['Collaboration Focus']?.multi_select || []),
      impactStory: extractPlainText(page.properties['Impact Story']?.rich_text || []),
      featured: extractCheckbox(page.properties.Featured?.checkbox),
      logoUrl: extractUrl(page.properties['Logo URL']?.url),
      location: extractPlainText(page.properties.Location?.rich_text || []),
      establishedDate: extractDate(page.properties['Established Date']?.date),
    }));

    setCache(cache, cacheKey, formattedPartners);
    return formattedPartners;
  } catch (error) {
    console.warn('Failed to fetch partners from Notion:', error.message);
    return [];
  }
}

/**
 * Fetch projects from Notion
 * @param {Object} optionsOrUseCache - Options object or useCache boolean
 * @param {Object} maybeFilter - Optional filter
 * @returns {Promise<Array>} Projects data
 */
export async function getProjects(optionsOrUseCache = {}, maybeFilter = {}) {
  let options = {};

  if (typeof optionsOrUseCache === 'boolean') {
    options = {
      useCache: optionsOrUseCache,
      filter: maybeFilter,
    };
  } else if (optionsOrUseCache && typeof optionsOrUseCache === 'object') {
    options = { ...optionsOrUseCache };
    if (
      maybeFilter &&
      typeof maybeFilter === 'object' &&
      Object.keys(maybeFilter).length > 0
    ) {
      options.filter = maybeFilter;
    }
  }

  const {
    useCache = true,
    filter = {},
    sorts: customSorts,
    pageSize = 100,
    getAllPages = true,
    startCursor = null,
    maxPages = null,
    databaseConfigs,
    cache,
    cacheStats,
    notion,
  } = options;

  const sorts = Array.isArray(customSorts) && customSorts.length > 0
    ? customSorts
    : [
        {
          property: 'Name',
          direction: 'ascending',
        },
      ];

  const cacheKey = getCacheKey('projects', filter, sorts);

  if (useCache && isCacheValid(cache, cacheKey)) {
    cacheStats.hits++;
    return getCache(cache, cacheKey);
  }

  cacheStats.misses++;
  cacheStats.totalQueries++;

  try {
    if (!databaseConfigs.projects?.id) {
      console.warn('⚠️ Notion projects database ID not configured - project list disabled');
      return [];
    }

    const enhancedFilter = buildEnhancedFilter(filter, {
      Status: 'select',
      Area: 'select',
      Funding: 'select',
      Theme: 'multi_select',
    });

    const results = await queryNotion({
      notion,
      databaseId: databaseConfigs.projects.id,
      filter: enhancedFilter,
      sorts,
      pageSize,
      getAllPages,
      startCursor,
      maxPages,
    });

    const formattedProjects = results.map(page => {
      const rawThemes = extractMultiSelect(page.properties.Theme?.multi_select || []);
      const rawTags = extractMultiSelect(page.properties.Tags?.multi_select || []);

      return {
        id: page.id,
        name: extractTitle(page.properties.Name?.title || []),
        status: extractSelect(page.properties.Status?.select),
        area: extractSelect(page.properties.Area?.select),
        description: extractPlainText(page.properties.Description?.rich_text || []),
        lead: extractPlainText(page.properties.Lead?.rich_text || []),
        aiSummary: extractPlainText(page.properties['AI Summary']?.rich_text || []),
        location: extractPlainText(page.properties['Western Name Location']?.rich_text || []),
        coreValues: extractSelect(page.properties['Core Values']?.select),
        funding: extractSelect(page.properties.Funding?.select),
        actualIncoming: extractNumber(page.properties['Actual Incoming']),
        potentialIncoming: extractNumber(page.properties['Potential Incoming']),
        nextMilestoneDate: extractDate(page.properties['Next Milestone Date']?.date),
        startDate: extractDate(page.properties['Start Date']?.date),
        themes: rawThemes,
        tags: rawTags,
        relationshipPillars: extractMultiSelect(page.properties['Relationship Pillars']?.multi_select || []),
        projectLead: null,
        notionUrl: page.url,
        coverImage: null,
        notionId: page.id,
        notionIdShort: page.id.replace(/-/g, '').substring(0, 8),
        notionCreatedAt: page.created_time,
        notionLastEditedAt: page.last_edited_time,
        updatedAt: new Date().toISOString(),
        featured: extractCheckbox(page.properties.Featured?.checkbox),
      };
    });

    setCache(cache, cacheKey, formattedProjects);
    return formattedProjects;
  } catch (error) {
    console.warn('Failed to fetch projects from Notion:', error.message);
    return [];
  }
}

/**
 * Get a specific project by ID
 * @param {string} projectId - Project ID
 * @param {Object} options - Fetch options
 * @returns {Promise<Object|null>} Project data
 */
export async function getProjectById(projectId, options = {}) {
  const { notion, databaseConfigs, getCache, getPartners, getOrganizations } = options;

  try {
    const response = await notion.pages.retrieve({ page_id: projectId });

    const projectData = {
      id: response.id,
      name: extractTitle(response.properties.Name?.title || []),
      status: extractSelect(response.properties.Status?.select),
      description: extractPlainText(response.properties.Description?.rich_text || []),
    };

    return projectData;
  } catch (error) {
    console.error('Failed to get project by ID:', error.message);
    return null;
  }
}

/**
 * Fetch opportunities from Notion
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Opportunities data
 */
export async function getOpportunities(options = {}) {
  const {
    useCache = true,
    filter = {},
    databaseConfigs,
    cache,
    cacheStats,
    notion,
  } = options;

  const cacheKey = getCacheKey('opportunities', filter);

  if (useCache && isCacheValid(cache, cacheKey)) {
    cacheStats.hits++;
    return getCache(cache, cacheKey);
  }

  cacheStats.misses++;
  cacheStats.totalQueries++;

  try {
    if (!databaseConfigs.opportunities?.id) {
      console.warn('⚠️ Notion opportunities database ID not configured');
      return [];
    }

    const results = await queryNotion({
      notion,
      databaseId: databaseConfigs.opportunities.id,
      filter: {},
      sorts: [],
      pageSize: 100,
      getAllPages: true,
    });

    const formattedOpportunities = results.map(page => ({
      id: page.id,
      name: extractTitle(page.properties.Name?.title || []),
      status: extractSelect(page.properties.Status?.select),
      opportunityType: extractSelect(page.properties['Opportunity Type']?.select),
      description: extractPlainText(page.properties.Description?.rich_text || []),
      value: extractNumber(page.properties.Value),
      probability: extractNumber(page.properties.Probability),
      dueDate: extractDate(page.properties['Due Date']?.date),
      contactPerson: extractPlainText(page.properties['Contact Person']?.rich_text || []),
      organizationId: extractRelation(page.properties.Organization?.relation || []),
      relatedProjects: extractRelation(page.properties['Related Projects']?.relation || []),
      notes: extractPlainText(page.properties.Notes?.rich_text || []),
    }));

    setCache(cache, cacheKey, formattedOpportunities);
    return formattedOpportunities;
  } catch (error) {
    console.warn('Failed to fetch opportunities from Notion:', error.message);
    return [];
  }
}

/**
 * Fetch organizations from Notion
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Organizations data
 */
export async function getOrganizations(options = {}) {
  const {
    useCache = true,
    filter = {},
    databaseConfigs,
    cache,
    cacheStats,
    notion,
  } = options;

  const cacheKey = getCacheKey('organizations', filter);

  if (useCache && isCacheValid(cache, cacheKey)) {
    cacheStats.hits++;
    return getCache(cache, cacheKey);
  }

  cacheStats.misses++;
  cacheStats.totalQueries++;

  try {
    if (!databaseConfigs.organizations?.id) {
      console.warn('⚠️ Notion organizations database ID not configured');
      return [];
    }

    const results = await queryNotion({
      notion,
      databaseId: databaseConfigs.organizations.id,
      filter: {},
      sorts: [],
      pageSize: 100,
      getAllPages: true,
    });

    const formattedOrganizations = results.map(page => ({
      id: page.id,
      name: extractTitle(page.properties.Name?.title || []),
      type: extractSelect(page.properties.Type?.select),
      location: extractPlainText(page.properties.Location?.rich_text || []),
      website: extractUrl(page.properties.Website?.url),
      description: extractPlainText(page.properties.Description?.rich_text || []),
      status: extractSelect(page.properties.Status?.select),
      contactEmail: extractPlainText(page.properties['Contact Email']?.rich_text || []),
      phoneNumber: extractPlainText(page.properties['Phone Number']?.rich_text || []),
      relatedProjects: extractRelation(page.properties['Related Projects']?.relation || []),
      relatedPeople: extractRelation(page.properties['Related People']?.relation || []),
      indigenousOwnership: extractCheckbox(page.properties['Indigenous Ownership']?.checkbox),
      communityOwned: extractCheckbox(page.properties['Community Owned']?.checkbox),
    }));

    setCache(cache, cacheKey, formattedOrganizations);
    return formattedOrganizations;
  } catch (error) {
    console.warn('Failed to fetch organizations from Notion:', error.message);
    return [];
  }
}

/**
 * Fetch recent activities from Notion
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Activities data
 */
export async function getRecentActivities(options = {}) {
  const {
    useCache = true,
    limit = 10,
    databaseConfigs,
    cache,
    cacheStats,
    notion,
  } = options;

  const cacheKey = getCacheKey('recent_activities', { limit });

  if (useCache && isCacheValid(cache, cacheKey)) {
    cacheStats.hits++;
    return getCache(cache, cacheKey);
  }

  cacheStats.misses++;
  cacheStats.totalQueries++;

  try {
    if (!databaseConfigs.activities?.id) {
      console.warn('⚠️ Notion activities database ID not configured');
      return [];
    }

    const results = await queryNotion({
      notion,
      databaseId: databaseConfigs.activities.id,
      filter: {},
      sorts: [{ property: 'Date', direction: 'descending' }],
      pageSize: limit,
      getAllPages: false,
    });

    const formattedActivities = results.map(page => ({
      id: page.id,
      name: extractTitle(page.properties.Name?.title || []),
      date: extractDate(page.properties.Date?.date),
      type: extractSelect(page.properties.Type?.select),
      relatedProject: extractRelation(page.properties['Related Project']?.relation || []),
      relatedOrganization: extractRelation(page.properties['Related Organization']?.relation || []),
      relatedPeople: extractRelation(page.properties['Related People']?.relation || []),
      location: extractPlainText(page.properties.Location?.rich_text || []),
      notes: extractPlainText(page.properties.Notes?.rich_text || []),
      outcome: extractPlainText(page.properties.Outcome?.rich_text || []),
      status: extractSelect(page.properties.Status?.select),
    }));

    setCache(cache, cacheKey, formattedActivities);
    return formattedActivities;
  } catch (error) {
    console.warn('Failed to fetch activities from Notion:', error.message);
    return [];
  }
}

/**
 * Fetch people from Notion
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} People data
 */
export async function getPeople(options = {}) {
  const {
    useCache = true,
    databaseConfigs,
    cache,
    cacheStats,
    notion,
  } = options;

  const cacheKey = getCacheKey('people');

  if (useCache && isCacheValid(cache, cacheKey)) {
    cacheStats.hits++;
    return getCache(cache, cacheKey);
  }

  cacheStats.misses++;
  cacheStats.totalQueries++;

  try {
    if (!databaseConfigs.people?.id) {
      console.warn('⚠️ Notion people database ID not configured');
      return [];
    }

    const results = await queryNotion({
      notion,
      databaseId: databaseConfigs.people.id,
      filter: {},
      sorts: [{ property: 'Name', direction: 'ascending' }],
      pageSize: 100,
      getAllPages: true,
    });

    const formattedPeople = results.map(page => ({
      id: page.id,
      name: extractTitle(page.properties.Name?.title || []),
      role: extractPlainText(page.properties.Role?.rich_text || []),
      email: extractPlainText(page.properties.Email?.rich_text || []),
      phone: extractPlainText(page.properties.Phone?.rich_text || []),
      organizationId: extractRelation(page.properties.Organization?.relation || []),
      relatedProjects: extractRelation(page.properties['Related Projects']?.relation || []),
      relationshipStartDate: extractDate(page.properties['Relationship Start Date']?.date),
      notes: extractPlainText(page.properties.Notes?.rich_text || []),
      tags: extractMultiSelect(page.properties.Tags?.multi_select || []),
      communityRole: extractSelect(page.properties['Community Role']?.select),
    }));

    setCache(cache, cacheKey, formattedPeople);
    return formattedPeople;
  } catch (error) {
    console.warn('Failed to fetch people from Notion:', error.message);
    return [];
  }
}

/**
 * Fetch artifacts from Notion
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Artifacts data
 */
export async function getArtifacts(options = {}) {
  const {
    useCache = true,
    databaseConfigs,
    cache,
    cacheStats,
    notion,
  } = options;

  const cacheKey = getCacheKey('artifacts');

  if (useCache && isCacheValid(cache, cacheKey)) {
    cacheStats.hits++;
    return getCache(cache, cacheKey);
  }

  cacheStats.misses++;
  cacheStats.totalQueries++;

  try {
    if (!databaseConfigs.artifacts?.id) {
      console.warn('⚠️ Notion artifacts database ID not configured');
      return [];
    }

    const results = await queryNotion({
      notion,
      databaseId: databaseConfigs.artifacts.id,
      filter: {},
      sorts: [{ property: 'Created Date', direction: 'descending' }],
      pageSize: 100,
      getAllPages: true,
    });

    const formattedArtifacts = results.map(page => ({
      id: page.id,
      name: extractTitle(page.properties.Name?.title || []),
      type: extractSelect(page.properties.Type?.select),
      status: extractSelect(page.properties.Status?.select),
      fileSize: extractNumber(page.properties['File Size']),
      createdBy: extractPlainText(page.properties['Created By']?.rich_text || []),
      createdDate: extractDate(page.properties['Created Date']?.date),
      tags: extractMultiSelect(page.properties.Tags?.multi_select || []),
      relatedProjects: extractRelation(page.properties['Related Projects']?.relation || []),
    }));

    setCache(cache, cacheKey, formattedArtifacts);
    return formattedArtifacts;
  } catch (error) {
    console.warn('Failed to fetch artifacts from Notion:', error.message);
    return [];
  }
}

/**
 * Fetch actions from Notion
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Actions data
 */
export async function getActions(options = {}) {
  const {
    useCache = true,
    databaseConfigs,
    cache,
    cacheStats,
    notion,
  } = options;

  const cacheKey = getCacheKey('actions');

  if (useCache && isCacheValid(cache, cacheKey)) {
    cacheStats.hits++;
    return getCache(cache, cacheKey);
  }

  cacheStats.misses++;
  cacheStats.totalQueries++;

  try {
    if (!databaseConfigs.actions?.id) {
      console.warn('⚠️ Notion actions database ID not configured');
      return [];
    }

    const results = await queryNotion({
      notion,
      databaseId: databaseConfigs.actions.id,
      filter: {},
      sorts: [{ property: 'Due Date', direction: 'ascending' }],
      pageSize: 100,
      getAllPages: true,
    });

    const formattedActions = results.map(page => ({
      id: page.id,
      name: extractTitle(page.properties.Name?.title || []),
      description: extractPlainText(page.properties.Description?.rich_text || []),
      status: extractSelect(page.properties.Status?.select),
      priority: extractSelect(page.properties.Priority?.select),
      category: extractSelect(page.properties.Category?.select),
      assignedTo: extractPlainText(page.properties['Assigned To']?.rich_text || []),
      dueDate: extractDate(page.properties['Due Date']?.date),
      startDate: extractDate(page.properties['Start Date']?.date),
      completedDate: extractDate(page.properties['Completed Date']?.date),
      tags: extractMultiSelect(page.properties.Tags?.multi_select || []),
      relatedProjects: extractRelation(page.properties['Related Projects']?.relation || []),
      relatedPeople: extractRelation(page.properties['Related People']?.relation || []),
      impact: extractSelect(page.properties.Impact?.select),
      effort: extractSelect(page.properties.Effort?.select),
      outcome: extractPlainText(page.properties.Outcome?.rich_text || []),
      lessons: extractPlainText(page.properties.Lessons?.rich_text || []),
    }));

    setCache(cache, cacheKey, formattedActions);
    return formattedActions;
  } catch (error) {
    console.warn('Failed to fetch actions from Notion:', error.message);
    return [];
  }
}

/**
 * Fetch places from Notion
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Places data
 */
export async function getPlaces(options = {}) {
  const {
    useCache = true,
    databaseConfigs,
    cache,
    cacheStats,
    notion,
  } = options;

  const cacheKey = getCacheKey('places');

  if (useCache && isCacheValid(cache, cacheKey)) {
    cacheStats.hits++;
    return getCache(cache, cacheKey);
  }

  cacheStats.misses++;
  cacheStats.totalQueries++;

  try {
    if (!databaseConfigs.places?.id) {
      console.warn('⚠️ Notion places database ID not configured');
      return [];
    }

    const results = await queryNotion({
      notion,
      databaseId: databaseConfigs.places.id,
      filter: {},
      sorts: [{ property: 'Place', direction: 'ascending' }],
      pageSize: 100,
      getAllPages: true,
    });

    const formattedPlaces = results.map(page => ({
      id: page.id,
      name: extractTitle(page.properties.Place?.title || []),
      place: extractTitle(page.properties.Place?.title || []),
      westernName: extractPlainText(page.properties['Western Name']?.rich_text || []),
      state: extractSelect(page.properties.State?.select),
      map: extractPlainText(page.properties.Map?.rich_text || []),
      protocols: extractPlainText(page.properties.Protocols?.rich_text || []),
      relatedOrganisations: extractRelation(page.properties.Organisations?.relation || []),
      relatedPeople: extractRelation(page.properties.People?.relation || []),
      relatedProjects: extractRelation(page.properties.Projects?.relation || []),
      // For frontend compatibility
      indigenousName: extractTitle(page.properties.Place?.title || []),
      displayName: extractTitle(page.properties.Place?.title || []),
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
    }));

    setCache(cache, cacheKey, formattedPlaces);
    return formattedPlaces;
  } catch (error) {
    console.warn('Failed to fetch places from Notion:', error.message);
    return [];
  }
}

/**
 * Get a specific place by ID
 * @param {string} placeId - Place ID
 * @param {Object} options - Fetch options
 * @returns {Promise<Object|null>} Place data
 */
export async function getPlace(placeId, options = {}) {
  const { getPlaces } = options;
  const places = await getPlaces({});
  return places.find(place => place.id === placeId) || null;
}

/**
 * Search across multiple databases
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchAll(query, options = {}) {
  const {
    useCache = true,
    databaseConfigs,
    cache,
    notion,
  } = options;

  const cacheKey = getCacheKey('search', { query });

  if (useCache && isCacheValid(cache, cacheKey)) {
    return getCache(cache, cacheKey);
  }

  if (!notion) {
    return {
      partners: [],
      projects: [],
      opportunities: [],
      organizations: [],
      total: 0,
      error: 'Notion client not initialized',
    };
  }

  try {
    const results = await notion.search({
      query,
      filter: {
        property: 'object',
        value: 'page',
      },
    });

    const searchResults = {
      partners: [],
      projects: [],
      opportunities: [],
      organizations: [],
      total: results?.results?.length || 0,
    };

    if (results?.results) {
      results.results.forEach(page => {
        const parentId = page.parent?.database_id || page.parent?.data_source_id;

        if (parentId === databaseConfigs.partners?.id) {
          searchResults.partners.push({
            id: page.id,
            name: extractTitle(page.properties.Name?.title || []),
            type: 'partner',
          });
        } else if (parentId === databaseConfigs.projects?.id) {
          searchResults.projects.push({
            id: page.id,
            name: extractTitle(page.properties.Name?.title || []),
            type: 'project',
          });
        }
      });
    }

    setCache(cache, cacheKey, searchResults);
    return searchResults;
  } catch (error) {
    console.warn('Failed to search Notion:', error.message);
    return {
      partners: [],
      projects: [],
      opportunities: [],
      organizations: [],
      total: 0,
      error: error.message,
    };
  }
}

export default {
  getPartners,
  getProjects,
  getProjectById,
  getOpportunities,
  getOrganizations,
  getRecentActivities,
  getPeople,
  getArtifacts,
  getActions,
  getPlaces,
  getPlace,
  searchAll,
};

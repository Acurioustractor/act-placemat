/**
 * Notion Creators Module
 * Handles creation operations for Notion databases
 */

/**
 * Create a new project in Notion
 * @param {Object} projectData - Project data
 * @param {Object} options - Creation options
 * @returns {Promise<Object>} Creation result
 */
export async function createProject(projectData, options = {}) {
  const { notion, databaseConfigs, clearCache } = options;

  if (!notion) {
    throw new Error('Notion client not initialized');
  }

  if (!databaseConfigs.projects?.id) {
    throw new Error('Projects database ID not configured');
  }

  const projectProps = {
    Name: {
      title: [
        {
          text: {
            content: projectData.name || 'New Project'
          }
        }
      ]
    }
  };

  // Add optional properties if provided
  if (projectData.status) {
    projectProps.Status = {
      select: {
        name: projectData.status
      }
    };
  }

  if (projectData.aiSummary) {
    projectProps['AI summary'] = {
      rich_text: [
        {
          text: {
            content: projectData.aiSummary
          }
        }
      ]
    };
  }

  if (projectData.location) {
    projectProps['Western Name Location'] = {
      rich_text: [
        {
          text: {
            content: projectData.location
          }
        }
      ]
    };
  }

  if (projectData.coreValues) {
    projectProps['Core Values'] = {
      select: {
        name: projectData.coreValues
      }
    };
  }

  if (projectData.actualIncoming) {
    projectProps['Actual Incoming'] = {
      number: projectData.actualIncoming
    };
  }

  if (projectData.potentialIncoming) {
    projectProps['Potential Incoming'] = {
      number: projectData.potentialIncoming
    };
  }

  if (projectData.nextMilestoneDate) {
    projectProps['Next Milestone Date'] = {
      date: {
        start: projectData.nextMilestoneDate
      }
    };
  }

  if (projectData.theme && Array.isArray(projectData.theme)) {
    projectProps['Theme'] = {
      multi_select: projectData.theme.map(theme => ({
        name: theme
      }))
    };
  }

  if (projectData.tags && Array.isArray(projectData.tags)) {
    projectProps['Tags'] = {
      multi_select: projectData.tags.map(tag => ({
        name: tag
      }))
    };
  }

  try {
    console.log('Creating project in Notion with properties:', JSON.stringify(projectProps, null, 2));

    const response = await notion.pages.create({
      parent: { database_id: databaseConfigs.projects.id },
      properties: projectProps
    });

    console.log('Project created successfully:', response.id);

    // Clear projects cache to force refresh
    if (clearCache) {
      clearCache('projects');
    }

    return {
      success: true,
      id: response.id,
      url: response.url,
      message: 'Project created successfully'
    };

  } catch (error) {
    console.error('Error creating project:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to create project'
    };
  }
}

/**
 * Create a new organization in Notion
 * @param {Object} orgData - Organization data
 * @param {Object} options - Creation options
 * @returns {Promise<Object>} Creation result
 */
export async function createOrganization(orgData, options = {}) {
  const { notion, databaseConfigs, clearCache } = options;

  if (!notion) {
    throw new Error('Notion client not initialized');
  }

  if (!databaseConfigs.organizations?.id) {
    throw new Error('Organizations database ID not configured');
  }

  const orgProps = {
    Name: {
      title: [
        {
          text: {
            content: orgData.name || 'New Organization'
          }
        }
      ]
    }
  };

  // Add optional properties if provided
  if (orgData.type) {
    orgProps.Type = {
      select: {
        name: orgData.type
      }
    };
  }

  if (orgData.location) {
    orgProps.Location = {
      rich_text: [
        {
          text: {
            content: orgData.location
          }
        }
      ]
    };
  }

  if (orgData.website) {
    orgProps.Website = {
      url: orgData.website
    };
  }

  if (orgData.description) {
    orgProps.Description = {
      rich_text: [
        {
          text: {
            content: orgData.description
          }
        }
      ]
    };
  }

  if (orgData.status) {
    orgProps.Status = {
      select: {
        name: orgData.status
      }
    };
  }

  try {
    console.log('Creating organization in Notion with properties:', JSON.stringify(orgProps, null, 2));

    const response = await notion.pages.create({
      parent: { database_id: databaseConfigs.organizations.id },
      properties: orgProps
    });

    console.log('Organization created successfully:', response.id);

    // Clear organizations cache to force refresh
    if (clearCache) {
      clearCache('organizations');
    }

    return {
      success: true,
      id: response.id,
      url: response.url,
      message: 'Organization created successfully'
    };

  } catch (error) {
    console.error('Error creating organization:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to create organization'
    };
  }
}

/**
 * Create the Goods project specifically
 * @param {Object} options - Creation options
 * @returns {Promise<Object>} Creation result
 */
export async function createGoodsProject(options = {}) {
  console.log('Creating the Goods project...');

  const goodsProject = {
    name: 'Goods.',
    status: 'Active 🔥',
    aiSummary: 'Community-led initiative delivering essential goods through local production, addressing cost-of-living gaps. Aims to manufacture 300 beds and 40 washing machines, supporting over 800 people, while promoting self-determination and sustainability among First Nations communities.',
    location: 'Remote Communities, NT',
    coreValues: 'Decentralised Power',
    actualIncoming: 150000,
    potentialIncoming: 400000,
    nextMilestoneDate: '2025-09-02',
    theme: ['Health and wellbeing', 'Indigenous'],
    tags: ['Health', 'Product', 'Community']
  };

  try {
    const result = await createProject(goodsProject, options);
    return {
      success: true,
      project: result,
      message: 'Goods project created successfully'
    };
  } catch (error) {
    console.error('Error creating Goods project:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to create Goods project'
    };
  }
}

/**
 * Test method to create a demo project and organization
 * @param {Object} options - Creation options
 * @returns {Promise<Object>} Creation result
 */
export async function createTestEntities(options = {}) {
  console.log('Creating test project and organization...');

  const testProject = {
    name: 'Claude Code Test Project',
    status: 'Active 🔥',
    aiSummary: 'A test project created by Claude Code to demonstrate the Notion API integration and project creation functionality.',
    location: 'Darwin, NT',
    coreValues: 'Decentralised Power',
    actualIncoming: 25000,
    potentialIncoming: 75000,
    nextMilestoneDate: '2025-10-01',
    theme: ['Technology', 'Innovation'],
    tags: ['Test', 'Demo', 'API']
  };

  const testOrg = {
    name: 'Claude Code Demo Organization',
    type: 'Technology Partner',
    location: 'Remote/Digital',
    website: 'https://claude.ai/code',
    description: 'A demonstration organization created to test the Notion API integration capabilities.',
    status: 'Active'
  };

  try {
    const projectResult = await createProject(testProject, options);
    const orgResult = await createOrganization(testOrg, options);

    return {
      success: true,
      project: projectResult,
      organization: orgResult,
      message: 'Test entities created successfully'
    };
  } catch (error) {
    console.error('Error creating test entities:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to create test entities'
    };
  }
}

export default {
  createProject,
  createOrganization,
  createGoodsProject,
  createTestEntities,
};

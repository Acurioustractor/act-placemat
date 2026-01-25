/**
 * Notion Database Schema Module
 * Defines database schemas for all Notion database types
 */

/**
 * Partners database schema
 */
export function getPartnersSchema() {
  return {
    properties: {
      Name: { type: 'title' },
      Type: {
        type: 'select',
        options: ['Community', 'Corporate', 'Government', 'Academic', 'NGO'],
      },
      Category: {
        type: 'select',
        options: [
          'Indigenous-led',
          'Regional',
          'Metropolitan',
          'National',
          'International',
        ],
      },
      Description: { type: 'rich_text' },
      'Contribution Type': { type: 'rich_text' },
      'Relationship Strength': {
        type: 'select',
        options: ['Strategic', 'Operational', 'Advisory', 'Informal'],
      },
      'Collaboration Focus': { type: 'multi_select' },
      'Impact Story': { type: 'rich_text' },
      Featured: { type: 'checkbox' },
      'Logo URL': { type: 'url' },
      Location: { type: 'rich_text' },
      'Established Date': { type: 'date' },
    },
    aggregations: ['count', 'group_by_type', 'group_by_category'],
    relationships: ['projects', 'activities', 'artifacts'],
  };
}

/**
 * Projects database schema
 */
export function getProjectsSchema() {
  return {
    properties: {
      Name: { type: 'title' },
      Status: {
        type: 'select',
        options: [
          'Active 🔥',
          'Preparation 📋',
          'On Hold',
          'Completed ✅',
          'Archived',
        ],
      },
      Description: { type: 'rich_text' },
      Area: {
        type: 'select',
        options: [
          'Technology',
          'Justice Reform',
          'Indigenous Rights',
          'Environment',
          'Education',
          'Health',
          'Economic Development',
          'Community Development',
        ],
      },
      Lead: { type: 'rich_text' },
      'AI Summary': { type: 'rich_text' },
      'Western Name Location': { type: 'rich_text' },
      'Core Values': {
        type: 'select',
        options: [
          'Decentralised Power',
          'Community Ownership',
          'Transparency',
          'Sustainability',
          'Innovation',
        ],
      },
      Funding: {
        type: 'select',
        options: ['Funded', 'Seeking', 'Self-funded', 'Grant'],
      },
      'Actual Incoming': { type: 'number' },
      'Potential Incoming': { type: 'number' },
      'Next Milestone Date': { type: 'date' },
      'Start Date': { type: 'date' },
      Theme: { type: 'multi_select' },
      Tags: { type: 'multi_select' },
      'Relationship Pillars': { type: 'multi_select' },
      'Project Lead': { type: 'relation' },
      'Related Organizations': { type: 'relation' },
      'Related People': { type: 'relation' },
    },
    aggregations: ['count', 'group_by_status', 'group_by_area', 'sum_budget'],
    relationships: ['partners', 'organizations', 'people', 'artifacts'],
  };
}

/**
 * Opportunities database schema
 */
export function getOpportunitiesSchema() {
  return {
    properties: {
      Name: { type: 'title' },
      Status: {
        type: 'select',
        options: ['Active', 'In Negotiation', 'Won', 'Lost'],
      },
      'Opportunity Type': {
        type: 'select',
        options: ['Grant', 'Partnership', 'Investment', 'Contract', 'Other'],
      },
      Description: { type: 'rich_text' },
      Value: { type: 'number' },
      Probability: { type: 'number' },
      'Due Date': { type: 'date' },
      'Contact Person': { type: 'rich_text' },
      Organization: { type: 'relation' },
      'Related Projects': { type: 'relation' },
      Notes: { type: 'rich_text' },
    },
    aggregations: ['count', 'group_by_status', 'sum_budget', 'avg_probability'],
    relationships: ['organizations', 'projects'],
  };
}

/**
 * Organizations database schema
 */
export function getOrganizationsSchema() {
  return {
    properties: {
      Name: { type: 'title' },
      Type: {
        type: 'select',
        options: [
          'Community',
          'Corporate',
          'Government',
          'Academic',
          'NGO',
          'Social Enterprise',
        ],
      },
      Location: { type: 'rich_text' },
      Website: { type: 'url' },
      Description: { type: 'rich_text' },
      Status: {
        type: 'select',
        options: ['Active', 'Inactive', 'Prospect', 'Archived'],
      },
      'Contact Email': { type: 'email' },
      'Phone Number': { type: 'phone_number' },
      'Related Projects': { type: 'relation' },
      'Related People': { type: 'relation' },
      'Indigenous Ownership': { type: 'checkbox' },
      'Community Owned': { type: 'checkbox' },
    },
    aggregations: ['count', 'group_by_type', 'group_by_status'],
    relationships: ['projects', 'people', 'partners'],
  };
}

/**
 * Activities database schema
 */
export function getActivitiesSchema() {
  return {
    properties: {
      Name: { type: 'title' },
      Date: { type: 'date' },
      Type: {
        type: 'select',
        options: [
          'Meeting',
          'Workshop',
          'Event',
          'Milestone',
          'Communication',
          'Decision',
        ],
      },
      'Related Project': { type: 'relation' },
      'Related Organization': { type: 'relation' },
      'Related People': { type: 'relation' },
      Location: { type: 'rich_text' },
      Notes: { type: 'rich_text' },
      Outcome: { type: 'rich_text' },
      Status: {
        type: 'select',
        options: ['Planned', 'Completed', 'Cancelled'],
      },
    },
    aggregations: ['count', 'group_by_type'],
    relationships: ['projects', 'organizations', 'people'],
  };
}

/**
 * People database schema
 */
export function getPeopleSchema() {
  return {
    properties: {
      Name: { type: 'title' },
      Role: { type: 'rich_text' },
      Email: { type: 'email' },
      Phone: { type: 'phone_number' },
      Organization: { type: 'relation' },
      'Related Projects': { type: 'relation' },
      'Relationship Start Date': { type: 'date' },
      Notes: { type: 'rich_text' },
      Tags: { type: 'multi_select' },
      'Community Role': {
        type: 'select',
        options: [
          'Community Member',
          'Community Leader',
          'Elder',
          'Youth',
          'Woman',
          'Man',
          'Non-binary',
        ],
      },
    },
    aggregations: ['count', 'group_by_community_role'],
    relationships: ['projects', 'organizations', 'partners'],
  };
}

/**
 * Artifacts database schema
 */
export function getArtifactsSchema() {
  return {
    properties: {
      Name: { type: 'title' },
      Type: {
        type: 'select',
        options: [
          'Document',
          'Video',
          'Audio',
          'Image',
          'Presentation',
          'Spreadsheet',
          'Other',
        ],
      },
      Status: {
        type: 'select',
        options: ['Draft', 'In Review', 'Published', 'Archived'],
      },
      'File Size': { type: 'number' },
      'Created By': { type: 'rich_text' },
      'Created Date': { type: 'date' },
      Tags: { type: 'multi_select' },
      'Related Projects': { type: 'relation' },
    },
    aggregations: ['count', 'group_by_type', 'group_by_status'],
    relationships: ['projects', 'people', 'actions'],
  };
}

/**
 * Actions database schema
 */
export function getActionsSchema() {
  return {
    properties: {
      Name: { type: 'title' },
      Description: { type: 'rich_text' },
      Status: {
        type: 'select',
        options: ['Planning', 'In Progress', 'Done', 'Blocked', 'Cancelled'],
      },
      Priority: { type: 'select', options: ['Critical', 'High', 'Medium', 'Low'] },
      Category: {
        type: 'select',
        options: [
          'Community Development',
          'Partnership',
          'Program Development',
          'Funding',
          'Community Events',
        ],
      },
      'Assigned To': { type: 'rich_text' },
      'Due Date': { type: 'date' },
      'Start Date': { type: 'date' },
      'Completed Date': { type: 'date' },
      Tags: { type: 'multi_select' },
      'Related Projects': { type: 'relation' },
      'Related People': { type: 'relation' },
      Impact: { type: 'select', options: ['Very High', 'High', 'Medium', 'Low'] },
      Effort: { type: 'select', options: ['High', 'Medium', 'Low'] },
      Outcome: { type: 'rich_text' },
      Lessons: { type: 'rich_text' },
    },
    aggregations: [
      'count',
      'group_by_status',
      'group_by_priority',
      'group_by_category',
    ],
    relationships: ['projects', 'people', 'artifacts'],
  };
}

/**
 * Places database schema
 */
export function getPlacesSchema() {
  return {
    properties: {
      Place: { type: 'title' },
      'Western Name': { type: 'rich_text' },
      State: {
        type: 'select',
        options: ['ACT', 'SA', 'WA', 'Vic', 'Tas', 'NT', 'NSW', 'Qld'],
      },
      Map: { type: 'rich_text' },
      Protocols: { type: 'rich_text' },
      Organisations: { type: 'relation' },
      People: { type: 'relation' },
      Projects: { type: 'relation' },
    },
    aggregations: ['count', 'group_by_state'],
    relationships: ['projects', 'organisations', 'people'],
  };
}

/**
 * Get all schema definitions
 */
export function getAllSchemas() {
  return {
    partners: getPartnersSchema(),
    projects: getProjectsSchema(),
    opportunities: getOpportunitiesSchema(),
    organizations: getOrganizationsSchema(),
    activities: getActivitiesSchema(),
    people: getPeopleSchema(),
    artifacts: getArtifactsSchema(),
    actions: getActionsSchema(),
    places: getPlacesSchema(),
  };
}

export default {
  getPartnersSchema,
  getProjectsSchema,
  getOpportunitiesSchema,
  getOrganizationsSchema,
  getActivitiesSchema,
  getPeopleSchema,
  getArtifactsSchema,
  getActionsSchema,
  getPlacesSchema,
  getAllSchemas,
};

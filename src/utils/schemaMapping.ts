// Schema mapping utilities to convert between frontend enums and actual database values
import { DATABASE_SCHEMAS } from '../constants/databaseSchema';

/**
 * Maps frontend project status enum values to actual Notion database values.
 * Translates application status codes to the emoji-prefixed values stored in Notion.
 *
 * @param {string} frontendStatus - The frontend status value to map
 * @returns {string} The corresponding Notion database status value
 * @example
 * const notionStatus = mapProjectStatus('active'); // Returns 'Active 🔥'
 */
export const mapProjectStatus = (frontendStatus: string): string => {
  // Handle both old enum values and new database values
  const statusMap: Record<string, string> = {
    'planning': 'Ideation 🌀',
    'active': 'Active 🔥',
    'on-hold': 'Sunsetting 🌅',
    'completed': 'Transferred ✅',
    'cancelled': 'Sunsetting 🌅'
  };

  return statusMap[frontendStatus] || frontendStatus;
};

/**
 * Maps frontend opportunity stage enum values to actual Notion database values.
 * Translates application stage codes to the values stored in Notion.
 *
 * @param {string} frontendStage - The frontend stage value to map
 * @returns {string} The corresponding Notion database stage value
 * @example
 * const notionStage = mapOpportunityStage('applying'); // Returns 'Applied'
 */
export const mapOpportunityStage = (frontendStage: string): string => {
  const stageMap: Record<string, string> = {
    'identified': 'Discovery',
    'researching': 'Discovery',
    'applying': 'Applied',
    'submitted': 'Applied',
    'awarded': 'Closed Won',
    'declined': 'Closed Lost'
  };

  return stageMap[frontendStage] || frontendStage;
};

/**
 * Maps frontend organization relationship status to actual Notion database values.
 * Translates application status codes to the values stored in Notion.
 *
 * @param {string} frontendStatus - The frontend status value to map
 * @returns {string} The corresponding Notion database status value
 * @example
 * const notionStatus = mapOrganizationStatus('partner'); // Returns 'Won'
 */
export const mapOrganizationStatus = (frontendStatus: string): string => {
  const statusMap: Record<string, string> = {
    'prospect': 'Research',
    'contacted': 'Contacted',
    'partner': 'Won',
    'inactive': 'Lost'
  };

  return statusMap[frontendStatus] || frontendStatus;
};

/**
 * Maps frontend project area to actual Notion database Theme values.
 * Translates application area codes to the Theme property values in Notion.
 *
 * @param {string} frontendArea - The frontend area value to map
 * @returns {string} The corresponding Notion database Theme value
 * @example
 * const notionArea = mapProjectArea('economic-freedom'); // Returns 'Economic Freedom'
 */
export const mapProjectArea = (frontendArea: string): string => {
  // The area mapping should already be correct, but this ensures consistency
  const areaMap: Record<string, string> = {
    'economic-freedom': 'Economic Freedom',
    'storytelling': 'Storytelling', 
    'operations': 'Operations',
    'youth-justice': 'Youth Justice',
    'health-wellbeing': 'Health and wellbeing',
    'indigenous': 'Indigenous',
    'global-community': 'Global community'
  };

  return areaMap[frontendArea] || frontendArea;
};

/**
 * Retrieves all property names from a Notion database schema.
 * Returns the list of field names available in the specified database.
 *
 * @param {keyof typeof DATABASE_SCHEMAS} database - The database type to get properties for
 * @returns {string[]} Array of property names in the database
 * @example
 * const properties = getActualPropertyNames('projects');
 * console.log('Available properties:', properties);
 */
export const getActualPropertyNames = (database: keyof typeof DATABASE_SCHEMAS): string[] => {
  return Object.keys(DATABASE_SCHEMAS[database].properties);
};

/**
 * Retrieves the available select options for a specific property in a Notion database.
 * Returns the valid values for select or multi-select properties.
 *
 * @param {keyof typeof DATABASE_SCHEMAS} database - The database type
 * @param {string} property - The property name to get options for
 * @returns {string[]} Array of valid select options, or empty array if not a select property
 * @example
 * const statuses = getSelectOptions('projects', 'Status');
 * console.log('Available statuses:', statuses);
 */
export const getSelectOptions = (database: keyof typeof DATABASE_SCHEMAS, property: string): string[] => {
  const properties = DATABASE_SCHEMAS[database].properties as Record<string, { type?: string; options?: string[] }>;
  const prop = properties[property];
  if (prop?.type === 'select' && prop.options) {
    return prop.options;
  }
  if (prop?.type === 'multi_select' && prop.options) {
    return prop.options;
  }
  return [];
};

/**
 * Checks if a specific property exists in a Notion database schema.
 * Useful for validating property names before making queries.
 *
 * @param {keyof typeof DATABASE_SCHEMAS} database - The database type to check
 * @param {string} property - The property name to check
 * @returns {boolean} True if the property exists, false otherwise
 * @example
 * if (propertyExists('projects', 'Status')) {
 *   console.log('Status property exists');
 * }
 */
export const propertyExists = (database: keyof typeof DATABASE_SCHEMAS, property: string): boolean => {
  return property in DATABASE_SCHEMAS[database].properties;
};

/**
 * Retrieves the data type of a specific property in a Notion database schema.
 * Returns the property type (e.g., 'select', 'multi_select', 'date', 'number', etc.).
 *
 * @param {keyof typeof DATABASE_SCHEMAS} database - The database type
 * @param {string} property - The property name to get the type for
 * @returns {string | null} The property type, or null if property doesn't exist
 * @example
 * const type = getPropertyType('projects', 'Status');
 * console.log('Status is a', type, 'property'); // 'Status is a select property'
 */
export const getPropertyType = (database: keyof typeof DATABASE_SCHEMAS, property: string): string | null => {
  const properties = DATABASE_SCHEMAS[database].properties as Record<string, { type?: string }>;
  const prop = properties[property];
  return prop?.type || null;
};
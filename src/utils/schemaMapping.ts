// Schema mapping utilities to convert between frontend enums and actual database values
import { DATABASE_SCHEMAS } from '../constants/databaseSchema';

/**
 * Maps frontend project status enum values to actual database values
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
 * Maps frontend opportunity stage enum values to actual database values
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
 * Maps frontend organization relationship status to actual database values
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
 * Maps frontend project area to actual database Theme values
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
 * Get actual property names for a database
 */
export const getActualPropertyNames = (database: keyof typeof DATABASE_SCHEMAS): string[] => {
  return Object.keys(DATABASE_SCHEMAS[database].properties);
};

/**
 * Get select options for a property in a database
 */
export const getSelectOptions = (database: keyof typeof DATABASE_SCHEMAS, property: string): string[] => {
  const prop = DATABASE_SCHEMAS[database].properties[property];
  if (prop?.type === 'select' && prop.options) {
    return prop.options;
  }
  if (prop?.type === 'multi_select' && prop.options) {
    return prop.options;
  }
  return [];
};

/**
 * Check if a property exists in the actual database schema
 */
export const propertyExists = (database: keyof typeof DATABASE_SCHEMAS, property: string): boolean => {
  return property in DATABASE_SCHEMAS[database].properties;
};

/**
 * Get the actual property type from the database schema
 */
export const getPropertyType = (database: keyof typeof DATABASE_SCHEMAS, property: string): string | null => {
  const prop = DATABASE_SCHEMAS[database].properties[property];
  return prop?.type || null;
};
// Application constants for the ACT Placemat client

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Database IDs - These come from the backend config endpoint
export const DATABASE_IDS = {
  PROJECTS: 'projects', // Will be resolved from backend config
  OPPORTUNITIES: 'opportunities',
  ORGANIZATIONS: 'organizations', 
  PEOPLE: 'people',
  ARTIFACTS: 'artifacts'
};

// Error Messages
export const ERROR_MESSAGES = {
  API_ERROR: 'An error occurred while communicating with the server',
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  AUTHENTICATION_ERROR: 'Authentication failed. Please log in again.',
  NOT_FOUND: 'The requested resource was not found',
  SERVER_ERROR: 'Internal server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again',
  TIMEOUT_ERROR: 'Request timed out. Please try again.'
};

// Cache Configuration
export const CACHE_CONFIG = {
  STALE_TIME: 30 * 60 * 1000, // 30 minutes - good balance
  CACHE_TIME: 2 * 60 * 60 * 1000, // 2 hours retention
  RETRY_ATTEMPTS: 1, // Single retry only
  RETRY_DELAY: 500 // Faster retry
};

// Application Settings
export const APP_CONFIG = {
  PAGINATION_SIZE: 20,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 5000,
  AUTO_SAVE_DELAY: 2000
};

// Theme Configuration
export const THEME_CONFIG = {
  COLORS: {
    primary: '#3b82f6',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4'
  },
  BREAKPOINTS: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
};

// Data Validation
export const VALIDATION_RULES = {
  PROJECT_NAME_MIN_LENGTH: 3,
  PROJECT_NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s-()]+$/,
  URL_REGEX: /^https?:\/\/.+/
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  API: 'yyyy-MM-dd',
  DATETIME: 'MMM dd, yyyy h:mm a',
  TIME: 'h:mm a'
};

// Status Options - Based on actual Notion database values
export const STATUS_OPTIONS = {
  PROJECT: [
    { value: 'Active 🔥', label: 'Active 🔥' },
    { value: 'Ideation 🌀', label: 'Ideation 🌀' },
    { value: 'Sunsetting 🌅', label: 'Sunsetting 🌅' },
    { value: 'Transferred ✅', label: 'Transferred ✅' }
  ],
  OPPORTUNITY: [
    { value: 'Discovery', label: 'Discovery' },
    { value: 'Applied', label: 'Applied' },
    { value: 'Negotiation', label: 'Negotiation' },
    { value: 'Closed Won', label: 'Closed Won' },
    { value: 'Closed Lost', label: 'Closed Lost' }
  ],
  ORGANIZATION: [
    { value: 'Contacted', label: 'Contacted' },
    { value: 'Research', label: 'Research' },
    { value: 'Pitched', label: 'Pitched' },
    { value: 'Diligence', label: 'Diligence' },
    { value: 'Won', label: 'Won' },
    { value: 'Lost', label: 'Lost' }
  ]
};

// Area Options - Based on actual Notion database Theme values
export const AREA_OPTIONS = [
  { value: 'Art', label: 'Art', icon: '🎨', color: '#ec4899' },
  { value: 'Economic Freedom', label: 'Economic Freedom', icon: '💰', color: '#10b981' },
  { value: 'Global community', label: 'Global community', icon: '🌍', color: '#ef4444' },
  { value: 'Health and wellbeing', label: 'Health and wellbeing', icon: '🏥', color: '#06b6d4' },
  { value: 'Indigenous', label: 'Indigenous', icon: '🪃', color: '#f59e0b' },
  { value: 'Operations', label: 'Operations', icon: '🔧', color: '#64748b' },
  { value: 'Storytelling', label: 'Storytelling', icon: '📖', color: '#3b82f6' },
  { value: 'Youth Justice', label: 'Youth Justice', icon: '⚖️', color: '#8b5cf6' }
];

// Project Areas (for compatibility)
export const PROJECT_AREAS = AREA_OPTIONS;

// Chart Colors
// Import design system colors for elegant, community-focused visualizations
import { DATA_COLORS } from './designSystem';

export const CHART_COLORS = {
  // Community-focused color palette
  primary: ['#0f766e', '#14b8a6', '#2dd4bf'],
  success: ['#166534', '#16a34a', '#22c55e'],
  warning: ['#a16207', '#d97706', '#f59e0b'],
  error: ['#b91c1c', '#dc2626', '#ef4444'],
  info: ['#0e7490', '#0891b2', '#06b6d4'],
  neutral: ['#374151', '#4b5563', '#6b7280'],
  
  // Sophisticated categorical palette for data visualization
  rainbow: DATA_COLORS.categorical,
  
  // Project area specific colors
  projectAreas: DATA_COLORS.projectAreas,
  
  // Relationship and impact colors
  relationships: DATA_COLORS.relationships,
  impact: DATA_COLORS.impact,
  pipeline: DATA_COLORS.pipeline
};

// ACT Values and Profit Sharing Info
export const ACT_VALUES = [
  'Collaboration',
  'Innovation',
  'Impact',
  'Transparency',
  'Community'
];

export const ACT_PROFIT_SHARING = {
  enabled: true,
  percentage: 10,
  description: 'ACT shares 10% of profits with community partners and contributors'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'act_placemat_user_preferences',
  THEME: 'act_placemat_theme',
  FILTERS: 'act_placemat_filters',
  LAST_SYNC: 'act_placemat_last_sync'
};

// Query Keys for React Query
export const QUERY_KEYS = {
  PROJECTS: ['projects'],
  PROJECT: (id: string) => ['project', id],
  OPPORTUNITIES: ['opportunities'],
  OPPORTUNITY: (id: string) => ['opportunity', id],
  ORGANIZATIONS: ['organizations'],
  ORGANIZATION: (id: string) => ['organization', id],
  PEOPLE: ['people'],
  PERSON: (id: string) => ['person', id],
  ARTIFACTS: ['artifacts'],
  ARTIFACT: (id: string) => ['artifact', id],
  CONFIG: ['config'],
  HEALTH: ['health']
};

// Application Routes
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  OPPORTUNITIES: '/opportunities',
  ARTIFACTS: '/artifacts',
  NETWORK: '/network',
  ANALYTICS: '/analytics'
};

// API Endpoints  
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  CONFIG: '/api/config',
  NOTION_QUERY: '/api/notion/query',
  ARTIFACTS: '/api/artifacts'
};

// Feature Flags
export const FEATURE_FLAGS = {
  USE_MOCK_DATA_ON_ERROR: true,
  ENABLE_CACHING: true,
  ENABLE_REAL_TIME_UPDATES: true
};

// Opportunity Stages - Based on actual Notion database values
export const OPPORTUNITY_STAGES = [
  { value: 'Discovery', label: 'Discovery', icon: '🔍', color: '#6b7280' },
  { value: 'Applied', label: 'Applied', icon: '📄', color: '#3b82f6' },
  { value: 'Negotiation', label: 'Negotiation', icon: '🤝', color: '#f59e0b' },
  { value: 'Closed Won', label: 'Closed Won', icon: '✅', color: '#10b981' },
  { value: 'Closed Lost', label: 'Closed Lost', icon: '❌', color: '#ef4444' }
];

// Probability Options - Based on actual Notion database values
export const PROBABILITY_OPTIONS = [
  { value: '25%', label: '25%', color: '#ef4444' },
  { value: '50%', label: '50%', color: '#f59e0b' },
  { value: '75%', label: '75%', color: '#10b981' },
  { value: '90%', label: '90%', color: '#10b981' }
];

// Location Options - Based on ACTUAL database schema
export const LOCATION_OPTIONS = [
  { value: 'Sunshine Coast', label: 'Sunshine Coast' },
  { value: 'Tennant Creek', label: 'Tennant Creek' },
  { value: 'Mount Isa', label: 'Mount Isa' },
  { value: 'Canberra', label: 'Canberra' },
  { value: 'Sydney', label: 'Sydney' },
  { value: 'Spain', label: 'Spain' },
  { value: 'Everywhere', label: 'Everywhere' },
  { value: 'Brisbane', label: 'Brisbane' },
  { value: 'Stradbroke Island', label: 'Stradbroke Island' },
  { value: 'Maningrida', label: 'Maningrida' },
  { value: 'Alice Springs', label: 'Alice Springs' },
  { value: 'Palm Island', label: 'Palm Island' },
  { value: 'Townsville', label: 'Townsville' },
  { value: 'Toowoomba', label: 'Toowoomba' }
];

// State Options - Based on ACTUAL database schema
export const STATE_OPTIONS = [
  { value: 'Queensland', label: 'Queensland' },
  { value: 'Northern Territory', label: 'Northern Territory' },
  { value: 'Global', label: 'Global' },
  { value: 'National', label: 'National' },
  { value: 'ACT', label: 'ACT' },
  { value: 'NSW', label: 'NSW' }
];

// Project Sort Options
export const PROJECT_SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)', field: 'name', direction: 'asc' },
  { value: 'name-desc', label: 'Name (Z-A)', field: 'name', direction: 'desc' },
  { value: 'revenue-desc', label: 'Revenue (High to Low)', field: 'revenueActual', direction: 'desc' },
  { value: 'revenue-asc', label: 'Revenue (Low to High)', field: 'revenueActual', direction: 'asc' },
  { value: 'modified-desc', label: 'Recently Modified', field: 'lastModified', direction: 'desc' }
];
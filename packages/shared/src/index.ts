// Shared configurations and constants for ACT Placemat

export const API_ENDPOINTS = {
  USERS: '/api/users',
  PROJECTS: '/api/projects',
  STORIES: '/api/stories',
  HEALTH: '/api/health'
} as const;

export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const AUSTRALIAN_STATES = [
  'NSW',
  'VIC',
  'QLD',
  'WA',
  'SA',
  'TAS',
  'ACT',
  'NT'
] as const;

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  maxLimit: 100
} as const;

export const CACHE_KEYS = {
  USERS: 'users',
  PROJECTS: 'projects',
  STORIES: 'stories'
} as const;
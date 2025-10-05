/**
 * GraphQL Playground Configuration
 * Enhanced documentation and interactive exploration for the ACT ecosystem API
 */

import { generateVersionDocumentation } from '../versioning/versionManager.js';

// Default playground tabs with examples
export const defaultTabs = [
  {
    name: 'Welcome to ACT Ecosystem API',
    query: `# 🌏 Welcome to the ACT Ecosystem GraphQL API
# 
# The Australian Community Technology (ACT) ecosystem provides a comprehensive
# platform for connecting communities, projects, and opportunities across Australia
# with a strong focus on cultural safety and Indigenous data sovereignty.
#
# 🚀 Quick Start Examples:

# 1. Get system health and supported features
query SystemOverview {
  systemHealth {
    status
    timestamp
    services {
      postgresql { status connected }
      redis { status connected }
      neo4j { status connected }
    }
    performance {
      responseTime
      memory { used total }
    }
  }
  
  systemConfig {
    version
    environment
    features {
      postgresql redis neo4j
      culturalSafety
      subscriptions
    }
  }
}

# 2. Search for culturally safe projects
query CulturallySafeProjects {
  projects(culturalSafety: 90, limit: 5) {
    id title description
    culturalSafetyScore
    location
    status
    createdBy {
      name username role
    }
  }
}`,
    variables: '{}',
    headers: JSON.stringify(
      {
        'API-Version': 'v1',
        'Content-Type': 'application/json',
      },
      null,
      2
    ),
  },

  {
    name: 'User Management',
    query: `# 👥 User Management Examples
#
# These examples demonstrate user authentication, profiles, and collaboration features
# with integrated cultural safety and privacy controls.

# Get current user profile (requires authentication)
query MyProfile {
  me {
    id name username email role
    profile {
      bio culturalBackground location
      skills interests
      privacySettings {
        profileVisibility
        activityVisibility
        contactPreferences
      }
    }
    recentActivity(limit: 5) {
      action timestamp
    }
    networkMetrics {
      degree totalRelationships
      clusteringCoefficient
      relationshipTypes
    }
  }
}

# Search users with cultural background filtering
query SearchUsers($query: String!, $culturalSafety: Int) {
  searchUsers(query: $query, culturalSafety: $culturalSafety) {
    id name username
    culturalSafetyScore
    profile {
      bio culturalBackground location
      skills
    }
  }
}

# User collaboration network
query UserCollaborations($userId: ID!) {
  userCollaborations(userId: $userId) {
    user { name role }
    relationship {
      type
      properties
    }
    target { ... on User { name role } }
  }
}`,
    variables: JSON.stringify(
      {
        query: 'Indigenous art',
        culturalSafety: 85,
        userId: 'example-user-id',
      },
      null,
      2
    ),
    headers: JSON.stringify(
      {
        Authorization: 'Bearer YOUR_JWT_TOKEN_HERE',
        'API-Version': 'v1',
      },
      null,
      2
    ),
  },

  {
    name: 'Cultural Safety Features',
    query: `# 🛡️ Cultural Safety and Data Sovereignty
#
# The ACT ecosystem prioritizes Indigenous data sovereignty and cultural protocols.
# All content is scored for cultural safety and community consent.

# Get overall cultural safety metrics
query CulturalSafetyOverview {
  culturalSafetyMetrics {
    overallScore
    totalItems
    protocolValidations
    communityConsentChecks
    sacredKnowledgeProtections
    indigenousDataSovereignty
    communityFeedbackScore
  }
}

# Search stories with high cultural safety scores
query CulturallySafeStories {
  stories(culturalSafety: 95, limit: 5) {
    id title
    culturalSafetyScore
    author {
      name
      profile { culturalBackground }
    }
    consent {
      hasConsent
      communityConsent
      consentType
    }
    themes
    impactMetrics {
      communityBenefit
      culturalSignificance
    }
  }
}

# Search with cultural background context
query CulturalConnections($background: String!) {
  searchUsers(query: $background) {
    name
    profile {
      culturalBackground
      location
    }
  }
  
  projects(culturalSafety: 85) {
    title description
    culturalSafetyScore
    impactMetrics
  }
}`,
    variables: JSON.stringify(
      {
        background: 'Torres Strait Islander',
      },
      null,
      2
    ),
  },

  {
    name: 'Real-time Features',
    query: `# ⚡ Real-time Subscriptions
#
# Subscribe to real-time updates for collaborative features.
# Note: WebSocket connection required for subscriptions.

# Subscribe to user activity updates
subscription UserActivityFeed($userId: ID!) {
  userActivity(userId: $userId) {
    action
    timestamp
    details
  }
}

# Subscribe to project updates
subscription ProjectUpdates {
  projectUpdated {
    id title status
    updatedBy { name }
    changes
    timestamp
  }
}

# Subscribe to system health changes
subscription SystemHealthMonitoring {
  systemHealthUpdated {
    status
    services {
      postgresql { status }
      redis { status }
      neo4j { status }
    }
    timestamp
  }
}

# Subscribe to cultural safety alerts
# (Admin access required)
subscription CulturalSafetyAlerts {
  culturalSafetyAlert {
    type severity
    entityId entityType
    message
    recommendedActions
    timestamp
  }
}`,
    variables: JSON.stringify(
      {
        userId: 'current-user-id',
      },
      null,
      2
    ),
    headers: JSON.stringify(
      {
        Authorization: 'Bearer YOUR_JWT_TOKEN_HERE',
        Connection: 'Upgrade',
        Upgrade: 'websocket',
      },
      null,
      2
    ),
  },

  {
    name: 'System Administration',
    query: `# ⚙️ System Administration
#
# Administrative queries for monitoring and managing the ACT ecosystem.
# Requires system_admin role.

# Comprehensive system overview
query AdminDashboard {
  systemHealth {
    status
    services {
      postgresql { status connected error }
      redis { status connected error }
      neo4j { status connected error }
    }
    performance {
      responseTime
      memory { used total }
      uptime
    }
  }
  
  databaseStats {
    postgresql {
      tables {
        users projects stories events
      }
      status
    }
    redis {
      memory keyspace
      hitRate
      status
    }
    neo4j {
      nodes relationships
      status
    }
  }
  
  cacheStats {
    memory { used peak }
    operations { totalCommands totalConnections }
    hitRate
  }
}

# Clear cache (admin only)
mutation ClearSystemCache($pattern: String) {
  clearCache(pattern: $pattern) {
    success
    message
    clearedCount
  }
}

# Set maintenance mode (admin only)
mutation EnableMaintenanceMode($enabled: Boolean!, $message: String) {
  setMaintenanceMode(enabled: $enabled, message: $message) {
    success
    message
  }
}`,
    variables: JSON.stringify(
      {
        pattern: 'user:*',
        enabled: false,
        message: 'Scheduled maintenance in progress',
      },
      null,
      2
    ),
    headers: JSON.stringify(
      {
        Authorization: 'Bearer ADMIN_JWT_TOKEN_HERE',
        'API-Version': 'v1',
      },
      null,
      2
    ),
  },
];

// Playground settings
export const playgroundSettings = {
  'schema.polling.enable': false,
  'schema.polling.endpointFilter': '*',
  'schema.polling.interval': 5000,
  'request.credentials': 'include',
  'request.globalHeaders': {
    'API-Version': 'v1',
  },
  'editor.theme': 'light',
  'editor.cursorShape': 'line',
  'editor.fontSize': 14,
  'editor.fontFamily': '"Fira Code", "Monaco", "Menlo", monospace',
  'editor.reuseHeaders': true,
  'tracing.hideTracingResponse': false,
  'queryPlan.hideQueryPlanResponse': false,
  'general.betaUpdates': false,
};

// Enhanced playground configuration
export function createPlaygroundConfig(req) {
  const versionDocs = generateVersionDocumentation();
  const apiVersion = req.apiVersion || 'v1';

  return {
    settings: playgroundSettings,
    tabs: defaultTabs.map(tab => ({
      ...tab,
      headers: JSON.stringify(
        {
          ...JSON.parse(tab.headers || '{}'),
          'API-Version': apiVersion,
        },
        null,
        2
      ),
    })),

    // Custom CSS for ACT branding
    workspaceName: `ACT Ecosystem API (${apiVersion})`,

    // Documentation embedded in playground
    introspectionQuery: `
      # ACT Ecosystem GraphQL API Documentation
      #
      # Version: ${versionDocs.currentVersion}
      # Supported Versions: ${versionDocs.supportedVersions.join(', ')}
      #
      # 🌟 Features:
      ${Object.entries(versionDocs.features[apiVersion] || {})
        .map(([feature, enabled]) => `      # - ${feature}: ${enabled ? '✅' : '❌'}`)
        .join('\n')}
      #
      # 📖 Usage:
      # - Set API version via header: API-Version: v1
      # - Or query parameter: ?version=v1
      # - Authentication via Authorization: Bearer <token>
      #
      # 🔒 Cultural Safety:
      # All operations respect Indigenous data sovereignty
      # and community consent protocols.
      
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            ...FullType
          }
          directives {
            name
            description
            locations
            args {
              ...InputValue
            }
          }
        }
      }
      
      fragment FullType on __Type {
        kind
        name
        description
        fields(includeDeprecated: true) {
          name
          description
          args {
            ...InputValue
          }
          type {
            ...TypeRef
          }
          isDeprecated
          deprecationReason
        }
        inputFields {
          ...InputValue
        }
        interfaces {
          ...TypeRef
        }
        enumValues(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
        }
        possibleTypes {
          ...TypeRef
        }
      }
      
      fragment InputValue on __InputValue {
        name
        description
        type { ...TypeRef }
        defaultValue
      }
      
      fragment TypeRef on __Type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
  };
}

// Generate comprehensive API documentation
export function generateAPIDocumentation(req) {
  const versionDocs = generateVersionDocumentation();
  const apiVersion = req.apiVersion || 'v1';

  return {
    title: 'ACT Ecosystem GraphQL API Documentation',
    version: apiVersion,
    description: `
      The Australian Community Technology (ACT) ecosystem provides a comprehensive
      platform for connecting communities, projects, and opportunities across Australia.
      
      Our API prioritises cultural safety, Indigenous data sovereignty, and 
      community-driven collaboration.
    `,

    endpoints: {
      graphql:
        process.env.NODE_ENV === 'production'
          ? 'https://api.act.place/graphql'
          : `http://localhost:${process.env.PORT || 4000}/graphql`,
      playground:
        process.env.NODE_ENV === 'production'
          ? 'https://api.act.place/graphql'
          : `http://localhost:${process.env.PORT || 4000}/graphql`,
      subscriptions:
        process.env.NODE_ENV === 'production'
          ? 'wss://api.act.place/graphql'
          : `ws://localhost:${process.env.PORT || 4000}/graphql`,
    },

    authentication: {
      type: 'JWT Bearer Token',
      header: 'Authorization: Bearer <token>',
      description: 'Obtain token via login mutation or external OAuth provider',
      scopes: [
        'read:public - Access public content',
        'read:community - Access community content with consent',
        'write:own - Create and modify own content',
        'write:community - Contribute to community content',
        'admin:system - System administration (restricted)',
      ],
    },

    versioning: versionDocs,

    culturalSafety: {
      description: 'Cultural safety is central to the ACT ecosystem',
      features: [
        'Automatic cultural safety scoring for all content',
        'Community consent validation',
        'Sacred knowledge protection protocols',
        'Indigenous data sovereignty compliance',
        'Cultural background-aware recommendations',
      ],
      guidelines: [
        'All content must meet minimum cultural safety thresholds',
        'Community consent is required for sensitive content',
        'Respect Indigenous intellectual property rights',
        'Follow Traditional Owner protocols for location-based content',
      ],
    },

    examples: {
      quickStart: defaultTabs[0],
      authentication: {
        title: 'User Authentication',
        mutations: [
          {
            name: 'registerUser',
            description: 'Create new user account with cultural background',
            example: `
              mutation RegisterUser {
                registerUser(input: {
                  email: "user@example.com"
                  password: "securePassword123"
                  name: "Community Member"
                  username: "communitymember"
                  culturalBackground: "Aboriginal Australian"
                }) {
                  success
                  user { id name email role }
                  token
                  message
                }
              }
            `,
          },
          {
            name: 'loginUser',
            description: 'Authenticate existing user',
            example: `
              mutation LoginUser {
                loginUser(
                  email: "user@example.com"
                  password: "securePassword123"
                ) {
                  success
                  user { id name role }
                  token
                  message
                }
              }
            `,
          },
        ],
      },
      queries: defaultTabs.slice(1),
    },

    errorHandling: {
      format: 'Standard GraphQL error format with ACT-specific extensions',
      codes: [
        'AUTHENTICATION_ERROR - Invalid or missing authentication',
        'AUTHORIZATION_ERROR - Insufficient permissions',
        'CULTURAL_SAFETY_ERROR - Content violates cultural safety protocols',
        'VALIDATION_ERROR - Input validation failed',
        'NOT_FOUND - Requested resource not found',
        'RATE_LIMITED - Too many requests',
        'MAINTENANCE_MODE - System in maintenance mode',
      ],
    },

    rateLimit: {
      default: '1000 requests per hour per authenticated user',
      anonymous: '100 requests per hour per IP address',
      admin: 'Unlimited for system administrators',
      headers: [
        'X-RateLimit-Limit - Request limit',
        'X-RateLimit-Remaining - Remaining requests',
        'X-RateLimit-Reset - Reset time (Unix timestamp)',
      ],
    },

    supportingTools: [
      {
        name: 'GraphQL Playground',
        description: 'Interactive API explorer and documentation',
        url: 'Built into the GraphQL endpoint',
      },
      {
        name: 'Apollo Client DevTools',
        description: 'Browser extension for GraphQL debugging',
        url: 'https://github.com/apollographql/apollo-client-devtools',
      },
      {
        name: 'GraphQL Code Generator',
        description: 'Generate TypeScript types from schema',
        url: 'https://graphql-code-generator.com/',
      },
    ],

    communityResources: [
      {
        name: 'ACT Community Guidelines',
        description: 'Community standards and cultural protocols',
        url: 'https://act.place/community-guidelines',
      },
      {
        name: 'Developer Forum',
        description: 'Technical discussions and API support',
        url: 'https://forum.act.place/developers',
      },
      {
        name: 'API Status Page',
        description: 'Real-time system status and maintenance updates',
        url: 'https://status.act.place',
      },
    ],

    lastUpdated: new Date().toISOString(),
  };
}

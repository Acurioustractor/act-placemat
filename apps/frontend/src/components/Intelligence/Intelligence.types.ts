/**
 * Intelligence Types
 *
 * Type definitions for the Intelligence Center component.
 * Defines all data structures used across tabs and data fetching.
 */

/**
 * Tab identifier type for navigation
 */
export type TabId = 'overview' | 'agents' | 'knowledge' | 'relationships' | 'proposals' | 'scouts' | 'strategy';

/**
 * Active agent in the system
 */
export interface Agent {
  id: string;
  name: string;
  domain: string;
  description: string;
  autonomy_level: number;
  enabled: boolean;
  current_task_id: string | null;
  last_heartbeat: string;
}

/**
 * Proposal from an agent requiring human verification
 */
export interface Proposal {
  id: string;
  agent_id: string;
  title: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: string;
  reasoning?: {
    details?: string;
  };
  created_at: string;
}

/**
 * Activity log entry from an agent
 */
export interface Activity {
  id: string;
  timestamp: string;
  agent_id: string;
  action: string;
  success: boolean;
}

/**
 * Task in the queue assigned to an agent
 */
export interface Task {
  id: string;
  title: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  priority: number;
  assigned_agent: string;
  agent_name: string;
  source: string;
  needs_review: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
}

/**
 * Performance metrics for an agent
 */
export interface AgentPerformance {
  count: number;
  success: number;
  failed: number;
}

/**
 * Agent performance by agent ID
 */
export interface AgentPerformanceMap {
  [agentId: string]: AgentPerformance;
}

/**
 * Aggregated activity data
 */
export interface ActivityData {
  count: number;
  byAgent: AgentPerformanceMap;
  activity: Activity[];
}

/**
 * Knowledge statistics
 */
export interface KnowledgeStats {
  knowledgeChunks: number;
  entities: number;
  identifiers: number;
  qaPairs: number;
  stories: number;
  storytellers: number;
  vignettes: number;
}

/**
 * Relationship health summary
 */
export interface RelationshipHealth {
  total: number;
  hot: number;
  warm: number;
  cool: number;
  needsAttention: number;
  overdue: number;
}

/**
 * Entity in the knowledge graph
 */
export interface Entity {
  id: string;
  canonical_name: string;
  entity_type: string;
  source_priority: string[];
  created_at: string;
  identifiers?: EntityIdentifier[];
}

/**
 * Identifier associated with an entity
 */
export interface EntityIdentifier {
  id: string;
  identifier_type: string;
  identifier_value: string;
  source: string;
  confidence: number;
}

/**
 * Knowledge sources breakdown
 */
export interface KnowledgeSources {
  knowledgeBySource: Record<string, number>;
  entitiesByType: Record<string, number>;
  identifiersByType: Record<string, number>;
}

/**
 * Individual relationship with a contact
 */
export interface Relationship {
  id: string;
  contact_id: string;
  contact_name: string;
  temperature: number;
  trend: 'rising' | 'stable' | 'falling' | null;
  last_contact_date: string | null;
  next_action: string | null;
  next_action_date: string | null;
  tags: string[] | null;
}

/**
 * Scout summary overview
 */
export interface ScoutSummary {
  id: string;
  name: string;
  icon: string;
  description: string;
  summary: Record<string, unknown>;
  status: 'healthy' | 'warning' | 'attention';
}

/**
 * BUNYA project health data
 */
export interface BunyaProject {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  healthScore: number;
  status: 'healthy' | 'needs_attention' | 'at_risk' | 'critical';
  risks: string[];
  recommendations: string[];
  metadata: Record<string, unknown>;
  analyzedAt: string;
}

/**
 * BUNYA scout data
 */
export interface BunyaData {
  summary: Record<string, number>;
  projects: BunyaProject[];
}

/**
 * ALTA grant opportunity
 */
export interface AltaGrant {
  id: string;
  name: string;
  provider: string;
  category: string;
  status: string;
  deadline: string;
  daysUntilDeadline: number | null;
  amountMin: number;
  amountMax: number;
  amountDisplay: string;
  matchedProjects: string[];
  relevanceScore: number;
  url: string;
  notes: string;
  isUrgent: boolean;
}

/**
 * ALTA scout data
 */
export interface AltaData {
  summary: Record<string, unknown>;
  grants: AltaGrant[];
}

/**
 * Draft for human verification
 */
export interface Draft {
  subject: string;
  body: string;
  channel: string;
  recipient: string;
}

/**
 * Fix action result
 */
export interface FixAction {
  type: string;
  message?: string;
  contacts?: number;
}

/**
 * Fix result from BUNYA
 */
export interface FixResult {
  projectCode: string;
  actions: FixAction[];
}

/**
 * Autonomy level configuration
 */
export interface AutonomyConfig {
  label: string;
  color: string;
}

/**
 * Temperature color configuration
 */
export interface TemperatureColorConfig {
  bg: string;
  text: string;
  light: string;
}

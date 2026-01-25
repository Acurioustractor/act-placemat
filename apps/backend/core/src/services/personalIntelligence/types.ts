/**
 * Type definitions for Personal Intelligence services
 *
 * Migrated from: act-personal-ai/services/
 * These types support the mode detector, work recommender, orchestrator,
 * and actionable brief services.
 */

// ============================================
// Mode Detection Types
// ============================================

export type WorkModeKey =
  | 'DEEP_WORK'
  | 'CONNECT'
  | 'ADMIN'
  | 'CREATE'
  | 'PLAN'
  | 'REST';

export type EnergyLevel = 'high' | 'medium' | 'low';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface TimeRange {
  start: number;
  end: number;
}

export interface ModeIdealConditions {
  meetingFree: boolean;
  energyLevel: EnergyLevel;
  moonPhases: string[];
  timeRanges: TimeRange[];
  days: string[];
}

export interface WorkMode {
  name: string;
  icon: string;
  description: string;
  idealConditions: ModeIdealConditions;
}

export interface MoonPhase {
  phase: string;
  key: string;
  energy: string;
  dayInCycle: number;
}

export interface ModeContext {
  hour: number;
  day: string;
  moonPhase: MoonPhase;
  calendarDensity: number;
  hasMeetings: boolean;
}

export interface ModeDetectionResult {
  mode: WorkModeKey;
  modeInfo: WorkMode;
  score: number;
  confidence: ConfidenceLevel;
  alternative: {
    mode: WorkModeKey;
    modeInfo: WorkMode;
    score: number;
  };
  context: ModeContext;
  reasoning: string;
}

export interface ModeDetectionOptions {
  energyLevel?: EnergyLevel;
  [key: string]: any;
}

// ============================================
// Work Recommender Types
// ============================================

export interface DayPattern {
  type: string;
  energy: EnergyLevel;
  focus: string[];
  sampleSize?: number;
}

export interface HourPattern {
  hours: number[];
  type: string;
  energy: EnergyLevel;
  period?: string;
}

export interface WorkPatterns {
  day: Record<number, DayPattern>;
  hour: Record<string, HourPattern>;
  taskTypes: Record<string, number>;
  learned: boolean;
  lastAnalyzed?: string;
  sampleSize?: number;
}

export interface TimeBasedRecommendation {
  message: string;
  taskTypes: string[];
  avoid: string[];
}

export interface PredictiveContext {
  dayOfWeek: number;
  dayName: string;
  hour: number;
  dayPattern: DayPattern;
  hourPattern: HourPattern;
  optimalType: string;
  recommendation: TimeBasedRecommendation;
}

export interface FreeBlock {
  start: number;
  end: number;
  duration: number;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  start_time: string;
  end_time: string;
  event_type: string;
  attendees?: Array<{ email?: string; name?: string }>;
  location?: string;
  description?: string;
}

export interface CalendarContext {
  events: CalendarEvent[];
  meetings?: CalendarEvent[];
  meetingCount: number;
  freeBlocks: FreeBlock[];
  nextMeeting: CalendarEvent | null;
}

export interface Issue {
  id: string;
  title: string;
  status: string;
  priority: string;
  labels: string[];
  sprint: string | null;
  assignee: string | null;
  isBlocking: boolean;
  createdAt: string;
  url: string;
}

export interface ScoredTask extends Issue {
  score: number;
  reasons: string[];
  modeAlignment: boolean;
}

export interface StaleContact {
  ghl_contact_id: string;
  last_communication: Date;
  days_since_contact: number;
}

export interface ProjectHealth {
  name: string;
  health: string;
  status: string;
}

export interface WorkRecommendations {
  timestamp: string;
  mode: ModeDetectionResult;
  predictive: PredictiveContext;
  topPriorities: ScoredTask[];
  calendarContext: CalendarContext;
  relationshipCheck: StaleContact[];
  projectHealth: ProjectHealth[];
  suggestion: string;
  patternsLearned: boolean;
}

export interface PatternAnalysisResult {
  patterns: WorkPatterns;
  entriesAnalyzed?: number;
  taskTypes?: Record<string, number>;
  recommendation?: string;
  error?: string;
}

// ============================================
// Orchestrator Types
// ============================================

export type InsightFocus =
  | 'morning-brief'
  | 'evening-capture'
  | 'quick-check'
  | 'meeting-prep';

export interface InsightOptions {
  focus?: InsightFocus;
  query?: string | null;
  includeKnowledge?: boolean;
}

export interface RelationshipAlert {
  name: string;
  email: string;
  company: string | null;
  daysSinceContact: number | null;
  lastContact: string | null;
  lastSubject: string | null;
  lastDirection: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'NORMAL';
  action: string;
  commCount: number;
}

export interface AttendeeContext {
  name: string;
  email: string;
  daysSinceContact: number | null;
  projects: string[];
  recentComms?: Array<{
    type: string;
    subject: string | null;
    date: string;
  }>;
}

export interface EnrichedMeeting {
  title: string;
  startTime: string;
  endTime: string;
  attendees: Array<{ email?: string; name?: string }>;
  location?: string;
  description?: string;
  attendeeContext?: AttendeeContext[];
}

export interface MeetingPrepContext {
  title: string;
  time: string;
  attendees: Array<{ email?: string; name?: string }>;
  context: AttendeeContext[];
}

export interface OrchestratorInsights {
  timestamp: string;
  focus: InsightFocus;
  processingTimeMs: number;

  mode: {
    current: WorkModeKey;
    name: string;
    icon: string;
    description: string;
    confidence: ConfidenceLevel;
    alternative: string;
  };

  predictive: {
    dayName: string;
    hour: number;
    optimalType: string;
    recommendation: string;
    taskTypes: string[];
    avoid: string[];
    learned: boolean;
  } | null;

  energy: {
    phase: string;
    guidance: string;
    dayInCycle: number;
  };

  priorities: Array<{
    title: string;
    reasons: string[];
    modeAlignment: boolean;
    url: string;
  }>;

  calendar: {
    meetingsToday: number;
    nextMeeting: CalendarEvent | null;
    freeBlocks: FreeBlock[];
    upcomingMeetings: EnrichedMeeting[];
  };

  relationships: {
    needingAttention: number;
    alerts: RelationshipAlert[];
  };

  projects: {
    healthy: number;
    needsAttention: number;
    issues: ProjectHealth[];
  };

  suggestion: string;

  knowledge: {
    query: string | null;
    context: string;
    sources: string[];
  } | null;

  morningBrief?: string;
  meetingPrep?: MeetingPrepContext | null;
}

// ============================================
// Actionable Brief Types
// ============================================

export type ActionType = 'email' | 'update' | 'notion' | 'planning';
export type ActionPriority = 'high' | 'medium' | 'low';

export interface ActionLinks {
  email?: string | null;
  phone?: string | null;
  ghl?: string | null;
  opportunity?: string | null;
  contact?: string | null;
  notion?: string | null;
}

export interface ActionContext {
  contact?: string;
  email?: string;
  phone?: string;
  pipeline?: string;
  stage?: string;
  daysSinceActivity?: number;
  tags?: string[];
  opportunity?: string;
  value?: number;
  daysSinceUpdate?: number;
  project?: string;
  status?: string;
  currentHealth?: number;
  moonPhase?: string;
  daysToNewMoon?: number;
  energy?: string;
  [key: string]: any;
}

export interface ActionableAction {
  type: ActionType;
  priority: ActionPriority;
  title: string;
  description: string;
  value?: number;
  links: ActionLinks;
  context: ActionContext;
  recommendation_id?: string;
}

export interface ActionableBriefSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
  totalValue: number;
}

export interface ActionableBriefOutput {
  generated: string;
  summary: ActionableBriefSummary;
  actions: ActionableAction[];
}

// ============================================
// Database Types
// ============================================

export interface DatabaseConfiguration {
  main: boolean;
  ghl: boolean;
}

export interface GHLContact {
  id: string;
  ghl_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  tags: string[] | null;
  last_contact_date: string | null;
  last_activity: string | null;
  projects: string[] | null;
  sync_status: string;
}

export interface ContactCommunication {
  id?: string;
  ghl_contact_id: string;
  occurred_at: string;
  direction: string;
  subject: string | null;
  summary: string | null;
  comm_type?: string;
}

export interface GHLOpportunity {
  id: string;
  ghl_id: string;
  name: string;
  status: string;
  ghl_stage_id: string;
  monetary_value: number | null;
  updated_at: string;
  ghl_contacts?: GHLContact;
}

export interface GHLPipeline {
  id: string;
  name: string;
  stages: Array<{ id: string; name: string }>;
}

// ============================================
// Threshold Learner Types
// ============================================

export type ThresholdType = 'stale_days' | 'attention_days' | 'normal_days' | 'high_value';

export type ContactSegment = 'default' | 'funder' | 'partner' | 'community';

export interface ThresholdPrior {
  value: number;
  strength: number;
}

export interface ThresholdResult {
  value: number;
  confidence: number;
  isLearned: boolean;
  sampleSize: number;
}

export interface BayesianUpdateResult {
  value: number;
  confidence: number;
}

export interface LearnedThreshold {
  threshold_type: ThresholdType;
  segment: ContactSegment;
  value: number;
  confidence: number;
  sample_size: number;
  prior_value: number;
  prior_strength: number;
  last_learned_at: string | null;
  learning_data: Record<string, any>;
}

export interface ThresholdLearningResult {
  updated: Array<{
    type: ThresholdType;
    segment: ContactSegment;
    previousValue?: number;
    newValue: number;
    confidence?: number;
    observations?: number;
    derivedFrom?: string;
  }>;
  unchanged: Array<{
    type: ThresholdType;
    segment: ContactSegment;
    reason: string;
  }>;
  errors: Array<{
    type: ThresholdType;
    segment: ContactSegment;
    error: string;
  }>;
}

export interface ThresholdAccuracyReport {
  generated: string;
  thresholds: Record<ThresholdType, Record<ContactSegment, {
    value: number;
    confidence: number;
    sampleSize: number;
    priorValue: number;
    changeFromPrior: number;
    lastLearned: string | null;
  }>>;
  recommendations: {
    total: number;
    acted: number;
    successful: number;
    actedRate?: number;
    successRate?: number;
  };
}

// ============================================
// Followup Detector Types
// ============================================

export type AlertLevel = 'urgent' | 'attention' | 'normal';

export interface FollowupItem {
  type: 'stale_relationship' | 'stale_opportunity';
  contactId?: string;
  entityId?: string | null;
  contactName: string;
  email?: string;
  segment?: ContactSegment;
  days: number;
  alertLevel: AlertLevel;
  priority: number;
  engagementScore?: number | null;
  projects?: string[];
  tags?: string[];
  reason: string;
  suggestedAction: string;
  // Opportunity-specific fields
  opportunityId?: string;
  ghlId?: string;
  name?: string;
  value?: number;
  stage?: string;
  pipeline?: string;
}

export interface FollowupStats {
  total: number;
  urgent: number;
  attention: number;
  normal: number;
}

export interface FollowupDetectionResult {
  followups: FollowupItem[];
  stats: FollowupStats;
}

export interface FollowupDetectionOptions {
  urgentOnly?: boolean;
  contactId?: string | null;
}

// ============================================
// Relationship Intelligence Types
// ============================================

export type RelationshipStage =
  | 'Strong Partner'
  | 'Active Relationship'
  | 'Developing'
  | 'New Connection'
  | 'Prospect';

export type SignalType = 'engagement' | 'drift' | 'no-response';

export type SignalPriority = 'high' | 'medium' | 'low';

export interface RelationshipSignal {
  type: SignalType;
  message: string;
  priority: SignalPriority;
}

export interface Touchpoint {
  occurred_at: string;
  direction: 'inbound' | 'outbound';
  subject?: string;
  summary?: string;
  comm_type?: string;
}

export interface TouchpointStats {
  total: number;
  inbound: number;
  outbound: number;
  lastContact: string | null;
  firstContact: string | null;
}

export interface ContactProfile {
  email: string;
  name: string;
  tags: string[];
  inGhl: boolean;
  ghlId?: string;
  healthScore: number;
  stage: RelationshipStage;
  signals: RelationshipSignal[];
  touchpoints: TouchpointStats;
  recentSubjects: string[];
}

export interface NextAction {
  priority: number;
  type: 'reach-out' | 'reconnect' | 'respond';
  contact: string;
  reason: string;
  tags: string[];
}

// ============================================
// Communication Planner Types
// ============================================

export type CommunicationChannel =
  | 'directOutreach'
  | 'newsletter'
  | 'social'
  | 'event'
  | 'call';

export type CommunicationPriority = 'high' | 'medium' | 'low';

export interface ChannelInfo {
  label: string;
  icon: string;
}

export interface ContactRecommendation {
  contact: string;
  email: string;
  company?: string;
  daysSince: number | null;
  relationshipScore: number;
  suggestedAction: string;
  channel: CommunicationChannel;
  projects: string[];
}

export interface ProjectRecommendation {
  project: ProjectHealth;
  contacts: ContactRecommendation[];
  channels: Set<CommunicationChannel>;
  priority: CommunicationPriority;
  reasons: string[];
}

export interface CommunicationRecommendations {
  high: ContactRecommendation[];
  medium: ContactRecommendation[];
  low: ContactRecommendation[];
  projectSpecific: Record<string, ProjectRecommendation>;
}

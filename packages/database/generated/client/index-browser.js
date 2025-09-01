
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  avatar: 'avatar',
  bio: 'bio',
  location: 'location',
  website: 'website',
  emailVerified: 'emailVerified',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  skills: 'skills',
  interests: 'interests'
};

exports.Prisma.ProjectScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  content: 'content',
  status: 'status',
  visibility: 'visibility',
  category: 'category',
  tags: 'tags',
  location: 'location',
  region: 'region',
  coordinates: 'coordinates',
  coverImage: 'coverImage',
  images: 'images',
  documents: 'documents',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  startDate: 'startDate',
  endDate: 'endDate'
};

exports.Prisma.ProjectMemberScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  projectId: 'projectId',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StoryScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  excerpt: 'excerpt',
  status: 'status',
  visibility: 'visibility',
  category: 'category',
  tags: 'tags',
  coverImage: 'coverImage',
  images: 'images',
  slug: 'slug',
  metaTitle: 'metaTitle',
  metaDescription: 'metaDescription',
  viewCount: 'viewCount',
  shareCount: 'shareCount',
  authorId: 'authorId',
  projectId: 'projectId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  publishedAt: 'publishedAt'
};

exports.Prisma.CommentScalarFieldEnum = {
  id: 'id',
  content: 'content',
  status: 'status',
  authorId: 'authorId',
  storyId: 'storyId',
  parentId: 'parentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OpportunityScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  content: 'content',
  type: 'type',
  status: 'status',
  category: 'category',
  tags: 'tags',
  skills: 'skills',
  timeCommitment: 'timeCommitment',
  location: 'location',
  remote: 'remote',
  isPaid: 'isPaid',
  compensation: 'compensation',
  deadline: 'deadline',
  startDate: 'startDate',
  duration: 'duration',
  coverImage: 'coverImage',
  images: 'images',
  projectId: 'projectId',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone',
  applicationUrl: 'applicationUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OpportunityApplicationScalarFieldEnum = {
  id: 'id',
  message: 'message',
  resume: 'resume',
  portfolio: 'portfolio',
  status: 'status',
  userId: 'userId',
  opportunityId: 'opportunityId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PageViewScalarFieldEnum = {
  id: 'id',
  path: 'path',
  userAgent: 'userAgent',
  ipAddress: 'ipAddress',
  referer: 'referer',
  sessionId: 'sessionId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.SearchQueryScalarFieldEnum = {
  id: 'id',
  query: 'query',
  results: 'results',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.SettingScalarFieldEnum = {
  id: 'id',
  value: 'value',
  updatedAt: 'updatedAt'
};

exports.Prisma.MediaScalarFieldEnum = {
  id: 'id',
  filename: 'filename',
  originalName: 'originalName',
  mimeType: 'mimeType',
  size: 'size',
  url: 'url',
  alt: 'alt',
  caption: 'caption',
  width: 'width',
  height: 'height',
  duration: 'duration',
  uploadedById: 'uploadedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LifeOSProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  timezone: 'timezone',
  locale: 'locale',
  currency: 'currency',
  themePreference: 'themePreference',
  notificationSettings: 'notificationSettings',
  privacySettings: 'privacySettings',
  extractiveSystemsTargeting: 'extractiveSystemsTargeting',
  communityControlEnabled: 'communityControlEnabled',
  dataResidencyPreference: 'dataResidencyPreference',
  onboardingCompleted: 'onboardingCompleted',
  lastActiveAt: 'lastActiveAt',
  activationDate: 'activationDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HabitScalarFieldEnum = {
  id: 'id',
  profileId: 'profileId',
  name: 'name',
  description: 'description',
  category: 'category',
  frequency: 'frequency',
  targetValue: 'targetValue',
  unit: 'unit',
  color: 'color',
  icon: 'icon',
  reminder: 'reminder',
  isActive: 'isActive',
  currentStreak: 'currentStreak',
  longestStreak: 'longestStreak',
  lastCompletedDate: 'lastCompletedDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HabitCompletionScalarFieldEnum = {
  id: 'id',
  habitId: 'habitId',
  completedAt: 'completedAt',
  value: 'value',
  notes: 'notes',
  satisfaction: 'satisfaction',
  difficulty: 'difficulty'
};

exports.Prisma.GoalScalarFieldEnum = {
  id: 'id',
  profileId: 'profileId',
  title: 'title',
  description: 'description',
  category: 'category',
  targetValue: 'targetValue',
  currentValue: 'currentValue',
  unit: 'unit',
  startDate: 'startDate',
  targetDate: 'targetDate',
  completedAt: 'completedAt',
  status: 'status',
  priority: 'priority',
  progress: 'progress',
  motivation: 'motivation',
  visualisation: 'visualisation',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GoalMilestoneScalarFieldEnum = {
  id: 'id',
  goalId: 'goalId',
  title: 'title',
  description: 'description',
  targetDate: 'targetDate',
  completedAt: 'completedAt',
  targetValue: 'targetValue',
  currentValue: 'currentValue',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GoalUpdateScalarFieldEnum = {
  id: 'id',
  goalId: 'goalId',
  content: 'content',
  value: 'value',
  createdAt: 'createdAt'
};

exports.Prisma.MeditationSessionScalarFieldEnum = {
  id: 'id',
  profileId: 'profileId',
  duration: 'duration',
  technique: 'technique',
  guidedSession: 'guidedSession',
  guideUrl: 'guideUrl',
  rating: 'rating',
  notes: 'notes',
  mood: 'mood',
  location: 'location',
  distractions: 'distractions',
  createdAt: 'createdAt'
};

exports.Prisma.MoodEntryScalarFieldEnum = {
  id: 'id',
  profileId: 'profileId',
  mood: 'mood',
  intensity: 'intensity',
  emotions: 'emotions',
  activities: 'activities',
  location: 'location',
  weather: 'weather',
  notes: 'notes',
  triggers: 'triggers',
  gratitude: 'gratitude',
  recordedAt: 'recordedAt',
  createdAt: 'createdAt'
};

exports.Prisma.JournalScalarFieldEnum = {
  id: 'id',
  profileId: 'profileId',
  title: 'title',
  content: 'content',
  mood: 'mood',
  tags: 'tags',
  isPrivate: 'isPrivate',
  template: 'template',
  prompts: 'prompts',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CalendarEventScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  description: 'description',
  startTime: 'startTime',
  endTime: 'endTime',
  isAllDay: 'isAllDay',
  location: 'location',
  url: 'url',
  category: 'category',
  color: 'color',
  isRecurring: 'isRecurring',
  recurrenceRule: 'recurrenceRule',
  parentEventId: 'parentEventId',
  eventType: 'eventType',
  visibility: 'visibility',
  projectId: 'projectId',
  communityEvent: 'communityEvent',
  reminders: 'reminders',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EventAttendeeScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  userId: 'userId',
  status: 'status',
  response: 'response',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FinancialTransactionScalarFieldEnum = {
  id: 'id',
  profileId: 'profileId',
  amount: 'amount',
  currency: 'currency',
  description: 'description',
  notes: 'notes',
  type: 'type',
  category: 'category',
  subcategory: 'subcategory',
  merchant: 'merchant',
  location: 'location',
  paymentMethod: 'paymentMethod',
  budgetId: 'budgetId',
  tags: 'tags',
  gstAmount: 'gstAmount',
  taxCategory: 'taxCategory',
  transactionDate: 'transactionDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BudgetScalarFieldEnum = {
  id: 'id',
  profileId: 'profileId',
  name: 'name',
  description: 'description',
  totalAmount: 'totalAmount',
  spentAmount: 'spentAmount',
  period: 'period',
  startDate: 'startDate',
  endDate: 'endDate',
  categories: 'categories',
  isActive: 'isActive',
  alertThreshold: 'alertThreshold',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserRole = exports.$Enums.UserRole = {
  MEMBER: 'MEMBER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN'
};

exports.ProjectStatus = exports.$Enums.ProjectStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED',
  ARCHIVED: 'ARCHIVED'
};

exports.Visibility = exports.$Enums.Visibility = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
  COMMUNITY_ONLY: 'COMMUNITY_ONLY'
};

exports.ProjectRole = exports.$Enums.ProjectRole = {
  MEMBER: 'MEMBER',
  CONTRIBUTOR: 'CONTRIBUTOR',
  LEAD: 'LEAD',
  OWNER: 'OWNER'
};

exports.StoryStatus = exports.$Enums.StoryStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED'
};

exports.CommentStatus = exports.$Enums.CommentStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SPAM: 'SPAM'
};

exports.OpportunityType = exports.$Enums.OpportunityType = {
  VOLUNTEER: 'VOLUNTEER',
  JOB: 'JOB',
  COLLABORATION: 'COLLABORATION',
  FUNDING: 'FUNDING',
  MENTORSHIP: 'MENTORSHIP',
  SKILL_SHARE: 'SKILL_SHARE'
};

exports.OpportunityStatus = exports.$Enums.OpportunityStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  FILLED: 'FILLED',
  CANCELLED: 'CANCELLED'
};

exports.ApplicationStatus = exports.$Enums.ApplicationStatus = {
  PENDING: 'PENDING',
  REVIEWING: 'REVIEWING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN'
};

exports.HabitFrequency = exports.$Enums.HabitFrequency = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  CUSTOM: 'CUSTOM'
};

exports.GoalStatus = exports.$Enums.GoalStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.Priority = exports.$Enums.Priority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

exports.MilestoneStatus = exports.$Enums.MilestoneStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.EventType = exports.$Enums.EventType = {
  PERSONAL: 'PERSONAL',
  WORK: 'WORK',
  COMMUNITY: 'COMMUNITY',
  HEALTH: 'HEALTH',
  EDUCATION: 'EDUCATION',
  SOCIAL: 'SOCIAL'
};

exports.AttendeeStatus = exports.$Enums.AttendeeStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  TENTATIVE: 'TENTATIVE'
};

exports.TransactionType = exports.$Enums.TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  TRANSFER: 'TRANSFER',
  INVESTMENT: 'INVESTMENT'
};

exports.BudgetPeriod = exports.$Enums.BudgetPeriod = {
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
  CUSTOM: 'CUSTOM'
};

exports.Prisma.ModelName = {
  User: 'User',
  Project: 'Project',
  ProjectMember: 'ProjectMember',
  Story: 'Story',
  Comment: 'Comment',
  Opportunity: 'Opportunity',
  OpportunityApplication: 'OpportunityApplication',
  PageView: 'PageView',
  SearchQuery: 'SearchQuery',
  Setting: 'Setting',
  Media: 'Media',
  LifeOSProfile: 'LifeOSProfile',
  Habit: 'Habit',
  HabitCompletion: 'HabitCompletion',
  Goal: 'Goal',
  GoalMilestone: 'GoalMilestone',
  GoalUpdate: 'GoalUpdate',
  MeditationSession: 'MeditationSession',
  MoodEntry: 'MoodEntry',
  Journal: 'Journal',
  CalendarEvent: 'CalendarEvent',
  EventAttendee: 'EventAttendee',
  FinancialTransaction: 'FinancialTransaction',
  Budget: 'Budget'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)

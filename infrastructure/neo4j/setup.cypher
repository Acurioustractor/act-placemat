// Life OS Graph Database Setup - Neo4j Initialization
// This script sets up constraints, indexes, and sample data for the ACT Life OS platform

// ==============================================
// DATABASE CONSTRAINTS AND INDEXES
// ==============================================

// Node uniqueness constraints
CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT project_id_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT habit_id_unique IF NOT EXISTS FOR (h:Habit) REQUIRE h.id IS UNIQUE;
CREATE CONSTRAINT goal_id_unique IF NOT EXISTS FOR (g:Goal) REQUIRE g.id IS UNIQUE;
CREATE CONSTRAINT skill_id_unique IF NOT EXISTS FOR (s:Skill) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT topic_id_unique IF NOT EXISTS FOR (t:Topic) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT story_id_unique IF NOT EXISTS FOR (st:Story) REQUIRE st.id IS UNIQUE;
CREATE CONSTRAINT community_id_unique IF NOT EXISTS FOR (c:Community) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT milestone_id_unique IF NOT EXISTS FOR (m:Milestone) REQUIRE m.id IS UNIQUE;

// Performance indexes
CREATE INDEX user_location_idx IF NOT EXISTS FOR (u:User) ON (u.location);
CREATE INDEX user_timezone_idx IF NOT EXISTS FOR (u:User) ON (u.timezone);
CREATE INDEX project_status_idx IF NOT EXISTS FOR (p:Project) ON (p.status);
CREATE INDEX project_category_idx IF NOT EXISTS FOR (p:Project) ON (p.category);
CREATE INDEX habit_category_idx IF NOT EXISTS FOR (h:Habit) ON (h.category);
CREATE INDEX habit_frequency_idx IF NOT EXISTS FOR (h:Habit) ON (h.frequency);
CREATE INDEX goal_status_idx IF NOT EXISTS FOR (g:Goal) ON (g.status);
CREATE INDEX goal_priority_idx IF NOT EXISTS FOR (g:Goal) ON (g.priority);
CREATE INDEX skill_category_idx IF NOT EXISTS FOR (s:Skill) ON (s.category);
CREATE INDEX skill_level_idx IF NOT EXISTS FOR (s:Skill) ON (s.level);
CREATE INDEX topic_category_idx IF NOT EXISTS FOR (t:Topic) ON (t.category);
CREATE INDEX story_category_idx IF NOT EXISTS FOR (st:Story) ON (st.category);
CREATE INDEX community_location_idx IF NOT EXISTS FOR (c:Community) ON (c.location);

// Beautiful Obsolescence tracking indexes
CREATE INDEX extractive_targeting_idx IF NOT EXISTS FOR (u:User) ON (u.extractiveSystemsTargeting);
CREATE INDEX data_residency_idx IF NOT EXISTS FOR (u:User) ON (u.dataResidencyPreference);
CREATE INDEX community_ownership_idx IF NOT EXISTS FOR (c:Community) ON (c.communityOwnership);
CREATE INDEX obsolescence_alignment_idx IF NOT EXISTS FOR (p:Project) ON (p.beautifulObsolescenceAlignment);

// ==============================================
// SAMPLE DATA CREATION
// ==============================================

// Create sample users with Australian context
CREATE (u1:User {
  id: "user_001",
  name: "Sarah Chen",
  email: "sarah@actplacemat.org.au",
  location: "Melbourne, VIC",
  timezone: "Australia/Melbourne", 
  createdAt: datetime("2024-06-15T09:00:00Z"),
  isActive: true,
  communityRole: "MEMBER",
  extractiveSystemsTargeting: true,
  dataResidencyPreference: "Australia"
})

CREATE (u2:User {
  id: "user_002", 
  name: "Marcus Thompson",
  email: "marcus@communitygardens.org.au",
  location: "Brisbane, QLD",
  timezone: "Australia/Brisbane",
  createdAt: datetime("2024-03-20T14:30:00Z"),
  isActive: true,
  communityRole: "MODERATOR",
  extractiveSystemsTargeting: true,
  dataResidencyPreference: "Australia"
})

CREATE (u3:User {
  id: "user_003",
  name: "Yuki Tanaka", 
  email: "yuki@resilientcommunities.org.au",
  location: "Sydney, NSW",
  timezone: "Australia/Sydney",
  createdAt: datetime("2024-08-01T11:15:00Z"),
  isActive: true,
  communityRole: "MEMBER",
  extractiveSystemsTargeting: true,
  dataResidencyPreference: "Australia"
})

// Create sample communities
CREATE (c1:Community {
  id: "comm_001",
  name: "Melbourne Regenerative Network",
  location: "Melbourne, VIC",
  memberCount: 150,
  foundedDate: date("2023-03-15"),
  focusAreas: ["Permaculture", "Community Resilience", "Local Economy"],
  communityOwnership: true,
  valueDistributionModel: "Cooperative",
  extractiveSystemReplacement: ["Corporate Agriculture", "Centralised Energy"]
})

CREATE (c2:Community {
  id: "comm_002", 
  name: "Brisbane Food Forest Collective",
  location: "Brisbane, QLD",
  memberCount: 85,
  foundedDate: date("2023-07-22"),
  focusAreas: ["Food Security", "Urban Agriculture", "Skill Sharing"],
  communityOwnership: true,
  valueDistributionModel: "Resource Sharing",
  extractiveSystemReplacement: ["Industrial Food System", "Corporate Retail"]
})

// Create sample projects
CREATE (p1:Project {
  id: "proj_001",
  title: "Northcote Community Garden",
  description: "Transforming unused urban space into productive community food system",
  status: "ACTIVE",
  category: "Urban Agriculture", 
  location: "Northcote, VIC",
  coordinates: {latitude: -37.7709, longitude: 144.9984},
  startDate: date("2024-09-01"),
  pillar: "Food Security",
  communityOwned: true,
  beautifulObsolescenceAlignment: 9.2
})

CREATE (p2:Project {
  id: "proj_002",
  title: "Solar Cooperative Network",
  description: "Community-owned renewable energy infrastructure",
  status: "ACTIVE", 
  category: "Renewable Energy",
  location: "Brisbane, QLD",
  coordinates: {latitude: -27.4698, longitude: 153.0251},
  startDate: date("2024-07-15"),
  pillar: "Energy Sovereignty",
  communityOwned: true,
  beautifulObsolescenceAlignment: 8.8
})

// Create sample skills
CREATE (s1:Skill {
  id: "skill_001",
  name: "Permaculture Design",
  category: "Regenerative Agriculture",
  level: "INTERMEDIATE",
  isVerified: false,
  communityValue: "HIGH",
  australianRelevance: true,
  extractiveAlternative: "Industrial Agriculture"
})

CREATE (s2:Skill {
  id: "skill_002",
  name: "Community Organising", 
  category: "Social Leadership",
  level: "ADVANCED",
  isVerified: true,
  communityValue: "CRITICAL",
  australianRelevance: true,
  extractiveAlternative: "Corporate Management"
})

CREATE (s3:Skill {
  id: "skill_003",
  name: "Solar System Installation",
  category: "Renewable Energy",
  level: "PROFESSIONAL",
  isVerified: true,
  communityValue: "HIGH",
  australianRelevance: true,
  extractiveAlternative: "Fossil Fuel Infrastructure"
})

// Create sample topics
CREATE (t1:Topic {
  id: "topic_001",
  name: "Sustainable Living",
  description: "Practical approaches to regenerative lifestyle",
  category: "Lifestyle",
  parentTopic: "Environmental Action",
  communityInterest: 8.5,
  beautifulObsolescenceRelevance: true
})

CREATE (t2:Topic {
  id: "topic_002",
  name: "Community Resilience",
  description: "Building adaptive capacity in local communities",
  category: "Social Systems",
  parentTopic: "Community Development",
  communityInterest: 9.2,
  beautifulObsolescenceRelevance: true
})

// Create sample habits
CREATE (h1:Habit {
  id: "habit_001",
  name: "Daily Garden Tending",
  category: "Regenerative Practice",
  frequency: "DAILY",
  targetValue: 30,
  unit: "minutes", 
  color: "#4A90E2",
  icon: "🌱",
  isActive: true,
  currentStreak: 15,
  longestStreak: 45,
  createdAt: datetime("2025-08-01T06:00:00Z")
})

CREATE (h2:Habit {
  id: "habit_002",
  name: "Community Check-in",
  category: "Social Connection",
  frequency: "WEEKLY", 
  targetValue: 1,
  unit: "sessions",
  color: "#E94B3C",
  icon: "🤝",
  isActive: true,
  currentStreak: 8,
  longestStreak: 20,
  createdAt: datetime("2025-07-15T18:00:00Z")
})

// Create sample goals  
CREATE (g1:Goal {
  id: "goal_001",
  title: "Complete Permaculture Design Certificate",
  description: "Achieve PDC to enhance community garden leadership",
  category: "Education",
  status: "ACTIVE",
  priority: "HIGH",
  targetValue: 1.0,
  currentValue: 0.6,
  unit: "course_completion",
  progress: 60.0,
  startDate: date("2025-08-01"),
  targetDate: date("2025-12-31"),
  communityBenefit: true
})

CREATE (g2:Goal {
  id: "goal_002",
  title: "Establish Neighbourhood Tool Library",
  description: "Create resource sharing system for 50 households",
  category: "Community Building",
  status: "ACTIVE",
  priority: "MEDIUM", 
  targetValue: 50.0,
  currentValue: 12.0,
  unit: "households",
  progress: 24.0,
  startDate: date("2025-07-01"),
  targetDate: date("2026-03-31"),
  communityBenefit: true
})

// Create sample stories
CREATE (st1:Story {
  id: "story_001",
  title: "From Concrete to Community: Our Garden Journey",
  category: "Urban Agriculture",
  publishedAt: datetime("2025-08-15T14:30:00Z"),
  viewCount: 245,
  impactScore: 7.8,
  communityVoice: true,
  consentVerified: true,
  australianContext: true
})

CREATE (st2:Story {
  id: "story_002", 
  title: "Powering Change: Community Solar Success",
  category: "Renewable Energy",
  publishedAt: datetime("2025-08-20T09:15:00Z"),
  viewCount: 189,
  impactScore: 8.2,
  communityVoice: true,
  consentVerified: true,
  australianContext: true
})

// ==============================================
// RELATIONSHIP CREATION
// ==============================================

// Community memberships
CREATE (u1)-[:MEMBER_OF_COMMUNITY {
  since: date("2024-07-01"),
  role: "ACTIVE_CONTRIBUTOR",
  contributionAreas: ["Event_Organization", "Skill_Sharing"],
  leadershipRole: false,
  mentorsNewMembers: true
}]->(c1)

CREATE (u2)-[:MEMBER_OF_COMMUNITY {
  since: date("2023-03-15"), 
  role: "CO_FOUNDER",
  contributionAreas: ["Strategic_Planning", "Community_Coordination"],
  leadershipRole: true,
  mentorsNewMembers: true
}]->(c2)

CREATE (u3)-[:MEMBER_OF_COMMUNITY {
  since: date("2024-08-15"),
  role: "ACTIVE_CONTRIBUTOR", 
  contributionAreas: ["Technical_Skills", "Workshop_Facilitation"],
  leadershipRole: false,
  mentorsNewMembers: false
}]->(c1)

// Community project hosting
CREATE (c1)-[:HOSTS_PROJECT {
  since: date("2024-09-01"),
  resourcesProvided: ["Meeting_Space", "Tool_Library", "Seed_Bank"],
  supportLevel: "HIGH",
  alignmentWithValues: 9.5
}]->(p1)

CREATE (c2)-[:HOSTS_PROJECT {
  since: date("2024-07-15"),
  resourcesProvided: ["Technical_Expertise", "Bulk_Purchasing"],
  supportLevel: "MEDIUM",
  alignmentWithValues: 8.8  
}]->(p2)

// Project memberships
CREATE (u1)-[:MEMBER_OF {
  role: "CONTRIBUTOR",
  since: date("2024-09-05"),
  skillsContributed: ["Garden_Design", "Community_Engagement"],
  commitmentLevel: "REGULAR",
  hoursPerMonth: 20
}]->(p1)

CREATE (u2)-[:LEADS {
  since: date("2024-07-15"),
  leadershipStyle: "Collaborative",
  teamSize: 12,
  decisionMakingModel: "Consensus"
}]->(p2)

CREATE (u3)-[:MEMBER_OF {
  role: "TECHNICAL_LEAD",
  since: date("2024-08-20"), 
  skillsContributed: ["Solar_Installation", "System_Design"],
  commitmentLevel: "HIGH",
  hoursPerMonth: 25
}]->(p2)

// Skill relationships
CREATE (u1)-[:HAS_SKILL {
  level: "INTERMEDIATE",
  acquiredDate: date("2024-06-15"),
  verificationSource: "Community_Recognition",
  teachingWillingness: true,
  continuousLearning: true
}]->(s1)

CREATE (u2)-[:HAS_SKILL {
  level: "ADVANCED",
  acquiredDate: date("2022-03-10"),
  verificationSource: "Professional_Experience",
  teachingWillingness: true,
  continuousLearning: true  
}]->(s2)

CREATE (u3)-[:HAS_SKILL {
  level: "PROFESSIONAL",
  acquiredDate: date("2021-11-20"),
  verificationSource: "Industry_Certification",
  teachingWillingness: true,
  continuousLearning: true
}]->(s3)

CREATE (u3)-[:WANTS_SKILL {
  urgency: "MEDIUM", 
  learningPreference: "Hands_On",
  communityPathway: true,
  timeframe: "6_months"
}]->(s1)

// Teaching relationships
CREATE (u2)-[:TEACHES_SKILL {
  teachingMethod: "Workshop_Series",
  frequency: "MONTHLY",
  studentsHelped: 25,
  communityImpact: "HIGH",
  freeOfCharge: true
}]->(s2)

CREATE (u3)-[:TEACHES_SKILL {
  teachingMethod: "Practical_Installation",
  frequency: "PROJECT_BASED", 
  studentsHelped: 8,
  communityImpact: "MEDIUM",
  freeOfCharge: false
}]->(s3)

// Mentorship
CREATE (u2)-[:MENTORS {
  since: date("2024-08-01"),
  skillAreas: ["Community_Organizing", "Project_Leadership"],
  formalArrangement: false,
  frequency: "WEEKLY",
  communityConnected: true
}]->(u1)

// Project skill requirements
CREATE (p1)-[:REQUIRES_SKILL {
  importance: "CRITICAL",
  currentGap: false,
  urgency: "ONGOING",
  learningSupported: true
}]->(s1)

CREATE (p2)-[:REQUIRES_SKILL {
  importance: "CRITICAL", 
  currentGap: false,
  urgency: "HIGH",
  learningSupported: true
}]->(s3)

// Goal pursuit
CREATE (u1)-[:PURSUES_GOAL {
  startDate: date("2025-08-01"),
  personalMotivation: "Skill_Development",
  communityBenefit: "Teaching_Others",
  commitmentLevel: "HIGH",
  resourcesAllocated: ["Time", "Money", "Energy"]
}]->(g1)

CREATE (u2)-[:PURSUES_GOAL {
  startDate: date("2025-07-01"),
  personalMotivation: "Community_Resilience",
  communityBenefit: "Resource_Access",
  commitmentLevel: "MEDIUM", 
  resourcesAllocated: ["Time", "Networks"]
}]->(g2)

// Habit adoption  
CREATE (u1)-[:HAS_HABIT {
  adoptedDate: date("2025-08-01"),
  currentStreak: 15,
  personalMotivation: "Connection_To_Nature",
  communitySupport: true,
  adaptations: ["Morning_Routine", "Weather_Flexibility"]
}]->(h1)

CREATE (u2)-[:HAS_HABIT {
  adoptedDate: date("2025-07-15"),
  currentStreak: 8,
  personalMotivation: "Community_Building",
  communitySupport: true,
  adaptations: ["Online_Options", "Flexible_Timing"]
}]->(h2)

// Habit contributions to goals
CREATE (h1)-[:CONTRIBUTES_TO_GOAL {
  contributionType: "Skill_Practice",
  importance: "MEDIUM",
  measuredImpact: 6.5,
  frequency: "DAILY"
}]->(g1)

CREATE (h2)-[:CONTRIBUTES_TO_GOAL {
  contributionType: "Network_Building", 
  importance: "HIGH",
  measuredImpact: 8.0,
  frequency: "WEEKLY"
}]->(g2)

// Story authorship and readership
CREATE (u1)-[:WROTE {
  publishedAt: datetime("2025-08-15T14:30:00Z"),
  writingRole: "PRIMARY_AUTHOR",
  communityCollaboration: true,
  impactMeasured: true
}]->(st1)

CREATE (u2)-[:WROTE {
  publishedAt: datetime("2025-08-20T09:15:00Z"),
  writingRole: "PRIMARY_AUTHOR", 
  communityCollaboration: false,
  impactMeasured: true
}]->(st2)

CREATE (u3)-[:READS {
  readAt: datetime("2025-08-20T19:30:00Z"),
  engagement: "DEEP",
  sharedWithOthers: true,
  appliedLearning: true
}]->(st1)

// Topic coverage and interest
CREATE (st1)-[:COVERS_TOPIC {
  depth: "COMPREHENSIVE",
  originalPerspective: true,
  communityRelevance: "HIGH",
  practicalApplication: true
}]->(t1)

CREATE (st2)-[:COVERS_TOPIC {
  depth: "CASE_STUDY",
  originalPerspective: true,
  communityRelevance: "HIGH",
  practicalApplication: true
}]->(t2)

CREATE (u1)-[:INTERESTED_IN {
  interestLevel: 8.5,
  since: date("2024-03-15"),
  learningActive: true,
  communityEngagement: "HIGH"
}]->(t1)

CREATE (u2)-[:EXPERT_IN {
  expertiseLevel: "ADVANCED",
  yearsExperience: 5,
  communityRecognized: true,
  mentorsOthers: true,
  contributesToTopic: "FREQUENT"  
}]->(t2)

// ==============================================
// VERIFICATION QUERIES
// ==============================================

// Verify data creation
// MATCH (n) RETURN labels(n), count(n) ORDER BY labels(n);
// MATCH ()-[r]->() RETURN type(r), count(r) ORDER BY type(r);
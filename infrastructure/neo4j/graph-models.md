# Life OS Graph Data Models - Neo4j Design

## Overview

This document defines the Neo4j graph data models for the ACT Life OS platform, focusing on relationship-rich data that complements the PostgreSQL relational schema. The graph database captures complex interconnections between users, projects, habits, goals, and community relationships.

## Design Philosophy

1. **Relationship-First**: Model entities where connections are as important as the data
2. **Community Networks**: Capture social graphs and collaboration patterns  
3. **Influence Tracking**: Model how habits, goals, and projects influence each other
4. **Knowledge Graphs**: Represent learning paths and skill development networks
5. **Beautiful Obsolescence**: Track transition away from extractive relationship patterns

## Node Types

### Core Entities

#### User Node
```cypher
(:User {
  id: "cuid123",
  name: "Community Member",
  email: "member@example.com",
  location: "Melbourne, Australia",
  timezone: "Australia/Sydney",
  createdAt: datetime("2025-08-26T08:00:00Z"),
  isActive: true,
  communityRole: "MEMBER",
  extractiveSystemsTargeting: true,
  dataResidencyPreference: "Australia"
})
```

#### Project Node
```cypher
(:Project {
  id: "proj123",
  title: "Community Garden Initiative",
  description: "Building sustainable food systems",
  status: "ACTIVE",
  category: "Environmental",
  location: "Sydney, NSW",
  coordinates: {latitude: -33.8688, longitude: 151.2093},
  startDate: date("2025-01-15"),
  pillar: "Regenerative Practices",
  communityOwned: true,
  beautifulObsolescenceAlignment: 9.2
})
```

#### Habit Node
```cypher
(:Habit {
  id: "habit123",
  name: "Daily Meditation",
  category: "Mindfulness",
  frequency: "DAILY",
  targetValue: 20,
  unit: "minutes",
  color: "#4A90E2",
  icon: "🧘‍♀️",
  isActive: true,
  currentStreak: 15,
  longestStreak: 45,
  createdAt: datetime("2025-08-01T06:00:00Z")
})
```

#### Goal Node
```cypher
(:Goal {
  id: "goal123",
  title: "Learn Permaculture Design",
  description: "Complete PDC certificate",
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
```

#### Skill Node
```cypher
(:Skill {
  id: "skill123",
  name: "Permaculture Design",
  category: "Regenerative Agriculture",
  level: "INTERMEDIATE",
  isVerified: false,
  communityValue: "HIGH",
  australianRelevance: true,
  extractiveAlternative: "Industrial Agriculture"
})
```

#### Topic Node  
```cypher
(:Topic {
  id: "topic123",
  name: "Sustainable Living",
  description: "Practices for regenerative lifestyle",
  category: "Lifestyle",
  parentTopic: "Environmental Action",
  communityInterest: 8.5,
  beautyfulObsolescenceRelevance: true
})
```

#### Story Node
```cypher
(:Story {
  id: "story123",
  title: "From Urban Sprawl to Food Forest",
  category: "Regenerative Agriculture", 
  publishedAt: datetime("2025-08-15T14:30:00Z"),
  viewCount: 245,
  impactScore: 7.8,
  communityVoice: true,
  consentVerified: true,
  australianContext: true
})
```

#### Community Node
```cypher
(:Community {
  id: "comm123",
  name: "Melbourne Regenerative Network",
  location: "Melbourne, VIC",
  memberCount: 150,
  foundedDate: date("2023-03-15"),
  focusAreas: ["Permaculture", "Community Resilience", "Local Economy"],
  communityOwnership: true,
  valueDistributionModel: "Cooperative",
  extractiveSystemReplacement: ["Corporate Agriculture", "Centralised Energy"]
})
```

### Life OS Specific Nodes

#### Milestone Node
```cypher
(:Milestone {
  id: "milestone123",
  title: "Complete Module 3",
  description: "Soil health and composting systems",
  status: "COMPLETED",
  targetDate: date("2025-09-30"),
  completedAt: datetime("2025-09-28T16:45:00Z"),
  communityShared: true
})
```

#### MoodPattern Node
```cypher
(:MoodPattern {
  id: "pattern123",
  primaryMood: "Energetic",
  intensity: 8,
  frequency: "WEEKLY",
  triggers: ["Community Events", "Garden Work"],
  activities: ["Volunteering", "Outdoor Work"],
  seasonalInfluence: "Spring_Summer"
})
```

#### HabitInfluence Node
```cypher
(:HabitInfluence {
  id: "influence123",
  influenceType: "POSITIVE",
  strength: 8.5,
  timeframe: "2_weeks",
  mechanism: "Routine_Reinforcement",
  communitySupported: true
})
```

## Relationship Types

### Social Relationships

#### FRIEND_OF
```cypher
(:User)-[:FRIEND_OF {
  since: date("2024-06-15"),
  strength: 7.5,
  mutualInterests: ["Permaculture", "Community Building"],
  collaborationHistory: 3,
  supportType: "Peer"
}]->(:User)
```

#### MENTORS / LEARNS_FROM
```cypher
(:User)-[:MENTORS {
  since: date("2024-08-01"),
  skillAreas: ["Permaculture", "Community Organizing"],
  formalArrangement: false,
  frequency: "WEEKLY",
  communityConnected: true
}]->(:User)

(:User)-[:LEARNS_FROM {
  skillAreas: ["Sustainable Living"],
  learningStyle: "Practical",
  progressTracking: true
}]->(:User)
```

### Project Relationships

#### MEMBER_OF / LEADS / COLLABORATES_ON
```cypher
(:User)-[:MEMBER_OF {
  role: "CONTRIBUTOR",
  since: date("2025-01-20"),
  skillsContributed: ["Design", "Community Engagement"],
  commitmentLevel: "REGULAR",
  hoursPerMonth: 15
}]->(:Project)

(:User)-[:LEADS {
  since: date("2024-12-01"),
  leadership_style: "Collaborative",
  teamSize: 8,
  decisionMakingModel: "Consensus"
}]->(:Project)

(:Project)-[:COLLABORATES_WITH {
  collaborationType: "Resource_Sharing",
  since: date("2025-02-01"),
  sharedResources: ["Tools", "Expertise", "Space"],
  frequency: "MONTHLY"
}]->(:Project)
```

#### INSPIRED_BY / INFLUENCES
```cypher
(:Project)-[:INSPIRED_BY {
  inspirationAspects: ["Methods", "Community Model"],
  adaptations: ["Local_Climate", "Urban_Context"],
  acknowledgmentGiven: true
}]->(:Project)

(:Project)-[:INFLUENCES {
  influenceType: "Methodology",
  adoptedPractices: ["Decision Making", "Resource Sharing"],
  measuredImpact: 6.8
}]->(:Project)
```

### Life OS Relationships

#### HAS_HABIT / SUPPORTS_HABIT
```cypher
(:User)-[:HAS_HABIT {
  adoptedDate: date("2025-08-01"),
  currentStreak: 15,
  personalMotivation: "Mental Clarity",
  communitySupport: true,
  adaptations: ["Morning_Routine", "Group_Sessions"]
}]->(:Habit)

(:User)-[:SUPPORTS_HABIT {
  supportType: "Accountability_Partner",
  frequency: "DAILY",
  encouragementStyle: "Check_ins",
  mutualSupport: true
}]->(hab:Habit)<-[:HAS_HABIT]-(:User)
```

#### INFLUENCES_HABIT
```cypher
(:Habit)-[:INFLUENCES_HABIT {
  influenceType: "ENABLES",
  strength: 8.0,
  mechanism: "Routine_Stacking",
  timeDelay: "30_minutes",
  consistency: 0.85
}]->(:Habit)
```

#### PURSUES_GOAL / SHARES_GOAL
```cypher
(:User)-[:PURSUES_GOAL {
  startDate: date("2025-08-01"),
  personalMotivation: "Skill Development",
  communityBenefit: "Teaching Others",
  commitmentLevel: "HIGH",
  resourcesAllocated: ["Time", "Money", "Energy"]
}]->(:Goal)

(:User)-[:SHARES_GOAL {
  shareType: "Progress_Updates",
  visibility: "COMMUNITY",
  encouragementReceived: true,
  collaborationLevel: "Resource_Sharing"
}]->(:Goal)
```

#### SUPPORTS_GOAL
```cypher
(:Goal)-[:SUPPORTS_GOAL {
  supportType: "ENABLES",
  mechanism: "Skill_Building",
  timeframe: "Long_term",
  criticalPath: true
}]->(:Goal)
```

#### CONTRIBUTES_TO_GOAL
```cypher
(:Habit)-[:CONTRIBUTES_TO_GOAL {
  contributionType: "Foundation_Building",
  importance: "CRITICAL",
  measuredImpact: 7.5,
  frequency: "DAILY"
}]->(:Goal)
```

### Skill and Learning Relationships

#### HAS_SKILL / TEACHES_SKILL / WANTS_SKILL
```cypher
(:User)-[:HAS_SKILL {
  level: "INTERMEDIATE",
  acquiredDate: date("2024-06-15"),
  verificationSource: "Community_Recognition",
  teachingWillingness: true,
  continuousLearning: true
}]->(:Skill)

(:User)-[:TEACHES_SKILL {
  teachingMethod: "Hands_on_Workshop",
  frequency: "MONTHLY",
  studentsHelped: 25,
  communityImpact: "HIGH",
  freeOfCharge: true
}]->(:Skill)

(:User)-[:WANTS_SKILL {
  urgency: "MEDIUM",
  learningPreference: "Practical",
  communityPathway: true,
  timeframe: "6_months"
}]->(:Skill)
```

#### REQUIRES_SKILL
```cypher
(:Project)-[:REQUIRES_SKILL {
  importance: "CRITICAL",
  currentGap: true,
  urgency: "HIGH",
  learningSupported: true
}]->(:Skill)

(:Goal)-[:REQUIRES_SKILL {
  importance: "MEDIUM",
  currentLevel: "BEGINNER",
  targetLevel: "INTERMEDIATE"
}]->(:Skill)
```

### Knowledge and Content Relationships

#### INTERESTED_IN / EXPERT_IN
```cypher
(:User)-[:INTERESTED_IN {
  interestLevel: 8.5,
  since: date("2024-03-15"),
  learningActive: true,
  communityEngagement: "HIGH"
}]->(:Topic)

(:User)-[:EXPERT_IN {
  expertiseLevel: "ADVANCED",
  yearsExperience: 5,
  communityRecognized: true,
  mentorsOthers: true,
  contributesToTopic: "FREQUENT"
}]->(:Topic)
```

#### WROTE / READS / SHARES
```cypher
(:User)-[:WROTE {
  publishedAt: datetime("2025-08-15T14:30:00Z"),
  writingRole: "PRIMARY_AUTHOR",
  communityCollaboration: true,
  impactMeasured: true
}]->(:Story)

(:User)-[:READS {
  readAt: datetime("2025-08-20T09:15:00Z"),
  engagement: "DEEP",
  sharedWithOthers: true,
  appliedLearning: true
}]->(:Story)

(:User)-[:SHARES {
  sharedAt: datetime("2025-08-20T11:30:00Z"),
  platform: "Community_Forum",
  personalNote: "Relevant to our garden project",
  reachCount: 45
}]->(:Story)
```

#### COVERS_TOPIC / RELATES_TO
```cypher
(:Story)-[:COVERS_TOPIC {
  depth: "COMPREHENSIVE",
  originalPerspective: true,
  communityRelevance: "HIGH",
  practicalApplication: true
}]->(:Topic)

(:Topic)-[:RELATES_TO {
  relationshipType: "SUPPORTS",
  strength: 7.5,
  practicalConnection: true
}]->(:Topic)
```

### Community and Collaboration Relationships

#### MEMBER_OF_COMMUNITY / FOUNDED
```cypher
(:User)-[:MEMBER_OF_COMMUNITY {
  since: date("2024-01-15"),
  role: "ACTIVE_CONTRIBUTOR",
  contributionAreas: ["Event_Organization", "Skill_Sharing"],
  leadershipRole: false,
  mentorsNewMembers: true
}]->(:Community)

(:User)-[:FOUNDED {
  foundedDate: date("2023-03-15"),
  foundingRole: "CO_FOUNDER",
  currentInvolvement: "ADVISORY",
  transitionedLeadership: true
}]->(:Community)
```

#### HOSTS_PROJECT
```cypher
(:Community)-[:HOSTS_PROJECT {
  since: date("2025-01-20"),
  resourcesProvided: ["Meeting_Space", "Tool_Library"],
  supportLevel: "HIGH",
  alignmentWithValues: 9.5
}]->(:Project)
```

### Influence and Pattern Relationships

#### INFLUENCED_BY / TRIGGERS
```cypher
(:MoodPattern)-[:INFLUENCED_BY {
  strength: 8.0,
  consistency: 0.85,
  seasonalVariation: true,
  communityFactor: true
}]->(:Habit)

(:MoodPattern)-[:TRIGGERS {
  triggerStrength: 7.5,
  timeDelay: "2_hours",
  frequency: "WEEKLY",
  positiveOutcome: true
}]->(:Habit)
```

#### REINFORCES / CONFLICTS_WITH
```cypher
(:HabitInfluence)-[:REINFORCES {
  reinforcementType: "Routine_Stacking",
  effectiveness: 8.5,
  timeframe: "2_weeks",
  communitySupported: true
}]->(:Habit)

(:Habit)-[:CONFLICTS_WITH {
  conflictType: "Time_Competition",
  severity: "MEDIUM",
  resolutionStrategy: "Schedule_Adjustment",
  resolved: true
}]->(:Habit)
```

## Graph Model Diagrams

### Community Network Pattern
```
(User)-[:MEMBER_OF_COMMUNITY]->(Community)-[:HOSTS_PROJECT]->(Project)
     \                                                         /
      [:MEMBER_OF]-------------------------------------[:REQUIRES_SKILL]
                  \                                    /
                   (Project)-[:REQUIRES_SKILL]-(Skill)
                             \                    /
                              [:HAS_SKILL]------/
```

### Learning and Development Flow
```
(User)-[:WANTS_SKILL]->(Skill)<-[:TEACHES_SKILL]-(Mentor:User)
  |                      |                           |
  [:PURSUES_GOAL]       [:REQUIRES_SKILL]           [:HAS_SKILL]
  |                      |                           |
  v                      v                           |
(Goal)-[:SUPPORTS_GOAL]->(Goal)<-[:SUPPORTS_GOAL]---/
```

### Habit Influence Network  
```
(User)-[:HAS_HABIT]->(Habit1)-[:INFLUENCES_HABIT]->(Habit2)
                        |                            |
                        [:CONTRIBUTES_TO_GOAL]      [:CONTRIBUTES_TO_GOAL]
                        |                            |
                        v                            v
                      (Goal1)-[:SUPPORTS_GOAL]--->(Goal2)
```

## Common Graph Queries

### 1. Find Community Skill Gaps
```cypher
// Find skills needed by projects but not available in community
MATCH (c:Community)-[:HOSTS_PROJECT]->(p:Project)-[:REQUIRES_SKILL]->(s:Skill)
WHERE NOT EXISTS {
  MATCH (c)<-[:MEMBER_OF_COMMUNITY]-(u:User)-[:HAS_SKILL]->(s)
  WHERE u.isActive = true
}
RETURN c.name as community, 
       collect(DISTINCT s.name) as missing_skills,
       count(DISTINCT p) as affected_projects
ORDER BY affected_projects DESC
```

### 2. Identify Learning Mentorship Opportunities
```cypher
// Find users who can mentor others based on skill gaps
MATCH (learner:User)-[:WANTS_SKILL]->(skill:Skill)<-[:HAS_SKILL]-(expert:User)
WHERE learner <> expert 
  AND expert.teachingWillingness = true
  AND NOT EXISTS((learner)-[:LEARNS_FROM]->(expert))
RETURN expert.name as potential_mentor,
       learner.name as potential_learner,
       skill.name as skill_area,
       skill.communityValue as community_value
ORDER BY community_value DESC
```

### 3. Discover Habit Influence Patterns
```cypher
// Find successful habit combinations and their goal contributions  
MATCH (u:User)-[:HAS_HABIT]->(h1:Habit)-[:INFLUENCES_HABIT {influenceType: 'POSITIVE'}]->(h2:Habit)
WHERE u-[:HAS_HABIT]->h2 
  AND h1.currentStreak > 14 
  AND h2.currentStreak > 14
MATCH (h1)-[:CONTRIBUTES_TO_GOAL]->(g:Goal)<-[:CONTRIBUTES_TO_GOAL]-(h2)
WHERE g.status = 'ACTIVE' AND g.progress > 0.5
RETURN h1.name + ' → ' + h2.name as habit_combination,
       g.title as supported_goal,
       count(*) as users_with_pattern,
       avg(g.progress) as average_progress
ORDER BY users_with_pattern DESC, average_progress DESC
```

### 4. Map Community Knowledge Networks
```cypher
// Find knowledge flow through community stories and topics
MATCH path = (author:User)-[:WROTE]->(story:Story)-[:COVERS_TOPIC]->(topic:Topic)
         <-[:INTERESTED_IN]-(reader:User)
WHERE author <> reader
  AND EXISTS((reader)-[:MEMBER_OF_COMMUNITY]->(:Community)<-[:MEMBER_OF_COMMUNITY]-(author))
WITH topic, collect(DISTINCT author.name) as authors, 
     collect(DISTINCT reader.name) as readers,
     count(DISTINCT story) as story_count
RETURN topic.name as knowledge_area,
       story_count,
       size(authors) as knowledge_creators,
       size(readers) as knowledge_consumers,
       authors[0..3] as sample_authors
ORDER BY story_count DESC
```

### 5. Identify Beautiful Obsolescence Progress
```cypher
// Track progress toward making extractive systems obsolete
MATCH (u:User)-[:MEMBER_OF_COMMUNITY]->(c:Community)-[:HOSTS_PROJECT]->(p:Project)
WHERE u.extractiveSystemsTargeting = true 
  AND p.beautifulObsolescenceAlignment > 7.0
WITH u, collect(DISTINCT p.extractiveAlternative) as alternatives_addressed,
     collect(DISTINCT c.extractiveSystemReplacement) as community_alternatives
RETURN u.name as changemaker,
       u.location as location,
       size(alternatives_addressed) as systems_addressed,
       alternatives_addressed[0..3] as sample_alternatives,
       size(community_alternatives) as community_systems
ORDER BY systems_addressed DESC
```

### 6. Find Project Collaboration Opportunities
```cypher
// Identify projects that should collaborate based on shared interests and complementary skills
MATCH (p1:Project)-[:REQUIRES_SKILL]->(skill:Skill)<-[:HAS_SKILL]-(u:User)-[:MEMBER_OF]->(p2:Project)
WHERE p1 <> p2 
  AND NOT EXISTS((p1)-[:COLLABORATES_WITH]-(p2))
  AND p1.status = 'ACTIVE' AND p2.status = 'ACTIVE'
WITH p1, p2, collect(DISTINCT skill.name) as shared_skills,
     collect(DISTINCT u.name) as connecting_people
WHERE size(shared_skills) >= 2
RETURN p1.title as project1,
       p2.title as project2,
       shared_skills,
       connecting_people,
       size(shared_skills) as skill_overlap_count
ORDER BY skill_overlap_count DESC
```

## Integration with PostgreSQL

The Neo4j graph database complements the PostgreSQL relational data:

- **Entity IDs**: Use same CUIDs as PostgreSQL for cross-database joins
- **Relationship Data**: Store lightweight relationship metadata in Neo4j
- **Complex Queries**: Use Neo4j for relationship traversals, PostgreSQL for detailed entity data
- **Real-time Sync**: Updates to PostgreSQL trigger graph relationship updates
- **Caching Layer**: Neo4j serves as intelligent cache for relationship-heavy queries

This graph model enables rich community insights while maintaining the Beautiful Obsolescence philosophy of community-controlled, relationship-centered technology platforms.
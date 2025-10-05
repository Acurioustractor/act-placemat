// =============================================
// ACT COMMUNITY KNOWLEDGE GRAPH SCHEMA
// Neo4j v5 Schema for Community Entities and Relationships
// =============================================

// This schema complements the PostgreSQL data models by representing
// semantic relationships and graph-traversal optimized queries

// =============================================
// NODE TYPES (LABELS)
// =============================================

// USER NODES
// Represents community members with their core identity
// Syncs with PostgreSQL user_profiles table
CREATE CONSTRAINT user_id_unique FOR (u:User) REQUIRE u.user_id IS UNIQUE;
CREATE CONSTRAINT user_email_unique FOR (u:User) REQUIRE u.email IS UNIQUE;

// User node properties:
// user_id: UUID from PostgreSQL user_profiles.user_id
// email: Primary email address
// display_name: Public display name
// account_status: active, inactive, suspended
// created_at: Account creation timestamp
// last_active_at: Last activity timestamp
// location: Geographic location data (city, state, country)
// onboarding_completed: Boolean flag

// PROJECT NODES  
// Represents community projects and initiatives
// Syncs with PostgreSQL projects table
CREATE CONSTRAINT project_id_unique FOR (p:Project) REQUIRE p.project_id IS UNIQUE;
CREATE CONSTRAINT project_slug_unique FOR (p:Project) REQUIRE p.slug IS UNIQUE;

// Project node properties:
// project_id: UUID from PostgreSQL projects.id
// name: Project title
// slug: URL-friendly identifier
// status: Project status (seed, active, completed, archived)
// summary: Brief description
// created_at: Project creation timestamp
// updated_at: Last update timestamp
// location: Geographic scope
// category: Project type/domain

// SKILL NODES
// Represents skills, expertise areas, and competencies
// Extracted from user_profiles.expertise_areas and interests
CREATE CONSTRAINT skill_name_unique FOR (s:Skill) REQUIRE s.name IS UNIQUE;

// Skill node properties:
// name: Skill name (normalized, lowercase)
// category: skill_category (technical, domain_expertise, soft_skills)
// level: proficiency_level when linked to users
// demand_score: How in-demand this skill is in the community
// created_at: When this skill was first identified

// INTEREST NODES
// Represents topics, causes, and areas of interest
// Extracted from user_profiles.interests
CREATE CONSTRAINT interest_name_unique FOR (i:Interest) REQUIRE i.name IS UNIQUE;

// Interest node properties:
// name: Interest name (normalized)
// category: broad categorization
// popularity_score: How popular this interest is
// created_at: When first identified

// OUTCOME NODES
// Represents measurable project outcomes and impact
// Syncs with PostgreSQL project_outcomes table
CREATE CONSTRAINT outcome_id_unique FOR (o:Outcome) REQUIRE o.outcome_id IS UNIQUE;

// Outcome node properties:
// outcome_id: UUID from PostgreSQL project_outcomes.id
// title: Outcome title
// outcome_type: social_impact, environmental_benefit, etc.
// status: planned, in_progress, achieved, etc.
// verification_status: unverified, verified, etc.
// beneficiary_count: Number of direct beneficiaries
// created_at: When outcome was defined

// EVENT NODES
// Represents significant community events and milestones
// Syncs with PostgreSQL community_events table (milestone events only)
CREATE CONSTRAINT event_id_unique FOR (e:Event) REQUIRE e.event_id IS UNIQUE;

// Event node properties:
// event_id: UUID from PostgreSQL community_events.id
// event_name: Event identifier
// event_type: milestone, system_event, external_integration
// created_at: Event timestamp
// impact_score: Calculated impact of the event

// LOCATION NODES
// Represents geographic locations for regional analysis
CREATE CONSTRAINT location_code_unique FOR (l:Location) REQUIRE l.location_code IS UNIQUE;

// Location node properties:
// location_code: Standardized location identifier (e.g., AU-VIC-MEL)
// name: Human-readable location name
// type: city, state, country, region
// coordinates: lat/lng for spatial queries
// population: Population if known

// ORGANIZATION NODES
// Represents partner organizations and institutions
CREATE CONSTRAINT org_name_unique FOR (org:Organization) REQUIRE org.name IS UNIQUE;

// Organization node properties:
// name: Organization name
// type: nonprofit, government, corporate, community_group
// website: Official website
// location: Primary location
// established_date: When organization was founded

// COLLABORATION NODES
// Represents specific collaboration instances between entities
CREATE CONSTRAINT collaboration_id_unique FOR (c:Collaboration) REQUIRE c.collaboration_id IS UNIQUE;

// Collaboration node properties:
// collaboration_id: Unique identifier
// collaboration_type: project_contribution, skill_sharing, mentorship
// start_date: When collaboration began
// end_date: When collaboration ended (if applicable)
// status: active, completed, paused
// impact_description: Description of collaboration impact

// =============================================
// RELATIONSHIP TYPES (EDGES)
// =============================================

// USER TO SKILL RELATIONSHIPS
// HAS_SKILL - User possesses a skill
// Properties: proficiency_level (beginner, intermediate, expert), verified_by, acquired_date
// Example: (user)-[HAS_SKILL {proficiency_level: "expert", verified_by: "community"}]->(skill)

// WANTS_TO_LEARN - User wants to acquire a skill
// Properties: priority (high, medium, low), learning_style, target_date
// Example: (user)-[WANTS_TO_LEARN {priority: "high"}]->(skill)

// TEACHES - User can teach/mentor others in a skill
// Properties: teaching_preference, availability, experience_years
// Example: (user)-[TEACHES {teaching_preference: "one_on_one"}]->(skill)

// USER TO INTEREST RELATIONSHIPS
// INTERESTED_IN - User has interest in topic/cause
// Properties: interest_level (high, medium, low), since_date, engagement_frequency
// Example: (user)-[INTERESTED_IN {interest_level: "high"}]->(interest)

// USER TO PROJECT RELATIONSHIPS
// FOLLOWS - User follows project updates
// Properties: notification_enabled, follow_date
// Example: (user)-[FOLLOWS]->(project)

// CONTRIBUTES_TO - User actively contributes to project
// Properties: contribution_type, hours_per_week, role, start_date, end_date
// Example: (user)-[CONTRIBUTES_TO {role: "data_analyst", hours_per_week: 5}]->(project)

// LEADS - User leads or manages project
// Properties: leadership_type, start_date, responsibilities
// Example: (user)-[LEADS {leadership_type: "project_manager"}]->(project)

// PROJECT TO SKILL RELATIONSHIPS
// REQUIRES_SKILL - Project needs specific skills
// Properties: skill_importance (critical, important, nice_to_have), current_coverage
// Example: (project)-[REQUIRES_SKILL {skill_importance: "critical"}]->(skill)

// DEVELOPS_SKILL - Project helps develop skills in contributors
// Properties: skill_development_level, learning_opportunities
// Example: (project)-[DEVELOPS_SKILL]->(skill)

// PROJECT TO INTEREST RELATIONSHIPS
// ADDRESSES_INTEREST - Project works on specific interest/cause
// Properties: alignment_strength, primary_focus
// Example: (project)-[ADDRESSES_INTEREST {alignment_strength: "high"}]->(interest)

// PROJECT TO OUTCOME RELATIONSHIPS
// PRODUCES_OUTCOME - Project generates specific outcome
// Properties: contribution_percentage, outcome_confidence
// Example: (project)-[PRODUCES_OUTCOME {contribution_percentage: 0.8}]->(outcome)

// PROJECT TO LOCATION RELATIONSHIPS
// LOCATED_IN - Project operates in specific location
// Properties: location_type (primary, secondary, remote), impact_radius
// Example: (project)-[LOCATED_IN {location_type: "primary"}]->(location)

// IMPACTS_LOCATION - Project has impact on specific location
// Properties: impact_type, beneficiary_count, impact_start_date
// Example: (project)-[IMPACTS_LOCATION {impact_type: "environmental"}]->(location)

// USER TO LOCATION RELATIONSHIPS  
// LIVES_IN - User resides in location
// Properties: residence_type (permanent, temporary), since_date
// Example: (user)-[LIVES_IN]->(location)

// WORKS_IN - User works in location
// Properties: work_arrangement (remote, hybrid, on_site), frequency
// Example: (user)-[WORKS_IN]->(location)

// USER TO USER RELATIONSHIPS
// COLLABORATES_WITH - Users work together
// Properties: collaboration_frequency, relationship_strength, collaboration_types
// Example: (user1)-[COLLABORATES_WITH {relationship_strength: 0.8}]->(user2)

// MENTORS - User mentors another user
// Properties: mentorship_area, start_date, meeting_frequency
// Example: (user1)-[MENTORS {mentorship_area: "data_analysis"}]->(user2)

// CONNECTED_TO - General connection/network relationship
// Properties: connection_strength, connection_type, mutual_connections
// Example: (user1)-[CONNECTED_TO]->(user2)

// PROJECT TO PROJECT RELATIONSHIPS
// RELATED_TO - Projects are conceptually related
// Properties: relationship_type (similar_domain, shared_resources, sequential)
// Example: (project1)-[RELATED_TO {relationship_type: "similar_domain"}]->(project2)

// DEPENDS_ON - Project depends on another project
// Properties: dependency_type, dependency_strength, critical_path
// Example: (project1)-[DEPENDS_ON]->(project2)

// COLLABORATION_INSTANCE - Specific collaboration between projects
// Properties: collaboration_start, collaboration_details, shared_resources
// Example: (project1)-[COLLABORATION_INSTANCE]->(project2)

// ORGANIZATION RELATIONSHIPS
// MEMBER_OF - User is member of organization
// Properties: role, membership_type, start_date, status
// Example: (user)-[MEMBER_OF {role: "volunteer"}]->(organization)

// PARTNERS_WITH - Project partners with organization
// Properties: partnership_type, contribution_type, partnership_value
// Example: (project)-[PARTNERS_WITH]->(organization)

// FUNDS - Organization funds project/outcome
// Properties: funding_amount, funding_type, funding_date
// Example: (organization)-[FUNDS]->(project)

// EVENT RELATIONSHIPS
// PARTICIPATES_IN - User participates in event
// Properties: participation_type, attendance_status
// Example: (user)-[PARTICIPATES_IN]->(event)

// TRIGGERS_EVENT - Action/entity triggers event
// Properties: trigger_type, causality_confidence
// Example: (outcome)-[TRIGGERS_EVENT]->(event)

// OUTCOME RELATIONSHIPS
// BENEFITS_FROM - User/location benefits from outcome
// Properties: benefit_type, benefit_magnitude
// Example: (user)-[BENEFITS_FROM]->(outcome)

// CONTRIBUTES_TO_OUTCOME - User contributes to achieving outcome
// Properties: contribution_percentage, contribution_type
// Example: (user)-[CONTRIBUTES_TO_OUTCOME]->(outcome)

// =============================================
// TEMPORAL RELATIONSHIPS
// =============================================

// PRECEDED_BY - Temporal sequence relationship
// Properties: time_gap, sequence_type
// Example: (event1)-[PRECEDED_BY]->(event2)

// INFLUENCED_BY - Influence relationship over time
// Properties: influence_strength, influence_type, time_period
// Example: (project)-[INFLUENCED_BY]->(outcome)

// =============================================
// SEMANTIC RELATIONSHIPS
// =============================================

// SIMILAR_TO - Semantic similarity
// Properties: similarity_score, similarity_dimensions
// Example: (skill1)-[SIMILAR_TO {similarity_score: 0.85}]->(skill2)

// PART_OF - Hierarchical relationship
// Properties: hierarchical_level, inclusion_percentage
// Example: (skill)-[PART_OF]->(skill_category)

// ENABLES - Enablement relationship
// Properties: enablement_strength, enablement_type
// Example: (skill1)-[ENABLES]->(skill2)

// =============================================
// CONSTRAINTS AND INDEXES
// =============================================

// Unique constraints for key identifiers (already defined above)

// Property indexes for common queries
CREATE INDEX user_display_name_index FOR (u:User) ON (u.display_name);
CREATE INDEX user_location_index FOR (u:User) ON (u.location);
CREATE INDEX project_status_index FOR (p:Project) ON (p.status);
CREATE INDEX project_category_index FOR (p:Project) ON (p.category);
CREATE INDEX skill_category_index FOR (s:Skill) ON (s.category);
CREATE INDEX interest_category_index FOR (i:Interest) ON (i.category);
CREATE INDEX outcome_type_index FOR (o:Outcome) ON (o.outcome_type);
CREATE INDEX location_type_index FOR (l:Location) ON (l.type);

// Composite indexes for relationship queries
CREATE INDEX user_skill_proficiency_index FOR ()-[r:HAS_SKILL]-() ON (r.proficiency_level);
CREATE INDEX user_project_contribution_index FOR ()-[r:CONTRIBUTES_TO]-() ON (r.role, r.hours_per_week);
CREATE INDEX collaboration_strength_index FOR ()-[r:COLLABORATES_WITH]-() ON (r.relationship_strength);
CREATE INDEX project_skill_importance_index FOR ()-[r:REQUIRES_SKILL]-() ON (r.skill_importance);

// Text indexes for name-based searches (Neo4j 5.x feature)
CREATE TEXT INDEX skill_name_text_index FOR (s:Skill) ON (s.name);
CREATE TEXT INDEX interest_name_text_index FOR (i:Interest) ON (i.name);
CREATE TEXT INDEX project_name_text_index FOR (p:Project) ON (p.name);
CREATE TEXT INDEX user_display_name_text_index FOR (u:User) ON (u.display_name);

// Range indexes for temporal queries
CREATE RANGE INDEX user_created_at_range_index FOR (u:User) ON (u.created_at);
CREATE RANGE INDEX project_created_at_range_index FOR (p:Project) ON (p.created_at);
CREATE RANGE INDEX outcome_created_at_range_index FOR (o:Outcome) ON (o.created_at);

// =============================================
// SCHEMA DOCUMENTATION
// =============================================

// This knowledge graph schema is designed to:
// 1. Complement PostgreSQL relational data with graph relationships
// 2. Enable complex traversal queries for collaboration matching
// 3. Support recommendation systems for skills and projects  
// 4. Facilitate network analysis and community insights
// 5. Provide semantic relationships for AI/ML applications

// Key design principles:
// - Node properties focus on searchable/traversable attributes
// - Relationship properties capture context and strength
// - Temporal relationships enable timeline analysis
// - Semantic relationships support similarity and recommendation
// - Indexes optimize for common graph traversal patterns

// Sync strategy with PostgreSQL:
// - Periodic batch sync for core entities (users, projects, outcomes)
// - Real-time event-driven sync for relationship changes
// - Conflict resolution favors PostgreSQL as source of truth
// - Graph relationships can be derived and don't require PostgreSQL storage
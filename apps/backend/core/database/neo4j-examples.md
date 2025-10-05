# Neo4j Knowledge Graph Examples

This document provides practical examples of using the ACT Community Knowledge Graph built with Neo4j v5.

## Overview

The ACT Community Knowledge Graph represents relationships between users, projects, skills, interests, outcomes, and other community entities. It enables complex queries for collaboration matching, recommendation systems, and community insights.

## Schema Summary

### Node Types
- **User**: Community members with profiles and preferences
- **Project**: Community projects and initiatives  
- **Skill**: Technical and domain expertise areas
- **Interest**: Topics, causes, and areas of focus
- **Outcome**: Measurable project results and impact
- **Event**: Significant community milestones
- **Location**: Geographic locations for regional analysis
- **Organization**: Partner organizations and institutions
- **Collaboration**: Specific collaboration instances

### Key Relationships
- `HAS_SKILL`, `WANTS_TO_LEARN`, `TEACHES` (User ↔ Skill)
- `INTERESTED_IN` (User ↔ Interest)
- `FOLLOWS`, `CONTRIBUTES_TO`, `LEADS` (User ↔ Project)
- `COLLABORATES_WITH`, `MENTORS` (User ↔ User)
- `REQUIRES_SKILL`, `DEVELOPS_SKILL` (Project ↔ Skill)
- `ADDRESSES_INTEREST` (Project ↔ Interest)
- `PRODUCES_OUTCOME` (Project ↔ Outcome)
- `LOCATED_IN`, `IMPACTS_LOCATION` (Entity ↔ Location)

## Basic Query Examples

### 1. Find All Users with Specific Skills

```cypher
// Find users with data analysis skills
MATCH (u:User)-[r:HAS_SKILL]->(s:Skill {name: "data_analysis"})
RETURN u.display_name as name, 
       u.location as location,
       r.proficiency_level as skill_level
ORDER BY r.proficiency_level DESC
```

### 2. Get Project Recommendations for a User

```cypher
// Recommend projects based on user interests and skills
MATCH (u:User {user_id: $userId})-[:INTERESTED_IN]->(i:Interest)<-[:ADDRESSES_INTEREST]-(p:Project)
WHERE p.status IN ['active', 'seed']
WITH u, p, count(i) as interest_matches

OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)<-[:REQUIRES_SKILL]-(p)
WITH u, p, interest_matches, count(s) as skill_matches

RETURN p.name as project_name,
       p.summary as description,
       p.status as status,
       interest_matches,
       skill_matches,
       (interest_matches * 2 + skill_matches * 3) as recommendation_score
ORDER BY recommendation_score DESC
LIMIT 5
```

### 3. Find Potential Collaborators

```cypher
// Find collaborators with complementary skills
MATCH (u:User {user_id: $userId})-[:WANTS_TO_LEARN]->(skill:Skill)<-[:HAS_SKILL]-(collaborator:User)
WHERE collaborator.user_id <> $userId
WITH u, collaborator, collect(skill.name) as teaching_skills

MATCH (u)-[:HAS_SKILL]->(skill2:Skill)<-[:WANTS_TO_LEARN]-(collaborator)
WITH u, collaborator, teaching_skills, collect(skill2.name) as learning_skills

OPTIONAL MATCH (u)-[:INTERESTED_IN]->(interest:Interest)<-[:INTERESTED_IN]-(collaborator)
WITH u, collaborator, teaching_skills, learning_skills, collect(interest.name) as shared_interests

RETURN collaborator.display_name as name,
       collaborator.location as location,
       teaching_skills,
       learning_skills,
       shared_interests,
       (size(teaching_skills) * 3 + size(learning_skills) * 3 + size(shared_interests) * 2) as collaboration_score
ORDER BY collaboration_score DESC
LIMIT 10
```

## Advanced Query Examples

### 4. Community Network Analysis

```cypher
// Find most connected community members
MATCH (u:User)
OPTIONAL MATCH (u)-[:COLLABORATES_WITH]-(c:User)
WITH u, count(c) as collaboration_count

OPTIONAL MATCH (u)-[:CONTRIBUTES_TO]-(p:Project)
WITH u, collaboration_count, count(p) as project_count

OPTIONAL MATCH (u)-[:MENTORS]-(m:User)
WITH u, collaboration_count, project_count, count(m) as mentorship_count

RETURN u.display_name as name,
       collaboration_count,
       project_count,
       mentorship_count,
       (collaboration_count * 2 + project_count + mentorship_count * 3) as community_influence_score
ORDER BY community_influence_score DESC
LIMIT 20
```

### 5. Project Impact Chains

```cypher
// Find projects that influence other projects through outcomes
MATCH (p1:Project)-[:PRODUCES_OUTCOME]->(o:Outcome)-[:INFLUENCES]->(p2:Project)
RETURN p1.name as source_project,
       o.title as outcome,
       p2.name as influenced_project,
       o.verification_status as verified
ORDER BY o.verification_status DESC, p1.name
```

### 6. Skill Gap Analysis

```cypher
// Find skills in demand but with few available teachers
MATCH (p:Project)-[r:REQUIRES_SKILL]->(s:Skill)
WHERE r.skill_importance IN ['critical', 'important']
WITH s, count(p) as demand_count

OPTIONAL MATCH (u:User)-[:TEACHES]->(s)
WITH s, demand_count, count(u) as teacher_count

WHERE demand_count > teacher_count * 2  // More than 2x demand vs supply
RETURN s.name as skill_name,
       demand_count,
       teacher_count,
       (demand_count - teacher_count) as skill_gap
ORDER BY skill_gap DESC
LIMIT 15
```

### 7. Regional Impact Analysis

```cypher
// Analyze project impact by geographic region
MATCH (p:Project)-[:IMPACTS_LOCATION]->(l:Location)
WHERE l.type IN ['city', 'state']

OPTIONAL MATCH (p)-[:PRODUCES_OUTCOME]->(o:Outcome)
WHERE o.verification_status = 'verified'

WITH l, count(DISTINCT p) as project_count, count(DISTINCT o) as verified_outcomes

OPTIONAL MATCH (u:User)-[:LIVES_IN]->(l)
WITH l, project_count, verified_outcomes, count(u) as local_users

RETURN l.name as location,
       l.type as location_type,
       project_count,
       verified_outcomes,
       local_users,
       CASE WHEN local_users > 0 THEN project_count / local_users ELSE 0 END as projects_per_user
ORDER BY verified_outcomes DESC, project_count DESC
```

### 8. Collaboration Success Patterns

```cypher
// Find successful collaboration patterns
MATCH (u1:User)-[:COLLABORATES_WITH]-(u2:User)
WHERE u1.user_id < u2.user_id  // Avoid duplicates

OPTIONAL MATCH (u1)-[:CONTRIBUTES_TO]->(p:Project)<-[:CONTRIBUTES_TO]-(u2)
WITH u1, u2, collect(p) as shared_projects

OPTIONAL MATCH (p)-[:PRODUCES_OUTCOME]->(o:Outcome)
WHERE o.verification_status = 'verified' AND p IN shared_projects
WITH u1, u2, shared_projects, count(o) as successful_outcomes

WHERE size(shared_projects) > 0
RETURN u1.display_name as collaborator1,
       u2.display_name as collaborator2,
       size(shared_projects) as projects_together,
       successful_outcomes,
       CASE WHEN size(shared_projects) > 0 THEN successful_outcomes / size(shared_projects) ELSE 0 END as success_rate
ORDER BY success_rate DESC, successful_outcomes DESC
LIMIT 20
```

### 9. Learning Path Recommendations

```cypher
// Suggest learning paths based on skill relationships
MATCH (u:User {user_id: $userId})-[:WANTS_TO_LEARN]->(target_skill:Skill)

// Find prerequisite skills
OPTIONAL MATCH (prerequisite:Skill)-[:ENABLES]->(target_skill)
WHERE NOT EXISTS((u)-[:HAS_SKILL]->(prerequisite))

// Find related skills that are often learned together
OPTIONAL MATCH (other_users:User)-[:HAS_SKILL]->(target_skill)
MATCH (other_users)-[:HAS_SKILL]->(related_skill:Skill)
WHERE related_skill <> target_skill 
  AND NOT EXISTS((u)-[:HAS_SKILL]->(related_skill))
WITH target_skill, prerequisite, related_skill, count(other_users) as co_occurrence

RETURN target_skill.name as target,
       collect(DISTINCT prerequisite.name) as prerequisites,
       collect({skill: related_skill.name, frequency: co_occurrence}) as related_skills
ORDER BY target_skill.name
```

### 10. Community Health Metrics

```cypher
// Calculate community engagement and diversity metrics
MATCH (u:User)
WHERE u.account_status = 'active'
WITH count(u) as total_users

MATCH (active_users:User)-[:CONTRIBUTES_TO]->(p:Project)
WITH total_users, count(DISTINCT active_users) as contributing_users

MATCH (p:Project)
WHERE p.status = 'active'
WITH total_users, contributing_users, count(p) as active_projects

MATCH (collaboration:User)-[:COLLABORATES_WITH]->(collaborator:User)
WITH total_users, contributing_users, active_projects, count(collaboration) as total_collaborations

// Calculate diversity (unique skills and interests)
MATCH (s:Skill)<-[:HAS_SKILL]-(:User)
WITH total_users, contributing_users, active_projects, total_collaborations, count(DISTINCT s) as skill_diversity

MATCH (i:Interest)<-[:INTERESTED_IN]-(:User)
WITH total_users, contributing_users, active_projects, total_collaborations, skill_diversity, count(DISTINCT i) as interest_diversity

RETURN total_users,
       contributing_users,
       ROUND(contributing_users * 100.0 / total_users, 2) as participation_rate,
       active_projects,
       ROUND(active_projects * 1.0 / contributing_users, 2) as projects_per_contributor,
       total_collaborations,
       skill_diversity,
       interest_diversity,
       ROUND((skill_diversity + interest_diversity) * 1.0 / total_users, 2) as diversity_index
```

## Data Synchronization Examples

### 11. Sync User from PostgreSQL

```cypher
// Create or update user node with profile data
MERGE (u:User {user_id: $user_id})
SET u.email = $email,
    u.display_name = $display_name,
    u.account_status = $account_status,
    u.location = $location,
    u.created_at = $created_at,
    u.last_active_at = $last_active_at,
    u.onboarding_completed = $onboarding_completed,
    u.updated_at = timestamp()

// Sync user interests
UNWIND $interests as interest_name
MERGE (i:Interest {name: toLower(interest_name)})
MERGE (u)-[r:INTERESTED_IN]->(i)
SET r.interest_level = coalesce(r.interest_level, "medium"),
    r.since_date = coalesce(r.since_date, date()),
    r.updated_at = timestamp()

// Sync user skills  
UNWIND $expertise_areas as skill_name
MERGE (s:Skill {name: toLower(skill_name)})
SET s.category = "expertise"
MERGE (u)-[rs:HAS_SKILL]->(s)
SET rs.proficiency_level = coalesce(rs.proficiency_level, "intermediate"),
    rs.verified_by = "self_reported",
    rs.acquired_date = coalesce(rs.acquired_date, date()),
    rs.updated_at = timestamp()

RETURN u
```

### 12. Sync Project Data

```cypher
// Create or update project node
MERGE (p:Project {project_id: $project_id})
SET p.name = $name,
    p.slug = $slug,
    p.status = $status,
    p.summary = $summary,
    p.created_at = $created_at,
    p.updated_at = $updated_at,
    p.category = coalesce($category, "community"),
    p.location = $location

// Link to location if provided
WITH p
WHERE $location_name IS NOT NULL
MERGE (l:Location {name: $location_name})
SET l.type = coalesce(l.type, "city")
MERGE (p)-[:LOCATED_IN {location_type: "primary"}]->(l)

RETURN p
```

## Performance Optimization Queries

### 13. Create Indexes for Common Queries

```cypher
// Create indexes for frequently queried properties
CREATE INDEX user_id_index FOR (u:User) ON (u.user_id);
CREATE INDEX user_email_index FOR (u:User) ON (u.email);
CREATE INDEX project_id_index FOR (p:Project) ON (p.project_id);
CREATE INDEX project_status_index FOR (p:Project) ON (p.status);
CREATE INDEX skill_name_index FOR (s:Skill) ON (s.name);
CREATE INDEX interest_name_index FOR (i:Interest) ON (i.name);

// Create composite indexes for relationship queries
CREATE INDEX user_skill_proficiency FOR ()-[r:HAS_SKILL]-() ON (r.proficiency_level);
CREATE INDEX project_skill_importance FOR ()-[r:REQUIRES_SKILL]-() ON (r.skill_importance);
CREATE INDEX collaboration_strength FOR ()-[r:COLLABORATES_WITH]-() ON (r.relationship_strength);

// Create text indexes for search functionality
CREATE TEXT INDEX skill_name_text FOR (s:Skill) ON (s.name);
CREATE TEXT INDEX user_display_name_text FOR (u:User) ON (u.display_name);
CREATE TEXT INDEX project_name_text FOR (p:Project) ON (p.name);
```

### 14. Query Optimization Examples

```cypher
// Efficient way to find users with multiple criteria
MATCH (u:User)
WHERE u.account_status = 'active' 
  AND u.onboarding_completed = true
  AND u.location.country = 'Australia'

OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)
WHERE s.category = 'technical'

WITH u, count(s) as technical_skills
WHERE technical_skills >= 2

RETURN u.display_name, u.location, technical_skills
ORDER BY technical_skills DESC
```

## Integration Patterns

### 15. Real-time Sync Pattern

```javascript
// Example Node.js code for real-time sync
async function syncUserToKnowledgeGraph(userProfileData) {
  const query = `
    MERGE (u:User {user_id: $user_id})
    SET u += $properties
    SET u.updated_at = timestamp()
    RETURN u
  `;
  
  const parameters = {
    user_id: userProfileData.user_id,
    properties: {
      email: userProfileData.email,
      display_name: userProfileData.display_name,
      account_status: userProfileData.account_status,
      location: userProfileData.location || {}
    }
  };
  
  return await knowledgeGraphService.executeWrite(query, parameters);
}
```

### 16. Batch Processing Pattern

```cypher
// Efficient batch insert of multiple users
UNWIND $users as user_data
MERGE (u:User {user_id: user_data.user_id})
SET u.email = user_data.email,
    u.display_name = user_data.display_name,
    u.account_status = user_data.account_status,
    u.location = user_data.location,
    u.updated_at = timestamp()

// Batch create interests
UNWIND $interests as interest_data
MERGE (i:Interest {name: toLower(interest_data.name)})
SET i.category = interest_data.category,
    i.popularity_score = coalesce(i.popularity_score, 0) + 1

RETURN count(u) as users_processed, count(i) as interests_processed
```

## Troubleshooting and Maintenance

### 17. Health Check Queries

```cypher
// Check graph connectivity
MATCH (n)
RETURN labels(n) as node_type, count(n) as count
ORDER BY count DESC;

// Check relationship distribution
MATCH ()-[r]->()
RETURN type(r) as relationship_type, count(r) as count
ORDER BY count DESC;

// Find orphaned nodes (no relationships)
MATCH (n)
WHERE NOT EXISTS(()-[]->(n)) AND NOT EXISTS((n)-[]->())
RETURN labels(n) as orphaned_node_types, count(n) as count;
```

### 18. Data Quality Checks

```cypher
// Find users without essential properties
MATCH (u:User)
WHERE u.display_name IS NULL 
   OR u.email IS NULL 
   OR u.account_status IS NULL
RETURN count(u) as incomplete_users;

// Find projects without required skills
MATCH (p:Project)
WHERE p.status = 'active' 
  AND NOT EXISTS((p)-[:REQUIRES_SKILL]->())
RETURN p.name as projects_without_skills;

// Check for duplicate skills/interests
MATCH (s:Skill)
WITH s.name as skill_name, collect(s) as skill_nodes
WHERE size(skill_nodes) > 1
RETURN skill_name, size(skill_nodes) as duplicate_count;
```

## API Usage Examples

Using the RESTful endpoints with the knowledge graph service:

```bash
# Check knowledge graph health
curl http://localhost:4000/api/knowledge-graph/health

# Get statistics
curl -H "Authorization: Bearer $JWT_TOKEN" \
     http://localhost:4000/api/knowledge-graph/statistics

# Find collaborators for a user
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:4000/api/knowledge-graph/users/user-123/collaborators?limit=5"

# Get project recommendations
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:4000/api/knowledge-graph/users/user-123/project-recommendations"

# Sync user data
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -d '{"user_id": "user-123", "display_name": "John Doe", "interests": ["climate_action"]}' \
     http://localhost:4000/api/knowledge-graph/sync/user

# Execute custom query (admin only)
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"query": "MATCH (u:User) RETURN count(u)", "mode": "READ"}' \
     http://localhost:4000/api/knowledge-graph/query
```

This knowledge graph enables sophisticated community analysis, personalized recommendations, and collaborative matching that would be difficult to achieve with traditional relational databases alone.
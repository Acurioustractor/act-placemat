// Life OS Neo4j Query Library
// Common graph patterns and analytical queries for the ACT Life OS platform

// ==============================================
// COMMUNITY NETWORK ANALYSIS
// ==============================================

// 1. Find the most connected community members
MATCH (u:User)-[r]-()
WHERE u.isActive = true
RETURN u.name, u.location, 
       count(r) as total_connections,
       size([(u)-[:MEMBER_OF_COMMUNITY]->() | 1]) as communities,
       size([(u)-[:MEMBER_OF]->() | 1]) as projects,
       size([(u)-[:HAS_SKILL]->() | 1]) as skills
ORDER BY total_connections DESC
LIMIT 10;

// 2. Identify community skill gaps and surpluses
MATCH (c:Community)-[:HOSTS_PROJECT]->(p:Project)-[:REQUIRES_SKILL]->(s:Skill)
WITH c, s, count(p) as projects_needing_skill
OPTIONAL MATCH (c)<-[:MEMBER_OF_COMMUNITY]-(u:User)-[:HAS_SKILL]->(s)
WITH c, s, projects_needing_skill, count(u) as members_with_skill
RETURN c.name as community,
       s.name as skill,
       projects_needing_skill,
       members_with_skill,
       CASE 
         WHEN members_with_skill = 0 THEN 'CRITICAL_GAP'
         WHEN members_with_skill < projects_needing_skill THEN 'SKILL_SHORTAGE'
         WHEN members_with_skill >= projects_needing_skill * 2 THEN 'SKILL_SURPLUS'
         ELSE 'ADEQUATE'
       END as skill_status
ORDER BY c.name, 
         CASE skill_status 
           WHEN 'CRITICAL_GAP' THEN 1
           WHEN 'SKILL_SHORTAGE' THEN 2  
           WHEN 'ADEQUATE' THEN 3
           ELSE 4 END;

// 3. Find potential mentorship connections
MATCH (learner:User)-[:WANTS_SKILL]->(skill:Skill)<-[:HAS_SKILL]-(expert:User)
WHERE learner <> expert 
  AND NOT EXISTS((learner)-[:LEARNS_FROM]->(expert))
MATCH (learner)-[:MEMBER_OF_COMMUNITY]->(community)<-[:MEMBER_OF_COMMUNITY]-(expert)
WHERE expert.teachingWillingness = true
RETURN expert.name as potential_mentor,
       learner.name as potential_learner, 
       skill.name as skill_area,
       community.name as shared_community,
       skill.communityValue as importance
ORDER BY skill.communityValue DESC, community.name;

// ==============================================
// PROJECT COLLABORATION OPPORTUNITIES
// ==============================================

// 4. Find projects that should collaborate based on shared needs and resources
MATCH (p1:Project)-[:REQUIRES_SKILL]->(skill:Skill)<-[:HAS_SKILL]-(u:User)-[:MEMBER_OF]->(p2:Project)
WHERE p1 <> p2 
  AND NOT EXISTS((p1)-[:COLLABORATES_WITH]-(p2))
  AND p1.status = 'ACTIVE' AND p2.status = 'ACTIVE'
WITH p1, p2, collect(DISTINCT skill.name) as shared_skills,
     collect(DISTINCT u.name) as connecting_people
WHERE size(shared_skills) >= 1
RETURN p1.title as project1,
       p2.title as project2,  
       shared_skills,
       connecting_people,
       size(shared_skills) as skill_overlap_count
ORDER BY skill_overlap_count DESC
LIMIT 20;

// 5. Identify successful project patterns for replication  
MATCH (p:Project)-[:REQUIRES_SKILL]->(s:Skill)<-[:HAS_SKILL]-(u:User)
WHERE p.beautifulObsolescenceAlignment > 8.0
WITH p, collect(DISTINCT s.name) as required_skills, count(u) as skill_coverage
MATCH (p)<-[:MEMBER_OF]-(member:User)
WITH p, required_skills, skill_coverage, count(member) as team_size
RETURN p.title as successful_project,
       p.category as category,
       p.beautifulObsolescenceAlignment as alignment_score,
       required_skills,
       skill_coverage,
       team_size,
       p.location as location
ORDER BY p.beautifulObsolescenceAlignment DESC;

// ==============================================
// HABIT AND GOAL ANALYSIS  
// ==============================================

// 6. Discover successful habit patterns and combinations
MATCH (u:User)-[:HAS_HABIT]->(h1:Habit)-[:INFLUENCES_HABIT {influenceType: 'POSITIVE'}]->(h2:Habit)
WHERE u-[:HAS_HABIT]->h2 
  AND h1.currentStreak > 10
  AND h2.currentStreak > 10
WITH h1, h2, count(u) as users_with_pattern,
     avg(h1.currentStreak) as avg_h1_streak,
     avg(h2.currentStreak) as avg_h2_streak
WHERE users_with_pattern >= 2
RETURN h1.name + ' → ' + h2.name as habit_combination,
       h1.category as primary_category,
       h2.category as secondary_category,
       users_with_pattern,
       round(avg_h1_streak, 1) as avg_primary_streak,
       round(avg_h2_streak, 1) as avg_secondary_streak
ORDER BY users_with_pattern DESC;

// 7. Identify goals with strong community support networks
MATCH (u:User)-[:PURSUES_GOAL]->(g:Goal)
WHERE g.status = 'ACTIVE' AND g.communityBenefit = true
WITH g, count(u) as pursuers
MATCH (g)<-[:SUPPORTS_GOAL]-(supporting_goal:Goal)<-[:PURSUES_GOAL]-(supporter:User)
WITH g, pursuers, count(DISTINCT supporter) as supporters
WHERE pursuers >= 1
OPTIONAL MATCH (g)<-[:CONTRIBUTES_TO_GOAL]-(h:Habit)<-[:HAS_HABIT]-(habit_user:User)
WITH g, pursuers, supporters, count(DISTINCT habit_user) as habit_contributors
RETURN g.title as community_goal,
       g.category as category,
       pursuers,
       supporters, 
       habit_contributors,
       round(g.progress, 1) as current_progress
ORDER BY (pursuers + supporters + habit_contributors) DESC;

// 8. Find habit-goal-skill learning pathways
MATCH path = (u:User)-[:HAS_HABIT]->(h:Habit)-[:CONTRIBUTES_TO_GOAL]->(g:Goal)
              -[:REQUIRES_SKILL]->(s:Skill)
WHERE g.status = 'ACTIVE' AND h.isActive = true
AND NOT (u)-[:HAS_SKILL]->(s)
RETURN u.name as learner,
       h.name as supporting_habit,
       g.title as target_goal,
       s.name as skill_to_develop,
       g.progress as current_progress,
       h.currentStreak as habit_consistency
ORDER BY g.progress DESC, h.currentStreak DESC;

// ==============================================
// KNOWLEDGE FLOW AND LEARNING NETWORKS
// ==============================================

// 9. Map knowledge flow through stories and topics
MATCH (author:User)-[:WROTE]->(story:Story)-[:COVERS_TOPIC]->(topic:Topic)
      <-[:INTERESTED_IN]-(reader:User)
WHERE author <> reader
  AND EXISTS((reader)-[:MEMBER_OF_COMMUNITY]->(:Community)<-[:MEMBER_OF_COMMUNITY]-(author))
WITH topic, 
     collect(DISTINCT author.name) as authors,
     collect(DISTINCT reader.name) as readers,
     count(DISTINCT story) as story_count
WHERE story_count >= 1
RETURN topic.name as knowledge_area,
       story_count,
       size(authors) as knowledge_creators,
       size(readers) as knowledge_consumers,
       round(size(readers) * 1.0 / size(authors), 2) as reader_to_author_ratio
ORDER BY story_count DESC;

// 10. Identify expertise distribution across communities  
MATCH (expert:User)-[:EXPERT_IN]->(topic:Topic)
MATCH (expert)-[:MEMBER_OF_COMMUNITY]->(community:Community)
WITH topic, community, count(expert) as expert_count,
     collect(expert.name) as experts
RETURN topic.name as expertise_area,
       collect({
         community: community.name,
         expert_count: expert_count,
         sample_experts: experts[0..2]
       }) as community_distribution,
       sum(expert_count) as total_experts
ORDER BY total_experts DESC;

// ==============================================
// BEAUTIFUL OBSOLESCENCE TRACKING
// ==============================================

// 11. Track progress toward making extractive systems obsolete
MATCH (u:User)-[:MEMBER_OF_COMMUNITY]->(c:Community)-[:HOSTS_PROJECT]->(p:Project)
WHERE u.extractiveSystemsTargeting = true 
  AND p.beautifulObsolescenceAlignment > 7.0
WITH u, 
     collect(DISTINCT p.extractiveAlternative) as project_alternatives,
     collect(DISTINCT c.extractiveSystemReplacement) as community_alternatives,
     avg(p.beautifulObsolescenceAlignment) as avg_alignment
RETURN u.name as changemaker,
       u.location as location,  
       size(project_alternatives) + size(community_alternatives) as systems_targeted,
       project_alternatives[0..3] as sample_project_alternatives,
       community_alternatives[0..3] as sample_community_alternatives,
       round(avg_alignment, 1) as average_alignment_score
ORDER BY systems_targeted DESC, avg_alignment DESC;

// 12. Measure community autonomy and ownership patterns
MATCH (c:Community)
WHERE c.communityOwnership = true
WITH c
MATCH (c)-[:HOSTS_PROJECT]->(p:Project)
WITH c, count(p) as total_projects,
     sum(CASE WHEN p.communityOwned = true THEN 1 ELSE 0 END) as community_owned_projects
MATCH (c)<-[:MEMBER_OF_COMMUNITY]-(u:User)
WITH c, total_projects, community_owned_projects, count(u) as member_count
WHERE total_projects > 0
RETURN c.name as community,
       c.location as location,
       member_count,
       total_projects,
       community_owned_projects,
       round((community_owned_projects * 1.0 / total_projects) * 100, 1) as ownership_percentage,
       c.valueDistributionModel as distribution_model
ORDER BY ownership_percentage DESC, member_count DESC;

// ==============================================
// COMMUNITY RESILIENCE METRICS
// ==============================================

// 13. Calculate community skill resilience scores
MATCH (c:Community)-[:HOSTS_PROJECT]->(p:Project)-[:REQUIRES_SKILL]->(s:Skill)
WITH c, s, count(p) as projects_needing
MATCH (c)<-[:MEMBER_OF_COMMUNITY]-(u:User)-[:HAS_SKILL]->(s)  
WITH c, s, projects_needing, count(u) as members_with_skill
WITH c, 
     collect({
       skill: s.name,
       demand: projects_needing,
       supply: members_with_skill,
       resilience: CASE 
         WHEN members_with_skill >= projects_needing * 2 THEN 3
         WHEN members_with_skill >= projects_needing THEN 2  
         WHEN members_with_skill > 0 THEN 1
         ELSE 0
       END
     }) as skill_analysis
RETURN c.name as community,
       size(skill_analysis) as total_skills_needed,
       round(reduce(total = 0.0, skill IN skill_analysis | total + skill.resilience) / size(skill_analysis), 2) as skill_resilience_score,
       [skill IN skill_analysis WHERE skill.resilience = 0 | skill.skill] as critical_gaps
ORDER BY skill_resilience_score DESC;

// 14. Find community bridge builders (high betweenness centrality)
MATCH (c1:Community)<-[:MEMBER_OF_COMMUNITY]-(u:User)-[:MEMBER_OF_COMMUNITY]->(c2:Community)
WHERE c1 <> c2
WITH u, collect(DISTINCT c1.name + ' ↔ ' + c2.name) as community_bridges
WHERE size(community_bridges) >= 2
MATCH (u)-[r]-()
RETURN u.name as bridge_builder,
       u.location as location,
       size(community_bridges) as communities_bridged,
       community_bridges,
       count(r) as total_connections
ORDER BY communities_bridged DESC, total_connections DESC;

// ==============================================  
// TEMPORAL ANALYSIS QUERIES
// ==============================================

// 15. Track habit adoption patterns over time
MATCH (u:User)-[rel:HAS_HABIT]->(h:Habit)
WHERE h.isActive = true
WITH h, rel.adoptedDate as adoption_date, count(u) as adopters
ORDER BY adoption_date
WITH h, 
     collect({date: adoption_date, cumulative: sum(adopters)}) as adoption_timeline
RETURN h.name as habit,
       h.category as category, 
       size(adoption_timeline) as adoption_periods,
       adoption_timeline[-1].cumulative as total_adopters,
       adoption_timeline[0].date as first_adoption,
       adoption_timeline[-1].date as latest_adoption
ORDER BY total_adopters DESC;

// 16. Community growth and engagement patterns
MATCH (c:Community)<-[rel:MEMBER_OF_COMMUNITY]-(u:User)
WITH c, rel.since as join_date, u
ORDER BY join_date  
WITH c, collect({date: join_date, member: u.name}) as member_timeline
RETURN c.name as community,
       c.location as location,
       size(member_timeline) as total_members,
       member_timeline[0].date as founded_date,
       member_timeline[-1].date as latest_member_date,
       duration.between(member_timeline[0].date, date()).months as age_months
ORDER BY total_members DESC;

// ==============================================
// IMPACT AND INFLUENCE ANALYSIS  
// ==============================================

// 17. Calculate user influence scores based on network effects
MATCH (u:User)
WHERE u.isActive = true
WITH u,
     size([(u)-[:TEACHES_SKILL]->() | 1]) as teaching_reach,
     size([(u)-[:MENTORS]->() | 1]) as mentoring_reach,
     size([(u)-[:LEADS]->() | 1]) as leadership_reach,
     size([(u)-[:WROTE]->() | 1]) as content_creation
OPTIONAL MATCH (u)-[:WROTE]->(s:Story)
WITH u, teaching_reach, mentoring_reach, leadership_reach, content_creation,
     sum(s.viewCount) as total_story_views
RETURN u.name as influential_member,
       u.location as location,
       (teaching_reach * 3 + mentoring_reach * 2 + leadership_reach * 4 + content_creation + coalesce(total_story_views, 0) / 100) as influence_score,
       {
         teaching: teaching_reach,
         mentoring: mentoring_reach, 
         leadership: leadership_reach,
         content: content_creation,
         story_views: coalesce(total_story_views, 0)
       } as influence_breakdown
ORDER BY influence_score DESC
LIMIT 15;

// 18. Identify high-impact stories and their network effects
MATCH (author:User)-[:WROTE]->(story:Story)
WHERE story.impactScore > 7.0
WITH story, author
MATCH (story)<-[:READS]-(reader:User)
WITH story, author, collect(reader.name) as readers
MATCH (story)-[:COVERS_TOPIC]->(topic:Topic)<-[:INTERESTED_IN]-(interested:User)
WITH story, author, readers, topic, count(interested) as topic_followers
RETURN story.title as high_impact_story,
       author.name as author,
       story.impactScore as impact_score,
       size(readers) as direct_readers,
       topic.name as main_topic,
       topic_followers as topic_community_size,
       story.viewCount as total_views
ORDER BY story.impactScore DESC;

// ==============================================
// RESOURCE SHARING AND COLLABORATION
// ==============================================

// 19. Find optimal resource sharing opportunities
MATCH (p1:Project)-[:REQUIRES_SKILL]->(s:Skill)<-[:HAS_SKILL]-(u:User)-[:MEMBER_OF]->(p2:Project)
WHERE p1 <> p2 AND p1.status = 'ACTIVE' AND p2.status = 'ACTIVE'
WITH p1, p2, collect(DISTINCT {skill: s.name, person: u.name}) as shared_resources
WHERE size(shared_resources) >= 2
MATCH (p1)<-[:MEMBER_OF]-(m1:User)-[:MEMBER_OF_COMMUNITY]->(c:Community)<-[:MEMBER_OF_COMMUNITY]-(m2:User)-[:MEMBER_OF]->(p2)
RETURN p1.title as project1,
       p2.title as project2,
       c.name as connecting_community,
       size(shared_resources) as resource_overlap,
       [r IN shared_resources | r.skill + ' (' + r.person + ')'] as available_resources
ORDER BY resource_overlap DESC
LIMIT 10;

// 20. Community resource distribution fairness analysis  
MATCH (c:Community)<-[:MEMBER_OF_COMMUNITY]-(u:User)
WITH c, count(u) as total_members
MATCH (c)-[:HOSTS_PROJECT]->(p:Project)<-[:MEMBER_OF]-(member:User)
WITH c, total_members, count(DISTINCT member) as active_project_members,
     count(p) as total_projects
RETURN c.name as community,
       total_members,
       active_project_members, 
       round((active_project_members * 1.0 / total_members) * 100, 1) as engagement_percentage,
       total_projects,
       round(total_projects * 1.0 / total_members, 2) as projects_per_member
ORDER BY engagement_percentage DESC;
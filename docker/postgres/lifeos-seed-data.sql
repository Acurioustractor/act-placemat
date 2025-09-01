-- Life OS Seed Data
-- Initial data for ACT Life Operating System with Beautiful Obsolescence principles
-- Australian community focus and timezone compliance

-- Insert demo users for Life OS development
INSERT INTO "User" (id, email, name, location, timezone, "dataResidencyPreference") VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'alice.melbourne@act.org.au', 'Alice Chen', 'Melbourne, Victoria', 'Australia/Melbourne', 'Australia'),
    ('550e8400-e29b-41d4-a716-446655440002', 'bob.sydney@act.org.au', 'Bob Williams', 'Sydney, New South Wales', 'Australia/Sydney', 'Australia'),
    ('550e8400-e29b-41d4-a716-446655440003', 'clara.brisbane@act.org.au', 'Clara Thompson', 'Brisbane, Queensland', 'Australia/Brisbane', 'Australia'),
    ('550e8400-e29b-41d4-a716-446655440004', 'david.perth@act.org.au', 'David Kumar', 'Perth, Western Australia', 'Australia/Perth', 'Australia'),
    ('550e8400-e29b-41d4-a716-446655440005', 'emma.adelaide@act.org.au', 'Emma Rodriguez', 'Adelaide, South Australia', 'Australia/Adelaide', 'Australia')
ON CONFLICT (id) DO NOTHING;

-- Create Life OS profiles for demo users
INSERT INTO "LifeOSProfile" (id, "userId", timezone, locale, currency, "dataResidencyPreference", "extractiveSystemsTargeting", "communityControlEnabled", "onboardingCompleted", "activationDate") VALUES
    ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Australia/Melbourne', 'en-AU', 'AUD', 'Australia', true, true, true, NOW() - INTERVAL '30 days'),
    ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Australia/Sydney', 'en-AU', 'AUD', 'Australia', true, true, true, NOW() - INTERVAL '25 days'),
    ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Australia/Brisbane', 'en-AU', 'AUD', 'Australia', true, true, true, NOW() - INTERVAL '20 days'),
    ('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'Australia/Perth', 'en-AU', 'AUD', 'Australia', true, true, true, NOW() - INTERVAL '15 days'),
    ('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'Australia/Adelaide', 'en-AU', 'AUD', 'Australia', true, true, true, NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- Insert Beautiful Obsolescence aligned habits
INSERT INTO "Habit" (id, "profileId", name, description, category, frequency, "targetValue", unit, "isActive", "currentStreak", "longestStreak", "beautifulObsolescenceAlignment", "communityBenefit") VALUES
    ('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'Support Local Cooperatives', 'Shop at worker-owned cooperatives instead of corporate chains', 'Economic Justice', 'WEEKLY', 3, 'visits', true, 8, 12, 9.5, true),
    ('750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', 'Community Garden Work', 'Participate in local food production systems', 'Food Sovereignty', 'WEEKLY', 2, 'hours', true, 15, 20, 9.8, true),
    ('750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440002', 'Skill Sharing Sessions', 'Teach skills to reduce dependency on corporate services', 'Knowledge Sharing', 'MONTHLY', 1, 'sessions', true, 6, 8, 9.2, true),
    ('750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440002', 'Digital Privacy Practices', 'Use alternatives to extractive tech platforms', 'Digital Sovereignty', 'DAILY', 1, 'actions', true, 45, 60, 8.9, true),
    ('750e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440003', 'Community Decision Making', 'Participate in democratic community processes', 'Democratic Participation', 'WEEKLY', 1, 'meetings', true, 12, 18, 9.7, true)
ON CONFLICT (id) DO NOTHING;

-- Insert habit completions with realistic streak data
INSERT INTO "HabitCompletion" (id, "habitId", "completedAt", value, notes, satisfaction, difficulty) VALUES
    -- Alice's Local Cooperative visits (weekly habit, 8-week streak)
    ('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '1 week', 3, 'Visited food co-op and bookshop cooperative', 9, 2),
    ('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '2 weeks', 4, 'Found new housing cooperative to support', 10, 1),
    ('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '3 weeks', 2, 'Local repair cafe and bike co-op', 8, 3),
    
    -- Bob's Digital Privacy (daily habit, recent streak)
    ('850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '1 day', 1, 'Used Signal instead of WhatsApp', 8, 2),
    ('850e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '2 days', 1, 'Switched to Mastodon for social media', 9, 3),
    ('850e8400-e29b-41d4-a716-446655440006', '750e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '3 days', 1, 'Used DuckDuckGo instead of Google', 7, 1)
ON CONFLICT (id) DO NOTHING;

-- Insert Beautiful Obsolescence aligned goals
INSERT INTO "Goal" (id, "profileId", title, description, category, "targetValue", "currentValue", unit, "targetDate", status, priority, "isPublic", "communityBenefit", "beautifulObsolescenceAlignment", "extractiveAlternative") VALUES
    ('950e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'Create Community Tool Library', 'Establish a shared tool library to reduce individual consumption', 'Resource Sharing', 100, 35, 'tools', NOW() + INTERVAL '6 months', 'ACTIVE', 'HIGH', true, true, 9.8, 'Corporate tool rental chains'),
    ('950e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'Launch Neighbourhood Skill Exchange', 'Platform for trading skills without money', 'Community Economy', 50, 18, 'participants', NOW() + INTERVAL '4 months', 'ACTIVE', 'HIGH', true, true, 9.5, 'Gig economy platforms'),
    ('950e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', 'Establish Community Land Trust', 'Remove land from commodity speculation', 'Housing Justice', 1, 0.4, 'properties', NOW() + INTERVAL '2 years', 'ACTIVE', 'HIGH', true, true, 9.9, 'Real estate investment trusts'),
    ('950e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440004', 'Food Forest Development', 'Create permaculture food system for community', 'Food Sovereignty', 5, 1.2, 'hectares', NOW() + INTERVAL '18 months', 'ACTIVE', 'MEDIUM', true, true, 9.6, 'Industrial agriculture'),
    ('950e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440005', 'Worker Cooperative Incubator', 'Help start 10 new worker cooperatives', 'Economic Democracy', 10, 3, 'cooperatives', NOW() + INTERVAL '1 year', 'ACTIVE', 'HIGH', true, true, 9.7, 'Venture capital startups')
ON CONFLICT (id) DO NOTHING;

-- Insert goal milestones
INSERT INTO "GoalMilestone" (id, "goalId", title, description, "targetValue", "targetDate", status, "isRequired") VALUES
    ('a50e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440001', 'Secure Location', 'Find suitable space for tool library', 1, NOW() + INTERVAL '1 month', 'COMPLETED', true),
    ('a50e8400-e29b-41d4-a716-446655440002', '950e8400-e29b-41d4-a716-446655440001', 'Initial Tool Donations', 'Collect first 25 tools', 25, NOW() + INTERVAL '2 months', 'COMPLETED', true),
    ('a50e8400-e29b-41d4-a716-446655440003', '950e8400-e29b-41d4-a716-446655440001', 'Cataloguing System', 'Implement tool tracking system', 1, NOW() + INTERVAL '3 months', 'PENDING', true),
    ('a50e8400-e29b-41d4-a716-446655440004', '950e8400-e29b-41d4-a716-446655440002', 'Platform Development', 'Create skill exchange website', 1, NOW() + INTERVAL '2 months', 'PENDING', true),
    ('a50e8400-e29b-41d4-a716-446655440005', '950e8400-e29b-41d4-a716-446655440002', 'First Exchange Event', 'Host inaugural skill swap meet', 1, NOW() + INTERVAL '1 month', 'PENDING', true)
ON CONFLICT (id) DO NOTHING;

-- Insert community events promoting Beautiful Obsolescence
INSERT INTO "CalendarEvent" (id, "organizerProfileId", title, description, "eventType", "startTime", "endTime", location, "maxAttendees", "skillsShared", "communityBenefit", "beautifulObsolescenceAlignment", "isPublic", timezone) VALUES
    ('b50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'Community Ownership Workshop', 'Learn about cooperative business models', 'WORKSHOP', NOW() + INTERVAL '1 week', NOW() + INTERVAL '1 week' + INTERVAL '3 hours', 'Melbourne Community Centre', 30, ARRAY['Cooperative Development', 'Legal Structures', 'Democratic Governance'], true, 9.5, true, 'Australia/Melbourne'),
    ('b50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'Skill Share: Digital Privacy', 'Hands-on session for digital sovereignty', 'SKILL_SHARE', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '2 hours', 'Sydney Tech Collective', 25, ARRAY['Digital Privacy', 'Alternative Platforms', 'Data Sovereignty'], true, 8.9, true, 'Australia/Sydney'),
    ('b50e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', 'Permaculture Design Course', 'Community food system planning', 'COURSE', NOW() + INTERVAL '2 weeks', NOW() + INTERVAL '2 weeks' + INTERVAL '6 hours', 'Brisbane Urban Farm', 20, ARRAY['Permaculture Design', 'Food Systems', 'Community Planning'], true, 9.6, true, 'Australia/Brisbane'),
    ('b50e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440004', 'Tool Library Launch Party', 'Celebrate community resource sharing', 'COMMUNITY', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '4 hours', 'Perth Tool Library', 50, ARRAY['Tool Sharing', 'Community Building', 'Resource Conservation'], true, 9.8, true, 'Australia/Perth'),
    ('b50e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440005', 'Housing Justice Forum', 'Discussion on community land trusts', 'MEETUP', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '2.5 hours', 'Adelaide Community Hub', 40, ARRAY['Community Land Trusts', 'Housing Justice', 'Policy Advocacy'], true, 9.7, true, 'Australia/Adelaide')
ON CONFLICT (id) DO NOTHING;

-- Insert financial transactions showing extractive system alternatives
INSERT INTO "FinancialTransaction" (id, "profileId", amount, currency, description, category, "transactionType", "transactionDate", merchant, location, "extractiveSystemAlternative", "communityBenefit", tags, timezone) VALUES
    -- Alice's cooperative purchases
    ('c50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 85.50, 'AUD', 'Weekly groceries from food cooperative', 'Food & Groceries', 'EXPENSE', NOW() - INTERVAL '2 days', 'Melbourne Food Cooperative', 'Melbourne, VIC', true, true, ARRAY['food-co-op', 'local-business', 'cooperative'], 'Australia/Melbourne'),
    ('c50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', 120.00, 'AUD', 'Books from independent bookshop cooperative', 'Education & Books', 'EXPENSE', NOW() - INTERVAL '5 days', 'Readings Books Cooperative', 'Melbourne, VIC', true, true, ARRAY['books', 'cooperative', 'independent'], 'Australia/Melbourne'),
    
    -- Bob's digital sovereignty subscriptions
    ('c50e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440002', 15.00, 'AUD', 'Proton Mail subscription for privacy', 'Digital Services', 'EXPENSE', NOW() - INTERVAL '1 day', 'Proton Technologies', 'Online', true, false, ARRAY['digital-privacy', 'email', 'alternative-tech'], 'Australia/Sydney'),
    ('c50e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440002', 25.00, 'AUD', 'Signal donation for secure messaging', 'Digital Services', 'EXPENSE', NOW() - INTERVAL '3 days', 'Signal Foundation', 'Online', true, true, ARRAY['digital-privacy', 'messaging', 'donation'], 'Australia/Sydney'),
    
    -- Clara's community land trust contribution
    ('c50e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440003', 500.00, 'AUD', 'Monthly community land trust contribution', 'Housing & Community', 'EXPENSE', NOW() - INTERVAL '1 day', 'Brisbane Community Land Trust', 'Brisbane, QLD', true, true, ARRAY['housing-justice', 'community-land-trust', 'cooperative'], 'Australia/Brisbane'),
    
    -- David's tool library setup
    ('c50e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440004', 300.00, 'AUD', 'Initial tools purchase for community library', 'Community Projects', 'EXPENSE', NOW() - INTERVAL '7 days', 'Perth Tool Collective', 'Perth, WA', true, true, ARRAY['tool-library', 'community-sharing', 'cooperative'], 'Australia/Perth'),
    
    -- Emma's skill exchange platform development
    ('c50e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440005', 200.00, 'AUD', 'Website hosting for skill exchange platform', 'Technology & Development', 'EXPENSE', NOW() - INTERVAL '4 days', 'Cooperative Web Hosting', 'Adelaide, SA', true, true, ARRAY['skill-share', 'platform-cooperative', 'web-hosting'], 'Australia/Adelaide')
ON CONFLICT (id) DO NOTHING;

-- Insert budgets for community-focused spending
INSERT INTO "Budget" (id, "profileId", name, description, category, "budgetAmount", currency, period, "startDate", "endDate", "currentSpent", "alertThreshold", "isActive", "trackExtractiveAlternatives", "communityGoals") VALUES
    ('d50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'Community Cooperative Spending', 'Monthly budget for supporting local cooperatives', 'Food & Groceries', 400.00, 'AUD', 'MONTHLY', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', 205.50, 80, true, true, true),
    ('d50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'Digital Sovereignty Tools', 'Budget for privacy and alternative tech platforms', 'Digital Services', 100.00, 'AUD', 'MONTHLY', DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', 40.00, 75, true, true, false),
    ('d50e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', 'Community Land Investment', 'Quarterly contribution to community land trust', 'Housing & Community', 1500.00, 'AUD', 'QUARTERLY', DATE_TRUNC('quarter', NOW()), DATE_TRUNC('quarter', NOW()) + INTERVAL '3 months' - INTERVAL '1 day', 500.00, 90, true, true, true),
    ('d50e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440004', 'Tool Library Project', 'One-time budget for community tool library setup', 'Community Projects', 2000.00, 'AUD', 'CUSTOM', NOW() - INTERVAL '30 days', NOW() + INTERVAL '3 months', 300.00, 70, true, true, true)
ON CONFLICT (id) DO NOTHING;

-- Insert meditation sessions showing community mindfulness practices
INSERT INTO "MeditationSession" (id, "profileId", type, "durationMinutes", "guidedBy", location, notes, mood, focus, "communitySession", "startedAt", "completedAt", timezone) VALUES
    ('e50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'Community Sitting', 20, 'Local Meditation Group', 'Melbourne Community Garden', 'Beautiful group session focused on collective wellbeing', 'peaceful', 'community connection', true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '20 minutes', 'Australia/Melbourne'),
    ('e50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'Loving Kindness', 15, 'Self-guided', 'Home', 'Sending love to community and those working for justice', 'grateful', 'compassion for community', false, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '15 minutes', 'Australia/Sydney'),
    ('e50e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', 'Earth Connection', 25, 'Indigenous Elder', 'Brisbane River', 'Connecting with country and understanding our responsibilities', 'grounded', 'connection to country', true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '25 minutes', 'Australia/Brisbane')
ON CONFLICT (id) DO NOTHING;

-- Insert mood entries tracking community engagement wellbeing
INSERT INTO "MoodEntry" (id, "profileId", mood, intensity, notes, triggers, activities, "stressLevel", gratitude, "loggedAt", timezone) VALUES
    ('f50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'inspired', 8, 'Great discussion about community ownership models', ARRAY['community workshop', 'learning'], ARRAY['workshop attendance', 'note taking'], 3, 'Grateful for people working towards economic justice', NOW() - INTERVAL '1 day', 'Australia/Melbourne'),
    ('f50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'empowered', 9, 'Successfully helped someone switch to privacy-respecting tools', ARRAY['teaching', 'skill sharing'], ARRAY['digital literacy workshop', 'mentoring'], 2, 'Thankful for the opportunity to share knowledge', NOW() - INTERVAL '2 days', 'Australia/Sydney'),
    ('f50e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', 'connected', 8, 'Working in the community garden brought such joy', ARRAY['physical work', 'nature', 'community'], ARRAY['gardening', 'socialising', 'physical activity'], 1, 'So grateful for community spaces and growing food together', NOW() - INTERVAL '1 day', 'Australia/Brisbane'),
    ('f50e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440004', 'hopeful', 7, 'Tool library planning meeting went really well', ARRAY['planning', 'collaboration'], ARRAY['community meeting', 'project planning'], 4, 'Grateful for community members who share the vision', NOW() - INTERVAL '3 days', 'Australia/Perth'),
    ('f50e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440005', 'determined', 8, 'Housing justice work is challenging but necessary', ARRAY['housing advocacy', 'systemic issues'], ARRAY['research', 'advocacy work'], 6, 'Thankful for the community supporting housing justice', NOW() - INTERVAL '2 days', 'Australia/Adelaide')
ON CONFLICT (id) DO NOTHING;

-- Insert journal entries reflecting on Beautiful Obsolescence journey
INSERT INTO "Journal" (id, "profileId", title, content, mood, tags, "isPrivate", "gratitudeList", goals, challenges, lessons, "communityReflection", "beautifulObsolescenceProgress", timezone) VALUES
    ('g50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'Cooperative Economics Workshop Reflection', 'Today''s workshop on cooperative business models really opened my eyes to how we can create alternatives to extractive capitalism. The presenter shared examples from around the world of successful worker cooperatives, housing cooperatives, and even cooperative banks. I''m feeling inspired to help establish more cooperatives in Melbourne.

The discussion about decision-making processes was particularly interesting. Learning about consensus, sociocracy, and other democratic governance models gives me hope that we can actually build the more beautiful world our hearts know is possible.

I''ve been thinking about how my purchasing decisions can support these cooperative alternatives. Every dollar I spend at a cooperative rather than a corporation is a small act of resistance and a vote for the future we want to see.', 'inspired', ARRAY['cooperatives', 'economic justice', 'beautiful obsolescence', 'melbourne'], true, ARRAY['Community of people working for economic justice', 'Access to cooperative businesses in Melbourne', 'Knowledge about alternative economic models'], ARRAY['Help establish 3 new cooperatives in Melbourne this year', 'Redirect 80% of spending to cooperative alternatives'], ARRAY['Finding cooperative alternatives for all my needs', 'Learning complex governance models'], ARRAY['Every economic choice is a political choice', 'Cooperation is more efficient than competition for many things', 'Community ownership creates stronger, more resilient economies'], 'The cooperative movement in Melbourne is growing and there''s real momentum for change. People are hungry for alternatives to extractive systems.', 'Made significant progress understanding cooperative models and identifying opportunities to establish new ones. This knowledge is key to building Beautiful Obsolescence by 2027.', 'Australia/Melbourne'),
    
    ('g50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'Digital Sovereignty Journey', 'Been reflecting on my journey away from Big Tech platforms over the past few months. It started with small changes - using Signal instead of WhatsApp, DuckDuckGo instead of Google - but now I''m seeing how interconnected these systems are and how much of our digital lives are controlled by a handful of corporations.

Teaching others about digital privacy tools has been incredibly rewarding. Watching someone''s face light up when they realize they don''t have to accept surveillance capitalism as inevitable is pure gold. We''re building a network of people who understand digital sovereignty and are taking concrete steps toward it.

The challenge now is making these tools more accessible and user-friendly for people who aren''t as tech-savvy. We need to meet people where they are and create pathways that don''t require extensive technical knowledge.', 'empowered', ARRAY['digital privacy', 'big tech alternatives', 'education', 'beautiful obsolescence'], false, ARRAY['Access to privacy-respecting technology', 'Community of people committed to digital sovereignty', 'Knowledge to share with others'], ARRAY['Help 100 people switch to privacy-respecting alternatives this year', 'Create beginner-friendly resources for digital sovereignty'], ARRAY['Making privacy tools accessible to non-technical people', 'Breaking free from convenient but extractive platforms'], ARRAY['Small changes can snowball into major shifts', 'Community education is more effective than individual evangelism', 'Digital sovereignty is essential for democracy'], 'There''s a growing awareness in Sydney about surveillance capitalism and people are actively seeking alternatives. We''re building real momentum.', 'Successfully transitioned away from most Big Tech platforms and developed systems for teaching others. This digital infrastructure is crucial for Beautiful Obsolescence.', 'Australia/Sydney'),
    
    ('g50e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', 'Community Land Trust Vision', 'The housing crisis in Brisbane is reaching a breaking point, but instead of despair, I''m feeling more determined than ever to work on community land trusts as a real solution. Today I spent time researching successful CLT models from around the world and I''m convinced this is one of the most powerful tools we have for removing land from speculation and keeping housing affordable in perpetuity.

The community land trust we''re establishing will be more than just affordable housing - it''s about community control, democratic decision-making, and creating spaces where people can build relationships and mutual aid networks. It''s about designing communities that regenerate rather than extract.

I''ve been thinking about the Indigenous concept of country and how community land trusts can be a way to move away from the Western notion of land as commodity. While we can never fully undo colonization, we can at least stop perpetuating the systems that treat land as something to be owned and exploited for profit.', 'hopeful', ARRAY['housing justice', 'community land trust', 'brisbane', 'indigenous wisdom', 'beautiful obsolescence'], true, ARRAY['Community of housing justice advocates', 'Learning from Indigenous perspectives on land', 'Growing support for community land trusts in Brisbane'], ARRAY['Establish Brisbane''s first community land trust', 'Remove 100 housing units from speculation'], ARRAY['Navigating complex legal structures', 'Building community buy-in and trust', 'Securing initial funding and land'], ARRAY['Housing is a human right, not a commodity', 'Community ownership creates stronger, more resilient neighborhoods', 'Land justice and housing justice are interconnected'], 'There''s real hunger in Brisbane for alternatives to the extractive housing market. Community meetings are growing and we''re building powerful coalitions.', 'Made significant progress on legal research and community organizing. CLTs are a key strategy for Beautiful Obsolescence in the housing sector.', 'Australia/Brisbane')
ON CONFLICT (id) DO NOTHING;

-- Log successful seed data insertion
INSERT INTO lifeos.beautiful_obsolescence_audit (
    event_type,
    table_name,
    event_data,
    compliance_score,
    community_impact
) VALUES (
    'SEED',
    'lifeos_database',
    '{"message": "Life OS seed data successfully inserted", "demo_users": 5, "demo_profiles": 5, "community_focus": true}'::jsonb,
    100.0,
    'Demo data ready for Beautiful Obsolescence development and testing'
);

-- Display summary of seed data
SELECT 
    'Seed data insertion completed!' as status,
    'Demo users with Australian focus and Beautiful Obsolescence alignment ready for development' as description;
-- ACT Public Dashboard - Row Level Security Migration
-- Implements secure access patterns for community data

-- Enable RLS on all tables
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_interest ENABLE ROW LEVEL SECURITY;

-- Public read policies for content
CREATE POLICY "Public can view published stories" ON stories
    FOR SELECT USING (published_at IS NOT NULL AND published_at <= NOW());

CREATE POLICY "Public can view metrics" ON metrics
    FOR SELECT USING (true);

CREATE POLICY "Public can view visible projects" ON projects
    FOR SELECT USING (public_visible = true);

CREATE POLICY "Public can view project updates" ON project_updates
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE public_visible = true)
    );

CREATE POLICY "Public can view visible partners" ON partners
    FOR SELECT USING (public_visible = true);

-- Service role policies (for backend API)
CREATE POLICY "Service role has full access to stories" ON stories
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to metrics" ON metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to projects" ON projects
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to project_updates" ON project_updates
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to partners" ON partners
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to newsletter_subscribers" ON newsletter_subscribers
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to community_inquiries" ON community_inquiries
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to volunteer_interest" ON volunteer_interest
    FOR ALL USING (auth.role() = 'service_role');

-- Public insert policies for engagement forms
CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can submit inquiries" ON community_inquiries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can express volunteer interest" ON volunteer_interest
    FOR INSERT WITH CHECK (true);
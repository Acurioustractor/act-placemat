-- ACT Public Dashboard - Functions and Triggers Migration
-- Adds helpful database functions and automated behaviors

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
DROP TRIGGER IF EXISTS update_stories_updated_at ON stories;
CREATE TRIGGER update_stories_updated_at 
    BEFORE UPDATE ON stories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_metrics_updated_at ON metrics;
CREATE TRIGGER update_metrics_updated_at 
    BEFORE UPDATE ON metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partners_updated_at ON partners;
CREATE TRIGGER update_partners_updated_at 
    BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get featured content for homepage
CREATE OR REPLACE FUNCTION get_homepage_content()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'featured_stories', (
            SELECT json_agg(row_to_json(s))
            FROM (
                SELECT id, title, slug, excerpt, hero_image_url, published_at, tags, author, community_voice, featured
                FROM stories 
                WHERE featured = true AND published_at IS NOT NULL AND published_at <= NOW()
                ORDER BY published_at DESC
                LIMIT 3
            ) s
        ),
        'key_metrics', (
            SELECT json_agg(row_to_json(m))
            FROM (
                SELECT id, label, value, unit, category, featured, display_order, confidence_level
                FROM metrics 
                WHERE featured = true
                ORDER BY display_order, created_at DESC
                LIMIT 6
            ) m
        ),
        'active_projects', (
            SELECT json_agg(row_to_json(p))
            FROM (
                SELECT id, name, slug, summary, image_url, status, pillar, geography, featured
                FROM projects 
                WHERE status IN ('sprouting', 'growing') AND public_visible = true
                ORDER BY updated_at DESC
                LIMIT 4
            ) p
        ),
        'featured_partners', (
            SELECT json_agg(row_to_json(part))
            FROM (
                SELECT id, name, type, logo_url, description, relationship_strength, featured
                FROM partners 
                WHERE featured = true AND public_visible = true
                ORDER BY 
                    CASE relationship_strength 
                        WHEN 'cornerstone' THEN 1
                        WHEN 'deep' THEN 2
                        WHEN 'active' THEN 3
                        WHEN 'emerging' THEN 4
                        ELSE 5
                    END,
                    name
                LIMIT 6
            ) part
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track story views
CREATE OR REPLACE FUNCTION increment_story_views(story_slug TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE stories 
    SET view_count = view_count + 1 
    WHERE slug = story_slug AND published_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get story statistics
CREATE OR REPLACE FUNCTION get_story_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_published', (SELECT COUNT(*) FROM stories WHERE published_at IS NOT NULL),
        'total_views', (SELECT COALESCE(SUM(view_count), 0) FROM stories),
        'community_authored', (SELECT COUNT(*) FROM stories WHERE community_voice = true AND published_at IS NOT NULL),
        'featured_count', (SELECT COUNT(*) FROM stories WHERE featured = true AND published_at IS NOT NULL),
        'consent_verified', (SELECT COUNT(*) FROM stories WHERE consent_verified = true AND published_at IS NOT NULL)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
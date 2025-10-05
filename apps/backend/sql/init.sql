-- Life Orchestrator Database Schema
-- Initial database setup for user management, tokens, and cached data

-- Users table for authentication and preferences
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    profile_data JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth tokens and service connections
CREATE TABLE IF NOT EXISTS user_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    service VARCHAR(50) NOT NULL, -- 'google', 'slack', 'notion'
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    scope TEXT[],
    token_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, service)
);

-- User sessions for authentication
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address INET
);

-- Project health cache
CREATE TABLE IF NOT EXISTS project_health_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(255) NOT NULL,
    project_name VARCHAR(255),
    health_data JSONB NOT NULL,
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(user_id, project_id)
);

-- Relationship data cache
CREATE TABLE IF NOT EXISTS relationship_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    contact_email VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    relationship_data JSONB NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(user_id, contact_email)
);

-- Communication tracking data
CREATE TABLE IF NOT EXISTS communication_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    communication_type VARCHAR(50) NOT NULL, -- 'email', 'slack', 'calendar'
    external_id VARCHAR(255), -- Email ID, Slack message ID, etc.
    from_contact VARCHAR(255),
    to_contact VARCHAR(255),
    subject TEXT,
    content_summary TEXT,
    sentiment_data JSONB,
    urgency_level VARCHAR(10),
    response_time INTEGER, -- Hours to respond
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- Calendar sync sessions
CREATE TABLE IF NOT EXISTS calendar_sync_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sync_options JSONB DEFAULT '{}',
    last_sync TIMESTAMP,
    sync_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Daily rituals and gamification data
CREATE TABLE IF NOT EXISTS daily_rituals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ritual_date DATE NOT NULL,
    ritual_type VARCHAR(20) NOT NULL, -- 'morning', 'evening'
    ritual_data JSONB NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, ritual_date, ritual_type)
);

-- User achievements and streaks
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(100) NOT NULL,
    achievement_data JSONB NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    streak_count INTEGER DEFAULT 1
);

-- Email intelligence cache
CREATE TABLE IF NOT EXISTS email_intelligence_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email_id VARCHAR(255) NOT NULL,
    intelligence_data JSONB NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(user_id, email_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_service ON user_tokens(user_id, service);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_project_health_user_project ON project_health_cache(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_health_expires ON project_health_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_relationship_user_email ON relationship_cache(user_id, contact_email);
CREATE INDEX IF NOT EXISTS idx_relationship_expires ON relationship_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_communication_user_type ON communication_logs(user_id, communication_type);
CREATE INDEX IF NOT EXISTS idx_communication_created ON communication_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_user_active ON calendar_sync_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_daily_rituals_user_date ON daily_rituals(user_id, ritual_date);
CREATE INDEX IF NOT EXISTS idx_achievements_user_type ON user_achievements(user_id, achievement_type);
CREATE INDEX IF NOT EXISTS idx_email_intelligence_user_email ON email_intelligence_cache(user_id, email_id);
CREATE INDEX IF NOT EXISTS idx_email_intelligence_expires ON email_intelligence_cache(expires_at);

-- Update function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for automatic updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tokens_updated_at BEFORE UPDATE ON user_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial admin user (optional)
INSERT INTO users (email, name, preferences) 
VALUES (
    'admin@act-placemat.com', 
    'System Administrator',
    '{"timezone": "Australia/Melbourne", "energyLevel": "medium", "defaultAvailableHours": 8}'
) ON CONFLICT (email) DO NOTHING;

-- Sample data for testing (remove in production)
INSERT INTO users (email, name, preferences) 
VALUES (
    'demo@example.com',
    'Demo User', 
    '{"timezone": "Australia/Melbourne", "energyLevel": "high", "defaultAvailableHours": 6}'
) ON CONFLICT (email) DO NOTHING;
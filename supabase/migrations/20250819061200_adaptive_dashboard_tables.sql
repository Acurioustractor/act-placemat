-- Create tables for adaptive dashboard functionality

-- Dashboard configurations table
CREATE TABLE IF NOT EXISTS dashboard_configs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard interactions tracking table
CREATE TABLE IF NOT EXISTS dashboard_interactions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_id ON dashboard_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_interactions_user_id ON dashboard_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_interactions_timestamp ON dashboard_interactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_dashboard_interactions_event_type ON dashboard_interactions(event_type);

-- Enable Row Level Security (RLS)
ALTER TABLE dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for dashboard_configs
CREATE POLICY "Users can view their own dashboard configs" ON dashboard_configs
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id = 'anonymous');

CREATE POLICY "Users can insert their own dashboard configs" ON dashboard_configs
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id = 'anonymous');

CREATE POLICY "Users can update their own dashboard configs" ON dashboard_configs
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id = 'anonymous');

-- Create RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id = 'anonymous');

CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id = 'anonymous');

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id = 'anonymous');

-- Create RLS policies for dashboard_interactions
CREATE POLICY "Users can view their own interactions" ON dashboard_interactions
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id = 'anonymous');

CREATE POLICY "Users can insert their own interactions" ON dashboard_interactions
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id = 'anonymous');

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_dashboard_configs_updated_at
  BEFORE UPDATE ON dashboard_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO dashboard_configs (user_id, config) VALUES 
('test_user', '{
  "layout": "grid",
  "theme": "light",
  "density": "comfortable",
  "widgets": [
    {"id": "overview", "type": "overview", "position": {"x": 0, "y": 0, "w": 12, "h": 4}, "enabled": true},
    {"id": "projects", "type": "projects", "position": {"x": 0, "y": 4, "w": 6, "h": 6}, "enabled": true}
  ]
}')
ON CONFLICT DO NOTHING;

INSERT INTO user_preferences (user_id, preferences) VALUES 
('test_user', '{
  "personalizations": {
    "preferredProjectTypes": ["community", "technology"],
    "interestedOpportunityTypes": ["grant", "partnership"]
  },
  "accessibility": {
    "fontSize": "medium",
    "highContrast": false
  }
}')
ON CONFLICT DO NOTHING;
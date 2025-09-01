-- Life OS Database Initialization Script
-- Sets up extensions, functions, and initial configuration for ACT Life Operating System
-- Australian timezone and Beautiful Obsolescence compliance

-- Enable required extensions for Life OS functionality
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create schema for Life OS components
CREATE SCHEMA IF NOT EXISTS lifeos;
COMMENT ON SCHEMA lifeos IS 'ACT Life Operating System core schema with Beautiful Obsolescence principles';

-- Set search path to include Life OS schema
ALTER DATABASE lifeos_database SET search_path TO lifeos, public;

-- Create Australian-compliant timezone function
CREATE OR REPLACE FUNCTION lifeos.australian_now() 
RETURNS timestamp with time zone AS $$
BEGIN
    RETURN now() AT TIME ZONE 'Australia/Sydney';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION lifeos.australian_now() IS 'Returns current timestamp in Australian Eastern timezone';

-- Create Beautiful Obsolescence tracking function
CREATE OR REPLACE FUNCTION lifeos.track_beautiful_obsolescence()
RETURNS trigger AS $$
BEGIN
    -- Add Beautiful Obsolescence metadata to any tracked table
    IF TG_OP = 'INSERT' THEN
        NEW.beautiful_obsolescence_created_at = lifeos.australian_now();
        NEW.beautiful_obsolescence_target_date = '2027-01-01'::timestamp with time zone;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.beautiful_obsolescence_updated_at = lifeos.australian_now();
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION lifeos.track_beautiful_obsolescence() IS 'Trigger function to track Beautiful Obsolescence timeline compliance';

-- Create community control validation function
CREATE OR REPLACE FUNCTION lifeos.validate_community_control()
RETURNS trigger AS $$
BEGIN
    -- Ensure community control is enabled for relevant data
    IF NEW.community_control_enabled IS NOT NULL AND NEW.community_control_enabled = false THEN
        RAISE WARNING 'Community control disabled - this may conflict with Beautiful Obsolescence principles';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION lifeos.validate_community_control() IS 'Validates community control compliance for Beautiful Obsolescence';

-- Create data residency validation function
CREATE OR REPLACE FUNCTION lifeos.validate_australian_data_residency()
RETURNS trigger AS $$
BEGIN
    -- Ensure data residency preferences comply with Australian requirements
    IF NEW.data_residency_preference IS NOT NULL AND NEW.data_residency_preference != 'Australia' THEN
        RAISE NOTICE 'Non-Australian data residency detected: %', NEW.data_residency_preference;
        -- Log for compliance auditing but allow the operation
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION lifeos.validate_australian_data_residency() IS 'Validates and logs data residency compliance';

-- Create habit streak calculation function
CREATE OR REPLACE FUNCTION lifeos.calculate_habit_streak(
    habit_id UUID,
    completion_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
    streak_count INTEGER := 0;
    check_date DATE;
    habit_frequency TEXT;
    frequency_days INTEGER;
BEGIN
    -- Get habit frequency
    SELECT frequency INTO habit_frequency 
    FROM "Habit" 
    WHERE id = habit_id;
    
    -- Convert frequency to days
    frequency_days := CASE habit_frequency
        WHEN 'DAILY' THEN 1
        WHEN 'WEEKLY' THEN 7
        WHEN 'MONTHLY' THEN 30
        ELSE 1
    END;
    
    -- Calculate current streak working backwards from completion_date
    check_date := completion_date;
    
    LOOP
        -- Check if there's a completion for this date
        IF NOT EXISTS (
            SELECT 1 FROM "HabitCompletion" 
            WHERE "habitId" = habit_id 
            AND DATE("completedAt") = check_date
        ) THEN
            EXIT; -- Break the streak
        END IF;
        
        streak_count := streak_count + 1;
        check_date := check_date - INTERVAL '1 day' * frequency_days;
        
        -- Prevent infinite loops
        IF streak_count > 365 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN streak_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION lifeos.calculate_habit_streak(UUID, DATE) IS 'Calculates current habit streak for Beautiful Obsolescence habit tracking';

-- Create goal progress calculation function
CREATE OR REPLACE FUNCTION lifeos.calculate_goal_progress(
    goal_id UUID
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    current_val DECIMAL;
    target_val DECIMAL;
    progress_pct DECIMAL(5,2);
BEGIN
    -- Get current and target values
    SELECT "currentValue", "targetValue" INTO current_val, target_val
    FROM "Goal"
    WHERE id = goal_id;
    
    -- Calculate progress percentage
    IF target_val IS NULL OR target_val = 0 THEN
        RETURN 0;
    END IF;
    
    progress_pct := (current_val / target_val) * 100;
    
    -- Cap at 100%
    IF progress_pct > 100 THEN
        progress_pct := 100;
    END IF;
    
    RETURN COALESCE(progress_pct, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION lifeos.calculate_goal_progress(UUID) IS 'Calculates goal completion progress for community accountability';

-- Create Beautiful Obsolescence compliance reporting function
CREATE OR REPLACE FUNCTION lifeos.beautiful_obsolescence_report(
    user_id UUID DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    compliance_level TEXT,
    community_impact TEXT
) AS $$
DECLARE
    start_date TIMESTAMP WITH TIME ZONE;
BEGIN
    start_date := lifeos.australian_now() - INTERVAL '1 day' * days_back;
    
    -- Return metrics for Beautiful Obsolescence compliance
    RETURN QUERY
    WITH metrics AS (
        -- Extractive system alternatives usage
        SELECT 
            'extractive_alternatives_percentage' as metric_name,
            COALESCE(
                (SELECT COUNT(*) * 100.0 / NULLIF(COUNT(*) OVER (), 0)
                 FROM "FinancialTransaction" ft
                 JOIN "LifeOSProfile" lp ON ft."profileId" = lp.id
                 WHERE ft."extractiveSystemAlternative" = true
                 AND ft."transactionDate" >= start_date
                 AND (user_id IS NULL OR lp."userId" = user_id)
                ), 0
            ) as metric_value,
            CASE 
                WHEN COALESCE((SELECT COUNT(*) * 100.0 / NULLIF(COUNT(*) OVER (), 0) FROM "FinancialTransaction" ft JOIN "LifeOSProfile" lp ON ft."profileId" = lp.id WHERE ft."extractiveSystemAlternative" = true AND ft."transactionDate" >= start_date AND (user_id IS NULL OR lp."userId" = user_id)), 0) >= 50 THEN 'HIGH'
                WHEN COALESCE((SELECT COUNT(*) * 100.0 / NULLIF(COUNT(*) OVER (), 0) FROM "FinancialTransaction" ft JOIN "LifeOSProfile" lp ON ft."profileId" = lp.id WHERE ft."extractiveSystemAlternative" = true AND ft."transactionDate" >= start_date AND (user_id IS NULL OR lp."userId" = user_id)), 0) >= 25 THEN 'MEDIUM'
                ELSE 'LOW'
            END as compliance_level,
            'Reducing dependence on extractive economic systems' as community_impact
        
        UNION ALL
        
        -- Community benefit goals completion
        SELECT 
            'community_benefit_goals_completion' as metric_name,
            COALESCE(
                (SELECT COUNT(*) * 100.0 / NULLIF(COUNT(*) OVER (), 0)
                 FROM "Goal" g
                 JOIN "LifeOSProfile" lp ON g."profileId" = lp.id
                 WHERE g."communityBenefit" = true
                 AND g.status = 'COMPLETED'
                 AND g."updatedAt" >= start_date
                 AND (user_id IS NULL OR lp."userId" = user_id)
                ), 0
            ) as metric_value,
            CASE 
                WHEN COALESCE((SELECT COUNT(*) * 100.0 / NULLIF(COUNT(*) OVER (), 0) FROM "Goal" g JOIN "LifeOSProfile" lp ON g."profileId" = lp.id WHERE g."communityBenefit" = true AND g.status = 'COMPLETED' AND g."updatedAt" >= start_date AND (user_id IS NULL OR lp."userId" = user_id)), 0) >= 70 THEN 'HIGH'
                WHEN COALESCE((SELECT COUNT(*) * 100.0 / NULLIF(COUNT(*) OVER (), 0) FROM "Goal" g JOIN "LifeOSProfile" lp ON g."profileId" = lp.id WHERE g."communityBenefit" = true AND g.status = 'COMPLETED' AND g."updatedAt" >= start_date AND (user_id IS NULL OR lp."userId" = user_id)), 0) >= 40 THEN 'MEDIUM'
                ELSE 'LOW'
            END as compliance_level,
            'Contributing to community wellbeing and Beautiful Obsolescence' as community_impact
    )
    SELECT * FROM metrics;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION lifeos.beautiful_obsolescence_report(UUID, INTEGER) IS 'Generates Beautiful Obsolescence compliance metrics for community accountability';

-- Create community data sovereignty audit function
CREATE OR REPLACE FUNCTION lifeos.community_data_sovereignty_audit()
RETURNS TABLE (
    table_name TEXT,
    total_records BIGINT,
    community_controlled BIGINT,
    australian_resident BIGINT,
    compliance_score DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'LifeOSProfile' as table_name,
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE "communityControlEnabled" = true) as community_controlled,
        COUNT(*) FILTER (WHERE "dataResidencyPreference" = 'Australia') as australian_resident,
        (COUNT(*) FILTER (WHERE "communityControlEnabled" = true AND "dataResidencyPreference" = 'Australia') * 100.0 / NULLIF(COUNT(*), 0)) as compliance_score
    FROM "LifeOSProfile"
    
    UNION ALL
    
    SELECT 
        'CalendarEvent' as table_name,
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE "communityBenefit" = true) as community_controlled,
        COUNT(*) as australian_resident, -- All events are Australian by default
        (COUNT(*) FILTER (WHERE "communityBenefit" = true) * 100.0 / NULLIF(COUNT(*), 0)) as compliance_score
    FROM "CalendarEvent";
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION lifeos.community_data_sovereignty_audit() IS 'Audits community data sovereignty compliance across Life OS';

-- Grant permissions for Life OS schema
GRANT USAGE ON SCHEMA lifeos TO lifeos_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA lifeos TO lifeos_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA lifeos TO lifeos_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA lifeos TO lifeos_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA lifeos GRANT ALL ON TABLES TO lifeos_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA lifeos GRANT ALL ON SEQUENCES TO lifeos_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA lifeos GRANT ALL ON FUNCTIONS TO lifeos_user;

-- Create audit log table for Beautiful Obsolescence tracking
CREATE TABLE IF NOT EXISTS lifeos.beautiful_obsolescence_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    user_id UUID,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT lifeos.australian_now(),
    compliance_score DECIMAL(5,2),
    community_impact TEXT
);

COMMENT ON TABLE lifeos.beautiful_obsolescence_audit IS 'Audit trail for Beautiful Obsolescence compliance tracking';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_beautiful_obsolescence_audit_created_at ON lifeos.beautiful_obsolescence_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_beautiful_obsolescence_audit_user_id ON lifeos.beautiful_obsolescence_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_beautiful_obsolescence_audit_event_type ON lifeos.beautiful_obsolescence_audit(event_type);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION lifeos.audit_beautiful_obsolescence()
RETURNS trigger AS $$
BEGIN
    INSERT INTO lifeos.beautiful_obsolescence_audit (
        event_type,
        table_name,
        record_id,
        user_id,
        event_data,
        compliance_score,
        community_impact
    ) VALUES (
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW."userId", OLD."userId", NEW."profileId"::UUID),
        row_to_json(NEW),
        CASE 
            WHEN NEW."communityControlEnabled" = true AND NEW."dataResidencyPreference" = 'Australia' THEN 100.0
            WHEN NEW."communityControlEnabled" = true OR NEW."dataResidencyPreference" = 'Australia' THEN 75.0
            ELSE 50.0
        END,
        'Contributing to Beautiful Obsolescence timeline (2027 target)'
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION lifeos.audit_beautiful_obsolescence() IS 'Audits changes for Beautiful Obsolescence compliance tracking';

-- Log successful initialization
INSERT INTO lifeos.beautiful_obsolescence_audit (
    event_type,
    table_name,
    event_data,
    compliance_score,
    community_impact
) VALUES (
    'INIT',
    'lifeos_database',
    '{"message": "Life OS database successfully initialized", "timezone": "Australia/Sydney", "target_date": "2027-01-01"}'::jsonb,
    100.0,
    'Database infrastructure ready for Beautiful Obsolescence timeline'
);

-- Success message
SELECT 'Life OS database initialization completed successfully!' as status;
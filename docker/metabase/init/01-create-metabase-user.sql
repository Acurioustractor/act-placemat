-- Create dedicated Metabase user and database
-- This script runs if using standalone PostgreSQL for Metabase metadata

-- Create Metabase database if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'metabase') THEN
        CREATE DATABASE metabase;
    END IF;
END
$$;

-- Create analytics read-only user for ACT data
CREATE USER IF NOT EXISTS metabase_readonly WITH PASSWORD 'readonly_password_change_this';

-- Grant connect permission
GRANT CONNECT ON DATABASE postgres TO metabase_readonly;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO metabase_readonly;

-- Grant select on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_readonly;

-- Grant select on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_readonly;

-- Grant usage on sequences (for id columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO metabase_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO metabase_readonly;

-- Comments
COMMENT ON ROLE metabase_readonly IS 'Read-only user for Metabase analytics dashboards';
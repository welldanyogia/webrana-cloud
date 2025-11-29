-- ═══════════════════════════════════════════════════════════════════════════════
-- WeBrana Cloud - Database Initialization Script
-- Creates separate schemas for each service
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create schemas for each service
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS instances;
CREATE SCHEMA IF NOT EXISTS notifications;

-- Grant privileges (adjust as needed for your user)
GRANT ALL ON SCHEMA auth TO webrana;
GRANT ALL ON SCHEMA catalog TO webrana;
GRANT ALL ON SCHEMA orders TO webrana;
GRANT ALL ON SCHEMA billing TO webrana;
GRANT ALL ON SCHEMA instances TO webrana;
GRANT ALL ON SCHEMA notifications TO webrana;

-- Create extension for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'WeBrana Cloud database schemas initialized successfully';
END $$;

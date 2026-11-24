-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 12_create_database_users.example.sql
-- Module: Database User & Privilege Administration (EXAMPLE ONLY)
-- ============================================================================
--
-- CAUTION:
-- DO NOT EXECUTE THIS SCRIPT AS-IS WITH DEFAULT PASSWORDS!
-- Replace 'CHANGE_ME_TO_STRONG_PASSWORD' with a cryptographically generated
-- secret before running in production.
--

-- 1. Create FastAPI Application User (Least Privilege)
-- Needs SELECT, INSERT, UPDATE, DELETE on application tables, plus EXECUTE on stored procedures.
-- Does NOT require DROP, ALTER, GRANT, or administrative privileges.

-- CREATE USER IF NOT EXISTS 'hunarlink_app'@'127.0.0.1'
--   IDENTIFIED BY 'CHANGE_ME_TO_STRONG_APP_PASSWORD';

-- GRANT SELECT, INSERT, UPDATE, DELETE ON `hunarlink`.* TO 'hunarlink_app'@'127.0.0.1';
-- GRANT EXECUTE ON `hunarlink`.* TO 'hunarlink_app'@'127.0.0.1';

-- 2. Create Migration Operator User (Alembic DDL Execution)
-- Used only during automated deployments or schema migrations.

-- CREATE USER IF NOT EXISTS 'hunarlink_migration'@'127.0.0.1'
--   IDENTIFIED BY 'CHANGE_ME_TO_STRONG_MIGRATION_PASSWORD';

-- GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON `hunarlink`.* TO 'hunarlink_migration'@'127.0.0.1';

-- 3. Read-Only Analytical User (BI / Analytics / Reporting)
-- CREATE USER IF NOT EXISTS 'hunarlink_readonly'@'127.0.0.1'
--   IDENTIFIED BY 'CHANGE_ME_TO_STRONG_RO_PASSWORD';

-- GRANT SELECT ON `hunarlink`.* TO 'hunarlink_readonly'@'127.0.0.1';

-- FLUSH PRIVILEGES;


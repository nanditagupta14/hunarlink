-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 11_validation_queries.sql
-- Module: Schema Integrity, Constraint & Reference Validation
-- ============================================================================

USE `hunarlink`;

-- 1. MySQL Server Version & Database Configuration
SELECT
  VERSION() AS `mysql_version`,
  DATABASE() AS `active_database`,
  @@character_set_database AS `db_charset`,
  @@collation_database AS `db_collation`,
  @@default_storage_engine AS `default_storage_engine`;

-- 2. Verify Every Table Uses InnoDB Storage Engine (Strict Requirement)
SELECT
  TABLE_NAME,
  ENGINE,
  TABLE_COLLATION,
  TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'hunarlink'
  AND TABLE_TYPE = 'BASE TABLE'
  AND ENGINE != 'InnoDB';
-- Expected result: 0 rows (all must be InnoDB)

-- 3. Inventory Count of Base Tables
SELECT
  COUNT(*) AS `total_base_tables_installed`
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'hunarlink'
  AND TABLE_TYPE = 'BASE TABLE';

-- 4. Foreign Key Constraints Count and Referenced Integrity
SELECT
  TABLE_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'hunarlink'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- 5. Verify Triggers Existence and State
SELECT
  TRIGGER_NAME,
  EVENT_MANIPULATION,
  EVENT_OBJECT_TABLE,
  ACTION_TIMING
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'hunarlink';

-- 6. Verify Stored Procedures and Views
SELECT
  ROUTINE_NAME,
  ROUTINE_TYPE,
  DEFINER
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'hunarlink';

SELECT
  TABLE_NAME AS `view_name`
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'hunarlink';

-- 7. Verify Core Master Reference Data is Seeded
SELECT 'Platform Roles' AS `component`, COUNT(*) AS `record_count` FROM `platform_roles`
UNION ALL
SELECT 'Admin Roles', COUNT(*) FROM `admin_roles`
UNION ALL
SELECT 'Admin Permissions', COUNT(*) FROM `admin_permissions`
UNION ALL
SELECT 'Craft Categories', COUNT(*) FROM `categories`
UNION ALL
SELECT 'GI Reference Records', COUNT(*) FROM `gi_reference_records`
UNION ALL
SELECT 'Platform Settings', COUNT(*) FROM `platform_settings`;

-- 8. Test Partial-Unique Default Address Guard
-- The generated column `default_guard` ensures that a user can have at most ONE default address
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  GENERATION_EXPRESSION
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'hunarlink'
  AND TABLE_NAME = 'user_addresses'
  AND COLUMN_NAME = 'default_guard';


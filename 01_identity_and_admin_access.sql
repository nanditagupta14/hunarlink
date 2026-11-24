-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 01_identity_and_admin_access.sql
-- Module A: Identity & Admin Access Control
-- ============================================================================

USE `hunarlink`;

-- 1. Base Users Table (Clerk external auth, platform roles held locally)
CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `clerk_user_id` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL DEFAULT '',
  `last_name` VARCHAR(100) NOT NULL DEFAULT '',
  `phone_number` VARCHAR(32) NULL,
  `account_status` ENUM('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
  `metadata` JSON NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_clerk_id` (`clerk_user_id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `ix_users_status_created` (`account_status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Master Platform Roles
-- Roles: CUSTOMER, DIRECT_SELLER, SUPPLIER, DEALER, WHOLESALE_BUYER, ADMIN
CREATE TABLE IF NOT EXISTS `platform_roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_code` VARCHAR(50) NOT NULL,
  `display_name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NOT NULL DEFAULT '',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_platform_roles_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Multi-Role User Assignments (A user can hold multiple approved roles)
CREATE TABLE IF NOT EXISTS `user_role_assignments` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `assigned_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `assigned_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_active_role` (`user_id`, `role_id`),
  KEY `ix_user_role_role_id` (`role_id`),
  CONSTRAINT `fk_ura_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ura_role` FOREIGN KEY (`role_id`) REFERENCES `platform_roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. User Shipping & Billing Addresses
CREATE TABLE IF NOT EXISTS `user_addresses` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `recipient_name` VARCHAR(150) NOT NULL,
  `phone_number` VARCHAR(32) NOT NULL,
  `address_line1` VARCHAR(255) NOT NULL,
  `address_line2` VARCHAR(255) NULL,
  `landmark` VARCHAR(150) NULL,
  `city` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NOT NULL DEFAULT 'Srinagar',
  `state` VARCHAR(100) NOT NULL DEFAULT 'Jammu and Kashmir',
  `postal_code` VARCHAR(20) NOT NULL,
  `country_code` VARCHAR(2) NOT NULL DEFAULT 'IN',
  `address_type` ENUM('HOME', 'WORK', 'WAREHOUSE', 'OTHER') NOT NULL DEFAULT 'HOME',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  -- MySQL Partial-Unique: allow only one default address per user by indexing generated column
  `default_guard` CHAR(36) GENERATED ALWAYS AS (IF(`is_default` = 1, `user_id`, NULL)) STORED,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_single_default_address` (`default_guard`),
  KEY `ix_user_addresses_user_id` (`user_id`),
  CONSTRAINT `fk_ua_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Admin Profiles (Extended attributes for internal operators)
CREATE TABLE IF NOT EXISTS `admin_profiles` (
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `employee_code` VARCHAR(50) NULL,
  `department` VARCHAR(100) NOT NULL DEFAULT 'Operations',
  `two_factor_enforced` TINYINT(1) NOT NULL DEFAULT 1,
  `is_super_admin` TINYINT(1) NOT NULL DEFAULT 0,
  `last_active_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_admin_employee_code` (`employee_code`),
  CONSTRAINT `fk_admin_profile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Granular Admin Roles
CREATE TABLE IF NOT EXISTS `admin_roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_key` VARCHAR(64) NOT NULL,
  `display_name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NOT NULL DEFAULT '',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_roles_key` (`role_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Granular Admin Permissions
CREATE TABLE IF NOT EXISTS `admin_permissions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `permission_key` VARCHAR(100) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NOT NULL DEFAULT '',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_permission_key` (`permission_key`),
  KEY `ix_admin_perm_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. Admin User to Admin Roles Mapping
CREATE TABLE IF NOT EXISTS `admin_user_roles` (
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `assigned_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`user_id`, `role_id`),
  CONSTRAINT `fk_aur_admin` FOREIGN KEY (`user_id`) REFERENCES `admin_profiles` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_aur_role` FOREIGN KEY (`role_id`) REFERENCES `admin_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. Admin Role to Permission Mappings
CREATE TABLE IF NOT EXISTS `admin_role_permissions` (
  `role_id` INT UNSIGNED NOT NULL,
  `permission_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `fk_arp_role` FOREIGN KEY (`role_id`) REFERENCES `admin_roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_arp_perm` FOREIGN KEY (`permission_id`) REFERENCES `admin_permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


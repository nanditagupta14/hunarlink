-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 00_create_database.sql
-- Module: System Initialization & Configuration
-- Target: MySQL 8.0.21+ / MySQL 8.4 LTS
-- ============================================================================

-- Create the database with full UTF-8 Unicode support
CREATE DATABASE IF NOT EXISTS `hunarlink`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `hunarlink`;

-- Set session parameters for strict SQL compliance and UTC timestamps
SET time_zone = '+00:00';
SET default_storage_engine = 'InnoDB';
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
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
-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 02_sellers_and_verification.sql
-- Module B: Seller Profiles, GI Registry & Verification Workflows
-- ============================================================================

USE `hunarlink`;

-- 1. Master GI Reference Registry (Official J&K Geographical Indications)
CREATE TABLE IF NOT EXISTS `gi_reference_records` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `gi_code` VARCHAR(64) NOT NULL,
  `craft_name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `gi_registration_number` VARCHAR(64) NOT NULL,
  `registered_proprietor` VARCHAR(255) NOT NULL,
  `authorized_user_number` VARCHAR(64) NULL,
  `authorized_user_name` VARCHAR(255) NULL,
  `district` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL DEFAULT 'Jammu and Kashmir',
  `specifications` JSON NULL,
  `issuing_authority` VARCHAR(255) NOT NULL DEFAULT 'Geographical Indications Registry, Government of India',
  `valid_from` DATE NOT NULL,
  `valid_until` DATE NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gi_ref_code` (`gi_code`),
  UNIQUE KEY `uq_gi_ref_auth_user` (`authorized_user_number`),
  KEY `ix_gi_ref_craft_district` (`craft_name`, `district`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Seller / Artisan Business Profiles
CREATE TABLE IF NOT EXISTS `seller_profiles` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `brand_name` VARCHAR(150) NOT NULL,
  `artisan_title` VARCHAR(150) NOT NULL DEFAULT 'Master Craftsperson',
  `craft_specialty` VARCHAR(100) NOT NULL, -- e.g. Pashmina Textiles, Walnut Woodcarving, Papier-Mache, Silk Carpets
  `experience_years` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `district` VARCHAR(100) NOT NULL DEFAULT 'Srinagar',
  `state` VARCHAR(100) NOT NULL DEFAULT 'Jammu and Kashmir',
  `workshop_address` TEXT NOT NULL,
  `pincode` VARCHAR(20) NOT NULL,
  `pan_number` VARCHAR(20) NULL,
  `bank_account_holder` VARCHAR(150) NULL,
  `bank_account_number_masked` VARCHAR(32) NULL,
  `bank_ifsc` VARCHAR(20) NULL,
  `is_gi_certified` TINYINT(1) NOT NULL DEFAULT 0,
  `verified_gi_reference_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `profile_status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'DRAFT',
  `profile_bio` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_seller_user` (`user_id`),
  KEY `ix_seller_specialty_status` (`craft_specialty`, `profile_status`),
  KEY `ix_seller_gi_reference` (`verified_gi_reference_id`),
  CONSTRAINT `fk_seller_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_seller_gi_ref` FOREIGN KEY (`verified_gi_reference_id`) REFERENCES `gi_reference_records` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Seller Verification Applications (Both GI and Non-GI routes)
CREATE TABLE IF NOT EXISTS `seller_verification_applications` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `seller_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `pathway` ENUM('GI_CERTIFIED', 'NON_GI_HERITAGE') NOT NULL,
  `claimed_gi_code` VARCHAR(64) NULL,
  `claimed_gi_auth_number` VARCHAR(64) NULL,
  `application_status` ENUM('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'AI_ASSESSED', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUESTED') NOT NULL DEFAULT 'SUBMITTED',
  `submission_notes` TEXT NULL,
  `admin_reviewer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `admin_decision_notes` TEXT NULL,
  `submitted_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `reviewed_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_sva_seller_status` (`seller_id`, `application_status`),
  KEY `ix_sva_pathway` (`pathway`),
  CONSTRAINT `fk_sva_seller` FOREIGN KEY (`seller_id`) REFERENCES `seller_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sva_admin` FOREIGN KEY (`admin_reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Seller Verification Documents (Certificates, Workshop Videos, Invoices)
CREATE TABLE IF NOT EXISTS `seller_documents` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `application_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `document_type` ENUM('GI_CERTIFICATE', 'WORKSHOP_PROOF', 'GOVERNMENT_ID', 'BANK_PROOF', 'TAX_INVOICE', 'VIDEO_WALKTHROUGH') NOT NULL,
  `file_storage_key` VARCHAR(512) NOT NULL,
  `file_hash_sha256` CHAR(64) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size_bytes` BIGINT UNSIGNED NOT NULL,
  `verification_notes` VARCHAR(255) NULL,
  `uploaded_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_sd_app_type` (`application_id`, `document_type`),
  CONSTRAINT `fk_sd_app` FOREIGN KEY (`application_id`) REFERENCES `seller_verification_applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Seller Verification Audit History (Immutable state transition timeline)
CREATE TABLE IF NOT EXISTS `seller_verification_history` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `application_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_status` VARCHAR(50) NOT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `actor_user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `action_type` VARCHAR(50) NOT NULL,
  `reason` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_svh_app_timeline` (`application_id`, `created_at`),
  CONSTRAINT `fk_svh_app` FOREIGN KEY (`application_id`) REFERENCES `seller_verification_applications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_svh_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Product-Level GI Claims (Product claims are strictly independent of seller status)
CREATE TABLE IF NOT EXISTS `product_gi_claims` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `seller_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL, -- Bound after product creation
  `gi_reference_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `claim_status` ENUM('PENDING_SUBMISSION', 'SUBMITTED', 'UNDER_ASSESSMENT', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
  `batch_identifier` VARCHAR(100) NOT NULL,
  `loom_number` VARCHAR(100) NULL,
  `artisan_declaration` TEXT NOT NULL,
  `admin_reviewer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `admin_decision_notes` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `verified_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_pgc_seller_status` (`seller_id`, `claim_status`),
  KEY `ix_pgc_product` (`product_id`),
  CONSTRAINT `fk_pgc_seller` FOREIGN KEY (`seller_id`) REFERENCES `seller_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pgc_ref` FOREIGN KEY (`gi_reference_id`) REFERENCES `gi_reference_records` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_pgc_admin` FOREIGN KEY (`admin_reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. GI Claim Evidence Documents
CREATE TABLE IF NOT EXISTS `gi_claim_documents` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `claim_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `document_category` ENUM('GI_AFFIXED_PHOTO', 'RAW_MATERIAL_SOURCE_SLIP', 'LOOM_RECORD', 'LAB_TEST_REPORT') NOT NULL,
  `file_storage_key` VARCHAR(512) NOT NULL,
  `file_hash_sha256` CHAR(64) NOT NULL,
  `uploaded_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_gcd_claim` (`claim_id`),
  CONSTRAINT `fk_gcd_claim` FOREIGN KEY (`claim_id`) REFERENCES `product_gi_claims` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. AI/LLM Evidence Verification Runs (Traceable audit runs for GI claims)
CREATE TABLE IF NOT EXISTS `gi_verification_runs` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `claim_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `model_provider` VARCHAR(50) NOT NULL DEFAULT 'Google DeepMind',
  `model_name` VARCHAR(100) NOT NULL, -- e.g. gemini-1.5-pro / gemini-2.5-flash
  `prompt_version` VARCHAR(50) NOT NULL,
  `dataset_version` VARCHAR(50) NOT NULL,
  `input_hash` CHAR(64) NOT NULL,
  `assessment_outcome` ENUM('HIGH_CONFIDENCE_MATCH', 'UNCERTAIN_ANOMALY_FLAGGED', 'MISMATCH_DETECTED') NOT NULL,
  `confidence_score` DECIMAL(5,4) NOT NULL, -- e.g. 0.9850
  `extracted_evidence` JSON NOT NULL,
  `is_manual_override` TINYINT(1) NOT NULL DEFAULT 0,
  `human_decision_reason` TEXT NULL,
  `executed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_gvr_claim` (`claim_id`),
  CONSTRAINT `fk_gvr_claim` FOREIGN KEY (`claim_id`) REFERENCES `product_gi_claims` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 03_catalog_and_gi_products.sql
-- Module C: Product Catalogue, Variants, Images & Listings
-- ============================================================================

USE `hunarlink`;

-- 1. Product Categories (Hierarchical craft taxonomy)
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` INT UNSIGNED NULL,
  `slug` VARCHAR(100) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `craft_discipline` VARCHAR(100) NOT NULL, -- Pashmina, Woodcarving, Papier-Mache, Carpets, Crewel
  `display_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `ix_categories_parent` (`parent_id`),
  CONSTRAINT `fk_cat_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Brands / Master Artisan Collectives
CREATE TABLE IF NOT EXISTS `brands` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `story` TEXT NULL,
  `district` VARCHAR(100) NOT NULL,
  `established_year` SMALLINT UNSIGNED NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brands_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Base Products Catalogue (Universal item specifications)
CREATE TABLE IF NOT EXISTS `products` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `sku_base` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `brand_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `technique` VARCHAR(100) NOT NULL DEFAULT '', -- Handwoven, Kani, Sozni needle, Carved relief
  `craft_provenance` VARCHAR(150) NOT NULL DEFAULT 'Kashmir Valley',
  `short_description` VARCHAR(500) NOT NULL DEFAULT '',
  `full_description` MEDIUMTEXT NULL,
  `base_mrp` DECIMAL(14,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `is_gi_eligible` TINYINT(1) NOT NULL DEFAULT 0,
  `gi_claim_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `is_gi_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `purity_metrics` JSON NULL, -- e.g. {"micron": 14.2, "fiber": "Changthangi Capra Hircus"}
  `dimensions_cm` VARCHAR(100) NULL,
  `weight_grams` DECIMAL(10,2) NULL,
  `approval_status` ENUM('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_sku_base` (`sku_base`),
  KEY `ix_products_cat` (`category_id`),
  KEY `ix_products_brand` (`brand_id`),
  KEY `ix_products_approval` (`approval_status`),
  CONSTRAINT `fk_prod_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_prod_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_prod_gi_claim` FOREIGN KEY (`gi_claim_id`) REFERENCES `product_gi_claims` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Product Variants (Color, Size, Motif, Fiber Tier)
CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `variant_sku` VARCHAR(80) NOT NULL,
  `variant_name` VARCHAR(150) NOT NULL, -- e.g. "Ivory Natural / King Size / 13.8 Micron"
  `color_family` VARCHAR(50) NULL,
  `size_label` VARCHAR(50) NULL,
  `attributes` JSON NULL,
  `variant_mrp` DECIMAL(14,2) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pv_sku` (`variant_sku`),
  KEY `ix_pv_product` (`product_id`),
  CONSTRAINT `fk_pv_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Product Images & Gallery Assets
CREATE TABLE IF NOT EXISTS `product_images` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `variant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `image_storage_key` VARCHAR(512) NOT NULL,
  `alt_text` VARCHAR(255) NOT NULL DEFAULT '',
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `display_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_pi_prod` (`product_id`),
  KEY `ix_pi_var` (`variant_id`),
  CONSTRAINT `fk_pi_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pi_var` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Direct Seller Retail Listings (Artisan's commercial retail offer)
CREATE TABLE IF NOT EXISTS `seller_product_listings` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `seller_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `variant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `selling_price` DECIMAL(14,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `loom_hours_spent` INT UNSIGNED NULL,
  `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'OUT_OF_STOCK', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_spl_seller_status` (`seller_id`, `status`),
  KEY `ix_spl_prod` (`product_id`),
  CONSTRAINT `fk_spl_seller` FOREIGN KEY (`seller_id`) REFERENCES `seller_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_spl_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_spl_var` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_spl_price` CHECK (`selling_price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Dealer Wholesale Listings (Dealer's bulk commercial listing)
CREATE TABLE IF NOT EXISTS `dealer_wholesale_listings` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dealer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `variant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `minimum_order_quantity` INT UNSIGNED NOT NULL DEFAULT 10,
  `available_bulk_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
  `base_wholesale_price` DECIMAL(14,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `lead_time_days` SMALLINT UNSIGNED NOT NULL DEFAULT 14,
  `status` ENUM('ACTIVE', 'PAUSED', 'SOLD_OUT', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_dwl_dealer_status` (`dealer_id`, `status`),
  KEY `ix_dwl_prod` (`product_id`),
  CONSTRAINT `fk_dwl_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dwl_var` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_dwl_moq` CHECK (`minimum_order_quantity` >= 1),
  CONSTRAINT `chk_dwl_price` CHECK (`base_wholesale_price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 04_suppliers_dealers_and_procurement.sql
-- Module D: Suppliers, Dealers, Procurement & Goods Receipts
-- ============================================================================

USE `hunarlink`;

-- 1. Dealer / Distributor Business Profiles
CREATE TABLE IF NOT EXISTS `dealer_profiles` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dealership_name` VARCHAR(200) NOT NULL,
  `business_registration_number` VARCHAR(100) NOT NULL,
  `gstin` VARCHAR(20) NULL,
  `pan_number` VARCHAR(20) NOT NULL,
  `contact_person_name` VARCHAR(150) NOT NULL,
  `primary_phone` VARCHAR(32) NOT NULL,
  `primary_email` VARCHAR(255) NOT NULL,
  `monthly_procurement_budget` DECIMAL(14,2) NOT NULL DEFAULT 1000000.00,
  `reliability_rating` DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  `total_orders_fulfilled` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING_APPROVAL',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dealer_user` (`user_id`),
  UNIQUE KEY `uq_dealer_biz_reg` (`business_registration_number`),
  KEY `ix_dealer_status` (`status`),
  CONSTRAINT `fk_dp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Bind the dealer foreign key constraint onto dealer_wholesale_listings (from script 03)
ALTER TABLE `dealer_wholesale_listings`
  ADD CONSTRAINT `fk_dwl_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealer_profiles` (`id`) ON DELETE CASCADE;

-- 2. Dealer Business Documents
CREATE TABLE IF NOT EXISTS `dealer_documents` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dealer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `document_type` ENUM('GST_CERTIFICATE', 'INCORPORATION_PROOF', 'WAREHOUSE_LEASE', 'AUDITED_FINANCIALS') NOT NULL,
  `file_storage_key` VARCHAR(512) NOT NULL,
  `file_hash_sha256` CHAR(64) NOT NULL,
  `uploaded_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_dd_dealer` (`dealer_id`),
  CONSTRAINT `fk_dd_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealer_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Dealer Craft Categories / Guild Capabilities
CREATE TABLE IF NOT EXISTS `dealer_categories` (
  `dealer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `max_procurement_units_per_month` INT UNSIGNED NOT NULL DEFAULT 500,
  PRIMARY KEY (`dealer_id`, `category_id`),
  CONSTRAINT `fk_dc_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealer_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dc_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Warehouses (Storage facilities managed by dealers or the platform)
CREATE TABLE IF NOT EXISTS `warehouses` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dealer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL, -- NULL if platform-operated hub
  `warehouse_code` VARCHAR(50) NOT NULL,
  `facility_name` VARCHAR(150) NOT NULL,
  `contact_phone` VARCHAR(32) NOT NULL,
  `address_line1` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL DEFAULT 'Jammu and Kashmir',
  `pincode` VARCHAR(20) NOT NULL,
  `total_capacity_sqft` INT UNSIGNED NOT NULL DEFAULT 5000,
  `climate_controlled` TINYINT(1) NOT NULL DEFAULT 1, -- Essential for raw Pashmina/Silk storage
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_warehouse_code` (`warehouse_code`),
  KEY `ix_warehouse_dealer` (`dealer_id`),
  CONSTRAINT `fk_wh_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealer_profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Supplier / Producer Profiles
CREATE TABLE IF NOT EXISTS `supplier_profiles` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `organization_name` VARCHAR(200) NOT NULL,
  `guild_affinity` VARCHAR(100) NOT NULL, -- Pashmina Raw Fiber, Walnut Wood Slabs, Silk Yarn
  `district` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL DEFAULT 'Jammu and Kashmir',
  `tax_id` VARCHAR(50) NULL,
  `bank_account_holder` VARCHAR(150) NULL,
  `bank_account_number_masked` VARCHAR(32) NULL,
  `bank_ifsc` VARCHAR(20) NULL,
  `verification_status` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_supplier_user` (`user_id`),
  KEY `ix_supplier_guild_status` (`guild_affinity`, `verification_status`),
  CONSTRAINT `fk_sup_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Supplier Verification Applications
CREATE TABLE IF NOT EXISTS `supplier_verification_applications` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `supplier_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('SUBMITTED', 'UNDER_AUDIT', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
  `reviewer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `reviewer_notes` TEXT NULL,
  `submitted_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `decided_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_sva_supplier` (`supplier_id`),
  CONSTRAINT `fk_sva_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `supplier_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sva_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Supplier Documents
CREATE TABLE IF NOT EXISTS `supplier_documents` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `application_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `doc_type` VARCHAR(50) NOT NULL,
  `file_storage_key` VARCHAR(512) NOT NULL,
  `uploaded_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_sd_supp_app` (`application_id`),
  CONSTRAINT `fk_sd_supp_app` FOREIGN KEY (`application_id`) REFERENCES `supplier_verification_applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. Supplier Verification History
CREATE TABLE IF NOT EXISTS `supplier_verification_history` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `application_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_status` VARCHAR(50) NOT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `actor_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `reason` VARCHAR(255) NULL,
  `logged_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_svh_supp_app` FOREIGN KEY (`application_id`) REFERENCES `supplier_verification_applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. Supplier Raw Material / Wholesale Supply Lots
CREATE TABLE IF NOT EXISTS `supplier_lots` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `lot_number` VARCHAR(64) NOT NULL,
  `supplier_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `raw_material_type` VARCHAR(100) NOT NULL, -- Changthangi raw cashmere, Seasoned walnut lumber
  `quantity` DECIMAL(14,3) NOT NULL,
  `unit_of_measure` VARCHAR(20) NOT NULL DEFAULT 'kg', -- kg, pcs, cubic_feet
  `expected_unit_price` DECIMAL(14,2) NOT NULL,
  `total_lot_value` DECIMAL(14,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `is_gi_tagged` TINYINT(1) NOT NULL DEFAULT 1,
  `gi_reference_code` VARCHAR(64) NULL,
  `status` ENUM('OPEN', 'MATCHING', 'ASSIGNED', 'PO_CREATED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sl_lot_number` (`lot_number`),
  KEY `ix_sl_supplier_status` (`supplier_id`, `status`),
  KEY `ix_sl_cat` (`category_id`),
  CONSTRAINT `fk_sl_supp` FOREIGN KEY (`supplier_id`) REFERENCES `supplier_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sl_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 10. Supplier Lot Documents
CREATE TABLE IF NOT EXISTS `supplier_lot_documents` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `lot_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `doc_type` VARCHAR(50) NOT NULL, -- ORIGIN_CERTIFICATE, WEIGHT_SCALE_SLIP, LAB_PURITY_TEST
  `file_storage_key` VARCHAR(512) NOT NULL,
  `uploaded_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sld_lot` FOREIGN KEY (`lot_id`) REFERENCES `supplier_lots` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 11. Supplier Lot Status Audit History
CREATE TABLE IF NOT EXISTS `supplier_lot_status_history` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `lot_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_status` VARCHAR(50) NOT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `actor_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_slsh_lot` FOREIGN KEY (`lot_id`) REFERENCES `supplier_lots` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 12. Dealer Assignment Recommendations (Algorithmic match proposals)
CREATE TABLE IF NOT EXISTS `dealer_assignment_recommendations` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `lot_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dealer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `match_score` DECIMAL(5,2) NOT NULL, -- 0 to 100 composite score
  `capacity_score` DECIMAL(5,2) NOT NULL,
  `reliability_score` DECIMAL(5,2) NOT NULL,
  `distance_km` DECIMAL(8,2) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_dar_lot` (`lot_id`),
  CONSTRAINT `fk_dar_lot` FOREIGN KEY (`lot_id`) REFERENCES `supplier_lots` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dar_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealer_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 13. Dealer Assignments (Procurement invitations dispatched to dealers)
CREATE TABLE IF NOT EXISTS `dealer_assignments` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `lot_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dealer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `assigned_by_admin_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('PENDING_RESPONSE', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_RESPONSE',
  `decline_reason` VARCHAR(255) NULL,
  `assigned_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `responded_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_da_lot_dealer` (`lot_id`, `dealer_id`),
  CONSTRAINT `fk_da_lot` FOREIGN KEY (`lot_id`) REFERENCES `supplier_lots` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_da_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealer_profiles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_da_admin` FOREIGN KEY (`assigned_by_admin_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 14. Dealer Assignment History
CREATE TABLE IF NOT EXISTS `dealer_assignment_history` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `assignment_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_dah_assign` FOREIGN KEY (`assignment_id`) REFERENCES `dealer_assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 15. Supplier-to-Dealer Purchase Orders
CREATE TABLE IF NOT EXISTS `supplier_purchase_orders` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `po_number` VARCHAR(64) NOT NULL,
  `lot_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `supplier_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dealer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `warehouse_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `total_amount` DECIMAL(14,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `status` ENUM('DRAFT', 'ISSUED', 'CONFIRMED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'ISSUED',
  `payment_terms` VARCHAR(100) NOT NULL DEFAULT 'ESCROW_ON_VERIFIED_RECEIPT',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_spo_number` (`po_number`),
  KEY `ix_spo_dealer_status` (`dealer_id`, `status`),
  KEY `ix_spo_supplier` (`supplier_id`),
  CONSTRAINT `fk_spo_lot` FOREIGN KEY (`lot_id`) REFERENCES `supplier_lots` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_spo_supp` FOREIGN KEY (`supplier_id`) REFERENCES `supplier_profiles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_spo_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealer_profiles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_spo_wh` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 16. Supplier Purchase Order Status Audit History
CREATE TABLE IF NOT EXISTS `supplier_purchase_order_status_history` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `po_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_status` VARCHAR(50) NOT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `actor_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sposh_po` FOREIGN KEY (`po_id`) REFERENCES `supplier_purchase_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 17. Supplier Purchase Order Line Items
CREATE TABLE IF NOT EXISTS `supplier_purchase_order_items` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `po_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `item_description` VARCHAR(255) NOT NULL,
  `quantity_ordered` DECIMAL(14,3) NOT NULL,
  `unit_of_measure` VARCHAR(20) NOT NULL DEFAULT 'kg',
  `agreed_unit_price` DECIMAL(14,2) NOT NULL,
  `line_total` DECIMAL(14,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_spoi_po` (`po_id`),
  CONSTRAINT `fk_spoi_po` FOREIGN KEY (`po_id`) REFERENCES `supplier_purchase_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 18. Goods Receipts (Inward delivery physical logging)
CREATE TABLE IF NOT EXISTS `goods_receipts` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `receipt_number` VARCHAR(64) NOT NULL,
  `po_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `warehouse_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `received_by_user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `vehicle_tracking_number` VARCHAR(100) NULL,
  `carrier_name` VARCHAR(100) NULL,
  `received_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `status` ENUM('PENDING_INSPECTION', 'INSPECTED', 'STOCKED') NOT NULL DEFAULT 'PENDING_INSPECTION',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gr_number` (`receipt_number`),
  KEY `ix_gr_po` (`po_id`),
  CONSTRAINT `fk_gr_po` FOREIGN KEY (`po_id`) REFERENCES `supplier_purchase_orders` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_gr_wh` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_gr_user` FOREIGN KEY (`received_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 19. Goods Receipt Line Items
CREATE TABLE IF NOT EXISTS `goods_receipt_items` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `goods_receipt_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `po_item_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `quantity_received` DECIMAL(14,3) NOT NULL,
  `quantity_accepted` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `quantity_rejected` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  PRIMARY KEY (`id`),
  KEY `ix_gri_gr` (`goods_receipt_id`),
  CONSTRAINT `fk_gri_gr` FOREIGN KEY (`goods_receipt_id`) REFERENCES `goods_receipts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gri_poi` FOREIGN KEY (`po_item_id`) REFERENCES `supplier_purchase_order_items` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 20. Quality Inspections (Lab test / manual verification of inward goods)
CREATE TABLE IF NOT EXISTS `quality_inspections` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `goods_receipt_item_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `inspector_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `result` ENUM('PASSED', 'PASSED_WITH_CONDITIONS', 'FAILED') NOT NULL,
  `measured_purity_percent` DECIMAL(5,2) NULL, -- e.g. 99.8% pure Pashmina fleece
  `inspection_report_storage_key` VARCHAR(512) NULL,
  `inspector_remarks` TEXT NULL,
  `inspected_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_qi_gri` (`goods_receipt_item_id`),
  CONSTRAINT `fk_qi_gri` FOREIGN KEY (`goods_receipt_item_id`) REFERENCES `goods_receipt_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_qi_inspector` FOREIGN KEY (`inspector_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 05_inventory_and_retail.sql
-- Module E: Inventory, Carts, Multi-Seller Retail Orders & Fulfilment
-- ============================================================================

USE `hunarlink`;

-- 1. Warehouse Physical Stock Balances
CREATE TABLE IF NOT EXISTS `warehouse_stock` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `warehouse_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `variant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `quantity_on_hand` INT NOT NULL DEFAULT 0,
  `quantity_reserved` INT NOT NULL DEFAULT 0,
  `quantity_damaged` INT NOT NULL DEFAULT 0,
  `quantity_available` INT GENERATED ALWAYS AS (`quantity_on_hand` - `quantity_reserved` - `quantity_damaged`) STORED,
  `last_counted_at` DATETIME(6) NULL,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ws_loc_item` (`warehouse_id`, `product_id`, `variant_id`),
  KEY `ix_ws_product` (`product_id`),
  CONSTRAINT `fk_ws_wh` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ws_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ws_var` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_ws_non_negative_on_hand` CHECK (`quantity_on_hand` >= 0),
  CONSTRAINT `chk_ws_non_negative_reserved` CHECK (`quantity_reserved` >= 0),
  CONSTRAINT `chk_ws_non_negative_available` CHECK (`quantity_available` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Immutable Inventory Transaction Ledger
CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `warehouse_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `variant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `transaction_type` ENUM('RECEIPT', 'RESERVATION', 'DISPATCH', 'RETURN_INWARD', 'DAMAGE_WRITE_OFF', 'CYCLE_COUNT_ADJUSTMENT') NOT NULL,
  `quantity_delta` INT NOT NULL, -- positive for inward, negative for outward
  `reference_document_type` VARCHAR(50) NOT NULL, -- GOODS_RECEIPT, RETAIL_ORDER, WHOLESALE_ORDER
  `reference_document_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `performed_by_user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `remarks` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_it_item_timeline` (`warehouse_id`, `product_id`, `created_at`),
  CONSTRAINT `fk_it_wh` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_it_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_it_actor` FOREIGN KEY (`performed_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Retail Shopping Carts
CREATE TABLE IF NOT EXISTS `carts` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `applied_coupon_code` VARCHAR(50) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cart_user` (`user_id`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Retail Shopping Cart Items
CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `cart_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `listing_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `added_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ci_cart_listing` (`cart_id`, `listing_id`),
  KEY `ix_ci_listing` (`listing_id`),
  CONSTRAINT `fk_ci_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ci_listing` FOREIGN KEY (`listing_id`) REFERENCES `seller_product_listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_ci_qty` CHECK (`quantity` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Customer Wishlists
CREATE TABLE IF NOT EXISTS `wishlists` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` VARCHAR(100) NOT NULL DEFAULT 'Saved Kashmiri Heirlooms',
  `is_public` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_wishlist_user` (`user_id`),
  CONSTRAINT `fk_wl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Customer Wishlist Items
CREATE TABLE IF NOT EXISTS `wishlist_items` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `wishlist_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `variant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `added_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wi_wishlist_item` (`wishlist_id`, `product_id`, `variant_id`),
  CONSTRAINT `fk_wi_wl` FOREIGN KEY (`wishlist_id`) REFERENCES `wishlists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wi_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Master Retail Orders (Customer checkout envelope)
CREATE TABLE IF NOT EXISTS `retail_orders` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `order_number` VARCHAR(64) NOT NULL, -- e.g. HL-ORD-2026-1001
  `customer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `shipping_address_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `subtotal_amount` DECIMAL(14,2) NOT NULL,
  `coupon_discount_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `shipping_fee` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(14,2) NOT NULL,
  `artisan_escrow_total` DECIMAL(14,2) NOT NULL, -- 100% Guaranteed payout before platform promo
  `order_status` ENUM('PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT',
  `payment_status` ENUM('UNPAID', 'ESCROW_HELD', 'CAPTURED', 'RELEASED_TO_ARTISAN', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
  `current_stage` TINYINT UNSIGNED NOT NULL DEFAULT 1, -- 1=Placed, 2=Confirmed, 3=Crafting/Packed, 4=In Transit, 5=Delivered
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ro_order_number` (`order_number`),
  KEY `ix_ro_customer_status` (`customer_id`, `order_status`),
  KEY `ix_ro_created` (`created_at`),
  CONSTRAINT `fk_ro_cust` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ro_addr` FOREIGN KEY (`shipping_address_id`) REFERENCES `user_addresses` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. Seller Fulfilment Groups (One customer order with multiple direct sellers splits here)
CREATE TABLE IF NOT EXISTS `seller_fulfilment_groups` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `order_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `seller_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `group_subtotal` DECIMAL(14,2) NOT NULL,
  `artisan_payout_amount` DECIMAL(14,2) NOT NULL, -- Zero middleman cut: 100% artisan share
  `status` ENUM('PENDING', 'ACCEPTED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'RETURNED') NOT NULL DEFAULT 'PENDING',
  `awb_number` VARCHAR(100) NULL,
  `courier_name` VARCHAR(100) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_sfg_order` (`order_id`),
  KEY `ix_sfg_seller` (`seller_id`),
  CONSTRAINT `fk_sfg_order` FOREIGN KEY (`order_id`) REFERENCES `retail_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sfg_seller` FOREIGN KEY (`seller_id`) REFERENCES `seller_profiles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. Retail Order Line Items (Historical immutable snapshot of purchased goods)
CREATE TABLE IF NOT EXISTS `retail_order_items` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `order_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `fulfilment_group_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `variant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `seller_listing_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_title_snapshot` VARCHAR(255) NOT NULL,
  `sku_snapshot` VARCHAR(100) NOT NULL,
  `unit_price` DECIMAL(14,2) NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `line_total` DECIMAL(14,2) NOT NULL,
  `gi_code_snapshot` VARCHAR(64) NULL,
  `is_gi_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `primary_image_key` VARCHAR(512) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_roi_order` (`order_id`),
  KEY `ix_roi_fg` (`fulfilment_group_id`),
  CONSTRAINT `fk_roi_order` FOREIGN KEY (`order_id`) REFERENCES `retail_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_roi_fg` FOREIGN KEY (`fulfilment_group_id`) REFERENCES `seller_fulfilment_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_roi_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_roi_qty` CHECK (`quantity` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 10. Retail Order Status Audit History
CREATE TABLE IF NOT EXISTS `retail_order_status_history` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `order_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_status` VARCHAR(50) NOT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `stage` TINYINT UNSIGNED NOT NULL,
  `actor_user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_rosh_order` (`order_id`),
  CONSTRAINT `fk_rosh_order` FOREIGN KEY (`order_id`) REFERENCES `retail_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 06_wholesale_marketplace.sql
-- Module F: Wholesale Marketplace, Tiered Pricing, RFQs & B2B Orders
-- ============================================================================

USE `hunarlink`;

-- 1. Wholesale Buyer Business Profiles
CREATE TABLE IF NOT EXISTS `wholesale_buyer_profiles` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `business_type` ENUM('LUXURY_RETAILER', 'HOTEL_CHAIN', 'EXPORT_HOUSE', 'INTERIOR_DESIGN_FIRM', 'BOUTIQUE') NOT NULL,
  `gstin` VARCHAR(20) NULL,
  `corporate_tax_id` VARCHAR(50) NULL,
  `annual_procurement_estimate` DECIMAL(14,2) NULL,
  `status` ENUM('PENDING_REVIEW', 'VERIFIED', 'RESTRICTED') NOT NULL DEFAULT 'PENDING_REVIEW',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wbp_user` (`user_id`),
  KEY `ix_wbp_status` (`status`),
  CONSTRAINT `fk_wbp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Wholesale Volume Price Tiers (Bulk discounts on dealer listings)
CREATE TABLE IF NOT EXISTS `wholesale_price_tiers` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `listing_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tier_min_quantity` INT UNSIGNED NOT NULL,
  `tier_max_quantity` INT UNSIGNED NULL, -- NULL indicates open upper bound
  `unit_price` DECIMAL(14,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wpt_listing_tier` (`listing_id`, `tier_min_quantity`),
  CONSTRAINT `fk_wpt_listing` FOREIGN KEY (`listing_id`) REFERENCES `dealer_wholesale_listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_wpt_min_qty` CHECK (`tier_min_quantity` >= 1),
  CONSTRAINT `chk_wpt_price` CHECK (`unit_price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Wholesale B2B Shopping Carts
CREATE TABLE IF NOT EXISTS `wholesale_carts` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `buyer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wc_buyer` (`buyer_id`),
  CONSTRAINT `fk_wc_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `wholesale_buyer_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Wholesale Shopping Cart Items
CREATE TABLE IF NOT EXISTS `wholesale_cart_items` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `cart_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `listing_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `effective_unit_price` DECIMAL(14,2) NOT NULL,
  `added_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wci_cart_listing` (`cart_id`, `listing_id`),
  CONSTRAINT `fk_wci_cart` FOREIGN KEY (`cart_id`) REFERENCES `wholesale_carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wci_listing` FOREIGN KEY (`listing_id`) REFERENCES `dealer_wholesale_listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Master Wholesale Request for Quotations (RFQs)
CREATE TABLE IF NOT EXISTS `wholesale_rfqs` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `rfq_number` VARCHAR(64) NOT NULL, -- e.g. HL-WHL-2026-1001
  `buyer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `craft_technique` VARCHAR(100) NULL,
  `requires_gi_certification` TINYINT(1) NOT NULL DEFAULT 1,
  `target_delivery_date` DATE NOT NULL,
  `delivery_pincode` VARCHAR(20) NOT NULL,
  `status` ENUM('OPEN', 'DEALERS_INVITED', 'QUOTES_RECEIVED', 'AWARDED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `awarded_quote_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rfq_number` (`rfq_number`),
  KEY `ix_rfq_buyer_status` (`buyer_id`, `status`),
  CONSTRAINT `fk_rfq_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `wholesale_buyer_profiles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rfq_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Wholesale RFQ Line Items
CREATE TABLE IF NOT EXISTS `wholesale_rfq_items` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `rfq_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `item_description` VARCHAR(255) NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `target_unit_price` DECIMAL(14,2) NULL,
  `specifications` JSON NULL, -- e.g. {"warp": "Silk", "weft": "Pashmina", "knot_density_sq_in": 400}
  PRIMARY KEY (`id`),
  KEY `ix_rfi_rfq` (`rfq_id`),
  CONSTRAINT `fk_rfi_rfq` FOREIGN KEY (`rfq_id`) REFERENCES `wholesale_rfqs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Dealer Invitations for RFQs
CREATE TABLE IF NOT EXISTS `rfq_dealer_invitations` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `rfq_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dealer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `invited_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `status` ENUM('SENT', 'VIEWED', 'QUOTED', 'DECLINED') NOT NULL DEFAULT 'SENT',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rdi_rfq_dealer` (`rfq_id`, `dealer_id`),
  CONSTRAINT `fk_rdi_rfq` FOREIGN KEY (`rfq_id`) REFERENCES `wholesale_rfqs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rdi_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealer_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. Dealer Quotations Submitted for RFQs
CREATE TABLE IF NOT EXISTS `dealer_quotes` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `quote_number` VARCHAR(64) NOT NULL,
  `rfq_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dealer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `total_quote_amount` DECIMAL(14,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `lead_time_days` SMALLINT UNSIGNED NOT NULL DEFAULT 21,
  `valid_until` DATE NOT NULL,
  `status` ENUM('SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'SUBMITTED',
  `dealer_remarks` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dq_number` (`quote_number`),
  KEY `ix_dq_rfq` (`rfq_id`),
  KEY `ix_dq_dealer` (`dealer_id`),
  CONSTRAINT `fk_dq_rfq` FOREIGN KEY (`rfq_id`) REFERENCES `wholesale_rfqs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dq_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealer_profiles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. Dealer Quotation Line Items
CREATE TABLE IF NOT EXISTS `dealer_quote_items` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `quote_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `rfq_item_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `unit_price` DECIMAL(14,2) NOT NULL,
  `offered_quantity` INT UNSIGNED NOT NULL,
  `line_total` DECIMAL(14,2) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_dqi_quote` FOREIGN KEY (`quote_id`) REFERENCES `dealer_quotes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dqi_rfqi` FOREIGN KEY (`rfq_item_id`) REFERENCES `wholesale_rfq_items` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 10. Master Wholesale B2B Orders
CREATE TABLE IF NOT EXISTS `wholesale_orders` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `order_number` VARCHAR(64) NOT NULL, -- e.g. HL-B2B-2026-5001
  `buyer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dealer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `origin_rfq_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `origin_quote_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `shipping_address_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `total_order_amount` DECIMAL(14,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `order_status` ENUM('CONFIRMED', 'MANUFACTURING', 'QC_INSPECTION', 'DISPATCHED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
  `payment_terms` ENUM('50_ADVANCE_50_ON_DISPATCH', '100_ESCROW', 'NET_30') NOT NULL DEFAULT '100_ESCROW',
  `payment_status` ENUM('PENDING', 'ESCROW_HELD', 'CAPTURED', 'RELEASED') NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wo_order_number` (`order_number`),
  KEY `ix_wo_buyer` (`buyer_id`),
  KEY `ix_wo_dealer` (`dealer_id`),
  CONSTRAINT `fk_wo_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `wholesale_buyer_profiles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_wo_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealer_profiles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_wo_addr` FOREIGN KEY (`shipping_address_id`) REFERENCES `user_addresses` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 11. Wholesale Order Line Items
CREATE TABLE IF NOT EXISTS `wholesale_order_items` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `wholesale_order_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_title` VARCHAR(255) NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `unit_price` DECIMAL(14,2) NOT NULL,
  `line_total` DECIMAL(14,2) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_woi_order` FOREIGN KEY (`wholesale_order_id`) REFERENCES `wholesale_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 12. Wholesale Order Status Audit History
CREATE TABLE IF NOT EXISTS `wholesale_order_status_history` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `wholesale_order_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_status` VARCHAR(50) NOT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `actor_user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `remarks` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_wosh_order` FOREIGN KEY (`wholesale_order_id`) REFERENCES `wholesale_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 13. Stock Reservations (Temporary hold during checkout and B2B quotation awards)
CREATE TABLE IF NOT EXISTS `stock_reservations` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `warehouse_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `variant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `reserved_quantity` INT NOT NULL,
  `reservation_type` ENUM('RETAIL_CART_CHECKOUT', 'WHOLESALE_ORDER_AWARD') NOT NULL,
  `reference_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `status` ENUM('ACTIVE', 'COMMITTED', 'RELEASED_EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_sr_status_expiry` (`status`, `expires_at`),
  CONSTRAINT `fk_sr_wh` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sr_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 07_payments_shipping_returns_reviews.sql
-- Module G: Payments, Escrow, Webhooks, Shipments, Returns & Reviews
-- ============================================================================

USE `hunarlink`;

-- 1. Master Payments Ledger (Escrow, Retail, Wholesale & Procurement Settlements)
CREATE TABLE IF NOT EXISTS `payments` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `payment_reference` VARCHAR(100) NOT NULL, -- e.g. HL-PAY-2026-9021
  `purpose` ENUM('RETAIL_ORDER', 'WHOLESALE_ORDER', 'SUPPLIER_PROCUREMENT') NOT NULL,
  `order_reference_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `payer_user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `payment_method` ENUM('UPI_VERIFIED_ESCROW', 'NET_BANKING', 'CARD_TOKENIZED', 'NEFT_RTGS') NOT NULL,
  `gateway_provider` VARCHAR(50) NOT NULL DEFAULT 'Razorpay',
  `gateway_order_id` VARCHAR(100) NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `amount_authorized` DECIMAL(14,2) NOT NULL,
  `amount_captured` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `amount_refunded` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('CREATED', 'AUTHORIZED', 'CAPTURED', 'ESCROW_HELD', 'RELEASED_TO_BENEFICIARY', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'CREATED',
  `escrow_release_code_hash` VARCHAR(128) NULL, -- SHA-256 hash of Doorstep GI QR token
  `escrow_released_at` DATETIME(6) NULL,
  `idempotency_key` VARCHAR(100) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_ref` (`payment_reference`),
  UNIQUE KEY `uq_payments_idempotency` (`idempotency_key`),
  KEY `ix_payments_order` (`purpose`, `order_reference_id`),
  KEY `ix_payments_status` (`status`),
  CONSTRAINT `fk_pay_payer` FOREIGN KEY (`payer_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_pay_amounts` CHECK (`amount_refunded` <= `amount_captured`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Payment Attempts (Audit each gateway roundtrip transaction)
CREATE TABLE IF NOT EXISTS `payment_attempts` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `payment_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `attempt_number` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `gateway_transaction_id` VARCHAR(100) NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `status` ENUM('INITIATED', 'SUCCESS', 'FAILED') NOT NULL,
  `error_code` VARCHAR(50) NULL,
  `error_message` VARCHAR(255) NULL,
  `gateway_response_raw` JSON NULL,
  `attempted_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_pa_payment` (`payment_id`),
  CONSTRAINT `fk_pa_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Payment Status History
CREATE TABLE IF NOT EXISTS `payment_status_history` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `payment_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_status` VARCHAR(50) NOT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `actor_id` VARCHAR(100) NOT NULL, -- SYSTEM, WEBHOOK, ADMIN_ID
  `reason` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_psh_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Payment Webhook Events (Idempotent signature-verified external payloads)
CREATE TABLE IF NOT EXISTS `payment_webhook_events` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `event_id` VARCHAR(128) NOT NULL, -- Gateway external event identifier
  `gateway` VARCHAR(50) NOT NULL DEFAULT 'Razorpay',
  `event_type` VARCHAR(100) NOT NULL, -- payment.authorized, payment.captured, refund.processed
  `payload` JSON NOT NULL,
  `is_processed` TINYINT(1) NOT NULL DEFAULT 0,
  `processed_at` DATETIME(6) NULL,
  `error_message` VARCHAR(255) NULL,
  `received_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pwe_event` (`gateway`, `event_id`),
  KEY `ix_pwe_processed` (`is_processed`, `received_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Customer / Buyer Refunds
CREATE TABLE IF NOT EXISTS `refunds` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `refund_reference` VARCHAR(100) NOT NULL,
  `payment_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `gateway_refund_id` VARCHAR(100) NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `reason` VARCHAR(255) NOT NULL,
  `initiated_by_admin_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` ENUM('INITIATED', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'INITIATED',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `completed_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refund_ref` (`refund_reference`),
  KEY `ix_refund_payment` (`payment_id`),
  CONSTRAINT `fk_rf_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rf_admin` FOREIGN KEY (`initiated_by_admin_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Direct Artisan & Supplier Payouts (100% Zero-Middleman direct bank transfer)
CREATE TABLE IF NOT EXISTS `payouts` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `payout_reference` VARCHAR(100) NOT NULL,
  `beneficiary_user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `beneficiary_role` ENUM('SELLER', 'SUPPLIER', 'DEALER') NOT NULL,
  `associated_order_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `gateway_transfer_id` VARCHAR(100) NULL,
  `utr_number` VARCHAR(64) NULL, -- Bank Unique Transaction Reference
  `status` ENUM('SCHEDULED', 'PROCESSING', 'SETTLED', 'FAILED') NOT NULL DEFAULT 'SCHEDULED',
  `settled_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payout_ref` (`payout_reference`),
  KEY `ix_payout_beneficiary` (`beneficiary_user_id`, `status`),
  CONSTRAINT `fk_po_user` FOREIGN KEY (`beneficiary_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Logistics Shipments (Multi-seller parcel tracking)
CREATE TABLE IF NOT EXISTS `shipments` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tracking_number` VARCHAR(100) NOT NULL,
  `fulfilment_group_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `carrier_code` VARCHAR(50) NOT NULL DEFAULT 'BLUEDART_HERITAGE',
  `service_tier` VARCHAR(50) NOT NULL DEFAULT 'TEMPERATURE_CONTROLLED_EXPRESS',
  `weight_grams` DECIMAL(10,2) NOT NULL,
  `label_storage_key` VARCHAR(512) NULL,
  `status` ENUM('LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_ATTEMPT', 'RETURNED') NOT NULL DEFAULT 'LABEL_CREATED',
  `estimated_delivery_at` DATETIME(6) NULL,
  `delivered_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shipment_tracking` (`tracking_number`),
  KEY `ix_shipment_fg` (`fulfilment_group_id`),
  CONSTRAINT `fk_ship_fg` FOREIGN KEY (`fulfilment_group_id`) REFERENCES `seller_fulfilment_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. Shipment Line Items
CREATE TABLE IF NOT EXISTS `shipment_items` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `shipment_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `order_item_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_si_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_si_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `retail_order_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. Real-Time Tracking Events
CREATE TABLE IF NOT EXISTS `tracking_events` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `shipment_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `location_city` VARCHAR(100) NOT NULL,
  `event_status` VARCHAR(100) NOT NULL,
  `activity_description` VARCHAR(255) NOT NULL,
  `event_timestamp` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_te_shipment_time` (`shipment_id`, `event_timestamp`),
  CONSTRAINT `fk_te_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 10. Customer Return Requests
CREATE TABLE IF NOT EXISTS `return_requests` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `return_number` VARCHAR(64) NOT NULL,
  `order_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `customer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `reason_category` ENUM('PHYSICAL_DEFECT', 'GI_INTEGRITY_FAILED', 'TRANSIT_DAMAGE', 'INCORRECT_ITEM') NOT NULL,
  `customer_notes` TEXT NOT NULL,
  `status` ENUM('REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'INSPECTED', 'REFUNDED', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
  `admin_decision_notes` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_return_number` (`return_number`),
  KEY `ix_rr_order` (`order_id`),
  CONSTRAINT `fk_rr_order` FOREIGN KEY (`order_id`) REFERENCES `retail_orders` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rr_cust` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 11. Return Status Audit History
CREATE TABLE IF NOT EXISTS `return_status_history` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `return_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_status` VARCHAR(50) NOT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `actor_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_rsh_return` FOREIGN KEY (`return_id`) REFERENCES `return_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 12. Return Request Line Items
CREATE TABLE IF NOT EXISTS `return_items` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `return_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `order_item_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ri_return` FOREIGN KEY (`return_id`) REFERENCES `return_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ri_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `retail_order_items` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 13. Verified Customer Product Reviews
CREATE TABLE IF NOT EXISTS `product_reviews` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `customer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `order_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, -- Verified buyer requirement
  `rating` TINYINT UNSIGNED NOT NULL, -- 1 to 5 stars
  `review_headline` VARCHAR(150) NOT NULL,
  `review_body` TEXT NOT NULL,
  `is_gi_experience_verified` TINYINT(1) NOT NULL DEFAULT 1,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pr_cust_order_prod` (`customer_id`, `order_id`, `product_id`),
  KEY `ix_pr_prod_rating` (`product_id`, `rating`),
  CONSTRAINT `fk_pr_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pr_cust` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pr_order` FOREIGN KEY (`order_id`) REFERENCES `retail_orders` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_pr_rating` CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 08_promotions_notifications_and_admin_operations.sql
-- Module H: Promotions, Coupons, Notifications, Support & Immutable Audit Logs
-- ============================================================================

USE `hunarlink`;

-- 1. Promotional Coupons (Discount absorbed by platform fee, never by the artisan)
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `code` VARCHAR(50) NOT NULL, -- e.g. VALLEY10, HERITAGE500
  `discount_type` ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL,
  `discount_value` DECIMAL(14,2) NOT NULL,
  `max_discount_cap` DECIMAL(14,2) NULL,
  `minimum_order_value` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `usage_limit_total` INT UNSIGNED NULL,
  `usage_limit_per_user` INT UNSIGNED NOT NULL DEFAULT 1,
  `times_used` INT UNSIGNED NOT NULL DEFAULT 0,
  `valid_from` DATETIME(6) NOT NULL,
  `valid_until` DATETIME(6) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coupon_code` (`code`),
  KEY `ix_coupon_validity` (`is_active`, `valid_from`, `valid_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Customer Coupon Usage Ledger
CREATE TABLE IF NOT EXISTS `coupon_usage` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `coupon_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `order_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `discount_amount_applied` DECIMAL(14,2) NOT NULL,
  `used_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_cu_coupon_user` (`coupon_id`, `user_id`),
  CONSTRAINT `fk_cu_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cu_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_cu_order` FOREIGN KEY (`order_id`) REFERENCES `retail_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Platform Promotional Campaigns
CREATE TABLE IF NOT EXISTS `promotions` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `banner_image_key` VARCHAR(512) NULL,
  `discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `starts_at` DATETIME(6) NOT NULL,
  `ends_at` DATETIME(6) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_promo_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Promotion Included Products
CREATE TABLE IF NOT EXISTS `promotion_products` (
  `promotion_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`promotion_id`, `product_id`),
  CONSTRAINT `fk_pp_promo` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pp_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Promotion Included Craft Categories
CREATE TABLE IF NOT EXISTS `promotion_categories` (
  `promotion_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`promotion_id`, `category_id`),
  CONSTRAINT `fk_pc_promo` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pc_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. User In-App & Push Notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `category` ENUM('ORDER_STATUS', 'ESCROW_PAYOUT', 'GI_VERIFICATION', 'RFQ_QUOTE', 'SECURITY_ALERT') NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `link_url` VARCHAR(255) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `read_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_notif_user_unread` (`user_id`, `is_read`, `created_at`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Customer & Artisan Support Tickets
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ticket_number` VARCHAR(64) NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `assigned_admin_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `category` ENUM('ESCROW_INQUIRY', 'GI_AUTHENTICITY', 'ORDER_DELIVERY', 'DAMAGE_DISPUTE', 'ACCOUNT_ACCESS') NOT NULL,
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `subject` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_number` (`ticket_number`),
  KEY `ix_ticket_status` (`status`),
  CONSTRAINT `fk_st_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_st_admin` FOREIGN KEY (`assigned_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. Support Ticket Messages
CREATE TABLE IF NOT EXISTS `support_ticket_messages` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ticket_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `sender_user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `message_body` TEXT NOT NULL,
  `attachment_storage_key` VARCHAR(512) NULL,
  `is_internal_note` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_stm_ticket` (`ticket_id`),
  CONSTRAINT `fk_stm_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stm_sender` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. Immutable Admin Audit Logs (Append-only security and compliance trail)
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_admin_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `action` VARCHAR(100) NOT NULL, -- SELLER_SUSPEND, GI_AUDIT_APPROVE, PLATFORM_FEE_UPDATE
  `target_type` VARCHAR(100) NOT NULL, -- User, SellerProfile, Product, PlatformSetting
  `target_id` VARCHAR(100) NOT NULL,
  `reason` VARCHAR(255) NOT NULL DEFAULT '',
  `ip_address` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
  `correlation_id` VARCHAR(100) NULL,
  `old_values` JSON NULL,
  `new_values` JSON NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_audit_target` (`target_type`, `target_id`),
  KEY `ix_audit_actor_created` (`actor_admin_id`, `created_at`),
  CONSTRAINT `fk_al_admin` FOREIGN KEY (`actor_admin_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 10. High-Risk Action Approvals (Dual-control workflow for financial/critical actions)
CREATE TABLE IF NOT EXISTS `admin_action_requests` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `requested_by_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `action_type` VARCHAR(100) NOT NULL,
  `action_payload` JSON NOT NULL,
  `justification` TEXT NOT NULL,
  `status` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING_APPROVAL',
  `reviewed_by_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `review_remarks` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `reviewed_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_aar_req` FOREIGN KEY (`requested_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_aar_rev` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 11. Platform Configuration Settings
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` VARCHAR(255) NOT NULL,
  `data_type` ENUM('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON') NOT NULL DEFAULT 'STRING',
  `description` VARCHAR(255) NOT NULL DEFAULT '',
  `is_public` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by_admin_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ps_key` (`setting_key`),
  CONSTRAINT `fk_ps_admin` FOREIGN KEY (`updated_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 12. Public Platform Announcements & Monograph Bulletins
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `bulletin_type` ENUM('CRAFT_HERITAGE', 'GI_LAB_RELEASE', 'FAIR_PRICE_AUDIT', 'MAINTENANCE') NOT NULL,
  `content` MEDIUMTEXT NOT NULL,
  `published_by_admin_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `published_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ann_slug` (`slug`),
  KEY `ix_ann_published` (`is_pinned`, `published_at`),
  CONSTRAINT `fk_ann_admin` FOREIGN KEY (`published_by_admin_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 13. Product Approval Audit History
CREATE TABLE IF NOT EXISTS `product_approval_history` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `reviewer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_status` VARCHAR(50) NOT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `comments` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_pah_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pah_rev` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 14. Dealer Status Audit History
CREATE TABLE IF NOT EXISTS `dealer_status_history` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dealer_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_status` VARCHAR(50) NOT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `actor_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `reason` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_dsh_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealer_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 15. Supplier Status Audit History
CREATE TABLE IF NOT EXISTS `supplier_status_history` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `supplier_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_status` VARCHAR(50) NOT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `actor_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `reason` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ssh_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `supplier_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 09_mysql_indexes_triggers_views_procedures.sql
-- Module: High-Performance Views, Full-Text Indexes, Triggers & Procedures
-- ============================================================================

USE `hunarlink`;

-- ----------------------------------------------------------------------------
-- 1. Full-Text Search Indexes for Products and Catalogue
-- ----------------------------------------------------------------------------
ALTER TABLE `products`
  ADD FULLTEXT INDEX `ft_products_title_desc` (`title`, `technique`, `short_description`);

-- ----------------------------------------------------------------------------
-- 2. Business Views
-- ----------------------------------------------------------------------------

-- View 1: Active Retail Storefront Catalogue (Pre-joined with seller & GI badge)
CREATE OR REPLACE VIEW `v_active_retail_listings` AS
SELECT
  spl.`id` AS `listing_id`,
  spl.`selling_price`,
  spl.`currency`,
  spl.`stock_quantity`,
  spl.`loom_hours_spent`,
  p.`id` AS `product_id`,
  p.`sku_base`,
  p.`title`,
  p.`technique`,
  p.`craft_provenance`,
  p.`base_mrp`,
  p.`is_gi_verified`,
  p.`dimensions_cm`,
  p.`weight_grams`,
  c.`name` AS `category_name`,
  c.`craft_discipline`,
  b.`name` AS `brand_name`,
  sp.`id` AS `seller_id`,
  sp.`brand_name` AS `artisan_store_name`,
  sp.`artisan_title`,
  sp.`district` AS `artisan_district`,
  sp.`is_gi_certified` AS `artisan_has_gi`,
  (
    SELECT pi.`image_storage_key`
    FROM `product_images` pi
    WHERE pi.`product_id` = p.`id` AND pi.`is_primary` = 1
    LIMIT 1
  ) AS `primary_image_key`
FROM `seller_product_listings` spl
JOIN `products` p ON spl.`product_id` = p.`id`
JOIN `categories` c ON p.`category_id` = c.`id`
LEFT JOIN `brands` b ON p.`brand_id` = b.`id`
JOIN `seller_profiles` sp ON spl.`seller_id` = sp.`id`
WHERE spl.`status` = 'ACTIVE'
  AND p.`approval_status` = 'APPROVED'
  AND sp.`profile_status` = 'APPROVED';

-- View 2: Dealer Procurement Lots & Assignments Pipeline
CREATE OR REPLACE VIEW `v_dealer_procurement_pipeline` AS
SELECT
  da.`id` AS `assignment_id`,
  da.`status` AS `assignment_status`,
  da.`assigned_at`,
  da.`responded_at`,
  sl.`id` AS `lot_id`,
  sl.`lot_number`,
  sl.`title` AS `lot_title`,
  sl.`raw_material_type`,
  sl.`quantity`,
  sl.`unit_of_measure`,
  sl.`expected_unit_price`,
  sl.`total_lot_value`,
  sl.`is_gi_tagged`,
  sp.`id` AS `supplier_id`,
  sp.`organization_name` AS `supplier_name`,
  sp.`district` AS `supplier_district`,
  dp.`id` AS `dealer_id`,
  dp.`dealership_name`
FROM `dealer_assignments` da
JOIN `supplier_lots` sl ON da.`lot_id` = sl.`id`
JOIN `supplier_profiles` sp ON sl.`supplier_id` = sp.`id`
JOIN `dealer_profiles` dp ON da.`dealer_id` = dp.`id`;

-- View 3: Executive Admin Dashboard Metrics
CREATE OR REPLACE VIEW `v_admin_platform_kpis` AS
SELECT
  (SELECT COUNT(*) FROM `users` WHERE `account_status` = 'ACTIVE') AS `active_users_count`,
  (SELECT COUNT(*) FROM `seller_profiles` WHERE `profile_status` = 'APPROVED') AS `verified_artisans_count`,
  (SELECT COUNT(*) FROM `dealer_profiles` WHERE `status` = 'APPROVED') AS `active_dealers_count`,
  (SELECT COUNT(*) FROM `seller_verification_applications` WHERE `application_status` IN ('SUBMITTED', 'IN_REVIEW')) AS `pending_verifications_count`,
  (SELECT COUNT(*) FROM `wholesale_rfqs` WHERE `status` = 'OPEN') AS `open_rfqs_count`,
  (SELECT IFNULL(SUM(`grand_total`), 0.00) FROM `retail_orders` WHERE `order_status` NOT IN ('CANCELLED', 'REFUNDED')) AS `retail_gmv`,
  (SELECT IFNULL(SUM(`total_order_amount`), 0.00) FROM `wholesale_orders` WHERE `order_status` != 'CANCELLED') AS `wholesale_gmv`;

-- ----------------------------------------------------------------------------
-- 3. Triggers: Strict Immutability on Security & Audit Logs
-- ----------------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER `trg_audit_logs_prevent_update`
BEFORE UPDATE ON `audit_logs`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'HunarLink Security Violation: audit_logs is append-only. Modification is strictly prohibited.';
END$$

CREATE TRIGGER `trg_audit_logs_prevent_delete`
BEFORE DELETE ON `audit_logs`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'HunarLink Security Violation: audit_logs is append-only. Deletion is strictly prohibited.';
END$$

-- ----------------------------------------------------------------------------
-- 4. Stored Procedures: Atomic Warehouse Stock Reservation & Consumption
-- ----------------------------------------------------------------------------

-- Procedure 1: Reserve Stock Atomically (Prevents negative stock / overselling)
CREATE PROCEDURE `sp_reserve_warehouse_stock`(
  IN p_reservation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
  IN p_warehouse_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
  IN p_product_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
  IN p_variant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
  IN p_quantity INT,
  IN p_reservation_type VARCHAR(50),
  IN p_reference_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
  IN p_ttl_minutes INT,
  OUT p_success TINYINT(1),
  OUT p_error_message VARCHAR(255)
)
proc_block: BEGIN
  DECLARE v_avail INT DEFAULT 0;

  IF p_quantity <= 0 THEN
    SET p_success = 0;
    SET p_error_message = 'Reservation quantity must be strictly greater than 0';
    LEAVE proc_block;
  END IF;

  -- Row-level lock check
  SELECT `quantity_available` INTO v_avail
  FROM `warehouse_stock`
  WHERE `warehouse_id` = p_warehouse_id
    AND `product_id` = p_product_id
    AND ((`variant_id` IS NULL AND p_variant_id IS NULL) OR (`variant_id` = p_variant_id))
  FOR UPDATE;

  IF v_avail IS NULL OR v_avail < p_quantity THEN
    SET p_success = 0;
    SET p_error_message = 'Insufficient warehouse stock available for reservation';
    LEAVE proc_block;
  END IF;

  -- Update reserved quantity
  UPDATE `warehouse_stock`
  SET `quantity_reserved` = `quantity_reserved` + p_quantity
  WHERE `warehouse_id` = p_warehouse_id
    AND `product_id` = p_product_id
    AND ((`variant_id` IS NULL AND p_variant_id IS NULL) OR (`variant_id` = p_variant_id));

  -- Insert reservation log
  INSERT INTO `stock_reservations` (
    `id`, `warehouse_id`, `product_id`, `variant_id`,
    `reserved_quantity`, `reservation_type`, `reference_id`,
    `expires_at`, `status`
  ) VALUES (
    p_reservation_id, p_warehouse_id, p_product_id, p_variant_id,
    p_quantity, p_reservation_type, p_reference_id,
    DATE_ADD(CURRENT_TIMESTAMP(6), INTERVAL p_ttl_minutes MINUTE), 'ACTIVE'
  );

  SET p_success = 1;
  SET p_error_message = 'Stock reserved successfully';
END proc_block$$

-- Procedure 2: Commit Reservation upon Order Placement
CREATE PROCEDURE `sp_commit_warehouse_stock`(
  IN p_reservation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
  IN p_actor_user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
  OUT p_success TINYINT(1)
)
proc_block: BEGIN
  DECLARE v_wh_id CHAR(36);
  DECLARE v_prod_id CHAR(36);
  DECLARE v_var_id CHAR(36);
  DECLARE v_qty INT;
  DECLARE v_status VARCHAR(50);

  SELECT `warehouse_id`, `product_id`, `variant_id`, `reserved_quantity`, `status`
  INTO v_wh_id, v_prod_id, v_var_id, v_qty, v_status
  FROM `stock_reservations`
  WHERE `id` = p_reservation_id
  FOR UPDATE;

  IF v_status != 'ACTIVE' THEN
    SET p_success = 0;
    LEAVE proc_block;
  END IF;

  -- Decrement on_hand and reserved simultaneously
  UPDATE `warehouse_stock`
  SET `quantity_on_hand` = `quantity_on_hand` - v_qty,
      `quantity_reserved` = `quantity_reserved` - v_qty
  WHERE `warehouse_id` = v_wh_id
    AND `product_id` = v_prod_id
    AND ((`variant_id` IS NULL AND v_var_id IS NULL) OR (`variant_id` = v_var_id));

  -- Record in immutable ledger
  INSERT INTO `inventory_transactions` (
    `id`, `warehouse_id`, `product_id`, `variant_id`,
    `transaction_type`, `quantity_delta`, `reference_document_type`,
    `reference_document_id`, `performed_by_user_id`, `remarks`
  ) VALUES (
    UUID(), v_wh_id, v_prod_id, v_var_id,
    'DISPATCH', -v_qty, 'STOCK_RESERVATION',
    p_reservation_id, p_actor_user_id, 'Committed upon confirmed checkout'
  );

  UPDATE `stock_reservations`
  SET `status` = 'COMMITTED'
  WHERE `id` = p_reservation_id;

  SET p_success = 1;
END proc_block$$

DELIMITER ;
-- ============================================================================
-- HunarLink MySQL 8.0+ Database Bootstrap
-- Script: 10_seed_reference_data.sql
-- Module: System Master Reference Data (No mock users, only official taxonomy)
-- ============================================================================

USE `hunarlink`;

-- 1. Platform Master Roles
INSERT INTO `platform_roles` (`role_code`, `display_name`, `description`, `is_active`) VALUES
('CUSTOMER', 'Retail Customer / Collector', 'Individual patron purchasing certified Kashmiri crafts', 1),
('DIRECT_SELLER', 'Master Artisan / Direct Seller', 'Verified craftsperson listing direct-to-consumer inventory', 1),
('SUPPLIER', 'Raw Material Producer / Supplier', 'Supplier offering bulk raw materials or artisan lot batches', 1),
('DEALER', 'Authorized Regional Dealer / Distributor', 'Procurement and warehousing partner for wholesale and raw lots', 1),
('WHOLESALE_BUYER', 'Institutional / Wholesale Buyer', 'B2B enterprise, luxury hotelier, or boutique buyer', 1),
('ADMIN', 'Platform Administrator', 'HunarLink operations, verification auditor, or platform executive', 1)
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- 2. Granular Admin Roles
INSERT INTO `admin_roles` (`role_key`, `display_name`, `description`) VALUES
('SUPER_ADMIN', 'Super Administrator', 'Full platform operational governance and settings access'),
('OPERATIONS_MANAGER', 'Operations Manager', 'Procurement oversight, dealer assignments and order management'),
('VERIFICATION_AUDITOR', 'GI & Artisan Verification Auditor', 'Audits seller applications and GI evidence verification claims'),
('FINANCE_OFFICER', 'Finance & Escrow Controller', 'Doorstep QR escrow settlements, refunds and direct artisan payouts'),
('CATALOGUE_MODERATOR', 'Catalogue & Quality Moderator', 'Reviews product listings, artisan profiles and craft taxonomy')
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- 3. Admin Permissions
INSERT INTO `admin_permissions` (`permission_key`, `module`, `description`) VALUES
('users:manage', 'IDENTITY', 'View, activate or suspend user accounts'),
('sellers:audit', 'VERIFICATION', 'Review and approve/reject artisan registration applications'),
('gi:adjudicate', 'VERIFICATION', 'Review AI verification results and make final GI claim decisions'),
('procurement:assign', 'PROCUREMENT', 'Assign raw material lots to qualified regional dealers'),
('finance:escrow_release', 'FINANCE', 'Authorize doorstep escrow release and dispute resolution'),
('settings:modify', 'SETTINGS', 'Modify platform commission fees and operational policies'),
('catalog:approve', 'CATALOGUE', 'Approve master products for public storefront listing')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- 4. Map Permissions to SUPER_ADMIN Role
INSERT INTO `admin_role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `admin_roles` r
CROSS JOIN `admin_permissions` p
WHERE r.`role_key` = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- 5. Master Craft Categories (J&K Heritage Disciplines)
INSERT INTO `categories` (`id`, `parent_id`, `slug`, `name`, `description`, `craft_discipline`, `display_order`, `is_active`) VALUES
(1, NULL, 'pashmina-textiles', 'Pashmina Textiles', 'Hand-spun and handwoven Changthangi cashmere wraps, shawls, and stoles', 'Pashmina', 1, 1),
(2, NULL, 'walnut-woodcarving', 'Walnut Woodcarving', 'Intricately carved Kashmiri walnut wood furniture, relief panels, and artifacts', 'Woodcarving', 2, 1),
(3, NULL, 'papier-mache', 'Kashmiri Papier-Mache', 'Molded paper pulp hand-painted with miniature naqashi floral gold leaf motifs', 'Papier-Mache', 3, 1),
(4, NULL, 'silk-rugs-carpets', 'Silk Rugs & Carpets', 'Hand-knotted pure mulberry silk carpets with high knot density (400-900 KPSI)', 'Carpets', 4, 1),
(5, NULL, 'crewel-chainstitch', 'Crewel & Chain Stitch', 'Hand-embroidered wool chainstitch rugs, tapestries, and furnishings', 'Crewel', 5, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 6. Official J&K Geographical Indications Registry Reference Records
INSERT INTO `gi_reference_records` (
  `id`, `gi_code`, `craft_name`, `category`,
  `gi_registration_number`, `registered_proprietor`, `authorized_user_number`, `authorized_user_name`,
  `district`, `state`, `specifications`, `issuing_authority`, `valid_from`, `valid_until`, `is_active`
) VALUES
(
  'a1b2c3d4-0001-4000-8000-000000000001', 'GI-JK-PASH-8821', 'Kashmir Pashmina', 'Textiles',
  'GI-46', 'Tahafuz Society / Craft Development Institute', 'GI #JK-PASH-8821', 'Master Ghulam Qadir Mir',
  'Srinagar', 'Jammu and Kashmir',
  JSON_OBJECT('micron_max', 15.0, 'fiber_origin', 'Changthangi Goat', 'spinning', 'Hand-spun Charkha', 'weaving', 'Traditional Wooden Handloom'),
  'Geographical Indications Registry, Government of India', '2008-12-09', '2028-12-08', 1
),
(
  'a1b2c3d4-0002-4000-8000-000000000002', 'GI-JK-KANI-8810', 'Kani Shawl', 'Textiles',
  'GI-118', 'Tahafuz Society', 'GI #JK-KANI-8810', 'Master Ghulam Qadir Mir',
  'Srinagar', 'Jammu and Kashmir',
  JSON_OBJECT('technique', 'Tujji / Wooden Eyeless Bobbin', 'pattern_guide', 'Talim coded script'),
  'Geographical Indications Registry, Government of India', '2010-06-22', '2030-06-21', 1
),
(
  'a1b2c3d4-0003-4000-8000-000000000003', 'GI-JK-WALN-8830', 'Kashmir Walnut Wood Carving', 'Handicraft',
  'GI-182', 'Directorate of Handicrafts & Handloom, J&K', 'GI #JK-WALN-8830', 'Ustadani Zareena Bano',
  'Srinagar', 'Jammu and Kashmir',
  JSON_OBJECT('wood_type', 'Juglans regia', 'seasoning_years', 4, 'carving_type', 'Deep Relief / Open Trellis (Jali)'),
  'Geographical Indications Registry, Government of India', '2011-09-14', '2031-09-13', 1
),
(
  'a1b2c3d4-0004-4000-8000-000000000004', 'GI-JK-PAPR-8845', 'Kashmir Papier Mache', 'Handicraft',
  'GI-184', 'Directorate of Handicrafts & Handloom, J&K', 'GI #JK-PAPR-8845', 'Master Nazir Ahmad Wani',
  'Srinagar', 'Jammu and Kashmir',
  JSON_OBJECT('base_material', 'Sakhtsazi rice-starch paper pulp', 'painting', 'Naqashi 24K gold illumination'),
  'Geographical Indications Registry, Government of India', '2011-09-14', '2031-09-13', 1
),
(
  'a1b2c3d4-0005-4000-8000-000000000005', 'GI-JK-CARP-8862', 'Kashmir Silk Carpet', 'Handicraft',
  'GI-522', 'Meeras Society', 'GI #JK-CARP-8862', 'Ustad Bashir Ahmad Lone',
  'Budgam', 'Jammu and Kashmir',
  JSON_OBJECT('knot_type', 'Persian Senneh asymmetric', 'min_kpsi', 400, 'warp_weft', 'Pure Mulberry Silk'),
  'Geographical Indications Registry, Government of India', '2016-04-18', '2036-04-17', 1
)
ON DUPLICATE KEY UPDATE `craft_name` = VALUES(`craft_name`);

-- 7. Platform Operational Configuration Settings
INSERT INTO `platform_settings` (`setting_key`, `setting_value`, `data_type`, `description`, `is_public`, `is_active`) VALUES
('PLATFORM_FEE_PERCENT', '3.0', 'DECIMAL', 'Platform sustainability fee charged to retail checkout (absorbed before artisan payout)', 1, 1),
('ARTISAN_ZERO_COMMISSION_GUARANTEE', 'true', 'BOOLEAN', 'Guarantee that 100% of listed price goes to the verified artisan', 1, 1),
('ESCROW_HOLD_PERIOD_DAYS', '7', 'INTEGER', 'Days funds remain in escrow after doorstep delivery before auto-release if no dispute', 0, 1),
('GI_VERIFICATION_STRICT_MODE', 'true', 'BOOLEAN', 'Requires dual verification (authorized user match + certificate) for GI label affixation', 0, 1),
('WHOLESALE_DEFAULT_ESCROW_PERCENT', '100', 'INTEGER', 'Default escrow security deposit percent required for B2B RFQ awards', 0, 1)
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

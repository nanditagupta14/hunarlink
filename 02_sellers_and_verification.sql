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


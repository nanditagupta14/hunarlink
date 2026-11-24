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


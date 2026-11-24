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


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


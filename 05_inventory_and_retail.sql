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


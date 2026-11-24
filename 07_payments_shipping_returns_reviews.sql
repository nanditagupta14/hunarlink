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


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


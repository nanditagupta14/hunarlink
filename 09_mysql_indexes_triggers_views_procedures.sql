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


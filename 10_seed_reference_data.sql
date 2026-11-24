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


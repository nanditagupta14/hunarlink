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


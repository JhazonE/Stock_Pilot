
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `accounts` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_account_name` (`name`),
  UNIQUE KEY `unique_account_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `approval_history` (
  `id` varchar(36) NOT NULL,
  `approval_queue_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `action` enum('Approve','Reject') NOT NULL,
  `notes` text,
  `step_number` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `approval_queue` (
  `id` varchar(36) NOT NULL,
  `transaction_type` varchar(50) NOT NULL,
  `transaction_data` json NOT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `current_step` int DEFAULT '1',
  `created_by` varchar(36) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `approval_workflows` (
  `id` varchar(36) NOT NULL,
  `transaction_type` varchar(50) NOT NULL,
  `user_type_id` varchar(36) NOT NULL,
  `step_order` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `bad_order_items` (
  `id` varchar(50) NOT NULL,
  `bad_order_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `cost` decimal(10,2) NOT NULL,
  `reason` enum('Damaged','Defective','Expired','Wrong Item','Missing','Other') NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bad_order_id` (`bad_order_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_reason` (`reason`),
  CONSTRAINT `bad_order_items_ibfk_1` FOREIGN KEY (`bad_order_id`) REFERENCES `bad_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bad_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `bad_orders` (
  `id` varchar(50) NOT NULL,
  `purchase_order_id` varchar(50) DEFAULT NULL,
  `supplier_id` varchar(50) DEFAULT NULL,
  `supplier_name` varchar(255) DEFAULT NULL,
  `reported_by` varchar(255) DEFAULT NULL,
  `report_date` datetime NOT NULL,
  `status` enum('Reported','Return Requested','Replaced','Credited','Resolved') DEFAULT 'Reported',
  `total_affected_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `notes` text,
  `resolution_notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `warehouse_id` varchar(50) DEFAULT NULL,
  `warehouse_name` varchar(255) DEFAULT NULL,
  `shelf_id` varchar(50) DEFAULT NULL,
  `shelf_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_purchase_order_id` (`purchase_order_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_report_date` (`report_date`),
  KEY `idx_status` (`status`),
  CONSTRAINT `bad_orders_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bad_orders_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `brands` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `markup_percentage` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `cash_transfers` (
  `id` varchar(50) NOT NULL,
  `shift_id` varchar(50) DEFAULT NULL,
  `terminal_id` varchar(50) DEFAULT NULL,
  `user_id` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` enum('deposit','pickup') NOT NULL,
  `reason` text,
  `transaction_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shift_id` (`shift_id`),
  KEY `idx_terminal_id` (`terminal_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_transaction_time` (`transaction_time`),
  KEY `idx_type` (`type`),
  CONSTRAINT `cash_transfers_ibfk_1` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cash_transfers_ibfk_2` FOREIGN KEY (`terminal_id`) REFERENCES `pos_terminals` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cash_transfers_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`uid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `categories` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `markup_percentage` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `cloud_sync_tracker` (
  `table_name` varchar(100) NOT NULL,
  `last_push_at` timestamp NOT NULL DEFAULT '1999-12-31 16:00:00',
  `last_pull_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`table_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `conversion_factors` (
  `id` varchar(100) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `unit` varchar(100) NOT NULL,
  `factor` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_unit` (`product_id`,`unit`),
  CONSTRAINT `conversion_factors_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `customer_loyalty` (
  `id` varchar(50) NOT NULL,
  `customer_id` varchar(50) NOT NULL,
  `rfid_code` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `point_setting` varchar(100) DEFAULT NULL,
  `current_points` decimal(15,3) DEFAULT '0.000',
  `last_transaction` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfid_code` (`rfid_code`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_rfid_code` (`rfid_code`),
  KEY `idx_expiry_date` (`expiry_date`),
  CONSTRAINT `customer_loyalty_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `customer_payments` (
  `id` varchar(255) NOT NULL,
  `customer_id` varchar(255) NOT NULL,
  `payment_type` varchar(100) NOT NULL,
  `payment_date` datetime NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reference` varchar(100) NOT NULL,
  `note` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference` (`reference`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_reference` (`reference`),
  CONSTRAINT `customer_payments_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `customer_payment_allocations` (
  `id` varchar(50) NOT NULL,
  `customer_payment_id` varchar(255) NOT NULL,
  `invoice_id` varchar(50) NOT NULL,
  `amount_allocated` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `customer_payment_id` (`customer_payment_id`),
  KEY `invoice_id` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `customers` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `loyalty_points` decimal(15,3) DEFAULT '0.000',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `address` text,
  `billing_address` text,
  `discount` decimal(5,2) DEFAULT '0.00',
  `credit_limit` decimal(15,2) DEFAULT '0.00',
  `active` tinyint(1) DEFAULT '1',
  `sales_person` varchar(100) DEFAULT NULL,
  `sales_area` varchar(100) DEFAULT NULL,
  `sales_group` varchar(100) DEFAULT NULL,
  `price_level_id` varchar(50) DEFAULT NULL,
  `is_senior_citizen` tinyint(1) DEFAULT '0',
  `osca_id` varchar(100) DEFAULT NULL,
  `sc_tin` varchar(100) DEFAULT NULL,
  `is_pwd` tinyint(1) DEFAULT '0',
  `pwd_id` varchar(100) DEFAULT NULL,
  `pwd_tin` varchar(100) DEFAULT NULL,
  `is_naac` tinyint(1) DEFAULT '0',
  `pnstm_id` varchar(100) DEFAULT NULL,
  `is_solo_parent` tinyint(1) DEFAULT '0',
  `spic_no` varchar(100) DEFAULT NULL,
  `dependent_child_name` varchar(255) DEFAULT NULL,
  `dependent_child_birthdate` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_contact_number` (`contact_number`),
  KEY `fk_customer_price_level` (`price_level_id`),
  KEY `idx_is_senior_citizen` (`is_senior_citizen`),
  KEY `idx_is_pwd` (`is_pwd`),
  KEY `idx_is_naac` (`is_naac`),
  KEY `idx_is_solo_parent` (`is_solo_parent`),
  CONSTRAINT `fk_customer_price_level` FOREIGN KEY (`price_level_id`) REFERENCES `price_levels` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `departments` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `markup_percentage` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `external_api_logs` (
  `id` varchar(50) NOT NULL,
  `transaction_type` varchar(50) NOT NULL,
  `transaction_id` varchar(50) NOT NULL,
  `endpoint` varchar(500) NOT NULL,
  `payload` text,
  `response` text,
  `status` varchar(20) NOT NULL,
  `error_message` text,
  `retry_count` int DEFAULT '0',
  `next_retry_at` datetime DEFAULT NULL,
  `last_retry_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_sync_queue` (`status`,`next_retry_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `external_api_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=173 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `external_apis` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `enabled` tinyint(1) NOT NULL DEFAULT '0',
  `api_endpoint` varchar(500) NOT NULL,
  `auth_type` enum('api_key','bearer_token','none') NOT NULL DEFAULT 'none',
  `api_key` varchar(500) DEFAULT NULL,
  `bearer_token` varchar(500) DEFAULT NULL,
  `allowed_methods` enum('send_only','receive_only','full_access') NOT NULL DEFAULT 'full_access',
  `timeout` int NOT NULL DEFAULT '30000',
  `retry_attempts` int NOT NULL DEFAULT '3',
  `retry_delay` int NOT NULL DEFAULT '2000',
  `sync_mode` enum('realtime','batch') NOT NULL DEFAULT 'realtime',
  `on_error_action` enum('retry','queue','log_only') NOT NULL DEFAULT 'log_only',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `role` enum('general','cloud_sync') NOT NULL DEFAULT 'general',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `inventory_batches` (
  `id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `purchase_order_id` varchar(50) DEFAULT NULL,
  `received_date` date NOT NULL,
  `quantity_in` decimal(14,4) NOT NULL,
  `quantity_remaining` decimal(14,4) NOT NULL,
  `unit_cost` decimal(14,4) NOT NULL,
  `selling_price` decimal(10,2) NOT NULL,
  `source_type` varchar(30) DEFAULT 'purchase',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ib_product` (`product_id`),
  KEY `idx_ib_po` (`purchase_order_id`),
  KEY `idx_ib_date` (`received_date`),
  CONSTRAINT `inventory_batches_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `inventory_transfer_items` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `transfer_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(15,4) NOT NULL,
  `unit_of_measure` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transfer_id` (`transfer_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `fk_transfer_id` FOREIGN KEY (`transfer_id`) REFERENCES `inventory_transfers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `inventory_transfers` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_warehouse_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_warehouse_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `transfer_date` datetime NOT NULL,
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'Completed',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_source_warehouse` (`source_warehouse_id`),
  KEY `idx_target_warehouse` (`target_warehouse_id`),
  KEY `idx_transfer_date` (`transfer_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `loyalty_points_settings` (
  `id` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `base` varchar(50) NOT NULL DEFAULT 'amount',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `equivalent` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_description` (`description`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `timestamp` varchar(50) NOT NULL,
  `executed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `payment_audit_log` (
  `id` varchar(50) NOT NULL,
  `transaction_id` varchar(50) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `error_message` text,
  `details` text,
  `user_id` varchar(50) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_action` (`action`),
  KEY `idx_status` (`status`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `payment_details` (
  `id` varchar(50) NOT NULL,
  `transaction_id` varchar(50) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `card_type` varchar(50) DEFAULT NULL,
  `card_last_four` varchar(4) DEFAULT NULL,
  `auth_code` varchar(50) DEFAULT NULL,
  `gateway_reference` varchar(100) DEFAULT NULL,
  `wallet_provider` varchar(50) DEFAULT NULL,
  `wallet_reference` varchar(100) DEFAULT NULL,
  `gift_check_number` varchar(50) DEFAULT NULL,
  `gift_check_balance_before` decimal(10,2) DEFAULT NULL,
  `gift_check_balance_after` decimal(10,2) DEFAULT NULL,
  `points_used` decimal(10,2) DEFAULT NULL,
  `points_remaining` decimal(10,2) DEFAULT NULL,
  `points_conversion_rate` decimal(10,4) DEFAULT NULL,
  `amount_tendered` decimal(10,2) DEFAULT NULL,
  `change_given` decimal(10,2) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `payment_details_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `pos_transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `require_reference` tinyint(1) DEFAULT '0',
  `points_amount` decimal(10,2) DEFAULT NULL,
  `currency_equivalent` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_name` (`name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `payment_term_types` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_name` (`name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `payment_terms` (
  `id` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `number_of_days_month` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_description` (`description`),
  KEY `idx_type` (`type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `point_history` (
  `id` varchar(50) NOT NULL,
  `customer_loyalty_id` varchar(50) NOT NULL,
  `transaction_type` enum('add','remove','purchase','redemption','expiration','adjustment') NOT NULL,
  `points` decimal(15,3) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `transaction_reference` varchar(100) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_loyalty_id` (`customer_loyalty_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `point_history_ibfk_1` FOREIGN KEY (`customer_loyalty_id`) REFERENCES `customer_loyalty` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `pos_settings` (
  `id` varchar(50) NOT NULL,
  `business_name` varchar(255) NOT NULL,
  `logo_path` varchar(500) DEFAULT NULL,
  `enable_advanced_inventory` tinyint(1) DEFAULT '0',
  `transaction_prefix` varchar(20) DEFAULT 'TXN',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `address` text,
  `contact_number` varchar(50) DEFAULT NULL,
  `tin` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `currency_symbol` varchar(10) DEFAULT '$',
  `currency_code` varchar(10) DEFAULT 'USD',
  `timezone` varchar(100) DEFAULT 'UTC',
  `date_format` varchar(20) DEFAULT 'MM/DD/YYYY',
  `enable_automatic_markup` tinyint(1) DEFAULT '1',
  `default_markup_percentage` decimal(5,2) DEFAULT '0.00',
  `markup_priority` json DEFAULT NULL,
  `enable_void_return_auth` tinyint(1) DEFAULT '0',
  `void_auth_username` varchar(255) DEFAULT NULL,
  `void_auth_password` varchar(255) DEFAULT NULL,
  `enable_return_auth` tinyint(1) DEFAULT '0',
  `return_auth_username` varchar(255) DEFAULT NULL,
  `return_auth_password` varchar(255) DEFAULT NULL,
  `enable_recent_sales_auth` tinyint(1) DEFAULT '0',
  `recent_sales_auth_username` varchar(255) DEFAULT NULL,
  `recent_sales_auth_password` varchar(255) DEFAULT NULL,
  `paper_size` enum('58mm','80mm') DEFAULT '58mm',
  `print_mode` enum('browser','escpos','usb','native') DEFAULT 'browser',
  `enable_negative_inventory` tinyint(1) DEFAULT '0',
  `enable_cash_count_auth` tinyint(1) DEFAULT '0',
  `cash_count_auth_username` varchar(255) DEFAULT NULL,
  `cash_count_auth_password` varchar(255) DEFAULT NULL,
  `enable_line_void_auth` tinyint(1) DEFAULT '0',
  `line_void_auth_username` varchar(255) DEFAULT NULL,
  `line_void_auth_password` varchar(255) DEFAULT NULL,
  `show_quantity_in_search` tinyint(1) DEFAULT '1',
  `enable_price_edit_auth` tinyint(1) DEFAULT '0',
  `price_edit_auth_username` varchar(255) DEFAULT NULL,
  `price_edit_auth_password` varchar(255) DEFAULT NULL,
  `operated_by` varchar(255) DEFAULT NULL,
  `min_number` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `low_stock_threshold` int DEFAULT '10',
  `enable_email_notifications` tinyint(1) DEFAULT '0',
  `notification_email` varchar(255) DEFAULT NULL,
  `enable_push_notifications` tinyint(1) DEFAULT '1',
  `is_training_mode` tinyint(1) DEFAULT '0',
  `last_ejournal_export` timestamp NULL DEFAULT NULL,
  `enable_tax_rates_auth` tinyint(1) DEFAULT '0',
  `tax_rates_auth_username` varchar(255) DEFAULT NULL,
  `tax_rates_auth_password` varchar(255) DEFAULT NULL,
  `fiscal_year_start_month` int DEFAULT '1',
  `print_two_receipts` tinyint(1) DEFAULT '0',
  `native_printer_name` varchar(255) DEFAULT 'XP-58-P',
  `require_adjustment_confirmation` tinyint(1) DEFAULT '0',
  `require_transfer_confirmation` tinyint(1) DEFAULT '0',
  `require_po_confirmation` tinyint(1) DEFAULT '0',
  `require_receive_confirmation` tinyint(1) DEFAULT '0',
  `require_bad_order_confirmation` tinyint(1) DEFAULT '0',
  `require_stock_count_approval` tinyint(1) DEFAULT '0',
  `require_repackaging_confirmation` tinyint(1) NOT NULL DEFAULT '0',
  `batch_costing_repack_inherit` tinyint(1) DEFAULT '1',
  `batch_costing_oversell_block` tinyint(1) DEFAULT '0',
  `require_shelf_transfer_confirmation` tinyint(1) DEFAULT '0',
  `enable_overall_reading_auth` tinyint(1) DEFAULT '0',
  `overall_reading_auth_username` varchar(255) DEFAULT NULL,
  `overall_reading_auth_password` varchar(255) DEFAULT NULL,
  `enable_customer_display` tinyint(1) DEFAULT '0',
  `customer_display_message` varchar(255) DEFAULT 'Welcome! Thank you for shopping.',
  `customer_display_show_logo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `pos_terminals` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `x_counter` int DEFAULT '0',
  `serial_number` varchar(100) DEFAULT NULL,
  `min_number` varchar(100) DEFAULT NULL,
  `permit_no` varchar(100) DEFAULT NULL,
  `print_official_receipt` varchar(10) DEFAULT 'No',
  `or_next_reference` varchar(100) DEFAULT NULL,
  `last_active` timestamp NULL DEFAULT NULL,
  `z_counter` int DEFAULT '0',
  `reset_counter` int DEFAULT '0',
  `terminal_min` varchar(50) DEFAULT NULL,
  `terminal_serial_number` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `pos_transaction_items` (
  `id` varchar(50) NOT NULL,
  `pos_transaction_id` varchar(50) NOT NULL,
  `sale_item_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `discount_percentage` decimal(5,2) DEFAULT '0.00',
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  `line_total` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `discount_type` varchar(50) DEFAULT 'percent',
  `tax_type` varchar(50) DEFAULT 'VAT',
  PRIMARY KEY (`id`),
  KEY `idx_pos_transaction_id` (`pos_transaction_id`),
  KEY `idx_sale_item_id` (`sale_item_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `pos_transaction_items_ibfk_1` FOREIGN KEY (`pos_transaction_id`) REFERENCES `pos_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pos_transaction_items_ibfk_2` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pos_transaction_items_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `pos_transactions` (
  `id` varchar(50) NOT NULL,
  `sale_id` varchar(50) NOT NULL,
  `shift_id` varchar(50) DEFAULT NULL,
  `user_id` varchar(255) NOT NULL,
  `terminal_id` varchar(50) DEFAULT NULL,
  `transaction_type` enum('sale','void','return','refund') DEFAULT 'sale',
  `subtotal` decimal(10,2) NOT NULL,
  `tax_amount` decimal(10,2) DEFAULT '0.00',
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `payment_reference` varchar(255) DEFAULT NULL,
  `customer_count` int DEFAULT '1',
  `transaction_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `void_reason` text,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `payment_status` varchar(50) DEFAULT 'completed',
  `payment_details_id` varchar(50) DEFAULT NULL,
  `payment_validated_at` timestamp NULL DEFAULT NULL,
  `order_number` int NOT NULL AUTO_INCREMENT,
  `is_training` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `idx_sale_id` (`sale_id`),
  KEY `idx_shift_id` (`shift_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_terminal_id` (`terminal_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_transaction_time` (`transaction_time`),
  KEY `idx_payment_status` (`payment_status`),
  CONSTRAINT `pos_transactions_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pos_transactions_ibfk_2` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pos_transactions_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`uid`) ON DELETE CASCADE,
  CONSTRAINT `pos_transactions_ibfk_4` FOREIGN KEY (`terminal_id`) REFERENCES `pos_terminals` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `price_levels` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `calculation_base` enum('retail','cost') DEFAULT 'retail',
  `description` text,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `percentage_adjustment` decimal(10,2) DEFAULT '100.00',
  `min_quantity` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_is_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `product_price_levels` (
  `product_id` varchar(50) NOT NULL,
  `price_level_id` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `min_quantity` int DEFAULT '0',
  PRIMARY KEY (`product_id`,`price_level_id`),
  KEY `price_level_id` (`price_level_id`),
  CONSTRAINT `product_price_levels_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_price_levels_ibfk_2` FOREIGN KEY (`price_level_id`) REFERENCES `price_levels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `product_shelves` (
  `product_id` varchar(50) NOT NULL,
  `shelf_id` varchar(50) NOT NULL,
  `quantity` decimal(15,4) NOT NULL DEFAULT '0.0000',
  PRIMARY KEY (`product_id`,`shelf_id`),
  KEY `shelf_id` (`shelf_id`),
  CONSTRAINT `product_shelves_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_shelves_ibfk_2` FOREIGN KEY (`shelf_id`) REFERENCES `shelf_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `products` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `additional_description` text,
  `category` varchar(100) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `subcategory` varchar(100) DEFAULT NULL,
  `stock` decimal(15,4) DEFAULT '0.0000',
  `reorder_point` decimal(15,4) DEFAULT '0.0000',
  `avg_daily_sales` decimal(10,2) DEFAULT '0.00',
  `price` decimal(10,2) NOT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `image_hint` varchar(255) DEFAULT NULL,
  `unit_of_measure` varchar(50) DEFAULT NULL,
  `parent_id` varchar(50) DEFAULT NULL,
  `conversion_factor` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `supplier_id` varchar(50) DEFAULT NULL,
  `income_account` varchar(50) DEFAULT NULL,
  `expense_account` varchar(50) DEFAULT NULL,
  `warehouse_id` varchar(50) DEFAULT NULL,
  `vat_status` varchar(50) DEFAULT 'YES (Subject to 12% VAT)',
  `availability` varchar(20) DEFAULT 'Available',
  `earns_points` tinyint(1) DEFAULT '1',
  `expiration_date` date DEFAULT NULL,
  `shelf_location_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku_warehouse` (`sku`,`warehouse_id`),
  KEY `parent_id` (`parent_id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `fk_products_income_account` (`income_account`),
  KEY `fk_products_expense_account` (`expense_account`),
  KEY `fk_products_warehouse` (`warehouse_id`),
  KEY `fk_products_shelf_location` (`shelf_location_id`),
  CONSTRAINT `fk_products_shelf_location` FOREIGN KEY (`shelf_location_id`) REFERENCES `shelf_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_products_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `products` (`id`),
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id` varchar(50) NOT NULL,
  `purchase_order_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `cost` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `selling_price` decimal(10,2) DEFAULT NULL,
  `discount` decimal(10,2) DEFAULT '0.00',
  `discount_type` varchar(20) DEFAULT 'amount',
  `vat_subject` tinyint(1) DEFAULT '0',
  `expiration_date` date DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `idx_purchase_order_id` (`purchase_order_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `purchase_order_payments` (
  `id` varchar(50) NOT NULL,
  `supplier_payment_id` varchar(50) NOT NULL,
  `purchase_order_id` varchar(50) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `supplier_payment_id` (`supplier_payment_id`),
  KEY `purchase_order_id` (`purchase_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` varchar(50) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `supplier_id` varchar(50) NOT NULL,
  `supplier_name` varchar(255) NOT NULL,
  `ordered_by` varchar(255) DEFAULT NULL,
  `date` datetime NOT NULL,
  `delivery_date` datetime DEFAULT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `received_total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `vat_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_method` varchar(100) DEFAULT NULL,
  `status` enum('Pending','Approved','Paid','Shipped','Received','Failed','Cancelled','Partially Paid') DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `paid_amount` decimal(15,2) DEFAULT '0.00',
  `warehouse_id` varchar(50) DEFAULT NULL,
  `warehouse_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_date` (`date`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_method` (`payment_method`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `repackaging_logs` (
  `id` varchar(100) NOT NULL,
  `source_product_id` varchar(100) NOT NULL,
  `source_product_name` varchar(255) NOT NULL,
  `source_qty` decimal(15,4) NOT NULL,
  `target_product_id` varchar(100) NOT NULL,
  `target_product_name` varchar(255) NOT NULL,
  `target_qty_produced` decimal(15,4) NOT NULL,
  `factor` decimal(15,4) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'completed',
  `approval_queue_id` varchar(100) DEFAULT NULL,
  `notes` text,
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_source_product` (`source_product_id`),
  KEY `idx_target_product` (`target_product_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `sale_items` (
  `id` varchar(50) NOT NULL,
  `sale_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `cost_at_sale` decimal(14,4) DEFAULT NULL COMMENT 'Weighted avg cost from batch sources',
  `batch_source` json DEFAULT NULL COMMENT 'Array of batch splits',
  PRIMARY KEY (`id`),
  KEY `idx_sale_id` (`sale_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sale_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `sales_areas` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `sales_groups` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `sales_invoice_items` (
  `id` varchar(50) NOT NULL,
  `sales_invoice_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_invoice_id` (`sales_invoice_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `sales_invoice_items_ibfk_1` FOREIGN KEY (`sales_invoice_id`) REFERENCES `sales_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_invoice_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `sales_invoices` (
  `id` varchar(50) NOT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `receipt_number` varchar(100) DEFAULT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `amount_paid` decimal(10,2) DEFAULT '0.00',
  `payment_method` varchar(100) DEFAULT NULL,
  `payment_reference` varchar(255) DEFAULT NULL,
  `sales_person_id` varchar(50) DEFAULT NULL,
  `status` enum('Paid','Pending','Failed','Shipped','Delivered','Returned','Partially Paid') DEFAULT 'Pending',
  `transaction_source` varchar(50) DEFAULT 'Backoffice',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_training` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_invoice_date` (`invoice_date`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_sales_person_id` (`sales_person_id`),
  CONSTRAINT `fk_sales_invoices_sales_person_id` FOREIGN KEY (`sales_person_id`) REFERENCES `sales_persons` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_invoices_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `sales_order_items` (
  `id` varchar(50) NOT NULL,
  `sales_order_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_order_id` (`sales_order_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `sales_order_items_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `sales_orders` (
  `id` varchar(50) NOT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `order_date` date NOT NULL,
  `delivery_date` date DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `delivery_address` text,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shipping` decimal(10,2) DEFAULT '0.00',
  `warehouse_id` varchar(50) DEFAULT NULL,
  `sales_person_id` varchar(50) DEFAULT NULL,
  `note` text,
  `payment_method` varchar(100) DEFAULT NULL,
  `payment_reference` varchar(255) DEFAULT NULL,
  `status` enum('Pending','Paid','Shipped','Delivered','Failed','Returned','To Deliver','Fully Delivered') DEFAULT 'Pending',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_delivery_date` (`delivery_date`),
  KEY `idx_status` (`status`),
  KEY `idx_reference` (`reference`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_sales_person_id` (`sales_person_id`),
  CONSTRAINT `fk_sales_orders_sales_person_id` FOREIGN KEY (`sales_person_id`) REFERENCES `sales_persons` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `sales_persons` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `sales_transactions` (
  `id` varchar(50) NOT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `receipt_number` varchar(100) DEFAULT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `status` enum('Paid','Pending','Failed','Shipped','Delivered','Returned','Partially Paid','Voided') DEFAULT 'Pending',
  `transaction_source` varchar(50) DEFAULT 'POS',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_training` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_date` (`date`),
  KEY `idx_invoice_date` (`invoice_date`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_method` (`payment_method`),
  CONSTRAINT `sales_transactions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `shelf_locations` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `terminal_id` varchar(50) DEFAULT NULL,
  `start_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_time` timestamp NULL DEFAULT NULL,
  `starting_cash` decimal(10,2) DEFAULT '0.00',
  `expected_cash` decimal(10,2) DEFAULT '0.00',
  `actual_cash` decimal(10,2) DEFAULT '0.00',
  `cash_difference` decimal(10,2) DEFAULT '0.00',
  `cash_denominations` json DEFAULT NULL,
  `status` enum('active','completed','reconciled') DEFAULT 'active',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_terminal_id` (`terminal_id`),
  KEY `idx_status` (`status`),
  KEY `idx_start_time` (`start_time`),
  CONSTRAINT `shifts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`uid`) ON DELETE CASCADE,
  CONSTRAINT `shifts_ibfk_2` FOREIGN KEY (`terminal_id`) REFERENCES `pos_terminals` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `stock_adjustments` (
  `id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `quantity` decimal(15,4) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `new_stock` decimal(15,4) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `warehouse_id` varchar(50) DEFAULT NULL,
  `target_warehouse_id` varchar(50) DEFAULT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `supplier_id` varchar(50) DEFAULT NULL,
  `note` text,
  `adj_type` enum('add','remove','transfer') DEFAULT 'add',
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `stock_adjustments_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `stock_count_items` (
  `id` varchar(50) NOT NULL,
  `stock_count_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `snapshot_quantity` int NOT NULL,
  `counted_quantity` int DEFAULT NULL,
  `variance` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stock_count_id` (`stock_count_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `stock_count_items_ibfk_1` FOREIGN KEY (`stock_count_id`) REFERENCES `stock_counts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_count_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `stock_counts` (
  `id` varchar(50) NOT NULL,
  `status` enum('in_progress','completed','cancelled') NOT NULL DEFAULT 'in_progress',
  `name` varchar(255) NOT NULL,
  `notes` text,
  `created_by` varchar(50) DEFAULT NULL,
  `completed_by` varchar(50) DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `warehouse_id` varchar(50) DEFAULT NULL,
  `shelf_location_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `fk_stock_counts_warehouse` (`warehouse_id`),
  KEY `fk_stock_counts_shelf` (`shelf_location_id`),
  CONSTRAINT `fk_stock_counts_shelf` FOREIGN KEY (`shelf_location_id`) REFERENCES `shelf_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_stock_counts_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `movement_type` enum('sale','purchase','adjustment','return','transfer','sales_order') NOT NULL,
  `quantity_change` decimal(15,4) NOT NULL,
  `previous_stock` decimal(15,4) NOT NULL,
  `new_stock` decimal(15,4) NOT NULL,
  `reference_id` varchar(50) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expiration_date` date DEFAULT NULL,
  `warehouse_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_movement_type` (`movement_type`),
  KEY `idx_reference_id` (`reference_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_sm_warehouse_id` (`warehouse_id`),
  CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `subcategories` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `markup_percentage` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `supplier_payments` (
  `id` varchar(50) NOT NULL,
  `supplier_id` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `date` datetime NOT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_date` (`date`),
  CONSTRAINT `supplier_payments_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `supplier_product_mapping` (
  `id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `supplier_id` varchar(50) NOT NULL,
  `supplier_sku` varchar(100) DEFAULT NULL,
  `supplier_lead_time` int DEFAULT '0' COMMENT 'Lead time in days',
  `supplier_specific_rop` int DEFAULT '0' COMMENT 'Reorder Point specific to this supplier',
  `supplier_cost` decimal(10,2) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_supplier` (`product_id`,`supplier_id`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `supplier_product_mapping_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supplier_product_mapping_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `address` text,
  `payment_terms` varchar(100) DEFAULT NULL,
  `markup_percentage` decimal(5,2) DEFAULT NULL,
  `telephone` varchar(50) DEFAULT NULL,
  `mobile_phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `tin` varchar(50) DEFAULT NULL,
  `order_schedule` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `tax_rates` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `rate` decimal(5,2) NOT NULL,
  `description` text,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `transaction_references` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sales_order` varchar(50) DEFAULT NULL,
  `purchase_order` varchar(50) DEFAULT NULL,
  `sales_delivery` varchar(50) DEFAULT NULL,
  `payment_to_supplier` varchar(50) DEFAULT NULL,
  `sales_invoice` varchar(50) DEFAULT NULL,
  `customer_payment` varchar(50) DEFAULT NULL,
  `delivery_receipt` varchar(50) DEFAULT NULL,
  `stock_adjustment` varchar(50) DEFAULT NULL,
  `sales_hold` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `receipt_number` varchar(100) DEFAULT '00000001',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `units_of_measure` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `abbreviation` varchar(10) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_activity_logs` (
  `id` varchar(36) NOT NULL,
  `user_uid` varchar(255) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `reference_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_uid` (`user_uid`),
  KEY `idx_module` (`module`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` varchar(50) NOT NULL,
  `user_uid` varchar(255) NOT NULL,
  `permission` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_permission` (`user_uid`,`permission`),
  KEY `idx_user_uid` (`user_uid`),
  KEY `idx_permission` (`permission`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_type_permissions` (
  `id` varchar(50) NOT NULL,
  `user_type_id` varchar(50) NOT NULL,
  `permission` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_type_permission` (`user_type_id`,`permission`),
  KEY `idx_user_type_id` (`user_type_id`),
  CONSTRAINT `user_type_permissions_ibfk_1` FOREIGN KEY (`user_type_id`) REFERENCES `user_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `user_types` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `users` (
  `uid` varchar(255) NOT NULL,
  `username` varchar(100) NOT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `disabled` tinyint(1) DEFAULT '0',
  `creation_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `password` varchar(255) NOT NULL,
  `user_type` varchar(50) DEFAULT 'User',
  PRIMARY KEY (`uid`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_disabled` (`disabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `warehouses` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `contact_number` varchar(100) DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `is_main` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `x_readings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reading_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_date` datetime NOT NULL,
  `shift_start` datetime DEFAULT NULL,
  `shift_end` datetime DEFAULT NULL,
  `terminal_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cashier_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cashier_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gross_sales` decimal(15,2) NOT NULL DEFAULT '0.00',
  `returns` decimal(15,2) NOT NULL DEFAULT '0.00',
  `discounts` decimal(15,2) NOT NULL DEFAULT '0.00',
  `net_sales` decimal(15,2) NOT NULL DEFAULT '0.00',
  `vat_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `payment_methods` json DEFAULT NULL,
  `transaction_count` int NOT NULL DEFAULT '0',
  `starting_cash` decimal(15,2) NOT NULL DEFAULT '0.00',
  `cash_sales` decimal(15,2) NOT NULL DEFAULT '0.00',
  `cash_in_drawer` decimal(15,2) NOT NULL DEFAULT '0.00',
  `shift_status` enum('active','completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `min_sale_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_sale_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `void_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `refund_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `previous_reading` decimal(15,2) NOT NULL DEFAULT '0.00',
  `running_total` decimal(15,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `reading_number` (`reading_number`),
  KEY `idx_report_date` (`report_date`),
  KEY `idx_shift_start` (`shift_start`),
  KEY `idx_shift_end` (`shift_end`),
  KEY `idx_terminal_id` (`terminal_id`),
  KEY `idx_cashier_id` (`cashier_id`),
  KEY `idx_shift_status` (`shift_status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `z_readings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reading_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_date` datetime NOT NULL,
  `terminal_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `cashier_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gross_sales` decimal(15,2) NOT NULL DEFAULT '0.00',
  `returns` decimal(15,2) NOT NULL DEFAULT '0.00',
  `discounts` decimal(15,2) NOT NULL DEFAULT '0.00',
  `net_sales` decimal(15,2) NOT NULL DEFAULT '0.00',
  `vat_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `payment_methods` json DEFAULT NULL,
  `transaction_count` int NOT NULL DEFAULT '0',
  `min_sale_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_sale_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `min_void_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_void_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `min_return_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_return_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `starting_cash` decimal(15,2) NOT NULL DEFAULT '0.00',
  `cash_sales` decimal(15,2) NOT NULL DEFAULT '0.00',
  `cash_in_drawer` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `z_counter` int DEFAULT '0',
  `reset_counter` int DEFAULT '0',
  `vat_sales` decimal(15,2) NOT NULL DEFAULT '0.00',
  `vat_exempt` decimal(15,2) NOT NULL DEFAULT '0.00',
  `zero_rated` decimal(15,2) NOT NULL DEFAULT '0.00',
  `non_vat` decimal(15,2) NOT NULL DEFAULT '0.00',
  `previous_reading` decimal(15,2) NOT NULL DEFAULT '0.00',
  `running_total` decimal(15,2) NOT NULL DEFAULT '0.00',
  `discount_summary` json DEFAULT NULL,
  `sales_adjustment` json DEFAULT NULL,
  `vat_adjustment` decimal(15,2) DEFAULT '0.00',
  `vatable_sales` decimal(15,2) DEFAULT '0.00',
  `void_amount` decimal(15,2) DEFAULT '0.00',
  `actual_cash` decimal(15,2) DEFAULT '0.00',
  `cash_difference` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `reading_number` (`reading_number`),
  KEY `idx_report_date` (`report_date`),
  KEY `idx_terminal_id` (`terminal_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


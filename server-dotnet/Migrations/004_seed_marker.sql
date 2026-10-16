-- Seed tag column for development demo data tracking (compatible with MySQL 8.4 and MariaDB).
-- MySQL 8.4 does not support conditional column syntax in ALTER statements.
-- Migration runners verify existence in information_schema.COLUMNS before applying or safely handle duplicate column errors.
ALTER TABLE `crm_customers` ADD COLUMN `seed_tag` VARCHAR(64) NULL;
ALTER TABLE `crm_leads` ADD COLUMN `seed_tag` VARCHAR(64) NULL;
ALTER TABLE `crm_deals` ADD COLUMN `seed_tag` VARCHAR(64) NULL;
ALTER TABLE `crm_activities` ADD COLUMN `seed_tag` VARCHAR(64) NULL;

-- Idempotent seed tag column for development demo data tracking.
ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS seed_tag VARCHAR(64) NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS seed_tag VARCHAR(64) NULL;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS seed_tag VARCHAR(64) NULL;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS seed_tag VARCHAR(64) NULL;

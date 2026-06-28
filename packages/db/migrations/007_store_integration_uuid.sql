ALTER TABLE store_integrations ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();

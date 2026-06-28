ALTER TABLE store_integrations DROP COLUMN IF EXISTS webhook_secret;
ALTER TABLE store_integrations ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();

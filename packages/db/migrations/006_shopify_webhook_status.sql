-- Migration 006: Add webhook_registered to store_integrations

ALTER TABLE store_integrations 
ADD COLUMN IF NOT EXISTS webhook_registered BOOLEAN DEFAULT false;

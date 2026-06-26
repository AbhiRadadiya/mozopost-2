-- Migration 007: Add company/return address, label mobile/image settings, and ticket attachment columns.

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS return_address TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS same_address BOOLEAN DEFAULT false;

ALTER TABLE label_settings ADD COLUMN IF NOT EXISTS show_mobile BOOLEAN DEFAULT false;
ALTER TABLE label_settings ADD COLUMN IF NOT EXISTS label_image_url TEXT;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attachment_url TEXT;

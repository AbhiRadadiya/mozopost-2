-- ════════════════════════════════════════════════════════════
-- MOZOPOST MIGRATION 006
-- Address Translation & Validation Engine
-- ════════════════════════════════════════════════════════════

DO $$ BEGIN CREATE TYPE detected_language AS ENUM (
  'hindi','tamil','telugu','gujarati','marathi',
  'bengali','kannada','malayalam','punjabi','odia','english','unknown'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE translation_status AS ENUM (
  'pending','translated','approved','rejected','manual_review'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS address_translations (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id             UUID REFERENCES orders(id) ON DELETE CASCADE,
  seller_id            UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,

  -- original input
  original_address     TEXT NOT NULL,
  original_city        TEXT,
  original_state       TEXT,
  original_pincode     VARCHAR(10),

  -- detection
  detected_language    detected_language DEFAULT 'unknown',
  detection_confidence DECIMAL(5,2) DEFAULT 0,

  -- translation output
  translated_address   TEXT,
  translated_city      TEXT,
  translated_state     TEXT,
  translated_pincode   VARCHAR(10),
  translation_confidence DECIMAL(5,2) DEFAULT 0,
  translation_provider VARCHAR(50) DEFAULT 'google', -- google|azure|mock

  -- review
  status               translation_status DEFAULT 'pending',
  seller_edited        BOOLEAN DEFAULT false,
  final_address        TEXT,   -- what actually gets used on the label
  final_city           TEXT,
  final_state          TEXT,
  approved_by          UUID REFERENCES users(id),
  approved_at          TIMESTAMPTZ,
  rejection_reason     TEXT,

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_at_seller ON address_translations(seller_id);
CREATE INDEX IF NOT EXISTS idx_at_order  ON address_translations(order_id);
CREATE INDEX IF NOT EXISTS idx_at_status ON address_translations(status);
CREATE INDEX IF NOT EXISTS idx_at_lang   ON address_translations(detected_language);

DROP TRIGGER IF EXISTS trg_touch_addr_translations ON address_translations;
CREATE TRIGGER trg_touch_addr_translations
  BEFORE UPDATE ON address_translations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Global settings for the translation module
INSERT INTO security_settings (rule_key, rule_name, is_enabled, threshold, action, description)
VALUES
  ('address_translation',
   'Address Translation Engine',
   true,
   '{"auto_approve_above":85,"min_confidence":60,"provider":"google"}',
   'flag',
   'Detect Indian regional language addresses and auto-translate to English before booking')
ON CONFLICT (rule_key) DO NOTHING;

-- Seed a few demo translation records
DO $$
DECLARE v_seller UUID;
BEGIN
  SELECT id INTO v_seller FROM sellers LIMIT 1;
  IF v_seller IS NOT NULL THEN
    INSERT INTO address_translations
      (seller_id, original_address, original_city, original_state, original_pincode,
       detected_language, detection_confidence,
       translated_address, translated_city, translated_state, translated_pincode,
       translation_confidence, status)
    VALUES
      (v_seller,
       'ઓ-12, ગોધ઼ ઉઘ઼ઝ, ઓ-ઑ-1, ઓ ઓ ઓ ઓ',
       'ਸੂਰਤ', 'ਗੁਜਰਾਤ', '395001',
       'gujarati', 94.5,
       'O-12, Green Park Society, Varachha Road', 'Surat', 'Gujarat', '395001',
       91.2, 'pending'),
      (v_seller,
       '23, அண்ணா நகர், முதல் தெரு',
       'சென்னை', 'தமிழ்நாடு', '600040',
       'tamil', 97.1,
       '23, Anna Nagar, First Street', 'Chennai', 'Tamil Nadu', '600040',
       95.8, 'approved'),
      (v_seller,
       'मकान नं 45, शांति नगर, मेन रोड',
       'जयपुर', 'राजस्थान', '302001',
       'hindi', 98.2,
       'House No. 45, Shanti Nagar, Main Road', 'Jaipur', 'Rajasthan', '302001',
       97.0, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

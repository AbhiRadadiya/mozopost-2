-- ════════════════════════════════════════════════════════════
-- MOZOPOST MIGRATION 004
-- Adds: SMTP config, email templates, email logs,
--       referral commissions, future COD, label settings
-- Safe to re-run (IF NOT EXISTS everywhere)
-- ════════════════════════════════════════════════════════════

-- ── SMTP CONFIGURATION ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS smtp_configs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL DEFAULT 'Default',
  host        VARCHAR(255) NOT NULL,
  port        INT NOT NULL DEFAULT 587,
  secure      BOOLEAN DEFAULT false,
  username    VARCHAR(255) NOT NULL,
  password_encrypted TEXT NOT NULL,
  from_email  VARCHAR(255) NOT NULL,
  from_name   VARCHAR(255) NOT NULL DEFAULT 'Mozopost',
  is_active   BOOLEAN DEFAULT true,
  is_default  BOOLEAN DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  test_status VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── EMAIL TEMPLATES ──────────────────────────────────────────
DO $$ BEGIN CREATE TYPE email_event AS ENUM (
  'order_booked','order_picked','order_in_transit','order_out_for_delivery',
  'order_delivered','order_rto','order_cancelled','order_ndr',
  'wallet_recharge','wallet_low_balance','wallet_debit',
  'cod_remittance','kyc_approved','kyc_rejected',
  'welcome','password_reset','weight_dispute_raised','weight_dispute_resolved',
  'credit_limit_assigned','credit_near_limit','credit_exhausted',
  'bulk_upload_complete','pickup_confirmed','pickup_failed'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS email_templates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event        email_event NOT NULL UNIQUE,
  subject      VARCHAR(500) NOT NULL,
  body_html    TEXT NOT NULL,
  body_text    TEXT,
  is_active    BOOLEAN DEFAULT true,
  variables    JSONB DEFAULT '[]',  -- list of {{variable}} names used
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── EMAIL LOGS ───────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE email_status AS ENUM ('queued','sent','failed','bounced','opened');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS email_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  smtp_config_id  UUID REFERENCES smtp_configs(id),
  template_id     UUID REFERENCES email_templates(id),
  to_email        VARCHAR(255) NOT NULL,
  to_name         VARCHAR(255),
  subject         VARCHAR(500) NOT NULL,
  status          email_status DEFAULT 'queued',
  error_message   TEXT,
  seller_id       UUID REFERENCES sellers(id),
  order_id        UUID REFERENCES orders(id),
  sent_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_logs_seller  ON email_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status  ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);

-- ── NOTIFICATION RULES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event       email_event NOT NULL,
  send_to     VARCHAR(20) NOT NULL DEFAULT 'seller', -- 'seller'|'admin'|'both'
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO notification_rules (event, send_to) VALUES
  ('order_booked',          'seller'),
  ('order_delivered',       'seller'),
  ('order_rto',             'seller'),
  ('order_ndr',             'seller'),
  ('wallet_low_balance',    'seller'),
  ('cod_remittance',        'seller'),
  ('kyc_approved',          'seller'),
  ('weight_dispute_raised', 'admin'),
  ('bulk_upload_complete',  'seller'),
  ('pickup_confirmed',      'seller')
ON CONFLICT DO NOTHING;

-- ── REFERRAL SYSTEM ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id      UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  referred_id      UUID REFERENCES sellers(id),
  referral_code    VARCHAR(20) UNIQUE NOT NULL,
  status           VARCHAR(20) DEFAULT 'pending', -- pending|active|paid
  commission_pct   DECIMAL(5,2) DEFAULT 2.00,
  total_orders     INT DEFAULT 0,
  total_commission DECIMAL(12,2) DEFAULT 0,
  paid_commission  DECIMAL(12,2) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  activated_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code     ON referrals(referral_code);

CREATE TABLE IF NOT EXISTS referral_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id   UUID NOT NULL REFERENCES referrals(id),
  order_id      UUID REFERENCES orders(id),
  order_freight DECIMAL(10,2) NOT NULL,
  commission    DECIMAL(10,2) NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending', -- pending|paid
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── FUTURE COD (advance COD release) ────────────────────────
CREATE TABLE IF NOT EXISTS future_cod_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id     UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  requested_amt DECIMAL(12,2) NOT NULL,
  approved_amt  DECIMAL(12,2),
  status        VARCHAR(20) DEFAULT 'pending', -- pending|approved|rejected|disbursed
  fee_pct       DECIMAL(5,2) DEFAULT 1.50,
  fee_amount    DECIMAL(10,2),
  net_amount    DECIMAL(12,2),
  admin_notes   TEXT,
  reviewed_by   UUID REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ,
  disbursed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_future_cod_seller ON future_cod_requests(seller_id);

-- ── LABEL SETTINGS PER SELLER ────────────────────────────────
CREATE TABLE IF NOT EXISTS label_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id       UUID UNIQUE NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  show_logo       BOOLEAN DEFAULT true,
  show_brand_name BOOLEAN DEFAULT true,
  show_gst        BOOLEAN DEFAULT false,
  show_return_addr BOOLEAN DEFAULT true,
  label_size      VARCHAR(20) DEFAULT '4x6',   -- '4x6'|'3x5'|'A5'|'A6'
  template_id     INT DEFAULT 1,               -- 1-6
  logo_url        TEXT,
  brand_name      VARCHAR(255),
  return_address  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── UTR ENTRIES FOR COD SETTLEMENTS ─────────────────────────
ALTER TABLE cod_remittances ADD COLUMN IF NOT EXISTS utr_number VARCHAR(50);
ALTER TABLE cod_remittances ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'neft';
ALTER TABLE cod_remittances ADD COLUMN IF NOT EXISTS bank_reference TEXT;
ALTER TABLE cod_remittances ADD COLUMN IF NOT EXISTS settled_by UUID REFERENCES users(id);

-- ── SELLERS TABLE: add account_manager_id, referral_code ────
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS account_manager_id UUID REFERENCES users(id);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES sellers(id);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── SEED DEFAULT EMAIL TEMPLATES ────────────────────────────
INSERT INTO email_templates (event, subject, body_html, variables) VALUES
('order_booked',
 '[{{order_id}}] Your shipment has been booked',
 '<p>Hi {{seller_name}},</p><p>Your shipment <strong>{{order_id}}</strong> has been booked with <strong>{{courier_name}}</strong>.</p><p>AWB: <strong>{{awb_number}}</strong></p><p>Consignee: {{consignee_name}}, {{consignee_city}}</p>',
 '["order_id","seller_name","courier_name","awb_number","consignee_name","consignee_city"]'),
('order_delivered',
 '[{{order_id}}] Delivered successfully ✓',
 '<p>Hi {{seller_name}},</p><p>Order <strong>{{order_id}}</strong> has been delivered to <strong>{{consignee_name}}</strong> in {{consignee_city}}.</p>',
 '["order_id","seller_name","consignee_name","consignee_city"]'),
('order_rto',
 '[{{order_id}}] RTO Initiated',
 '<p>Hi {{seller_name}},</p><p>Order <strong>{{order_id}}</strong> has been marked for return. Reason: {{rto_reason}}.</p>',
 '["order_id","seller_name","rto_reason"]'),
('wallet_low_balance',
 'Wallet balance low — ₹{{balance}} remaining',
 '<p>Hi {{seller_name}},</p><p>Your Mozopost wallet balance is low: <strong>₹{{balance}}</strong>. Please recharge to continue shipping without interruptions.</p>',
 '["seller_name","balance"]'),
('cod_remittance',
 'COD Remittance ₹{{amount}} — UTR: {{utr}}',
 '<p>Hi {{seller_name}},</p><p>Your COD remittance of <strong>₹{{amount}}</strong> has been processed.</p><p>UTR: <strong>{{utr}}</strong></p>',
 '["seller_name","amount","utr"]'),
('kyc_approved',
 'KYC Verified — Welcome to Mozopost!',
 '<p>Hi {{seller_name}},</p><p>Your KYC verification has been approved. Your account is now fully active.</p>',
 '["seller_name"]')
ON CONFLICT (event) DO NOTHING;

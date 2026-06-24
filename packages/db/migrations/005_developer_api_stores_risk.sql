-- ════════════════════════════════════════════════════════════
-- MOZOPOST MIGRATION 005
-- Adds: Developer API module, Store Integrations, Merchant Risk
-- Safe to re-run (IF NOT EXISTS everywhere)
-- ════════════════════════════════════════════════════════════

-- ── DEVELOPER API KEYS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id    UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL DEFAULT 'Default',
  api_key      VARCHAR(100) UNIQUE NOT NULL,
  secret_key   VARCHAR(100) NOT NULL,
  permissions  JSONB NOT NULL DEFAULT '[]',
  is_active    BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apikeys_seller  ON api_keys(seller_id);
CREATE INDEX IF NOT EXISTS idx_apikeys_key     ON api_keys(api_key);

-- ── IP WHITELIST ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_ip_whitelist (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id  UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  ip_address VARCHAR(50) NOT NULL,
  label      VARCHAR(100),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, ip_address)
);
CREATE INDEX IF NOT EXISTS idx_ipwl_seller ON api_ip_whitelist(seller_id);

-- ── WEBHOOK ENDPOINTS ─────────────────────────────────────────
DO $$ BEGIN CREATE TYPE webhook_status AS ENUM ('active','paused','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  secret      VARCHAR(100) NOT NULL,
  events      JSONB NOT NULL DEFAULT '[]',
  status      webhook_status DEFAULT 'active',
  failure_count INT DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_response_code INT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhooks_seller ON webhook_endpoints(seller_id);

-- ── API LOGS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id      UUID REFERENCES sellers(id),
  api_key_id     UUID REFERENCES api_keys(id),
  method         VARCHAR(10) NOT NULL,
  path           VARCHAR(500) NOT NULL,
  status_code    INT,
  response_time_ms INT,
  ip_address     VARCHAR(50),
  request_body   JSONB,
  response_body  JSONB,
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_logs_seller  ON api_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at DESC);

-- ── STORE INTEGRATIONS ────────────────────────────────────────
DO $$ BEGIN CREATE TYPE store_platform AS ENUM
  ('shopify','woocommerce','opencart','magento','shopline','dukaan','custom_api');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE sync_status AS ENUM ('idle','syncing','error','paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS store_integrations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id         UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  platform          store_platform NOT NULL,
  store_name        VARCHAR(255) NOT NULL,
  store_url         TEXT NOT NULL,
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  access_token_encrypted TEXT,
  webhook_secret    VARCHAR(100),
  sync_interval_min INT DEFAULT 15,  -- 5, 15, 30, 60
  auto_sync         BOOLEAN DEFAULT true,
  import_pending    BOOLEAN DEFAULT true,
  import_prepaid    BOOLEAN DEFAULT true,
  import_cod        BOOLEAN DEFAULT true,
  push_tracking     BOOLEAN DEFAULT true,
  push_awb          BOOLEAN DEFAULT true,
  status            sync_status DEFAULT 'idle',
  is_active         BOOLEAN DEFAULT true,
  last_sync_at      TIMESTAMPTZ,
  last_sync_orders  INT DEFAULT 0,
  last_error        TEXT,
  total_imported    INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stores_seller ON store_integrations(seller_id);

CREATE TABLE IF NOT EXISTS store_sync_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES store_integrations(id) ON DELETE CASCADE,
  seller_id   UUID NOT NULL REFERENCES sellers(id),
  status      VARCHAR(20) NOT NULL,  -- success|failed|partial
  orders_imported  INT DEFAULT 0,
  orders_failed    INT DEFAULT 0,
  error_message    TEXT,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sync_logs_store ON store_sync_logs(store_id);

-- ── RISK MANAGEMENT ───────────────────────────────────────────
DO $$ BEGIN CREATE TYPE risk_level AS ENUM ('safe','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Global security settings (all rules with enable/disable/threshold)
CREATE TABLE IF NOT EXISTS security_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_key    VARCHAR(100) UNIQUE NOT NULL,
  rule_name   VARCHAR(200) NOT NULL,
  is_enabled  BOOLEAN DEFAULT true,
  threshold   JSONB DEFAULT '{}',  -- flexible per-rule config
  action      VARCHAR(50) DEFAULT 'flag',  -- flag|block|suspend|hold_cod
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Merchant risk scores
CREATE TABLE IF NOT EXISTS merchant_risk_scores (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id      UUID UNIQUE NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  risk_score     INT DEFAULT 0,
  risk_level     risk_level DEFAULT 'safe',
  merchant_level INT DEFAULT 1,       -- 1=New, 2=Verified, 3=Trusted, 4=Enterprise
  flags          JSONB DEFAULT '[]',  -- array of risk flags
  last_evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_seller ON merchant_risk_scores(seller_id);

-- Blacklist
DO $$ BEGIN CREATE TYPE blacklist_type AS ENUM
  ('mobile','email','gst','ip','pan','device');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS blacklist (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type       blacklist_type NOT NULL,
  value      VARCHAR(255) NOT NULL,
  reason     TEXT,
  added_by   UUID REFERENCES users(id),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, value)
);
CREATE INDEX IF NOT EXISTS idx_bl_type_val ON blacklist(type, value);

-- Security event logs
DO $$ BEGIN CREATE TYPE security_event AS ENUM
  ('login_attempt','failed_otp','multiple_devices','duplicate_order',
   'fake_mobile','high_rto','ip_flagged','account_blocked','cod_held',
   'wallet_frozen','kyc_rejected','suspicious_upload');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS security_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id  UUID REFERENCES sellers(id),
  event      security_event NOT NULL,
  ip_address VARCHAR(50),
  device_fp  VARCHAR(255),
  metadata   JSONB DEFAULT '{}',
  severity   VARCHAR(20) DEFAULT 'info',  -- info|warn|critical
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seclogs_seller  ON security_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_seclogs_event   ON security_logs(event);
CREATE INDEX IF NOT EXISTS idx_seclogs_created ON security_logs(created_at DESC);

-- Merchant order limits (new merchant throttling)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS daily_order_limit   INT DEFAULT 0;  -- 0 = unlimited
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS weekly_order_limit  INT DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS monthly_order_limit INT DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS cod_amount_limit    DECIMAL(10,2) DEFAULT 0;  -- 0 = unlimited
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS security_deposit    DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS merchant_level      INT DEFAULT 1;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS risk_score          INT DEFAULT 0;

-- ── SEED DEFAULT SECURITY SETTINGS ───────────────────────────
INSERT INTO security_settings (rule_key, rule_name, is_enabled, threshold, action, description) VALUES
('kyc_verification',       'KYC Verification',           true, '{"mandatory":true}',           'block',    'Verify merchant KYC before enabling shipping'),
('mobile_otp',             'Mobile OTP Verification',    true, '{}',                           'block',    'Require OTP verification for mobile number'),
('email_verification',     'Email Verification',         true, '{}',                           'block',    'Require email verification before first order'),
('security_deposit',       'Initial Security Deposit',   false,'{"amount":500}',               'block',    'Require wallet deposit before first shipment'),
('new_merchant_limit',     'New Merchant Order Limit',   true, '{"daily":10,"weekly":50,"monthly":200}', 'block', 'Throttle new merchant order volumes'),
('credit_restriction',     'Credit Restriction',         true, '{"manual_approval":true}',     'block',    'No auto credit for new merchants'),
('cod_restriction',        'COD Amount Restriction',     false,'{"max_amount":1000}',           'flag',     'Limit COD order value for new merchants'),
('fake_mobile_detection',  'Fake Mobile Detection',      true, '{"blocked":["9999999999","8888888888","7777777777","6666666666","1111111111","0000000000"]}', 'block', 'Block known fake/test mobile numbers'),
('address_quality',        'Address Quality Check',      true, '{"min_length":30}',             'flag',     'Reject addresses that are too short or incomplete'),
('duplicate_order',        'Duplicate Order Detection',  true, '{"lookback_days":30}',          'flag',     'Detect duplicate orders by mobile/address'),
('duplicate_upload',       'Duplicate Upload Detection', true, '{}',                           'flag',     'Detect same bulk file uploaded twice'),
('awb_validation',         'Existing AWB Validation',    true, '{}',                           'block',    'Prevent booking already-delivered shipments'),
('ip_monitoring',          'IP Address Monitoring',      true, '{"max_accounts":3}',           'flag',     'Detect multiple merchant accounts from same IP'),
('device_fingerprinting',  'Device Fingerprinting',      false,'{}',                           'flag',     'Track browser/device for fraud detection'),
('high_rto_detection',     'High RTO Detection',         true, '{"warning_pct":30,"critical_pct":50}', 'flag', 'Flag merchants with abnormally high RTO rates'),
('risk_scoring',           'Risk Scoring System',        true, '{"threshold_medium":31,"threshold_high":61,"threshold_critical":81}', 'flag', 'Auto-score merchant risk 0-100'),
('settlement_hold',        'COD Settlement Hold',        false,'{"hold_days":3}',              'hold_cod', 'Hold COD settlements for suspicious merchants'),
('auto_suspend',           'Auto Suspend on Critical Risk', false,'{"threshold":81}',          'suspend',  'Automatically suspend merchants scoring critical risk'),
('auto_hold_cod',          'Auto Hold COD on High Risk', false,'{"threshold":61}',             'hold_cod', 'Automatically hold COD for high-risk merchants'),
('auto_freeze_wallet',     'Auto Freeze Wallet on Fraud',false,'{"threshold":81}',             'freeze',   'Automatically freeze wallet on detected fraud')
ON CONFLICT (rule_key) DO NOTHING;

-- Seed common fake mobiles to blacklist
INSERT INTO blacklist (type, value, reason) VALUES
('mobile','9999999999','Known fake/test number'),
('mobile','8888888888','Known fake/test number'),
('mobile','7777777777','Known fake/test number'),
('mobile','6666666666','Known fake/test number'),
('mobile','1111111111','Known fake/test number'),
('mobile','0000000000','Known fake/test number'),
('mobile','1234567890','Common test sequence')
ON CONFLICT (type, value) DO NOTHING;

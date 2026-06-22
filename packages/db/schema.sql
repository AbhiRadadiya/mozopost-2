-- ════════════════════════════════════════════════════════════
-- MOZOPOST DATABASE SCHEMA — PostgreSQL 14+
-- Run this once against your database before starting the API.
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- ════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMS ──────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('seller','master_admin','super_admin','staff'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE user_status AS ENUM ('active','suspended','pending_kyc','inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE kyc_status AS ENUM ('pending','submitted','verified','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('unprocessed','booked','picked','in_transit','out_for_delivery','delivered','rto_initiated','rto_in_transit','rto_delivered','cancelled','failed','lost'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_mode AS ENUM ('prepaid','cod'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE wallet_txn_type AS ENUM ('credit','debit','adjustment','refund','cod_settlement'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ndr_reason AS ENUM ('customer_not_available','wrong_address','refused_delivery','premises_closed','out_of_delivery_area','fake_attempt','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ndr_action AS ENUM ('reattempt','update_address','hold','rto','customer_confirm'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pickup_status AS ENUM ('scheduled','picked_up','failed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE cod_settlement_status AS ENUM ('pending','processing','settled','on_hold','disputed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE courier_status AS ENUM ('active','inactive','testing','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE margin_type AS ENUM ('fixed','percentage'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ticket_status AS ENUM ('open','in_progress','escalated','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ticket_priority AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_cycle AS ENUM ('D1','D2','D3','weekly','custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── TENANTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO tenants (name, slug) VALUES ('Mozopost','mozopost') ON CONFLICT (slug) DO NOTHING;

-- ── USERS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  role user_role NOT NULL DEFAULT 'seller',
  status user_status DEFAULT 'pending_kyc',
  kyc_status kyc_status DEFAULT 'pending',
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  login_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_info JSONB,
  ip_address VARCHAR(64),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rt_user ON refresh_tokens(user_id);

-- ── SELLERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100),
  gstin VARCHAR(20),
  pan VARCHAR(20),
  bank_account_name VARCHAR(255),
  bank_account_number VARCHAR(50),
  bank_ifsc VARCHAR(20),
  auto_allocate_courier BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  contact_phone VARCHAR(20),
  address_line1 TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wh_seller ON warehouses(seller_id);

-- ── COURIERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS couriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  status courier_status DEFAULT 'active',
  supports_cod BOOLEAN DEFAULT true,
  supports_prepaid BOOLEAN DEFAULT true,
  priority INT DEFAULT 50,
  is_mock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO couriers (name, code, priority) VALUES
  ('Delhivery','delhivery',90), ('Shadowfax','shadowfax',80),
  ('XpressBees','xpressbees',75), ('EcomExpress','ecomexpress',70),
  ('Amazon Shipping','amazon_shipping',65), ('BlueDart','bluedart',85),
  ('DTDC','dtdc',72), ('Ekart','ekart',68), ('Gati','gati',60),
  ('India Post','india_post',40), ('DLH','dlh',55)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS courier_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID REFERENCES couriers(id) ON DELETE CASCADE,
  environment VARCHAR(20) DEFAULT 'production',
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  extra_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  test_status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_courier_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  courier_id UUID REFERENCES couriers(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  priority INT DEFAULT 50,
  UNIQUE(seller_id, courier_id)
);

CREATE TABLE IF NOT EXISTS rate_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID REFERENCES couriers(id) ON DELETE CASCADE,
  zone_from VARCHAR(10) NOT NULL DEFAULT 'ALL',
  zone_to VARCHAR(10) NOT NULL DEFAULT 'ALL',
  min_weight_kg DECIMAL(8,3) NOT NULL DEFAULT 0,
  max_weight_kg DECIMAL(8,3) NOT NULL DEFAULT 50,
  base_rate DECIMAL(10,2) NOT NULL,
  additional_rate_per_kg DECIMAL(10,2) DEFAULT 0,
  cod_charge_fixed DECIMAL(10,2) DEFAULT 0,
  cod_charge_pct DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rc_courier ON rate_cards(courier_id);

-- Seed sane default rate cards so orders can be priced out of the box
INSERT INTO rate_cards (courier_id, base_rate, additional_rate_per_kg, cod_charge_fixed, cod_charge_pct)
SELECT id, CASE code
    WHEN 'delhivery' THEN 60 WHEN 'bluedart' THEN 125 WHEN 'dtdc' THEN 82
    WHEN 'ekart' THEN 65 WHEN 'shadowfax' THEN 70 WHEN 'xpressbees' THEN 78
    WHEN 'ecomexpress' THEN 64 WHEN 'amazon_shipping' THEN 90
    WHEN 'gati' THEN 58 WHEN 'india_post' THEN 35 WHEN 'dlh' THEN 68
    ELSE 70 END,
  18, 15, 1.5
FROM couriers
WHERE NOT EXISTS (SELECT 1 FROM rate_cards WHERE rate_cards.courier_id = couriers.id);

CREATE TABLE IF NOT EXISTS margin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  courier_id UUID REFERENCES couriers(id) ON DELETE CASCADE,
  margin_type margin_type NOT NULL DEFAULT 'fixed',
  margin_value DECIMAL(10,2) NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Global default margin (seller_id and courier_id NULL = applies to everyone)
INSERT INTO margin_settings (seller_id, courier_id, margin_type, margin_value)
SELECT NULL, NULL, 'fixed', 5
WHERE NOT EXISTS (SELECT 1 FROM margin_settings WHERE seller_id IS NULL AND courier_id IS NULL);

CREATE TABLE IF NOT EXISTS pincode_master (
  pincode VARCHAR(10) PRIMARY KEY,
  city VARCHAR(100),
  state VARCHAR(100),
  zone VARCHAR(5) DEFAULT 'C',
  is_active BOOLEAN DEFAULT true
);
INSERT INTO pincode_master (pincode, city, state, zone) VALUES
  ('394230','Surat','Gujarat','A'), ('400013','Mumbai','Maharashtra','A'),
  ('411001','Pune','Maharashtra','A'), ('560001','Bengaluru','Karnataka','B'),
  ('110001','Delhi','Delhi','B'), ('600001','Chennai','Tamil Nadu','B'),
  ('500001','Hyderabad','Telangana','B'), ('700001','Kolkata','West Bengal','C')
ON CONFLICT (pincode) DO NOTHING;

CREATE TABLE IF NOT EXISTS courier_serviceability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID REFERENCES couriers(id) ON DELETE CASCADE,
  pincode VARCHAR(10) NOT NULL,
  supports_delivery BOOLEAN DEFAULT true,
  supports_cod BOOLEAN DEFAULT true,
  UNIQUE(courier_id, pincode)
);
-- Seed: every active courier services every seed pincode (mock-friendly default)
INSERT INTO courier_serviceability (courier_id, pincode)
SELECT c.id, p.pincode FROM couriers c CROSS JOIN pincode_master p
ON CONFLICT (courier_id, pincode) DO NOTHING;

-- ── ORDERS ─────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS mozopost_order_seq START 1;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  mozopost_order_id VARCHAR(30) UNIQUE,
  seller_order_id VARCHAR(255),
  status order_status DEFAULT 'unprocessed',
  payment_mode payment_mode NOT NULL DEFAULT 'prepaid',

  consignee_name VARCHAR(255) NOT NULL,
  consignee_phone VARCHAR(20) NOT NULL,
  consignee_email VARCHAR(255),
  consignee_address1 TEXT NOT NULL,
  consignee_address2 TEXT,
  consignee_city VARCHAR(100) NOT NULL,
  consignee_state VARCHAR(100) NOT NULL,
  consignee_pincode VARCHAR(10) NOT NULL,

  warehouse_id UUID REFERENCES warehouses(id),

  dead_weight_kg DECIMAL(8,3) NOT NULL,
  length_cm DECIMAL(8,2), width_cm DECIMAL(8,2), height_cm DECIMAL(8,2),
  volumetric_weight_kg DECIMAL(8,3),
  billed_weight_kg DECIMAL(8,3),
  declared_value DECIMAL(12,2) DEFAULT 0,
  num_pieces INT DEFAULT 1,
  item_description TEXT,

  courier_id UUID REFERENCES couriers(id),
  awb_number VARCHAR(100),
  auto_allocated BOOLEAN DEFAULT true,

  base_freight DECIMAL(10,2) DEFAULT 0,
  cod_charge DECIMAL(10,2) DEFAULT 0,
  margin_applied DECIMAL(10,2) DEFAULT 0,
  total_freight DECIMAL(10,2) DEFAULT 0,
  cod_amount DECIMAL(12,2) DEFAULT 0,

  label_url TEXT,

  -- Fraud engine results (computed at creation time)
  fraud_score INT,
  fraud_flags JSONB DEFAULT '[]',

  last_tracking_status VARCHAR(100),
  last_tracking_at TIMESTAMPTZ,
  rto_initiated_at TIMESTAMPTZ,

  channel VARCHAR(50) DEFAULT 'dashboard',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_awb ON orders(awb_number);
CREATE INDEX IF NOT EXISTS idx_orders_moz_id ON orders(mozopost_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

CREATE OR REPLACE FUNCTION generate_mozopost_order_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mozopost_order_id IS NULL THEN
    NEW.mozopost_order_id := 'MP' || TO_CHAR(NOW(),'YYMM') || LPAD(nextval('mozopost_order_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_id ON orders;
CREATE TRIGGER trg_order_id BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_mozopost_order_id();

CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status order_status,
  location VARCHAR(255),
  description TEXT,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'mock',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_te_order ON tracking_events(order_id);

CREATE TABLE IF NOT EXISTS ndr_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  attempt_number INT DEFAULT 1,
  ndr_reason ndr_reason NOT NULL,
  ndr_at TIMESTAMPTZ DEFAULT NOW(),
  action_taken ndr_action,
  action_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ndr_order ON ndr_records(order_id);

CREATE TABLE IF NOT EXISTS pickup_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id),
  courier_id UUID REFERENCES couriers(id),
  pickup_date DATE NOT NULL,
  expected_package_count INT DEFAULT 1,
  status pickup_status DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── WALLET ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID UNIQUE REFERENCES sellers(id) ON DELETE CASCADE,
  balance DECIMAL(15,2) DEFAULT 0,
  low_balance_alert_threshold DECIMAL(10,2) DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  type wallet_txn_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  order_id UUID REFERENCES orders(id),
  description TEXT NOT NULL,
  payment_gateway_txn_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wt_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wt_created ON wallet_transactions(created_at DESC);

-- ── COD ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cod_remittances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  total_orders INT DEFAULT 0,
  total_cod_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) DEFAULT 0,
  payment_cycle payment_cycle DEFAULT 'D2',
  due_date DATE,
  status cod_settlement_status DEFAULT 'pending',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TICKETS ────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(30) UNIQUE,
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  type VARCHAR(50) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  description TEXT,
  priority ticket_priority DEFAULT 'medium',
  status ticket_status DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(),'YYYY') || '-' || LPAD(nextval('ticket_seq')::TEXT, 5, '0');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_ticket_number ON tickets;
CREATE TRIGGER trg_ticket_number BEFORE INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- ── NOTIFICATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

-- ── AUDIT LOG ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ── GLOBAL SETTINGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO global_settings (key, value) VALUES
  ('default_payment_cycle','"D2"'), ('wallet_minimum_balance','0'),
  ('low_balance_alert','500'), ('gst_rate','18'), ('max_bulk_upload_rows','500')
ON CONFLICT (key) DO NOTHING;

-- Auto-update updated_at on orders/wallets/sellers/users
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','sellers','orders','wallets','courier_credentials','tickets']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_%s ON %s', t, t);
    EXECUTE format('CREATE TRIGGER trg_touch_%s BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION touch_updated_at()', t, t);
  END LOOP;
END $$;

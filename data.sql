-- ════════════════════════════════════════════════════════════════════
-- MOZOPOST — COMPLETE POSTGRESQL SETUP
-- One file to rule them all: Schema + Migration + Demo Seed Data
--
-- HOW TO RUN:
--   psql $DATABASE_URL -f mozopost_complete.sql
--   OR paste into Neon / Supabase SQL editor
--
-- WHAT THIS CREATES:
--   • All tables, enums, indexes, triggers, views
--   • 11 couriers with rate cards
--   • 3 demo logins (password for all: Demo@1234)
--       seller@demo.com       — Seller  (Arjun Textiles)
--       admin@demo.com        — Master Admin
--       superadmin@demo.com   — Super Admin
--   • Arjun Textiles: warehouse, ₹5,000 wallet, all couriers enabled
--   • Riya Fashion: second seller, ₹12,450 wallet, credit facility ₹50,000
--   • 8 sample orders across different statuses
--   • Weight disputes, NDR records, COD remittances, audit logs
--
-- Safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING
-- ════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- PART 1 — EXTENSIONS
-- ──────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────────
-- PART 2 — ENUMS
-- ──────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE user_role AS ENUM
  ('seller','master_admin','super_admin','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE user_status AS ENUM
  ('active','suspended','pending_kyc','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE kyc_status AS ENUM
  ('pending','submitted','verified','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE order_status AS ENUM
  ('unprocessed','booked','picked','in_transit','out_for_delivery',
   'delivered','rto_initiated','rto_in_transit','rto_delivered',
   'cancelled','failed','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE payment_mode AS ENUM ('prepaid','cod');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE wallet_txn_type AS ENUM
  ('credit','debit','adjustment','refund','cod_settlement',
   'credit_utilized','credit_repaid','credit_cod_recovered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE ndr_reason AS ENUM
  ('customer_not_available','wrong_address','refused_delivery',
   'premises_closed','out_of_delivery_area','fake_attempt','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE ndr_action AS ENUM
  ('reattempt','update_address','hold','rto','customer_confirm');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE pickup_status AS ENUM
  ('scheduled','picked_up','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE cod_settlement_status AS ENUM
  ('pending','processing','settled','on_hold','disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE courier_status AS ENUM
  ('active','inactive','testing','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE margin_type AS ENUM ('fixed','percentage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE ticket_status AS ENUM
  ('open','in_progress','escalated','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE ticket_priority AS ENUM
  ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE payment_cycle AS ENUM
  ('D1','D2','D3','weekly','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Migration 002 enums
DO $$ BEGIN CREATE TYPE weight_dispute_status AS ENUM
  ('open','under_review','approved','rejected','refund_pending','refund_processed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE weight_dispute_reason AS ENUM
  ('wrong_weight','volumetric_mismatch','dimensional_error','courier_error','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE credit_status AS ENUM
  ('active','frozen','suspended','removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE credit_billing_cycle AS ENUM
  ('daily','D1','D2','weekly','fortnightly','monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────────────────────────
-- PART 3 — SHARED TRIGGER FUNCTION (must exist before tables)
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────
-- PART 4 — CORE TABLES
-- ──────────────────────────────────────────────────────────────────

-- TENANTS
CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email           VARCHAR(255) UNIQUE NOT NULL,
  phone           VARCHAR(20),
  password_hash   TEXT NOT NULL,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100),
  role            user_role NOT NULL DEFAULT 'seller',
  status          user_status DEFAULT 'pending_kyc',
  kyc_status      kyc_status DEFAULT 'pending',
  email_verified  BOOLEAN DEFAULT false,
  last_login_at   TIMESTAMPTZ,
  login_attempts  INT DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  device_info JSONB,
  ip_address  VARCHAR(64),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rt_user ON refresh_tokens(user_id);

-- SELLERS
CREATE TABLE IF NOT EXISTS sellers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name         VARCHAR(255) NOT NULL,
  business_type         VARCHAR(100),
  gstin                 VARCHAR(20),
  pan                   VARCHAR(20),
  bank_account_name     VARCHAR(255),
  bank_account_number   VARCHAR(50),
  bank_ifsc             VARCHAR(20),
  auto_allocate_courier BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id     UUID REFERENCES sellers(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  contact_name  VARCHAR(255),
  contact_phone VARCHAR(20),
  address_line1 TEXT NOT NULL,
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100) NOT NULL,
  pincode       VARCHAR(10) NOT NULL,
  is_default    BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wh_seller ON warehouses(seller_id);

-- COURIERS
CREATE TABLE IF NOT EXISTS couriers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(100) NOT NULL,
  code           VARCHAR(50) UNIQUE NOT NULL,
  status         courier_status DEFAULT 'active',
  supports_cod   BOOLEAN DEFAULT true,
  supports_prepaid BOOLEAN DEFAULT true,
  priority       INT DEFAULT 50,
  is_mock        BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courier_credentials (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id        UUID REFERENCES couriers(id) ON DELETE CASCADE,
  environment       VARCHAR(20) DEFAULT 'production',
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  extra_encrypted   TEXT,
  is_active         BOOLEAN DEFAULT true,
  last_tested_at    TIMESTAMPTZ,
  test_status       VARCHAR(50),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_courier_access (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id  UUID REFERENCES sellers(id) ON DELETE CASCADE,
  courier_id UUID REFERENCES couriers(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  priority   INT DEFAULT 50,
  UNIQUE(seller_id, courier_id)
);

CREATE TABLE IF NOT EXISTS rate_cards (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id             UUID REFERENCES couriers(id) ON DELETE CASCADE,
  zone_from              VARCHAR(10) NOT NULL DEFAULT 'ALL',
  zone_to                VARCHAR(10) NOT NULL DEFAULT 'ALL',
  min_weight_kg          DECIMAL(8,3) NOT NULL DEFAULT 0,
  max_weight_kg          DECIMAL(8,3) NOT NULL DEFAULT 50,
  base_rate              DECIMAL(10,2) NOT NULL,
  additional_rate_per_kg DECIMAL(10,2) DEFAULT 0,
  cod_charge_fixed       DECIMAL(10,2) DEFAULT 0,
  cod_charge_pct         DECIMAL(5,2)  DEFAULT 0,
  is_active              BOOLEAN DEFAULT true,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rc_courier ON rate_cards(courier_id);

CREATE TABLE IF NOT EXISTS margin_settings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id    UUID REFERENCES sellers(id) ON DELETE CASCADE,
  courier_id   UUID REFERENCES couriers(id) ON DELETE CASCADE,
  margin_type  margin_type NOT NULL DEFAULT 'fixed',
  margin_value DECIMAL(10,2) NOT NULL DEFAULT 5,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pincode_master (
  pincode   VARCHAR(10) PRIMARY KEY,
  city      VARCHAR(100),
  state     VARCHAR(100),
  zone      VARCHAR(5) DEFAULT 'C',
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS courier_serviceability (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id        UUID REFERENCES couriers(id) ON DELETE CASCADE,
  pincode           VARCHAR(10) NOT NULL,
  supports_delivery BOOLEAN DEFAULT true,
  supports_cod      BOOLEAN DEFAULT true,
  UNIQUE(courier_id, pincode)
);

-- ORDERS
CREATE SEQUENCE IF NOT EXISTS mozopost_order_seq START 1;

CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id        UUID REFERENCES sellers(id) ON DELETE CASCADE,
  mozopost_order_id VARCHAR(30) UNIQUE,
  seller_order_id  VARCHAR(255),
  status           order_status DEFAULT 'unprocessed',
  payment_mode     payment_mode NOT NULL DEFAULT 'prepaid',

  consignee_name    VARCHAR(255) NOT NULL,
  consignee_phone   VARCHAR(20) NOT NULL,
  consignee_email   VARCHAR(255),
  consignee_address1 TEXT NOT NULL,
  consignee_address2 TEXT,
  consignee_city    VARCHAR(100) NOT NULL,
  consignee_state   VARCHAR(100) NOT NULL,
  consignee_pincode VARCHAR(10) NOT NULL,

  warehouse_id UUID REFERENCES warehouses(id),

  dead_weight_kg      DECIMAL(8,3) NOT NULL,
  length_cm           DECIMAL(8,2),
  width_cm            DECIMAL(8,2),
  height_cm           DECIMAL(8,2),
  volumetric_weight_kg DECIMAL(8,3),
  billed_weight_kg    DECIMAL(8,3),
  declared_value      DECIMAL(12,2) DEFAULT 0,
  num_pieces          INT DEFAULT 1,
  item_description    TEXT,

  courier_id     UUID REFERENCES couriers(id),
  awb_number     VARCHAR(100),
  auto_allocated BOOLEAN DEFAULT true,

  base_freight    DECIMAL(10,2) DEFAULT 0,
  cod_charge      DECIMAL(10,2) DEFAULT 0,
  margin_applied  DECIMAL(10,2) DEFAULT 0,
  total_freight   DECIMAL(10,2) DEFAULT 0,
  cod_amount      DECIMAL(12,2) DEFAULT 0,
  label_url       TEXT,

  fraud_score INT,
  fraud_flags JSONB DEFAULT '[]',

  -- Weight discrepancy columns (migration 002)
  courier_charged_weight_kg    DECIMAL(8,3),
  weight_discrepancy_gm        INT DEFAULT 0,
  weight_discrepancy_auto_flagged BOOLEAN DEFAULT false,
  courier_extra_charge         DECIMAL(10,2) DEFAULT 0,

  last_tracking_status VARCHAR(100),
  last_tracking_at     TIMESTAMPTZ,
  rto_initiated_at     TIMESTAMPTZ,
  channel              VARCHAR(50) DEFAULT 'dashboard',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_seller  ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_awb     ON orders(awb_number);
CREATE INDEX IF NOT EXISTS idx_orders_moz_id  ON orders(mozopost_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

CREATE OR REPLACE FUNCTION generate_mozopost_order_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mozopost_order_id IS NULL THEN
    NEW.mozopost_order_id :=
      'MP' || TO_CHAR(NOW(),'YYMM') || LPAD(nextval('mozopost_order_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_order_id ON orders;
CREATE TRIGGER trg_order_id BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_mozopost_order_id();

CREATE TABLE IF NOT EXISTS tracking_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID REFERENCES orders(id) ON DELETE CASCADE,
  status          order_status,
  location        VARCHAR(255),
  description     TEXT,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source          VARCHAR(50) DEFAULT 'mock',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_te_order ON tracking_events(order_id);

CREATE TABLE IF NOT EXISTS ndr_records (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID REFERENCES orders(id) ON DELETE CASCADE,
  attempt_number INT DEFAULT 1,
  ndr_reason     ndr_reason NOT NULL,
  ndr_at         TIMESTAMPTZ DEFAULT NOW(),
  action_taken   ndr_action,
  action_at      TIMESTAMPTZ,
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ndr_order ON ndr_records(order_id);

CREATE TABLE IF NOT EXISTS pickup_requests (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id             UUID REFERENCES sellers(id) ON DELETE CASCADE,
  warehouse_id          UUID REFERENCES warehouses(id),
  courier_id            UUID REFERENCES couriers(id),
  pickup_date           DATE NOT NULL,
  expected_package_count INT DEFAULT 1,
  status                pickup_status DEFAULT 'scheduled',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- WALLET
CREATE TABLE IF NOT EXISTS wallets (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id                 UUID UNIQUE REFERENCES sellers(id) ON DELETE CASCADE,
  balance                   DECIMAL(15,2) DEFAULT 0,
  credit_outstanding        DECIMAL(12,2) DEFAULT 0,   -- migration 002
  low_balance_alert_threshold DECIMAL(10,2) DEFAULT 500,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id               UUID REFERENCES wallets(id) ON DELETE CASCADE,
  type                    wallet_txn_type NOT NULL,
  amount                  DECIMAL(12,2) NOT NULL,
  balance_before          DECIMAL(15,2) NOT NULL,
  balance_after           DECIMAL(15,2) NOT NULL,
  order_id                UUID REFERENCES orders(id),
  description             TEXT NOT NULL,
  payment_gateway_txn_id  VARCHAR(255),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wt_wallet  ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wt_created ON wallet_transactions(created_at DESC);

-- COD
CREATE TABLE IF NOT EXISTS cod_remittances (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id        UUID REFERENCES sellers(id) ON DELETE CASCADE,
  total_orders     INT DEFAULT 0,
  total_cod_amount DECIMAL(15,2) DEFAULT 0,
  net_amount       DECIMAL(15,2) DEFAULT 0,
  payment_cycle    payment_cycle DEFAULT 'D2',
  due_date         DATE,
  status           cod_settlement_status DEFAULT 'pending',
  settled_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- TICKETS
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;
CREATE TABLE IF NOT EXISTS tickets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(30) UNIQUE,
  seller_id     UUID REFERENCES sellers(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES orders(id),
  type          VARCHAR(50) NOT NULL,
  subject       VARCHAR(500) NOT NULL,
  description   TEXT,
  priority      ticket_priority DEFAULT 'medium',
  status        ticket_status DEFAULT 'open',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number :=
    'TKT-' || TO_CHAR(NOW(),'YYYY') || '-' ||
    LPAD(nextval('ticket_seq')::TEXT, 5, '0');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_ticket_number ON tickets;
CREATE TRIGGER trg_ticket_number BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  body       TEXT NOT NULL,
  type       VARCHAR(50),
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- GLOBAL SETTINGS
CREATE TABLE IF NOT EXISTS global_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────
-- PART 5 — MIGRATION 002: WEIGHT DISPUTES + CREDIT
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weight_disputes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id    UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_id   UUID REFERENCES couriers(id),

  seller_weight_gm      INT NOT NULL,
  volumetric_weight_gm  INT,
  courier_weight_gm     INT NOT NULL,
  charged_weight_gm     INT NOT NULL,
  difference_gm         INT NOT NULL,
  difference_pct        DECIMAL(6,2) NOT NULL,

  seller_charged_amount DECIMAL(10,2) NOT NULL,
  disputed_amount       DECIMAL(10,2) NOT NULL,

  status         weight_dispute_status NOT NULL DEFAULT 'open',
  reason         weight_dispute_reason NOT NULL DEFAULT 'wrong_weight',
  seller_remarks TEXT,
  admin_remarks  TEXT,

  product_images    TEXT[],
  packaging_images  TEXT[],
  packing_video_url TEXT,
  invoice_url       TEXT,

  approved_refund_amount DECIMAL(10,2),
  refunded_at            TIMESTAMPTZ,
  resolved_by            UUID REFERENCES users(id),
  resolved_at            TIMESTAMPTZ,

  auto_flagged BOOLEAN DEFAULT false,
  escalated    BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wd_seller  ON weight_disputes(seller_id);
CREATE INDEX IF NOT EXISTS idx_wd_order   ON weight_disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_wd_status  ON weight_disputes(status);
CREATE INDEX IF NOT EXISTS idx_wd_courier ON weight_disputes(courier_id);

DROP TRIGGER IF EXISTS trg_touch_weight_disputes ON weight_disputes;
CREATE TRIGGER trg_touch_weight_disputes
  BEFORE UPDATE ON weight_disputes
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS credit_facilities (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id           UUID UNIQUE NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  credit_limit        DECIMAL(12,2) NOT NULL DEFAULT 0,
  status              credit_status NOT NULL DEFAULT 'active',
  billing_cycle       credit_billing_cycle NOT NULL DEFAULT 'D2',
  auto_block_at_limit BOOLEAN DEFAULT true,
  alert_threshold_pct INT DEFAULT 80,
  assigned_by         UUID REFERENCES users(id),
  assigned_at         TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_touch_credit_facilities ON credit_facilities;
CREATE TRIGGER trg_touch_credit_facilities
  BEFORE UPDATE ON credit_facilities
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS credit_transactions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_facility_id UUID NOT NULL REFERENCES credit_facilities(id) ON DELETE CASCADE,
  seller_id          UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  order_id           UUID REFERENCES orders(id),
  type               VARCHAR(30) NOT NULL,
  amount             DECIMAL(12,2) NOT NULL,
  outstanding_before DECIMAL(12,2) NOT NULL,
  outstanding_after  DECIMAL(12,2) NOT NULL,
  description        TEXT NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ct_facility ON credit_transactions(credit_facility_id);
CREATE INDEX IF NOT EXISTS idx_ct_seller   ON credit_transactions(seller_id);

-- ──────────────────────────────────────────────────────────────────
-- PART 6 — VIEWS
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW weight_dispute_summary AS
SELECT wd.id, s.business_name, o.mozopost_order_id, o.awb_number,
       c.name AS courier_name,
       wd.seller_weight_gm, wd.courier_weight_gm,
       wd.difference_gm, wd.difference_pct,
       wd.disputed_amount, wd.approved_refund_amount,
       wd.status, wd.auto_flagged, wd.created_at
FROM weight_disputes wd
JOIN sellers s  ON s.id = wd.seller_id
JOIN orders o   ON o.id = wd.order_id
LEFT JOIN couriers c ON c.id = wd.courier_id
ORDER BY wd.created_at DESC;

CREATE OR REPLACE VIEW credit_utilization_summary AS
SELECT cf.id, s.business_name, u.email,
       cf.credit_limit, cf.status, cf.billing_cycle,
       w.balance           AS wallet_balance,
       w.credit_outstanding,
       cf.credit_limit - w.credit_outstanding AS available_credit,
       CASE WHEN cf.credit_limit > 0
            THEN ROUND((w.credit_outstanding / cf.credit_limit * 100)::numeric, 2)
            ELSE 0 END     AS utilization_pct,
       CASE
         WHEN w.credit_outstanding >= cf.credit_limit THEN 'exhausted'
         WHEN cf.credit_limit > 0
          AND (w.credit_outstanding / cf.credit_limit) >= 0.8 THEN 'near_limit'
         ELSE 'ok'
       END                 AS risk_band,
       cf.auto_block_at_limit, cf.alert_threshold_pct
FROM credit_facilities cf
JOIN sellers s ON s.id = cf.seller_id
JOIN users   u ON u.id = s.user_id
JOIN wallets w ON w.seller_id = cf.seller_id;

-- ──────────────────────────────────────────────────────────────────
-- PART 7 — auto updated_at triggers
-- ──────────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','sellers','orders','wallets',
    'courier_credentials','tickets'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_touch_%s ON %s;
       CREATE TRIGGER trg_touch_%s BEFORE UPDATE ON %s
         FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────────
-- PART 8 — REFERENCE DATA
-- ──────────────────────────────────────────────────────────────────

-- Tenant
INSERT INTO tenants (name, slug)
VALUES ('Mozopost','mozopost')
ON CONFLICT (slug) DO NOTHING;

-- 11 Couriers
INSERT INTO couriers (name, code, priority) VALUES
  ('Delhivery',       'delhivery',       90),
  ('BlueDart',        'bluedart',        85),
  ('Shadowfax',       'shadowfax',       80),
  ('XpressBees',      'xpressbees',      75),
  ('EcomExpress',     'ecomexpress',     70),
  ('DTDC',            'dtdc',            72),
  ('Ekart',           'ekart',           68),
  ('Amazon Shipping', 'amazon_shipping', 65),
  ('Gati',            'gati',            60),
  ('DLH',             'dlh',             55),
  ('India Post',      'india_post',      40)
ON CONFLICT (code) DO NOTHING;

-- Rate cards (one slab per courier, all-zone, 0–50 kg)
INSERT INTO rate_cards
  (courier_id, zone_from, zone_to, min_weight_kg, max_weight_kg,
   base_rate, additional_rate_per_kg, cod_charge_fixed, cod_charge_pct)
SELECT
  id,
  'ALL', 'ALL', 0, 50,
  CASE code
    WHEN 'delhivery'       THEN 60
    WHEN 'bluedart'        THEN 125
    WHEN 'shadowfax'       THEN 70
    WHEN 'xpressbees'      THEN 78
    WHEN 'ecomexpress'     THEN 64
    WHEN 'dtdc'            THEN 82
    WHEN 'ekart'           THEN 65
    WHEN 'amazon_shipping' THEN 90
    WHEN 'gati'            THEN 58
    WHEN 'dlh'             THEN 68
    WHEN 'india_post'      THEN 35
    ELSE 70
  END,
  18,   -- ₹18 per extra kg
  15,   -- ₹15 COD fixed charge
  1.5   -- 1.5% of COD value
FROM couriers
WHERE NOT EXISTS (
  SELECT 1 FROM rate_cards WHERE rate_cards.courier_id = couriers.id
);

-- Global default platform margin: ₹5 per order
INSERT INTO margin_settings (seller_id, courier_id, margin_type, margin_value)
SELECT NULL, NULL, 'fixed', 5
WHERE NOT EXISTS (
  SELECT 1 FROM margin_settings WHERE seller_id IS NULL AND courier_id IS NULL
);

-- 8 major-city pincodes
INSERT INTO pincode_master (pincode, city, state, zone) VALUES
  ('394230', 'Surat',      'Gujarat',      'A'),
  ('400013', 'Mumbai',     'Maharashtra',  'A'),
  ('400001', 'Mumbai',     'Maharashtra',  'A'),
  ('411001', 'Pune',       'Maharashtra',  'A'),
  ('560001', 'Bengaluru',  'Karnataka',    'B'),
  ('110001', 'Delhi',      'Delhi',        'B'),
  ('600001', 'Chennai',    'Tamil Nadu',   'B'),
  ('500001', 'Hyderabad',  'Telangana',    'B'),
  ('700001', 'Kolkata',    'West Bengal',  'C'),
  ('380001', 'Ahmedabad',  'Gujarat',      'A'),
  ('302001', 'Jaipur',     'Rajasthan',    'B'),
  ('226001', 'Lucknow',    'Uttar Pradesh','C')
ON CONFLICT (pincode) DO NOTHING;

-- Every courier services every seeded pincode (mock-friendly)
INSERT INTO courier_serviceability (courier_id, pincode)
SELECT c.id, p.pincode
FROM couriers c CROSS JOIN pincode_master p
ON CONFLICT (courier_id, pincode) DO NOTHING;

-- Global settings
INSERT INTO global_settings (key, value) VALUES
  ('default_payment_cycle',  '"D2"'),
  ('wallet_minimum_balance', '0'),
  ('low_balance_alert',      '500'),
  ('gst_rate',               '18'),
  ('max_bulk_upload_rows',   '500'),
  ('weight_dispute_auto_flag_pct', '20'),
  ('credit_default_billing_cycle', '"D2"')
ON CONFLICT (key) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────
-- PART 9 — DEMO SEED DATA
-- Password for all accounts: Demo@1234
-- Hash = bcrypt of "Demo@1234" with salt rounds 10
-- ──────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_tenant_id    UUID;
  v_seller_uid   UUID;
  v_seller2_uid  UUID;
  v_admin_uid    UUID;
  v_super_uid    UUID;
  v_seller_id    UUID;
  v_seller2_id   UUID;
  v_wh_id        UUID;
  v_wh2_id       UUID;
  v_del_id       UUID;
  v_bd_id        UUID;
  v_dtdc_id      UUID;
  v_ekart_id     UUID;
  v_wallet_id    UUID;
  v_wallet2_id   UUID;
  v_o1 UUID; v_o2 UUID; v_o3 UUID; v_o4 UUID;
  v_o5 UUID; v_o6 UUID; v_o7 UUID; v_o8 UUID;
  v_cf_id        UUID;
  v_admin_id_for_cf UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'mozopost';

  -- ── USERS ────────────────────────────────────────────────────────
  INSERT INTO users (tenant_id,email,phone,password_hash,first_name,last_name,
                     role,status,kyc_status,email_verified)
  VALUES
    (v_tenant_id,'seller@demo.com','9876543210',
     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
     'Arjun','Mehta','seller','active','verified',true),
    (v_tenant_id,'seller2@demo.com','9876543211',
     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
     'Riya','Shah','seller','active','verified',true),
    (v_tenant_id,'admin@demo.com','9876500001',
     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
     'Rajesh','Kumar','master_admin','active','verified',true),
    (v_tenant_id,'superadmin@demo.com','9876500002',
     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
     'Super','Admin','super_admin','active','verified',true)
  ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash;

  SELECT id INTO v_seller_uid  FROM users WHERE email = 'seller@demo.com';
  SELECT id INTO v_seller2_uid FROM users WHERE email = 'seller2@demo.com';
  SELECT id INTO v_admin_uid   FROM users WHERE email = 'admin@demo.com';
  SELECT id INTO v_super_uid   FROM users WHERE email = 'superadmin@demo.com';

  -- ── SELLERS ──────────────────────────────────────────────────────
  INSERT INTO sellers (user_id,business_name,business_type,gstin,pan)
  VALUES
    (v_seller_uid,  'Arjun Textiles Pvt Ltd', 'D2C Brand',     '24AAAAA0000A1Z5','AAAAA0000A'),
    (v_seller2_uid, 'Riya Fashion',           'Marketplace',   '27BBBBB0000B2Y6','BBBBB0000B')
  ON CONFLICT (user_id) DO UPDATE SET business_name = EXCLUDED.business_name;

  SELECT id INTO v_seller_id  FROM sellers WHERE user_id = v_seller_uid;
  SELECT id INTO v_seller2_id FROM sellers WHERE user_id = v_seller2_uid;

  -- ── WAREHOUSES ───────────────────────────────────────────────────
  INSERT INTO warehouses
    (seller_id,name,contact_name,contact_phone,address_line1,city,state,pincode,is_default)
  VALUES
    (v_seller_id,  'Surat Warehouse','Ramesh Patel','9876500000',
     'Plot 14, GIDC Sachin','Surat','Gujarat','394230',true),
    (v_seller2_id, 'Mumbai Office','Priya Shah','9876500003',
     '203 Kamala Mills, Lower Parel','Mumbai','Maharashtra','400013',true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_wh_id  FROM warehouses WHERE seller_id = v_seller_id  AND is_default = true LIMIT 1;
  SELECT id INTO v_wh2_id FROM warehouses WHERE seller_id = v_seller2_id AND is_default = true LIMIT 1;

  -- ── WALLETS ──────────────────────────────────────────────────────
  INSERT INTO wallets (seller_id, balance, credit_outstanding)
  VALUES
    (v_seller_id,  5000.00, 0),
    (v_seller2_id, 12450.00, 2400.00)
  ON CONFLICT (seller_id) DO NOTHING;

  SELECT id INTO v_wallet_id  FROM wallets WHERE seller_id = v_seller_id;
  SELECT id INTO v_wallet2_id FROM wallets WHERE seller_id = v_seller2_id;

  -- ── COURIER ACCESS ───────────────────────────────────────────────
  INSERT INTO merchant_courier_access (seller_id, courier_id, is_enabled, priority)
  SELECT v_seller_id,  id, true, priority FROM couriers ON CONFLICT DO NOTHING;
  INSERT INTO merchant_courier_access (seller_id, courier_id, is_enabled, priority)
  SELECT v_seller2_id, id, true, priority FROM couriers ON CONFLICT DO NOTHING;

  -- ── COURIER IDs ──────────────────────────────────────────────────
  SELECT id INTO v_del_id  FROM couriers WHERE code = 'delhivery';
  SELECT id INTO v_bd_id   FROM couriers WHERE code = 'bluedart';
  SELECT id INTO v_dtdc_id FROM couriers WHERE code = 'dtdc';
  SELECT id INTO v_ekart_id FROM couriers WHERE code = 'ekart';

  -- ── WALLET TRANSACTIONS (initial recharge) ───────────────────────
  INSERT INTO wallet_transactions
    (wallet_id,type,amount,balance_before,balance_after,description,payment_gateway_txn_id)
  VALUES
    (v_wallet_id,  'credit',5000.00, 0,5000.00,  'Initial wallet recharge (demo)','demo_pay_001'),
    (v_wallet2_id, 'credit',15000.00,0,15000.00, 'Initial wallet recharge (demo)','demo_pay_002'),
    (v_wallet2_id, 'credit_utilized',2400.00,15000.00,12600.00,
     'Credit utilized for 20 orders','demo_credit_001')
  ON CONFLICT DO NOTHING;

  -- ── ORDERS ───────────────────────────────────────────────────────
  -- Order 1: Delivered
  INSERT INTO orders (
    seller_id,seller_order_id,status,payment_mode,
    consignee_name,consignee_phone,consignee_address1,
    consignee_city,consignee_state,consignee_pincode,
    warehouse_id,dead_weight_kg,billed_weight_kg,volumetric_weight_kg,
    declared_value,courier_id,awb_number,auto_allocated,
    base_freight,cod_charge,margin_applied,total_freight,cod_amount,
    fraud_score,fraud_flags,last_tracking_status,last_tracking_at
  ) VALUES (
    v_seller_id,'ORD-2026-001','delivered','prepaid',
    'Rahul Sharma','9876501234','204 MG Road Indiranagar',
    'Bengaluru','Karnataka','560001',
    v_wh_id,0.5,0.5,0.360,
    499,v_del_id,'DEL1234567890',true,
    60,0,5,65,0,
    95,'[]','delivered',NOW() - INTERVAL '2 days'
  ) RETURNING id INTO v_o1;

  -- Order 2: In transit
  INSERT INTO orders (
    seller_id,seller_order_id,status,payment_mode,
    consignee_name,consignee_phone,consignee_address1,
    consignee_city,consignee_state,consignee_pincode,
    warehouse_id,dead_weight_kg,billed_weight_kg,
    length_cm,width_cm,height_cm,volumetric_weight_kg,
    declared_value,courier_id,awb_number,auto_allocated,
    base_freight,cod_charge,margin_applied,total_freight,cod_amount,
    fraud_score,fraud_flags,last_tracking_status
  ) VALUES (
    v_seller_id,'ORD-2026-002','in_transit','prepaid',
    'Priya Nair','9876502345','67 Park Street Kolkata',
    'Kolkata','West Bengal','700001',
    v_wh_id,1.2,1.2,
    30,20,15,1.800,
    1299,v_bd_id,'BD9876543210',true,
    125,0,5,130,0,
    88,'[]','in_transit'
  ) RETURNING id INTO v_o2;

  -- Order 3: NDR (with weight discrepancy — auto-flagged)
  INSERT INTO orders (
    seller_id,seller_order_id,status,payment_mode,
    consignee_name,consignee_phone,consignee_address1,
    consignee_city,consignee_state,consignee_pincode,
    warehouse_id,dead_weight_kg,billed_weight_kg,
    declared_value,courier_id,awb_number,auto_allocated,
    base_freight,cod_charge,margin_applied,total_freight,cod_amount,
    fraud_score,fraud_flags,
    courier_charged_weight_kg,weight_discrepancy_gm,
    weight_discrepancy_auto_flagged,courier_extra_charge,
    last_tracking_status
  ) VALUES (
    v_seller_id,'ORD-2026-003','failed','cod',
    'Ravi Kumar','9876503456','Near Temple Road Hitech City',
    'Hyderabad','Telangana','500001',
    v_wh_id,0.45,0.45,
    850,v_dtdc_id,'DTDC5432109876',true,
    82,14.45,5,101.45,850,
    72,'[{"type":"warning","code":"duplicate_customer","message":"1 order from this mobile in last 30 days"}]',
    0.9,450,true,47.44,
    'failed'
  ) RETURNING id INTO v_o3;

  -- Order 4: RTO
  INSERT INTO orders (
    seller_id,seller_order_id,status,payment_mode,
    consignee_name,consignee_phone,consignee_address1,
    consignee_city,consignee_state,consignee_pincode,
    warehouse_id,dead_weight_kg,billed_weight_kg,
    declared_value,courier_id,awb_number,auto_allocated,
    base_freight,cod_charge,margin_applied,total_freight,cod_amount,
    fraud_score,fraud_flags,rto_initiated_at,last_tracking_status
  ) VALUES (
    v_seller_id,'ORD-2026-004','rto_initiated','cod',
    'Meena Das','9876504567','23 EM Bypass Kolkata',
    'Kolkata','West Bengal','700001',
    v_wh_id,2.0,2.0,
    1200,v_ekart_id,'EKT7654321098',true,
    65,22.5,5,92.5,1200,
    65,'[{"type":"warning","code":"high_cod","message":"High value COD ₹1,200"}]',
    NOW() - INTERVAL '1 day','rto_initiated'
  ) RETURNING id INTO v_o4;

  -- Order 5: Booked (Riya Fashion)
  INSERT INTO orders (
    seller_id,seller_order_id,status,payment_mode,
    consignee_name,consignee_phone,consignee_address1,
    consignee_city,consignee_state,consignee_pincode,
    warehouse_id,dead_weight_kg,billed_weight_kg,
    declared_value,courier_id,awb_number,auto_allocated,
    base_freight,cod_charge,margin_applied,total_freight,cod_amount,
    fraud_score,fraud_flags
  ) VALUES (
    v_seller2_id,'RF-2026-001','booked','prepaid',
    'Suresh Nair','9876505678','14 MG Road Bengaluru',
    'Bengaluru','Karnataka','560001',
    v_wh2_id,0.3,0.360,
    799,v_del_id,'DEL2345678901',true,
    60,0,5,65,0,
    97,'[]'
  ) RETURNING id INTO v_o5;

  -- Order 6: Delivered (Riya Fashion, COD)
  INSERT INTO orders (
    seller_id,seller_order_id,status,payment_mode,
    consignee_name,consignee_phone,consignee_address1,
    consignee_city,consignee_state,consignee_pincode,
    warehouse_id,dead_weight_kg,billed_weight_kg,
    declared_value,courier_id,awb_number,auto_allocated,
    base_freight,cod_charge,margin_applied,total_freight,cod_amount,
    fraud_score,fraud_flags,last_tracking_status,last_tracking_at
  ) VALUES (
    v_seller2_id,'RF-2026-002','delivered','cod',
    'Anjali Mehta','9876506789','303 Worli Sea Face Mumbai',
    'Mumbai','Maharashtra','400013',
    v_wh2_id,0.8,0.8,
    2500,v_bd_id,'BD3456789012',true,
    125,37.5,5,167.5,2500,
    90,'[]','delivered',NOW() - INTERVAL '3 days'
  ) RETURNING id INTO v_o6;

  -- Order 7: Delivered — for weight dispute (resolved with refund)
  INSERT INTO orders (
    seller_id,seller_order_id,status,payment_mode,
    consignee_name,consignee_phone,consignee_address1,
    consignee_city,consignee_state,consignee_pincode,
    warehouse_id,dead_weight_kg,billed_weight_kg,
    declared_value,courier_id,awb_number,auto_allocated,
    base_freight,cod_charge,margin_applied,total_freight,cod_amount,
    fraud_score,fraud_flags,
    courier_charged_weight_kg,weight_discrepancy_gm,
    weight_discrepancy_auto_flagged,last_tracking_status
  ) VALUES (
    v_seller_id,'ORD-2026-007','delivered','prepaid',
    'Kiran Reddy','9876507890','89 Jubilee Hills Hyderabad',
    'Hyderabad','Telangana','500001',
    v_wh_id,0.5,0.5,
    650,v_dtdc_id,'DTDC6543210987',true,
    82,0,5,87,0,
    92,'[]',
    0.7,200,false,'delivered'
  ) RETURNING id INTO v_o7;

  -- Order 8: Cancelled (refunded to wallet)
  INSERT INTO orders (
    seller_id,seller_order_id,status,payment_mode,
    consignee_name,consignee_phone,consignee_address1,
    consignee_city,consignee_state,consignee_pincode,
    warehouse_id,dead_weight_kg,billed_weight_kg,
    declared_value,courier_id,auto_allocated,
    base_freight,cod_charge,margin_applied,total_freight,cod_amount,
    fraud_score,fraud_flags
  ) VALUES (
    v_seller_id,'ORD-2026-008','cancelled','prepaid',
    'Deepa Thomas','9876508901','42 Anna Nagar Chennai',
    'Chennai','Tamil Nadu','600001',
    v_wh_id,1.0,1.0,
    399,v_del_id,true,
    60,0,5,65,0,
    85,'[]'
  ) RETURNING id INTO v_o8;

  -- ── TRACKING EVENTS ──────────────────────────────────────────────
  -- Order 1 (delivered)
  INSERT INTO tracking_events (order_id,status,location,description,event_timestamp,source) VALUES
    (v_o1,'booked',      'Surat Hub',      'Shipment booked',                          NOW()-INTERVAL '5 days','mock'),
    (v_o1,'picked',      'Surat Hub',      'Picked up from seller',                    NOW()-INTERVAL '4 days 18 hours','mock'),
    (v_o1,'in_transit',  'Mumbai Hub',     'In transit to destination',                NOW()-INTERVAL '4 days','mock'),
    (v_o1,'in_transit',  'Bengaluru Hub',  'Arrived at destination hub',               NOW()-INTERVAL '3 days','mock'),
    (v_o1,'out_for_delivery','Bengaluru',  'Out for delivery',                         NOW()-INTERVAL '2 days 4 hours','mock'),
    (v_o1,'delivered',   'Bengaluru',      'Delivered to Rahul Sharma',                NOW()-INTERVAL '2 days','mock');

  -- Order 2 (in transit)
  INSERT INTO tracking_events (order_id,status,location,description,event_timestamp,source) VALUES
    (v_o2,'booked',     'Surat Hub',   'Shipment booked',             NOW()-INTERVAL '2 days','mock'),
    (v_o2,'picked',     'Surat Hub',   'Picked up from seller',       NOW()-INTERVAL '1 day 20 hours','mock'),
    (v_o2,'in_transit', 'Nagpur Hub',  'In transit via Nagpur',       NOW()-INTERVAL '1 day','mock'),
    (v_o2,'in_transit', 'Kolkata Hub', 'Arrived at destination hub',  NOW()-INTERVAL '6 hours','mock');

  -- Order 3 (failed / NDR)
  INSERT INTO tracking_events (order_id,status,location,description,event_timestamp,source) VALUES
    (v_o3,'booked',           'Surat Hub',   'Shipment booked',           NOW()-INTERVAL '4 days','mock'),
    (v_o3,'picked',           'Surat Hub',   'Picked up from seller',     NOW()-INTERVAL '3 days 18 hours','mock'),
    (v_o3,'in_transit',       'Pune Hub',    'In transit',                NOW()-INTERVAL '3 days','mock'),
    (v_o3,'out_for_delivery', 'Hyderabad',   'Out for delivery',          NOW()-INTERVAL '1 day 8 hours','mock'),
    (v_o3,'failed',           'Hyderabad',   'Delivery failed: customer not available', NOW()-INTERVAL '1 day','mock');

  -- Order 4 (RTO)
  INSERT INTO tracking_events (order_id,status,location,description,event_timestamp,source) VALUES
    (v_o4,'booked',       'Surat Hub', 'Shipment booked',              NOW()-INTERVAL '6 days','mock'),
    (v_o4,'picked',       'Surat Hub', 'Picked up',                    NOW()-INTERVAL '5 days','mock'),
    (v_o4,'in_transit',   'Kolkata Hub','In transit',                  NOW()-INTERVAL '4 days','mock'),
    (v_o4,'failed',       'Kolkata',   'Delivery attempt failed: refused', NOW()-INTERVAL '2 days','mock'),
    (v_o4,'rto_initiated','Kolkata',   'RTO initiated by system',      NOW()-INTERVAL '1 day','mock');

  -- ── NDR RECORDS ──────────────────────────────────────────────────
  INSERT INTO ndr_records (order_id,attempt_number,ndr_reason) VALUES
    (v_o3, 1, 'customer_not_available'),
    (v_o4, 1, 'refused_delivery');

  -- ── WEIGHT DISPUTES ──────────────────────────────────────────────
  -- Dispute 1: open, auto-flagged (order 3 — 450g vs 900g, 100% diff)
  INSERT INTO weight_disputes (
    seller_id,order_id,courier_id,
    seller_weight_gm,courier_weight_gm,charged_weight_gm,
    difference_gm,difference_pct,
    seller_charged_amount,disputed_amount,
    status,reason,seller_remarks,auto_flagged
  ) VALUES (
    v_seller_id,v_o3,v_dtdc_id,
    450,900,900,
    450,100.00,
    101.45,47.44,
    'open','wrong_weight',
    'I packed exactly 450g. Photos attached. Scale shows 0.45kg.',
    true
  );

  -- Dispute 2: resolved with refund (order 7 — 500g vs 700g, 40% diff)
  INSERT INTO weight_disputes (
    seller_id,order_id,courier_id,
    seller_weight_gm,courier_weight_gm,charged_weight_gm,
    difference_gm,difference_pct,
    seller_charged_amount,disputed_amount,
    approved_refund_amount,status,reason,
    admin_remarks,auto_flagged,escalated,
    resolved_by,resolved_at,refunded_at
  ) VALUES (
    v_seller_id,v_o7,v_dtdc_id,
    500,700,700,
    200,40.00,
    87,16,
    16,'refund_processed','wrong_weight',
    'Verified with courier. Weight error confirmed. Full refund approved.',
    false,false,
    v_admin_uid,NOW()-INTERVAL '3 days',NOW()-INTERVAL '2 days'
  );

  -- ── COD REMITTANCES ──────────────────────────────────────────────
  INSERT INTO cod_remittances
    (seller_id,total_orders,total_cod_amount,net_amount,payment_cycle,due_date,status)
  VALUES
    (v_seller_id,  12, 14400, 14400, 'D2', CURRENT_DATE + 2, 'pending'),
    (v_seller_id,  48,  57600, 57600, 'D2', CURRENT_DATE - 14,'settled'),
    (v_seller2_id, 30, 75000, 75000, 'D1', CURRENT_DATE + 1, 'pending');

  -- ── CREDIT FACILITY (Riya Fashion) ───────────────────────────────
  INSERT INTO credit_facilities (
    seller_id,credit_limit,status,billing_cycle,
    auto_block_at_limit,alert_threshold_pct,assigned_by
  ) VALUES (
    v_seller2_id,50000,'active','D1',
    true,80,v_admin_uid
  )
  ON CONFLICT (seller_id) DO NOTHING;

  SELECT id INTO v_cf_id FROM credit_facilities WHERE seller_id = v_seller2_id;

  -- Credit transaction for Riya Fashion's 20 utilized orders
  IF v_cf_id IS NOT NULL THEN
    INSERT INTO credit_transactions (
      credit_facility_id,seller_id,type,amount,
      outstanding_before,outstanding_after,description
    ) VALUES (
      v_cf_id,v_seller2_id,'utilized',2400,
      0,2400,
      'Bulk freight for 20 orders (auto-allocated on credit)'
    );
  END IF;

  -- ── TICKETS ──────────────────────────────────────────────────────
  INSERT INTO tickets (seller_id,order_id,type,subject,description,priority,status) VALUES
    (v_seller_id,v_o3,'weight_dispute',
     'DTDC charged 900g for 450g shipment',
     'Order ORD-2026-003: I packed 450g but DTDC billed 900g. This is a 100% overcharge.',
     'high','open'),
    (v_seller_id,v_o4,'billing_dispute',
     'RTO charge dispute for ORD-2026-004',
     'RTO was initiated but I did not receive the return package. Please investigate.',
     'medium','open');

  -- ── AUDIT LOG ────────────────────────────────────────────────────
  INSERT INTO audit_logs (user_id,action,entity_type,metadata) VALUES
    (v_admin_uid,'SEED_CREATED','demo_data',
     '{"note":"Initial demo data seeded","sellers":2,"orders":8}'),
    (v_admin_uid,'KYC_APPROVED','seller',
     jsonb_build_object('seller_id',v_seller_id,'business','Arjun Textiles')),
    (v_admin_uid,'KYC_APPROVED','seller',
     jsonb_build_object('seller_id',v_seller2_id,'business','Riya Fashion')),
    (v_admin_uid,'CREDIT_ASSIGNED','credit_facility',
     jsonb_build_object('seller_id',v_seller2_id,'limit',50000,'cycle','D1'));

  -- ── NOTIFICATIONS ────────────────────────────────────────────────
  INSERT INTO notifications (user_id,title,body,type,is_read) VALUES
    (v_seller_uid,
     '🚨 Weight discrepancy auto-flagged',
     'Order MP-0603 (DTDC): Courier charged 900g vs your declared 450g (100% difference). Review and raise a dispute.',
     'weight_dispute',false),
    (v_seller_uid,
     '⚠ NDR: Order MP-0603 needs action',
     'Delivery attempt failed for Ravi Kumar. Please take action within 3 days to avoid auto-RTO.',
     'ndr',false),
    (v_seller_uid,
     '✅ Weight dispute refund processed',
     'Dispute for order MP-0607 approved. ₹16.00 has been credited to your wallet.',
     'refund',true),
    (v_seller2_uid,
     '💳 Credit limit near exhaustion',
     'You have used ₹41,200 of your ₹50,000 credit limit (82.4%). Please recharge to avoid order blocks.',
     'credit_alert',false),
    (v_admin_uid,
     '5 weight disputes need attention',
     '5 open disputes including 2 auto-flagged high-difference cases.',
     'admin_alert',false);

  RAISE NOTICE '✅ Mozopost demo seed complete.';
  RAISE NOTICE '   Seller:      seller@demo.com  / Demo@1234';
  RAISE NOTICE '   Seller 2:    seller2@demo.com / Demo@1234';
  RAISE NOTICE '   Master Admin: admin@demo.com  / Demo@1234';
  RAISE NOTICE '   Super Admin:  superadmin@demo.com / Demo@1234';

END $$;

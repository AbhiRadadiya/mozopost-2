-- ════════════════════════════════════════════════════════════
-- MOZOPOST MIGRATION 002
-- Adds: Weight Discrepancy Management + Postpaid Credit Wallet
-- Safe to re-run (all IF NOT EXISTS / DO $$ EXCEPTION blocks)
-- Run: psql $DATABASE_URL -f packages/db/migrations/002_weight_disputes_credit.sql
-- ════════════════════════════════════════════════════════════

-- ── NEW ENUMS ──────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE weight_dispute_status AS ENUM (
  'open','under_review','approved','rejected','refund_pending','refund_processed'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE weight_dispute_reason AS ENUM (
  'wrong_weight','volumetric_mismatch','dimensional_error','courier_error','other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE credit_status AS ENUM (
  'active','frozen','suspended','removed'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE credit_billing_cycle AS ENUM (
  'daily','D1','D2','weekly','fortnightly','monthly'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ADD COURIER WEIGHT COLUMNS TO ORDERS ──────────────────────
-- courier_charged_weight_kg: what the courier actually billed
-- weight_discrepancy_gm: difference flagged for dispute (grams)
-- weight_discrepancy_auto_flagged: auto-flagged when >20% difference
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_charged_weight_kg DECIMAL(8,3);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight_discrepancy_gm     INT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight_discrepancy_auto_flagged BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_extra_charge       DECIMAL(10,2) DEFAULT 0;

-- ── WEIGHT DISPUTES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weight_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id        UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_id       UUID REFERENCES couriers(id),

  -- Weight values (all in grams for integer precision)
  seller_weight_gm     INT NOT NULL,
  volumetric_weight_gm INT,
  courier_weight_gm    INT NOT NULL,
  charged_weight_gm    INT NOT NULL,
  difference_gm        INT NOT NULL,
  difference_pct       DECIMAL(6,2) NOT NULL,

  -- Financial impact
  seller_charged_amount   DECIMAL(10,2) NOT NULL,
  disputed_amount         DECIMAL(10,2) NOT NULL,

  -- Dispute lifecycle
  status        weight_dispute_status NOT NULL DEFAULT 'open',
  reason        weight_dispute_reason NOT NULL DEFAULT 'wrong_weight',
  seller_remarks TEXT,
  admin_remarks  TEXT,

  -- Evidence (file paths / URLs)
  product_images  TEXT[],
  packaging_images TEXT[],
  packing_video_url TEXT,
  invoice_url      TEXT,

  -- Resolution
  approved_refund_amount DECIMAL(10,2),
  refunded_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,

  auto_flagged BOOLEAN DEFAULT false,
  escalated    BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wd_seller   ON weight_disputes(seller_id);
CREATE INDEX IF NOT EXISTS idx_wd_order    ON weight_disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_wd_status   ON weight_disputes(status);
CREATE INDEX IF NOT EXISTS idx_wd_courier  ON weight_disputes(courier_id);

-- auto updated_at trigger
DROP TRIGGER IF EXISTS trg_touch_weight_disputes ON weight_disputes;
CREATE TRIGGER trg_touch_weight_disputes
  BEFORE UPDATE ON weight_disputes
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── CREDIT FACILITY ────────────────────────────────────────────
-- One row per seller. NULL = no credit facility assigned.
CREATE TABLE IF NOT EXISTS credit_facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id    UUID UNIQUE NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  status       credit_status NOT NULL DEFAULT 'active',
  billing_cycle credit_billing_cycle NOT NULL DEFAULT 'D2',

  -- Risk controls
  auto_block_at_limit BOOLEAN DEFAULT true,
  alert_threshold_pct INT DEFAULT 80,  -- warn when usage > 80%

  -- Assigned by admin
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_touch_credit_facilities ON credit_facilities;
CREATE TRIGGER trg_touch_credit_facilities
  BEFORE UPDATE ON credit_facilities
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── CREDIT TRANSACTIONS ────────────────────────────────────────
-- Every time a seller ships on credit, or repays, it's logged here.
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_facility_id UUID NOT NULL REFERENCES credit_facilities(id) ON DELETE CASCADE,
  seller_id          UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  order_id           UUID REFERENCES orders(id),

  type           VARCHAR(30) NOT NULL,  -- 'utilized','repaid','adjusted','cod_recovered'
  amount         DECIMAL(12,2) NOT NULL,
  outstanding_before DECIMAL(12,2) NOT NULL,
  outstanding_after  DECIMAL(12,2) NOT NULL,

  description    TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ct_facility ON credit_transactions(credit_facility_id);
CREATE INDEX IF NOT EXISTS idx_ct_seller   ON credit_transactions(seller_id);

-- ── ADD OUTSTANDING COLUMN TO WALLETS ─────────────────────────
-- outstanding_credit: how much the seller owes (positive = owes money)
-- This lives on wallets so the existing wallet debit logic can be
-- extended without a join in the hot order-creation path.
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS credit_outstanding DECIMAL(12,2) DEFAULT 0;

-- ── EXTEND wallet_txn_type FOR CREDIT ENTRIES ─────────────────
-- PostgreSQL doesn't support removing enum values, only adding.
DO $$
BEGIN
  ALTER TYPE wallet_txn_type ADD VALUE IF NOT EXISTS 'credit_utilized';
  ALTER TYPE wallet_txn_type ADD VALUE IF NOT EXISTS 'credit_repaid';
  ALTER TYPE wallet_txn_type ADD VALUE IF NOT EXISTS 'credit_cod_recovered';
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── WEIGHT DISPUTE REFUNDS VIEW (admin convenience) ────────────
CREATE OR REPLACE VIEW weight_dispute_summary AS
SELECT
  wd.id,
  s.business_name,
  o.mozopost_order_id,
  o.awb_number,
  c.name AS courier_name,
  wd.seller_weight_gm,
  wd.courier_weight_gm,
  wd.difference_gm,
  wd.difference_pct,
  wd.disputed_amount,
  wd.approved_refund_amount,
  wd.status,
  wd.auto_flagged,
  wd.created_at
FROM weight_disputes wd
JOIN sellers s ON s.id = wd.seller_id
JOIN orders o  ON o.id = wd.order_id
LEFT JOIN couriers c ON c.id = wd.courier_id
ORDER BY wd.created_at DESC;

-- ── CREDIT UTILIZATION VIEW (admin convenience) ────────────────
CREATE OR REPLACE VIEW credit_utilization_summary AS
SELECT
  cf.id,
  s.business_name,
  u.email,
  cf.credit_limit,
  cf.status,
  cf.billing_cycle,
  w.balance         AS wallet_balance,
  w.credit_outstanding,
  cf.credit_limit - w.credit_outstanding AS available_credit,
  CASE WHEN cf.credit_limit > 0
       THEN ROUND((w.credit_outstanding / cf.credit_limit * 100)::numeric, 2)
       ELSE 0 END   AS utilization_pct,
  CASE
    WHEN w.credit_outstanding >= cf.credit_limit THEN 'exhausted'
    WHEN cf.credit_limit > 0 AND (w.credit_outstanding / cf.credit_limit) >= 0.8 THEN 'near_limit'
    ELSE 'ok'
  END               AS risk_band,
  cf.auto_block_at_limit,
  cf.alert_threshold_pct
FROM credit_facilities cf
JOIN sellers s ON s.id = cf.seller_id
JOIN users   u ON u.id = s.user_id
JOIN wallets w ON w.seller_id = cf.seller_id;

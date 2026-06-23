-- ════════════════════════════════════════════════════════════
-- MOZOPOST MIGRATION 003
-- Adds: staff_roles table for User Role & Permissions system
-- Safe to re-run (IF NOT EXISTS everywhere)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_roles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  permissions  JSONB NOT NULL DEFAULT '[]',
  description  TEXT,
  is_system    BOOLEAN DEFAULT false,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_touch_staff_roles ON staff_roles;
CREATE TRIGGER trg_touch_staff_roles
  BEFORE UPDATE ON staff_roles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Seed system roles (is_system=true so they cannot be deleted via API)
INSERT INTO staff_roles (name, display_name, permissions, is_system, description) VALUES

('operations_manager', 'Operations Manager',
 '["view_merchants","view_orders","edit_orders","cancel_orders","view_wallet","view_ndr","resolve_ndr","view_cod","view_reports","view_couriers"]',
 true, 'Full operations access — orders, NDR, pickups, tracking'),

('finance_manager', 'Finance Manager',
 '["view_merchants","view_wallet","adjust_wallet","export_wallet","view_credit","manage_credit","view_cod","release_cod","view_reports","export_reports"]',
 true, 'Full finance access — wallet, COD, credit, reports'),

('support_manager', 'Support Manager',
 '["view_merchants","view_orders","view_wallet","view_ndr","resolve_ndr","view_disputes","resolve_disputes","view_reports"]',
 true, 'Support access — tickets, NDR, disputes'),

('sales_manager', 'Sales Manager',
 '["view_merchants","create_merchants","edit_merchants","approve_merchants","view_orders","view_reports","export_reports"]',
 true, 'Sales access — merchant onboarding, KYC, reports'),

('kyc_executive', 'KYC Executive',
 '["view_merchants","approve_merchants"]',
 true, 'KYC review and approval only'),

('cod_executive', 'COD Executive',
 '["view_merchants","view_wallet","view_cod","release_cod"]',
 true, 'COD settlement and remittance'),

('ndr_executive', 'NDR Executive',
 '["view_orders","view_ndr","resolve_ndr"]',
 true, 'NDR resolution and reattempt management'),

('courier_manager', 'Courier Manager',
 '["view_couriers","manage_couriers","manage_rate_cards","view_reports"]',
 true, 'Courier integrations, rate cards, API keys')

ON CONFLICT (name) DO NOTHING;

-- Add time_slot column to pickup_requests if missing
ALTER TABLE pickup_requests ADD COLUMN IF NOT EXISTS time_slot VARCHAR(50);
ALTER TABLE pickup_requests ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add department/designation columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);

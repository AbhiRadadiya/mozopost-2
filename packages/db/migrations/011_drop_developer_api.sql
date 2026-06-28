-- ════════════════════════════════════════════════════════════
-- MOZOPOST MIGRATION 011
-- Removes: Developer API module tables
-- ════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS api_logs CASCADE;
DROP TABLE IF EXISTS webhook_endpoints CASCADE;
DROP TABLE IF EXISTS api_ip_whitelist CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TYPE IF EXISTS webhook_status CASCADE;

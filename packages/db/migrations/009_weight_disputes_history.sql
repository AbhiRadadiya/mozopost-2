-- Migration 009: Add weight_dispute_events table and proof_image_urls to weight_disputes.

ALTER TABLE weight_disputes ADD COLUMN IF NOT EXISTS proof_image_urls JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS weight_dispute_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES weight_disputes(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  description TEXT,
  user_type VARCHAR(20),
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_dispute_events_dispute_id ON weight_dispute_events(dispute_id);

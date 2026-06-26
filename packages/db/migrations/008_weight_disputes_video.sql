-- Migration 008: Add proof_video_url to weight_disputes for video uploads.

ALTER TABLE weight_disputes ADD COLUMN IF NOT EXISTS proof_video_url TEXT;

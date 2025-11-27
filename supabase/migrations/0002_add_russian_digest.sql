-- Add Russian translation column to daily_digest table
-- Run this migration in Supabase SQL Editor

ALTER TABLE daily_digest 
ADD COLUMN IF NOT EXISTS summary_md_ru TEXT;

COMMENT ON COLUMN daily_digest.summary_md_ru IS 'Russian translation of the daily digest';

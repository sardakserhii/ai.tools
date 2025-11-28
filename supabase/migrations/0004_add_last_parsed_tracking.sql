-- Migration: 0004_add_last_parsed_tracking.sql
-- Description: Add tracking for last parsed news item per tool
-- Created: 2024

-- Add column to track the last parsed news URL for each tool
-- This allows us to detect new content by comparing URLs instead of dates
ALTER TABLE tools ADD COLUMN IF NOT EXISTS last_parsed_url TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS last_parsed_at TIMESTAMPTZ;

-- Comment for documentation
COMMENT ON COLUMN tools.last_parsed_url IS 'URL of the last parsed news item - used to detect new content';
COMMENT ON COLUMN tools.last_parsed_at IS 'When the last parsing was done';

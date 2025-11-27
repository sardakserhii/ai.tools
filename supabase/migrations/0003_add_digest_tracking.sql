-- Migration: Add digest tracking for news items
-- This allows us to track which news items have been included in digests
-- to avoid duplicates and implement "missed news" functionality

-- Add column to track if news was included in a digest
ALTER TABLE news_items 
ADD COLUMN IF NOT EXISTS digest_date DATE DEFAULT NULL;

-- Add index for efficient querying of unprocessed news
CREATE INDEX IF NOT EXISTS idx_news_items_digest_date 
ON news_items(digest_date) 
WHERE digest_date IS NULL;

-- Add index for querying by published_at and digest status
CREATE INDEX IF NOT EXISTS idx_news_items_published_digest 
ON news_items(published_at DESC, digest_date);

COMMENT ON COLUMN news_items.digest_date IS 'Date of the digest this news item was included in. NULL means not yet included in any digest.';

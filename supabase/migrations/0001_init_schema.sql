-- Migration: 0001_init_schema.sql
-- Description: Initial schema for AI News Aggregator
-- Created: 2024

-- ============================================
-- Table: tools
-- Stores AI tools that we aggregate news from
-- ============================================
CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY,                          -- e.g., 'chatgpt', 'claude', 'midjourney'
    name TEXT NOT NULL,                           -- Display name: 'ChatGPT', 'Claude', etc.
    category TEXT,                                -- e.g., 'llm', 'image-gen', 'code-assistant'
    site_url TEXT,                                -- Main website URL
    news_url TEXT,                                -- URL to scrape for news/updates
    lang TEXT DEFAULT 'en',                       -- Primary language of the tool's content
    is_active BOOLEAN DEFAULT TRUE,               -- Whether to include in aggregation
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: news_items
-- Stores individual news items parsed from tools
-- ============================================
CREATE TABLE IF NOT EXISTS news_items (
    id BIGSERIAL PRIMARY KEY,
    tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    published_at TIMESTAMPTZ,                     -- When the news was originally published
    raw_content TEXT,                             -- Full scraped content
    snippet TEXT,                                 -- Short excerpt/summary
    importance TEXT,                              -- 'high', 'medium', 'low' (set by LLM classifier)
    tags TEXT[] DEFAULT '{}',                     -- Tags for categorization
    lang TEXT,                                    -- Language of this specific news item
    hash TEXT UNIQUE,                             -- Hash for deduplication
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries by tool and date
CREATE INDEX IF NOT EXISTS idx_news_items_tool_id ON news_items(tool_id);
CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_importance ON news_items(importance);

-- ============================================
-- Table: daily_digest
-- Stores daily aggregated summaries
-- ============================================
CREATE TABLE IF NOT EXISTS daily_digest (
    id BIGSERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,                    -- The date this digest covers
    summary_md TEXT NOT NULL,                     -- Full markdown summary
    summary_short TEXT,                           -- Short TL;DR summary
    tools_list TEXT[] DEFAULT '{}',               -- List of tool IDs included in this digest
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_daily_digest_date ON daily_digest(date DESC);

-- ============================================
-- Trigger: Update updated_at on tools table
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tools_updated_at
    BEFORE UPDATE ON tools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed data: Example AI tools
-- ============================================
INSERT INTO tools (id, name, category, site_url, news_url, lang, is_active) VALUES
    ('chatgpt', 'ChatGPT', 'llm', 'https://chat.openai.com', 'https://openai.com/blog', 'en', TRUE),
    ('claude', 'Claude', 'llm', 'https://claude.ai', 'https://www.anthropic.com/news', 'en', TRUE),
    ('midjourney', 'Midjourney', 'image-gen', 'https://midjourney.com', 'https://midjourney.com/updates', 'en', TRUE),
    ('github-copilot', 'GitHub Copilot', 'code-assistant', 'https://github.com/features/copilot', 'https://github.blog/tag/github-copilot/', 'en', TRUE),
    ('dalle', 'DALL-E', 'image-gen', 'https://openai.com/dall-e-3', 'https://openai.com/blog', 'en', TRUE)
ON CONFLICT (id) DO NOTHING;

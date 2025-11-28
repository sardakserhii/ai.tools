/**
 * TypeScript types for database entities
 * These types match the schema defined in supabase/migrations/0001_init_schema.sql
 */

/**
 * AI Tool entity
 * Represents an AI tool that we aggregate news from
 */
export interface Tool {
    id: string;
    name: string;
    category: string | null;
    site_url: string | null;
    news_url: string | null;
    lang: string;
    is_active: boolean;
    last_parsed_url: string | null;
    last_parsed_at: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * News Item entity
 * Represents a single news item from an AI tool
 */
export interface NewsItem {
    id: number;
    tool_id: string;
    title: string;
    url: string;
    published_at: string | null;
    raw_content: string | null;
    snippet: string | null;
    importance: "high" | "medium" | "low" | null;
    tags: string[];
    lang: string | null;
    hash: string | null;
    digest_date: string | null; // Date when included in a digest
    created_at: string;
}

/**
 * News Item with Tool info (for joined queries)
 */
export interface NewsItemWithTool extends NewsItem {
    tool_name: string;
}

/**
 * Input type for inserting news items (without auto-generated fields)
 */
export interface NewsItemInput {
    tool_id: string;
    title: string;
    url: string;
    published_at?: string | null;
    raw_content?: string | null;
    snippet?: string | null;
    importance?: "high" | "medium" | "low" | null;
    tags?: string[];
    lang?: string | null;
    hash?: string | null;
}

/**
 * Daily Digest entity
 * Represents a daily summary of AI news
 */
export interface DailyDigest {
    id: number;
    date: string;
    summary_md: string;
    summary_md_ru: string | null;
    summary_short: string | null;
    tools_list: string[];
    created_at: string;
}

/**
 * Input type for saving daily digest (without auto-generated fields)
 */
export interface DailyDigestInput {
    date: string;
    summary_md: string;
    summary_md_ru?: string | null;
    summary_short?: string | null;
    tools_list?: string[];
}

/**
 * Parsed news item from fetcher (before saving to DB)
 */
export interface ParsedNewsItem {
    title: string;
    url: string;
    publishedAt: Date | null;
    rawContent: string;
    snippet?: string;
}

/**
 * Database schema type for Supabase client
 * This provides type safety for all database operations
 */
export interface Database {
    public: {
        Tables: {
            tools: {
                Row: Tool;
                Insert: Omit<Tool, "created_at" | "updated_at"> & {
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Omit<Tool, "id">>;
            };
            news_items: {
                Row: NewsItem;
                Insert: {
                    tool_id: string;
                    title: string;
                    url: string;
                    published_at?: string | null;
                    raw_content?: string | null;
                    snippet?: string | null;
                    importance?: "high" | "medium" | "low" | null;
                    tags?: string[];
                    lang?: string | null;
                    hash?: string | null;
                    id?: number;
                    created_at?: string;
                };
                Update: Partial<Omit<NewsItem, "id">>;
            };
            daily_digest: {
                Row: DailyDigest;
                Insert: {
                    date: string;
                    summary_md: string;
                    summary_short?: string | null;
                    tools_list?: string[];
                    id?: number;
                    created_at?: string;
                };
                Update: Partial<Omit<DailyDigest, "id">>;
            };
        };
    };
}

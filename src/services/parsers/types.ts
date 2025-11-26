import type { ParsedNewsItem, Tool } from "../../db/types.js";

/**
 * Parser interface that all news source parsers must implement
 */
export interface NewsParser {
    /**
     * Name of the parser for logging
     */
    name: string;

    /**
     * Check if this parser can handle the given URL
     */
    canParse(url: string): boolean;

    /**
     * Parse news from the given URL
     */
    parse(url: string, tool: Tool, since: Date): Promise<ParsedNewsItem[]>;
}

/**
 * Result of fetching a URL
 */
export interface FetchResult {
    ok: boolean;
    contentType: string;
    text: string;
    error?: string;
}

/**
 * Common date patterns found in blog posts
 */
export const DATE_PATTERNS = {
    // ISO format: 2024-01-15
    ISO: /\d{4}-\d{2}-\d{2}/,
    // US format: January 15, 2024 or Jan 15, 2024
    US_LONG:
        /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i,
    // EU format: 15 January 2024
    EU_LONG:
        /\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
};

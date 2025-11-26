import type { Tool, ParsedNewsItem } from "../db/types.js";
import { findParser, getAllParsers } from "./parsers/index.js";

/**
 * Fetch news for a specific AI tool
 *
 * This function:
 * 1. Checks if the tool has a news_url configured
 * 2. Finds the best parser for that URL
 * 3. Fetches and parses the news
 * 4. Filters by publish date
 *
 * @param tool The tool to fetch news for
 * @param since Fetch news published after this date
 * @returns Array of parsed news items
 */
export async function fetchToolNews(
    tool: Tool,
    since: Date
): Promise<ParsedNewsItem[]> {
    console.log(
        `[fetchToolNews] Fetching news for ${tool.name} since ${since.toISOString()}`
    );

    // Check if tool has a news URL
    if (!tool.news_url) {
        console.log(`[fetchToolNews] No news_url configured for ${tool.name}`);
        return [];
    }

    try {
        // Find the best parser for this URL
        const parser = findParser(tool.news_url);
        console.log(`[fetchToolNews] Using parser: ${parser.name}`);

        // Parse the news
        const news = await parser.parse(tool.news_url, tool, since);

        console.log(
            `[fetchToolNews] Found ${news.length} news items for ${tool.name}`
        );
        return news;
    } catch (error) {
        console.error(
            `[fetchToolNews] Error fetching news for ${tool.name}:`,
            error instanceof Error ? error.message : error
        );
        return [];
    }
}

/**
 * Fetch news using multiple parsers as fallback
 * If the primary parser fails or returns no results, try alternatives
 */
export async function fetchToolNewsWithFallback(
    tool: Tool,
    since: Date
): Promise<ParsedNewsItem[]> {
    if (!tool.news_url) {
        return [];
    }

    const parsers = getAllParsers();

    for (const parser of parsers) {
        if (!parser.canParse(tool.news_url)) {
            continue;
        }

        try {
            console.log(
                `[fetchToolNews] Trying parser: ${parser.name} for ${tool.name}`
            );
            const news = await parser.parse(tool.news_url, tool, since);

            if (news.length > 0) {
                console.log(
                    `[fetchToolNews] Success with ${parser.name}: ${news.length} items`
                );
                return news;
            }
        } catch (error) {
            console.error(
                `[fetchToolNews] Parser ${parser.name} failed:`,
                error instanceof Error ? error.message : error
            );
            // Continue to next parser
        }
    }

    console.log(`[fetchToolNews] No parsers returned results for ${tool.name}`);
    return [];
}

/**
 * Check if a tool's news URL is reachable and parseable
 * Useful for validation and debugging
 */
export async function validateToolNewsUrl(
    tool: Tool
): Promise<{ valid: boolean; parser: string; error?: string }> {
    if (!tool.news_url) {
        return { valid: false, parser: "", error: "No news_url configured" };
    }

    const parser = findParser(tool.news_url);

    try {
        const news = await parser.parse(tool.news_url, tool, new Date(0)); // Get all news
        return {
            valid: news.length > 0,
            parser: parser.name,
            error: news.length === 0 ? "No articles found" : undefined,
        };
    } catch (error) {
        return {
            valid: false,
            parser: parser.name,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

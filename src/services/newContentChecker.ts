import type { Tool, ParsedNewsItem } from "../db/types.js";
import { updateToolLastParsedUrl } from "../db/queries/tools.js";
import { findParser } from "./parsers/index.js";

/**
 * Result of checking for new content
 */
export interface NewContentCheckResult {
    hasNewContent: boolean;
    newItems: ParsedNewsItem[];
    latestUrl: string | null;
    previousUrl: string | null;
}

/**
 * Check if a tool has new content by comparing the latest parsed URL
 * with what we have stored in the database.
 *
 * This approach is more reliable than date-based checking because:
 * 1. Some sites don't have proper dates on articles
 * 2. Dates can be in different formats/timezones
 * 3. We want to detect ANY new content, not just recent dated content
 *
 * @param tool The tool to check for new content
 * @returns Object with new items and metadata
 */
export async function checkForNewContent(
    tool: Tool
): Promise<NewContentCheckResult> {
    console.log(`[newContentChecker] Checking for new content: ${tool.name}`);

    if (!tool.news_url) {
        console.log(
            `[newContentChecker] No news_url configured for ${tool.name}`
        );
        return {
            hasNewContent: false,
            newItems: [],
            latestUrl: null,
            previousUrl: tool.last_parsed_url,
        };
    }

    try {
        // Find the best parser for this URL
        const parser = findParser(tool.news_url);
        console.log(`[newContentChecker] Using parser: ${parser.name}`);

        // Parse all available news (without date filter)
        // We use a very old date to get all items
        const allNews = await parser.parse(
            tool.news_url,
            tool,
            new Date(0) // Get all available items
        );

        if (allNews.length === 0) {
            console.log(`[newContentChecker] No news found for ${tool.name}`);
            return {
                hasNewContent: false,
                newItems: [],
                latestUrl: null,
                previousUrl: tool.last_parsed_url,
            };
        }

        // Sort by URL or date to get consistent ordering (newest first)
        // Most parsers already return items in reverse chronological order
        const latestItem = allNews[0];
        const latestUrl = latestItem.url;

        console.log(`[newContentChecker] Latest URL: ${latestUrl}`);
        console.log(
            `[newContentChecker] Previous URL: ${tool.last_parsed_url ?? "none"}`
        );

        // If this is the first time parsing, or if the latest URL is different
        if (!tool.last_parsed_url) {
            console.log(
                `[newContentChecker] First time parsing ${tool.name}, returning latest item only`
            );
            // First time - just return the latest item to avoid flooding
            return {
                hasNewContent: true,
                newItems: [latestItem],
                latestUrl,
                previousUrl: null,
            };
        }

        if (latestUrl === tool.last_parsed_url) {
            console.log(
                `[newContentChecker] No new content for ${tool.name} (URL unchanged)`
            );
            return {
                hasNewContent: false,
                newItems: [],
                latestUrl,
                previousUrl: tool.last_parsed_url,
            };
        }

        // Find all new items (items before the last parsed URL)
        const newItems: ParsedNewsItem[] = [];
        for (const item of allNews) {
            if (item.url === tool.last_parsed_url) {
                // We've reached the last known item, stop here
                break;
            }
            newItems.push(item);
        }

        console.log(
            `[newContentChecker] Found ${newItems.length} new items for ${tool.name}`
        );

        return {
            hasNewContent: newItems.length > 0,
            newItems,
            latestUrl,
            previousUrl: tool.last_parsed_url,
        };
    } catch (error) {
        console.error(
            `[newContentChecker] Error checking ${tool.name}:`,
            error instanceof Error ? error.message : error
        );
        return {
            hasNewContent: false,
            newItems: [],
            latestUrl: null,
            previousUrl: tool.last_parsed_url,
        };
    }
}

/**
 * Check for new content and update the last parsed URL in the database
 *
 * @param tool The tool to check
 * @param updateDb Whether to update the database with the new URL (default: true)
 * @returns Check result
 */
export async function checkAndUpdateLastParsed(
    tool: Tool,
    updateDb: boolean = true
): Promise<NewContentCheckResult> {
    const result = await checkForNewContent(tool);

    // Update the last parsed URL in the database if we found new content
    if (updateDb && result.hasNewContent && result.latestUrl) {
        await updateToolLastParsedUrl(tool.id, result.latestUrl);
    }

    return result;
}

/**
 * Fetch only new news items for a tool (items that appeared since last check)
 * This is a drop-in replacement for fetchToolNews that uses URL-based detection
 *
 * @param tool The tool to fetch news for
 * @param updateLastParsed Whether to update the last_parsed_url after fetching
 * @returns Array of new parsed news items
 */
export async function fetchNewToolNews(
    tool: Tool,
    updateLastParsed: boolean = true
): Promise<ParsedNewsItem[]> {
    const result = await checkAndUpdateLastParsed(tool, updateLastParsed);
    return result.newItems;
}

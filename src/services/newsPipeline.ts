import { createHash } from "crypto";
import { getActiveTools } from "../db/queries/tools.js";
import { insertNewsItems } from "../db/queries/newsItems.js";
import { fetchToolNews } from "./fetchToolNews.js";
import { formatDateISO, getDaysAgo } from "../utils/dates.js";
import type { Tool, NewsItemInput, ParsedNewsItem } from "../db/types.js";

/**
 * Result of running the daily digest pipeline
 */
export interface PipelineResult {
    ok: boolean;
    totalNews: number;
    toolsProcessed: number;
    errors: string[];
}

/**
 * Run the daily digest pipeline
 *
 * This pipeline:
 * 1. Fetches all active AI tools from the database
 * 2. For each tool, fetches recent news from their news sources
 * 3. Transforms and deduplicates news items
 * 4. Inserts new items into the database
 *
 * Note: LLM classification and digest generation are not yet implemented
 *
 * @param date The date to run the pipeline for (typically today)
 * @returns Pipeline result with statistics
 */
export async function runDailyDigestPipeline(
    date: Date
): Promise<PipelineResult> {
    const dateStr = formatDateISO(date);
    console.log(`\n========================================`);
    console.log(`[pipeline] Starting daily digest pipeline for ${dateStr}`);
    console.log(`========================================\n`);

    const errors: string[] = [];
    let totalNewsCount = 0;
    let toolsProcessed = 0;

    try {
        // Step 1: Get all active tools
        console.log("[pipeline] Step 1: Fetching active tools...");
        const tools = await getActiveTools();

        if (tools.length === 0) {
            console.log("[pipeline] No active tools found. Exiting.");
            return {
                ok: true,
                totalNews: 0,
                toolsProcessed: 0,
                errors: [],
            };
        }

        console.log(
            `[pipeline] Found ${tools.length} active tools to process\n`
        );

        // Step 2: Fetch news for each tool
        console.log("[pipeline] Step 2: Fetching news for each tool...");

        // Look for news from the last 24 hours (or yesterday if run in the morning)
        const sinceDate = getDaysAgo(1);

        const allNewsItems: NewsItemInput[] = [];

        for (const tool of tools) {
            try {
                console.log(
                    `\n[pipeline] Processing: ${tool.name} (${tool.id})`
                );

                const parsedNews = await fetchToolNews(tool, sinceDate);

                if (parsedNews.length === 0) {
                    console.log(`[pipeline] No news found for ${tool.name}`);
                    continue;
                }

                // Transform parsed news to database format
                const newsItems = transformNewsItems(parsedNews, tool);
                allNewsItems.push(...newsItems);

                totalNewsCount += newsItems.length;
                toolsProcessed++;

                console.log(
                    `[pipeline] Found ${newsItems.length} news items for ${tool.name}`
                );
            } catch (error) {
                const errorMsg = `Error processing ${tool.name}: ${error instanceof Error ? error.message : String(error)}`;
                console.error(`[pipeline] ${errorMsg}`);
                errors.push(errorMsg);
                // Continue processing other tools
            }
        }

        // Step 3: Insert all news items into the database
        console.log(
            `\n[pipeline] Step 3: Inserting ${allNewsItems.length} news items into database...`
        );

        if (allNewsItems.length > 0) {
            await insertNewsItems(allNewsItems);
            console.log("[pipeline] News items inserted successfully");
        }

        // Step 4: TODO - LLM classification (not implemented)
        console.log(
            "\n[pipeline] Step 4: LLM classification - NOT IMPLEMENTED (placeholder)"
        );

        // Step 5: TODO - Generate daily digest (not implemented)
        console.log(
            "[pipeline] Step 5: Generate digest - NOT IMPLEMENTED (placeholder)"
        );

        console.log(`\n========================================`);
        console.log(`[pipeline] Pipeline completed successfully`);
        console.log(`[pipeline] Total news items: ${totalNewsCount}`);
        console.log(
            `[pipeline] Tools processed: ${toolsProcessed}/${tools.length}`
        );
        console.log(`[pipeline] Errors: ${errors.length}`);
        console.log(`========================================\n`);

        return {
            ok: true,
            totalNews: totalNewsCount,
            toolsProcessed,
            errors,
        };
    } catch (error) {
        const errorMsg = `Pipeline fatal error: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[pipeline] ${errorMsg}`);

        if (error instanceof Error && error.stack) {
            console.error("[pipeline] Stack trace:", error.stack);
        }

        return {
            ok: false,
            totalNews: totalNewsCount,
            toolsProcessed,
            errors: [...errors, errorMsg],
        };
    }
}

/**
 * Transform parsed news items to database format
 * Adds tool_id, lang, hash and other required fields
 */
function transformNewsItems(
    parsedNews: ParsedNewsItem[],
    tool: Tool
): NewsItemInput[] {
    return parsedNews.map((item) => {
        // Generate a unique hash based on URL and title for deduplication
        const hash = generateHash(`${item.url}|${item.title}`);

        return {
            tool_id: tool.id,
            title: item.title,
            url: item.url,
            published_at: item.publishedAt?.toISOString() ?? null,
            raw_content: item.rawContent,
            snippet: item.snippet ?? item.rawContent.substring(0, 200),
            importance: null, // Will be set by LLM classifier later
            tags: [],
            lang: tool.lang,
            hash,
        };
    });
}

/**
 * Generate a SHA-256 hash for deduplication
 */
function generateHash(input: string): string {
    return createHash("sha256").update(input).digest("hex").substring(0, 32);
}

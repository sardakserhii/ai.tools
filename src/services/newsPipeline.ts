import { createHash } from "crypto";
import { getActiveTools } from "../db/queries/tools.js";
import { insertNewsItems, getTodayNews } from "../db/queries/newsItems.js";
import { saveDailyDigest, getDailyDigest } from "../db/queries/dailyDigest.js";
import { fetchToolNews } from "./fetchToolNews.js";
import { generateDailyDigest } from "./digestGenerator.js";
import { formatDateISO, getDaysAgo } from "../utils/dates.js";
import type { Tool, NewsItemInput, ParsedNewsItem } from "../db/types.js";

/**
 * Result of running the daily digest pipeline
 */
export interface PipelineResult {
    ok: boolean;
    totalNews: number;
    toolsProcessed: number;
    digestGenerated: boolean;
    digestFromCache: boolean;
    errors: string[];
}

/**
 * Pipeline options
 */
export interface PipelineOptions {
    /** Date to generate digest for (default: yesterday) */
    targetDate?: Date;
    /** Force regenerate digest even if exists (default: false) */
    forceRegenerate?: boolean;
    /** Skip news fetching, only generate digest (default: false) */
    skipNewsFetch?: boolean;
}

/**
 * Result of news fetching step
 */
interface FetchNewsResult {
    totalNews: number;
    toolsProcessed: number;
    errors: string[];
}

/**
 * Fetch news from all active tools and insert into database
 */
async function fetchAndInsertNews(
    targetDateStr: string
): Promise<FetchNewsResult> {
    const errors: string[] = [];
    let totalNewsCount = 0;
    let toolsProcessed = 0;

    // Get all active tools
    console.log("[pipeline] Fetching active tools...");
    const tools = await getActiveTools();

    if (tools.length === 0) {
        console.log("[pipeline] No active tools found.");
        return { totalNews: 0, toolsProcessed: 0, errors: [] };
    }

    console.log(`[pipeline] Found ${tools.length} active tools to process\n`);

    // Fetch news for each tool
    console.log("[pipeline] Fetching news for each tool...");

    // Look for news from the last 48 hours to ensure we don't miss anything
    const sinceDate = getDaysAgo(2);

    const allNewsItems: NewsItemInput[] = [];

    for (const tool of tools) {
        try {
            console.log(`\n[pipeline] Processing: ${tool.name} (${tool.id})`);

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

    // Insert all news items into the database
    console.log(
        `\n[pipeline] Inserting ${allNewsItems.length} news items into database...`
    );

    if (allNewsItems.length > 0) {
        await insertNewsItems(allNewsItems);
        console.log("[pipeline] News items inserted successfully");
    }

    return {
        totalNews: totalNewsCount,
        toolsProcessed,
        errors,
    };
}

/**
 * Run the daily digest pipeline
 *
 * This pipeline:
 * 1. Checks if digest already exists for target date (skip LLM if exists)
 * 2. Fetches all active AI tools from the database
 * 3. For each tool, fetches recent news from their news sources
 * 4. Transforms and deduplicates news items
 * 5. Inserts new items into the database
 * 6. Generates digest via LLM (only if not exists or forced)
 *
 * Default behavior: processes news for YESTERDAY (run in the morning)
 *
 * @param options Pipeline options
 * @returns Pipeline result with statistics
 */
export async function runDailyDigestPipeline(
    options: PipelineOptions = {}
): Promise<PipelineResult> {
    const {
        targetDate = getDaysAgo(1), // Default: yesterday
        forceRegenerate = false,
        skipNewsFetch = false,
    } = options;

    const dateStr = formatDateISO(targetDate);
    console.log(`\n========================================`);
    console.log(`[pipeline] Starting daily digest pipeline`);
    console.log(`[pipeline] Target date: ${dateStr}`);
    console.log(`[pipeline] Force regenerate: ${forceRegenerate}`);
    console.log(`[pipeline] Skip news fetch: ${skipNewsFetch}`);
    console.log(`========================================\n`);

    const errors: string[] = [];
    let totalNewsCount = 0;
    let toolsProcessed = 0;
    let digestGenerated = false;
    let digestFromCache = false;

    try {
        // Step 1: Check if digest already exists
        console.log("[pipeline] Step 1: Checking for existing digest...");
        const existingDigest = await getDailyDigest(dateStr);

        if (existingDigest && !forceRegenerate) {
            console.log(
                `[pipeline] ✅ Digest already exists for ${dateStr}. Skipping LLM call.`
            );
            digestFromCache = true;

            // Still fetch news to keep database updated, but skip digest generation
            if (!skipNewsFetch) {
                console.log(
                    "\n[pipeline] Step 2: Fetching news (updating database)..."
                );
                const result = await fetchAndInsertNews(dateStr);
                totalNewsCount = result.totalNews;
                toolsProcessed = result.toolsProcessed;
                errors.push(...result.errors);
            }

            console.log(`\n========================================`);
            console.log(`[pipeline] Pipeline completed (digest from cache)`);
            console.log(`[pipeline] Target date: ${dateStr}`);
            console.log(`[pipeline] News items fetched: ${totalNewsCount}`);
            console.log(`[pipeline] Digest generated: false (using cached)`);
            console.log(`========================================\n`);

            return {
                ok: true,
                totalNews: totalNewsCount,
                toolsProcessed,
                digestGenerated: false,
                digestFromCache: true,
                errors,
            };
        }

        if (existingDigest && forceRegenerate) {
            console.log(
                `[pipeline] ⚠️ Digest exists but force regenerate is enabled`
            );
        } else {
            console.log(`[pipeline] No existing digest found for ${dateStr}`);
        }

        // Step 2: Fetch and insert news
        if (!skipNewsFetch) {
            console.log("\n[pipeline] Step 2: Fetching and inserting news...");
            const result = await fetchAndInsertNews(dateStr);
            totalNewsCount = result.totalNews;
            toolsProcessed = result.toolsProcessed;
            errors.push(...result.errors);
        } else {
            console.log(
                "\n[pipeline] Step 2: Skipping news fetch (skipNewsFetch=true)"
            );
        }

        // Step 3: Generate daily digest using LLM
        console.log("\n[pipeline] Step 3: Generating daily digest via LLM...");

        const newsForDigest = await getTodayNews(dateStr);

        if (newsForDigest.length > 0) {
            console.log(
                `[pipeline] Found ${newsForDigest.length} news items for digest generation`
            );

            // Generate digest using LLM
            const digest = await generateDailyDigest(newsForDigest, dateStr);

            // Save digest to database
            await saveDailyDigest({
                date: dateStr,
                summaryMd: digest.summaryMd,
                summaryShort: digest.summaryShort,
                toolsList: digest.toolsList,
            });

            digestGenerated = true;
            console.log("[pipeline] ✅ Daily digest generated and saved");
        } else {
            console.log(
                "[pipeline] ⚠️ No news items available for digest generation"
            );
        }

        console.log(`\n========================================`);
        console.log(`[pipeline] Pipeline completed successfully`);
        console.log(`[pipeline] Target date: ${dateStr}`);
        console.log(`[pipeline] Total news items: ${totalNewsCount}`);
        console.log(`[pipeline] Digest generated: ${digestGenerated}`);
        console.log(`[pipeline] Errors: ${errors.length}`);
        console.log(`========================================\n`);

        return {
            ok: true,
            totalNews: totalNewsCount,
            toolsProcessed,
            digestGenerated,
            digestFromCache,
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
            digestGenerated,
            digestFromCache,
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

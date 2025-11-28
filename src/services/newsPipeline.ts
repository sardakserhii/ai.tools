import { createHash } from "crypto";
import { getActiveTools } from "../db/queries/tools.js";
import {
    insertNewsItems,
    getTodayNews,
    getNewsForDigest,
    markNewsAsDigested,
} from "../db/queries/newsItems.js";
import { saveDailyDigest, getDailyDigest } from "../db/queries/dailyDigest.js";
import { fetchToolNews } from "./fetchToolNews.js";
import { fetchNewToolNews } from "./newContentChecker.js";
import { generateDailyDigest } from "./digestGenerator.js";
import { publishToTelegram } from "./telegramPublisher.js";
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
    telegramPublished: boolean;
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
    /** Publish digest to Telegram (default: false) */
    publishToTelegram?: boolean;
    /** Use rolling window mode instead of single date (default: false) */
    useRollingWindow?: boolean;
    /** Days to look back for recent news in rolling mode (default: 3) */
    recentDays?: number;
    /** Use URL-based new content detection instead of date filtering (default: true) */
    useUrlBasedDetection?: boolean;
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
 * Uses URL-based detection to find new content (compares with last_parsed_url)
 */
async function fetchAndInsertNews(
    _targetDateStr: string,
    useUrlBasedDetection: boolean = true
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

    console.log(`[pipeline] Found ${tools.length} active tools to process`);
    console.log(
        `[pipeline] Detection mode: ${useUrlBasedDetection ? "URL-based (new content)" : "Date-based (legacy)"}\n`
    );

    const allNewsItems: NewsItemInput[] = [];

    for (const tool of tools) {
        try {
            console.log(`\n[pipeline] Processing: ${tool.name} (${tool.id})`);

            let parsedNews: ParsedNewsItem[];

            if (useUrlBasedDetection) {
                // New URL-based detection: only fetch items newer than last_parsed_url
                parsedNews = await fetchNewToolNews(tool, true);
            } else {
                // Legacy date-based filtering
                const sinceDate = getDaysAgo(7);
                parsedNews = await fetchToolNews(tool, sinceDate);
            }

            if (parsedNews.length === 0) {
                console.log(`[pipeline] No new content for ${tool.name}`);
                continue;
            }

            // Transform parsed news to database format
            const newsItems = transformNewsItems(parsedNews, tool);
            allNewsItems.push(...newsItems);

            totalNewsCount += newsItems.length;
            toolsProcessed++;

            console.log(
                `[pipeline] Found ${newsItems.length} NEW items for ${tool.name}`
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
        publishToTelegram: shouldPublish = false,
        useUrlBasedDetection = true, // Default to new URL-based detection
    } = options;

    const dateStr = formatDateISO(targetDate);
    console.log(`\n========================================`);
    console.log(`[pipeline] Starting daily digest pipeline`);
    console.log(`[pipeline] Target date: ${dateStr}`);
    console.log(`[pipeline] Force regenerate: ${forceRegenerate}`);
    console.log(`[pipeline] Skip news fetch: ${skipNewsFetch}`);
    console.log(`[pipeline] Publish to Telegram: ${shouldPublish}`);
    console.log(`[pipeline] URL-based detection: ${useUrlBasedDetection}`);
    console.log(`========================================\n`);

    const errors: string[] = [];
    let totalNewsCount = 0;
    let toolsProcessed = 0;
    let digestGenerated = false;
    let digestFromCache = false;
    let telegramPublished = false;

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
                const result = await fetchAndInsertNews(
                    dateStr,
                    useUrlBasedDetection
                );
                totalNewsCount = result.totalNews;
                toolsProcessed = result.toolsProcessed;
                errors.push(...result.errors);
            }

            // Publish cached digest to Telegram
            const digestToPublish = existingDigest.summary_md;
            if (shouldPublish && digestToPublish) {
                console.log(
                    "\n[pipeline] Step 3: Publishing cached digest to Telegram..."
                );
                const telegramResult = await publishToTelegram(
                    digestToPublish,
                    dateStr
                );
                if (telegramResult.success) {
                    telegramPublished = true;
                    console.log("[pipeline] ✅ Digest published to Telegram");
                } else {
                    errors.push(
                        `Telegram publish error: ${telegramResult.error}`
                    );
                    console.log(
                        `[pipeline] ⚠️ Failed to publish to Telegram: ${telegramResult.error}`
                    );
                }
            }

            console.log(`\n========================================`);
            console.log(`[pipeline] Pipeline completed (digest from cache)`);
            console.log(`[pipeline] Target date: ${dateStr}`);
            console.log(`[pipeline] News items fetched: ${totalNewsCount}`);
            console.log(`[pipeline] Digest generated: false (using cached)`);
            console.log(`[pipeline] Telegram published: ${telegramPublished}`);
            console.log(`========================================\n`);

            return {
                ok: true,
                totalNews: totalNewsCount,
                toolsProcessed,
                digestGenerated: false,
                digestFromCache: true,
                telegramPublished,
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
            const result = await fetchAndInsertNews(
                dateStr,
                useUrlBasedDetection
            );
            totalNewsCount = result.totalNews;
            toolsProcessed = result.toolsProcessed;
            errors.push(...result.errors);
        } else {
            console.log(
                "\n[pipeline] Step 2: Skipping news fetch (skipNewsFetch=true)"
            );
        }

        console.log("\n[pipeline] Step 3: Generating daily digest via LLM...");

        const newsForDigest = await getTodayNews(dateStr);
        let generatedSummary: string | null = null;

        if (newsForDigest.length > 0) {
            console.log(
                `[pipeline] Found ${newsForDigest.length} news items for digest generation`
            );

            // Generate digest using LLM
            const digest = await generateDailyDigest(newsForDigest, dateStr);
            generatedSummary = digest.summaryMd;

            // Save digest to database
            await saveDailyDigest({
                date: dateStr,
                summaryMd: digest.summaryMd,
                summaryMdRu: digest.summaryMdRu,
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

        // Step 4: Publish to Telegram if requested
        if (shouldPublish && generatedSummary) {
            console.log(
                "\n[pipeline] Step 4: Publishing digest to Telegram..."
            );
            const telegramResult = await publishToTelegram(
                generatedSummary,
                dateStr
            );
            if (telegramResult.success) {
                telegramPublished = true;
                console.log("[pipeline] ✅ Digest published to Telegram");
            } else {
                errors.push(`Telegram publish error: ${telegramResult.error}`);
                console.log(
                    `[pipeline] ⚠️ Failed to publish to Telegram: ${telegramResult.error}`
                );
            }
        }

        console.log(`\n========================================`);
        console.log(`[pipeline] Pipeline completed successfully`);
        console.log(`[pipeline] Target date: ${dateStr}`);
        console.log(`[pipeline] Total news items: ${totalNewsCount}`);
        console.log(`[pipeline] Digest generated: ${digestGenerated}`);
        console.log(`[pipeline] Telegram published: ${telegramPublished}`);
        console.log(`[pipeline] Errors: ${errors.length}`);
        console.log(`========================================\n`);

        return {
            ok: true,
            totalNews: totalNewsCount,
            toolsProcessed,
            digestGenerated,
            digestFromCache,
            telegramPublished,
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
            telegramPublished,
            errors: [...errors, errorMsg],
        };
    }
}

/**
 * Rolling window digest result
 */
export interface RollingDigestResult {
    ok: boolean;
    recentNewsCount: number;
    missedNewsCount: number;
    digestGenerated: boolean;
    telegramPublished: boolean;
    newsMarkedAsDigested: number;
    errors: string[];
}

/**
 * Run the rolling window digest pipeline
 *
 * This is the recommended production mode that:
 * 1. Collects news from the last N days that haven't been included in any digest
 * 2. Optionally includes "missed" high-importance news from earlier
 * 3. Generates a combined digest with both sections
 * 4. Marks all included news as processed
 *
 * Benefits:
 * - No news gets lost if pipeline fails one day
 * - Important news resurfaces if missed initially
 * - Handles irregular publishing schedules
 *
 * @param options Pipeline configuration
 */
export async function runRollingDigestPipeline(
    options: {
        /** Days to look back for recent news (default: 3) */
        recentDays?: number;
        /** Days to look back for missed important news (default: 7) */
        missedDays?: number;
        /** Fetch fresh news before generating digest (default: true) */
        fetchNews?: boolean;
        /** Publish to Telegram (default: false) */
        publishToTelegram?: boolean;
        /** Skip marking news as digested (for testing) */
        dryRun?: boolean;
        /** Use URL-based new content detection (default: true) */
        useUrlBasedDetection?: boolean;
    } = {}
): Promise<RollingDigestResult> {
    const {
        recentDays = 3,
        missedDays = 7,
        fetchNews = true,
        publishToTelegram: shouldPublish = false,
        dryRun = false,
        useUrlBasedDetection = true,
    } = options;

    const errors: string[] = [];
    const today = formatDateISO(new Date());
    let telegramPublished = false;
    let newsMarkedAsDigested = 0;

    console.log(`\n========================================`);
    console.log(`[pipeline] Starting ROLLING WINDOW digest pipeline`);
    console.log(`[pipeline] Date: ${today}`);
    console.log(`[pipeline] Recent window: ${recentDays} days`);
    console.log(`[pipeline] Missed window: ${missedDays} days`);
    console.log(`[pipeline] Dry run: ${dryRun}`);
    console.log(`[pipeline] URL-based detection: ${useUrlBasedDetection}`);
    console.log(`========================================\n`);

    try {
        // Step 1: Optionally fetch fresh news
        if (fetchNews) {
            console.log("[pipeline] Step 1: Fetching fresh news...");
            const fetchResult = await fetchAndInsertNews(
                today,
                useUrlBasedDetection
            );
            console.log(
                `[pipeline] Fetched ${fetchResult.totalNews} news items`
            );
            errors.push(...fetchResult.errors);
        } else {
            console.log("[pipeline] Step 1: Skipping news fetch");
        }

        // Step 2: Get unprocessed news using rolling window
        console.log("\n[pipeline] Step 2: Gathering unprocessed news...");
        const { recentNews, missedNews } = await getNewsForDigest({
            recentDays,
            missedDays,
            includeUndated: true,
            missedImportance: ["high"],
        });

        const totalNews = recentNews.length + missedNews.length;
        console.log(`[pipeline] Recent news: ${recentNews.length}`);
        console.log(`[pipeline] Missed important news: ${missedNews.length}`);

        if (totalNews === 0) {
            console.log("[pipeline] ⚠️ No unprocessed news found");
            return {
                ok: true,
                recentNewsCount: 0,
                missedNewsCount: 0,
                digestGenerated: false,
                telegramPublished: false,
                newsMarkedAsDigested: 0,
                errors,
            };
        }

        // Step 3: Generate digest with both sections
        console.log("\n[pipeline] Step 3: Generating digest...");

        // Combine for digest generation (recent first, then missed)
        const allNewsForDigest = [...recentNews, ...missedNews];
        const digest = await generateDailyDigest(allNewsForDigest, today, {
            includeMissedSection: missedNews.length > 0,
            missedNewsCount: missedNews.length,
        });

        // Save digest
        await saveDailyDigest({
            date: today,
            summaryMd: digest.summaryMd,
            summaryMdRu: digest.summaryMdRu,
            summaryShort: digest.summaryShort,
            toolsList: digest.toolsList,
        });
        console.log("[pipeline] ✅ Digest saved to database");

        // Step 4: Mark news as digested
        if (!dryRun) {
            const allNewsIds = allNewsForDigest.map((n) => n.id);
            await markNewsAsDigested(allNewsIds, today);
            newsMarkedAsDigested = allNewsIds.length;
            console.log(
                `[pipeline] ✅ Marked ${newsMarkedAsDigested} news items as digested`
            );
        } else {
            console.log("[pipeline] ⏭️ Dry run - skipping digest marking");
        }

        // Step 5: Publish to Telegram
        if (shouldPublish && digest.summaryMd) {
            console.log("\n[pipeline] Step 5: Publishing to Telegram...");
            const telegramResult = await publishToTelegram(
                digest.summaryMd,
                today
            );
            if (telegramResult.success) {
                telegramPublished = true;
                console.log("[pipeline] ✅ Published to Telegram");
            } else {
                errors.push(`Telegram: ${telegramResult.error}`);
            }
        }

        console.log(`\n========================================`);
        console.log(`[pipeline] Rolling digest completed successfully`);
        console.log(`[pipeline] Recent news: ${recentNews.length}`);
        console.log(`[pipeline] Missed news: ${missedNews.length}`);
        console.log(`[pipeline] News marked: ${newsMarkedAsDigested}`);
        console.log(`[pipeline] Telegram: ${telegramPublished}`);
        console.log(`========================================\n`);

        return {
            ok: true,
            recentNewsCount: recentNews.length,
            missedNewsCount: missedNews.length,
            digestGenerated: true,
            telegramPublished,
            newsMarkedAsDigested,
            errors,
        };
    } catch (error) {
        const errorMsg = `Rolling pipeline error: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[pipeline] ${errorMsg}`);
        errors.push(errorMsg);

        return {
            ok: false,
            recentNewsCount: 0,
            missedNewsCount: 0,
            digestGenerated: false,
            telegramPublished: false,
            newsMarkedAsDigested: 0,
            errors,
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

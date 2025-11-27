import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runDailyDigestPipeline } from "../src/services/newsPipeline.js";
import { formatDateISO } from "../src/utils/dates.js";

/**
 * Vercel Serverless Function: Run Daily Digest Pipeline
 *
 * This endpoint triggers the daily news aggregation pipeline.
 * It can be called manually or scheduled via Vercel Cron Jobs.
 *
 * Schedule: Runs daily at 06:00 UTC (configured in vercel.json)
 *
 * Date handling:
 * - Uses UTC timezone for consistency across deployments
 * - The pipeline processes news from the last 24 hours (yesterday)
 * - If digest already exists for the date, it returns from cache
 *
 * Query parameters:
 * - force=true: Force regenerate digest even if it already exists
 * - date=YYYY-MM-DD: Process specific date instead of yesterday
 * - telegram=true: Publish digest to Telegram after generation
 *
 * @param req Vercel request object
 * @param res Vercel response object
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    // Only allow GET and POST requests
    if (req.method !== "GET" && req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Method not allowed" });
        return;
    }

    console.log("[api] run-daily-digest endpoint called");
    console.log(`[api] Method: ${req.method}`);
    console.log(`[api] Time: ${new Date().toISOString()}`);

    try {
        // Parse query parameters
        const forceRegenerate = req.query.force === "true";
        const publishTelegram = req.query.telegram === "true";
        const dateParam = req.query.date as string | undefined;

        let targetDate: Date | undefined;
        if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
            targetDate = new Date(dateParam);
        }

        const now = new Date();
        const dateStr = targetDate
            ? formatDateISO(targetDate)
            : formatDateISO(new Date(now.getTime() - 24 * 60 * 60 * 1000)); // yesterday

        console.log(`[api] Running pipeline for date: ${dateStr} (UTC)`);
        console.log(`[api] Force regenerate: ${forceRegenerate}`);
        console.log(`[api] Publish to Telegram: ${publishTelegram}`);

        // Run the pipeline
        const result = await runDailyDigestPipeline({
            targetDate,
            forceRegenerate,
            publishToTelegram: publishTelegram,
        });

        // Return success response
        res.status(200).json({
            ok: result.ok,
            totalNews: result.totalNews,
            toolsProcessed: result.toolsProcessed,
            digestGenerated: result.digestGenerated,
            digestFromCache: result.digestFromCache,
            telegramPublished: result.telegramPublished,
            date: dateStr,
            timestamp: now.toISOString(),
            errors: result.errors.length > 0 ? result.errors : undefined,
        });
    } catch (error) {
        // Log the full error for debugging
        console.error("[api] Pipeline error:", error);

        if (error instanceof Error && error.stack) {
            console.error("[api] Stack trace:", error.stack);
        }

        // Return error response
        res.status(500).json({
            ok: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
            timestamp: new Date().toISOString(),
        });
    }
}

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
 * - The pipeline processes news from the last 24 hours
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
        // Use current UTC date for the pipeline
        // Note: Using UTC ensures consistency regardless of deployment region
        const now = new Date();
        const dateStr = formatDateISO(now);

        console.log(`[api] Running pipeline for date: ${dateStr} (UTC)`);

        // Run the pipeline
        const result = await runDailyDigestPipeline(now);

        // Return success response
        res.status(200).json({
            ok: result.ok,
            totalNews: result.totalNews,
            toolsProcessed: result.toolsProcessed,
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

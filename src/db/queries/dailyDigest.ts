import { supabase } from "../supabaseClient.js";
import type { DailyDigest } from "../types.js";

/**
 * Save or update a daily digest
 * Uses upsert to handle existing digests for the same date
 *
 * @param input Daily digest data to save
 * @throws Error if database operation fails
 */
export async function saveDailyDigest(input: {
    date: string;
    summaryMd: string;
    summaryMdRu?: string;
    summaryShort: string;
    toolsList: string[];
}): Promise<void> {
    console.log(`[dailyDigest] Saving digest for date: ${input.date}`);

    // Build digest data - only include summary_md_ru if it exists
    // This allows the code to work before and after the migration
    const digestData: Record<string, unknown> = {
        date: input.date,
        summary_md: input.summaryMd,
        summary_short: input.summaryShort,
        tools_list: input.toolsList,
    };

    // Only add Russian version if provided (column may not exist yet)
    if (input.summaryMdRu) {
        digestData.summary_md_ru = input.summaryMdRu;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
        .from("daily_digest")
        .upsert(digestData as any, {
            onConflict: "date",
        });

    if (error) {
        // If the error is about missing column, try without Russian version
        if (error.message.includes("summary_md_ru")) {
            console.warn(
                "[dailyDigest] Column summary_md_ru not found, saving without Russian version"
            );
            delete digestData.summary_md_ru;

            const { error: retryError } = await supabase
                .from("daily_digest")
                .upsert(digestData as any, {
                    onConflict: "date",
                });

            if (retryError) {
                console.error(
                    "[dailyDigest] Error saving digest:",
                    retryError.message
                );
                throw new Error(
                    `Failed to save daily digest: ${retryError.message}`
                );
            }

            console.log(
                `[dailyDigest] Successfully saved digest for ${input.date} (without Russian)`
            );
            return;
        }

        console.error("[dailyDigest] Error saving digest:", error.message);
        throw new Error(`Failed to save daily digest: ${error.message}`);
    }

    console.log(`[dailyDigest] Successfully saved digest for ${input.date}`);
}

/**
 * Get a daily digest by date
 *
 * @param date Date in YYYY-MM-DD format
 * @returns Daily digest or null if not found
 * @throws Error if database query fails
 */
export async function getDailyDigest(
    date: string
): Promise<DailyDigest | null> {
    console.log(`[dailyDigest] Fetching digest for date: ${date}`);

    const { data, error } = await supabase
        .from("daily_digest")
        .select("*")
        .eq("date", date)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            // No rows returned
            console.log(`[dailyDigest] No digest found for ${date}`);
            return null;
        }
        console.error("[dailyDigest] Error fetching digest:", error.message);
        throw new Error(`Failed to fetch daily digest: ${error.message}`);
    }

    return data as DailyDigest | null;
}

/**
 * Get the most recent daily digests
 *
 * @param limit Maximum number of digests to return
 * @returns Array of daily digests
 * @throws Error if database query fails
 */
export async function getRecentDigests(
    limit: number = 7
): Promise<DailyDigest[]> {
    const { data, error } = await supabase
        .from("daily_digest")
        .select("*")
        .order("date", { ascending: false })
        .limit(limit);

    if (error) {
        console.error(
            "[dailyDigest] Error fetching recent digests:",
            error.message
        );
        throw new Error(`Failed to fetch recent digests: ${error.message}`);
    }

    return (data as DailyDigest[] | null) ?? [];
}

/**
 * Check if a digest exists for a given date
 *
 * @param date Date in YYYY-MM-DD format
 * @returns True if exists, false otherwise
 */
export async function digestExists(date: string): Promise<boolean> {
    const { data, error } = await supabase
        .from("daily_digest")
        .select("id")
        .eq("date", date)
        .limit(1);

    if (error) {
        console.error(
            "[dailyDigest] Error checking digest existence:",
            error.message
        );
        return false;
    }

    return (data?.length ?? 0) > 0;
}

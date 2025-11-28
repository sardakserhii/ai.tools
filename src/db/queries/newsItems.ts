import { supabase } from "../supabaseClient.js";
import type {
    NewsItem,
    NewsItemInput,
    NewsItemWithTool,
    Tool,
} from "../types.js";

/**
 * Insert multiple news items into the database
 * Uses upsert to handle duplicates based on hash
 *
 * @param items Array of news items to insert
 * @throws Error if database operation fails
 */
export async function insertNewsItems(items: NewsItemInput[]): Promise<void> {
    if (items.length === 0) {
        console.log("[newsItems] No items to insert");
        return;
    }

    console.log(`[newsItems] Inserting ${items.length} news items...`);

    // Use upsert with hash as the conflict key to avoid duplicates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("news_items").upsert(items as any[], {
        onConflict: "hash",
        ignoreDuplicates: true,
    });

    if (error) {
        console.error("[newsItems] Error inserting news items:", error.message);
        throw new Error(`Failed to insert news items: ${error.message}`);
    }

    console.log(
        `[newsItems] Successfully inserted/updated ${items.length} news items`
    );
}

/**
 * Get news items for a specific date with optional importance filter
 * Returns news items joined with tool information
 *
 * @param date Date in YYYY-MM-DD format
 * @param importanceFilter Optional array of importance levels to filter by
 * @returns Array of news items with tool information
 * @throws Error if database query fails
 */
export async function getTodayNews(
    date: string,
    importanceFilter?: ("high" | "medium" | "low")[]
): Promise<NewsItemWithTool[]> {
    console.log(`[newsItems] Fetching news for date: ${date}`);

    // Build the date range for the given day (UTC)
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    let query = supabase
        .from("news_items")
        .select("*")
        .gte("published_at", startOfDay)
        .lte("published_at", endOfDay)
        .order("published_at", { ascending: false });

    if (importanceFilter && importanceFilter.length > 0) {
        query = query.in("importance", importanceFilter);
    }

    const { data: newsItems, error: newsError } = await query;

    if (newsError) {
        console.error("[newsItems] Error fetching news:", newsError.message);
        throw new Error(`Failed to fetch news: ${newsError.message}`);
    }

    if (!newsItems || newsItems.length === 0) {
        console.log("[newsItems] No news found for this date");
        return [];
    }

    // Cast to proper type
    const typedNewsItems = newsItems as NewsItem[];

    // Get unique tool IDs
    const toolIds = [...new Set(typedNewsItems.map((n) => n.tool_id))];

    // Fetch tool information
    const { data: tools, error: toolsError } = await supabase
        .from("tools")
        .select("id, name")
        .in("id", toolIds);

    if (toolsError) {
        console.error("[newsItems] Error fetching tools:", toolsError.message);
        throw new Error(`Failed to fetch tools: ${toolsError.message}`);
    }

    // Create a map for quick tool name lookup
    const toolMap = new Map<string, string>();
    (tools as Pick<Tool, "id" | "name">[] | null)?.forEach((t) => {
        toolMap.set(t.id, t.name);
    });

    // Combine news with tool names
    const result: NewsItemWithTool[] = typedNewsItems.map((item) => ({
        ...item,
        tool_name: toolMap.get(item.tool_id) ?? "Unknown",
    }));

    console.log(`[newsItems] Found ${result.length} news items for ${date}`);
    return result;
}

/**
 * Get news items by tool ID
 *
 * @param toolId Tool identifier
 * @param limit Maximum number of items to return
 * @returns Array of news items
 * @throws Error if database query fails
 */
export async function getNewsByToolId(
    toolId: string,
    limit: number = 50
): Promise<NewsItem[]> {
    const { data, error } = await supabase
        .from("news_items")
        .select("*")
        .eq("tool_id", toolId)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(limit);

    if (error) {
        console.error(
            `[newsItems] Error fetching news for tool ${toolId}:`,
            error.message
        );
        throw new Error(`Failed to fetch news for tool: ${error.message}`);
    }

    return (data as NewsItem[] | null) ?? [];
}

/**
 * Check if a news item with the given hash already exists
 *
 * @param hash Hash to check
 * @returns True if exists, false otherwise
 */
export async function newsItemExists(hash: string): Promise<boolean> {
    const { data, error } = await supabase
        .from("news_items")
        .select("id")
        .eq("hash", hash)
        .limit(1);

    if (error) {
        console.error(
            "[newsItems] Error checking news existence:",
            error.message
        );
        return false;
    }

    return (data?.length ?? 0) > 0;
}

/**
 * Get news items for digest generation using a rolling window approach
 *
 * This fetches:
 * 1. Recent news (last N days) that hasn't been included in any digest yet
 * 2. Optionally includes "missed" high-importance news from earlier
 *
 * @param options Configuration for the rolling window
 * @returns Object with recent news and missed important news
 */
export async function getNewsForDigest(
    options: {
        /** Number of days to look back for recent news (default: 3) */
        recentDays?: number;
        /** Number of days to look back for missed important news (default: 7) */
        missedDays?: number;
        /** Include news without published_at date (default: true) */
        includeUndated?: boolean;
        /** Importance levels to include for missed news (default: ['high']) */
        missedImportance?: ("high" | "medium" | "low")[];
    } = {}
): Promise<{
    recentNews: NewsItemWithTool[];
    missedNews: NewsItemWithTool[];
}> {
    const {
        recentDays = 3,
        missedDays = 7,
        includeUndated = true,
        missedImportance = ["high"],
    } = options;

    const now = new Date();
    const recentCutoff = new Date(
        now.getTime() - recentDays * 24 * 60 * 60 * 1000
    );
    const missedCutoff = new Date(
        now.getTime() - missedDays * 24 * 60 * 60 * 1000
    );

    console.log(
        `[newsItems] Fetching news for digest (recent: ${recentDays}d, missed: ${missedDays}d)`
    );

    // Fetch recent unprocessed news
    const recentQuery = supabase
        .from("news_items")
        .select("*")
        .is("digest_date", null)
        .gte("published_at", recentCutoff.toISOString())
        .order("published_at", { ascending: false });

    const { data: recentData, error: recentError } = await recentQuery;

    if (recentError) {
        console.error(
            "[newsItems] Error fetching recent news:",
            recentError.message
        );
        throw new Error(`Failed to fetch recent news: ${recentError.message}`);
    }

    // Fetch undated news if enabled
    let undatedNews: NewsItem[] = [];
    if (includeUndated) {
        const { data: undatedData, error: undatedError } = await supabase
            .from("news_items")
            .select("*")
            .is("digest_date", null)
            .is("published_at", null)
            .order("created_at", { ascending: false })
            .limit(20);

        if (!undatedError && undatedData) {
            undatedNews = undatedData as NewsItem[];
        }
    }

    // Fetch missed important news (older than recent window but not yet in digest)
    const { data: missedData, error: missedError } = await supabase
        .from("news_items")
        .select("*")
        .is("digest_date", null)
        .gte("published_at", missedCutoff.toISOString())
        .lt("published_at", recentCutoff.toISOString())
        .in("importance", missedImportance)
        .order("published_at", { ascending: false });

    if (missedError) {
        console.error(
            "[newsItems] Error fetching missed news:",
            missedError.message
        );
        // Non-fatal, continue with recent news only
    }

    // Combine recent dated and undated news
    const allRecentNews = [
        ...((recentData as NewsItem[]) || []),
        ...undatedNews,
    ];

    // Get tool names for all news
    const allNews = [...allRecentNews, ...((missedData as NewsItem[]) || [])];
    const toolIds = [...new Set(allNews.map((n) => n.tool_id))];

    const { data: tools } = await supabase
        .from("tools")
        .select("id, name")
        .in("id", toolIds);

    const toolMap = new Map<string, string>();
    (tools as Pick<Tool, "id" | "name">[] | null)?.forEach((t) => {
        toolMap.set(t.id, t.name);
    });

    const mapWithToolName = (items: NewsItem[]): NewsItemWithTool[] =>
        items.map((item) => ({
            ...item,
            tool_name: toolMap.get(item.tool_id) ?? "Unknown",
        }));

    const recentNews = mapWithToolName(allRecentNews);
    const missedNews = mapWithToolName((missedData as NewsItem[]) || []);

    console.log(
        `[newsItems] Found ${recentNews.length} recent + ${missedNews.length} missed news items`
    );

    return { recentNews, missedNews };
}

/**
 * Mark news items as included in a digest
 *
 * @param newsIds Array of news item IDs to mark
 * @param digestDate The date of the digest they were included in
 */
export async function markNewsAsDigested(
    newsIds: number[],
    digestDate: string
): Promise<void> {
    if (newsIds.length === 0) return;

    console.log(
        `[newsItems] Marking ${newsIds.length} news items as digested for ${digestDate}`
    );

    const { error } = await supabase
        .from("news_items")
        .update({ digest_date: digestDate })
        .in("id", newsIds);

    if (error) {
        console.error(
            "[newsItems] Error marking news as digested:",
            error.message
        );
        throw new Error(`Failed to mark news as digested: ${error.message}`);
    }
}

/**
 * Get all undigested news items (not yet included in any digest)
 * This is used for the new URL-based detection logic
 *
 * @param limit Maximum number of items to return
 * @returns Array of news items with tool information
 */
export async function getUndigestedNews(
    limit: number = 50
): Promise<NewsItemWithTool[]> {
    console.log(`[newsItems] Fetching undigested news (limit: ${limit})`);

    const { data: newsItems, error: newsError } = await supabase
        .from("news_items")
        .select("*")
        .is("digest_date", null)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (newsError) {
        console.error(
            "[newsItems] Error fetching undigested news:",
            newsError.message
        );
        throw new Error(
            `Failed to fetch undigested news: ${newsError.message}`
        );
    }

    if (!newsItems || newsItems.length === 0) {
        console.log("[newsItems] No undigested news found");
        return [];
    }

    const typedNewsItems = newsItems as NewsItem[];

    // Get unique tool IDs
    const toolIds = [...new Set(typedNewsItems.map((n) => n.tool_id))];

    // Fetch tool information
    const { data: tools, error: toolsError } = await supabase
        .from("tools")
        .select("id, name")
        .in("id", toolIds);

    if (toolsError) {
        console.error("[newsItems] Error fetching tools:", toolsError.message);
        throw new Error(`Failed to fetch tools: ${toolsError.message}`);
    }

    // Create a map for quick tool name lookup
    const toolMap = new Map<string, string>();
    (tools as Pick<Tool, "id" | "name">[] | null)?.forEach((t) => {
        toolMap.set(t.id, t.name);
    });

    // Combine news with tool names
    const result: NewsItemWithTool[] = typedNewsItems.map((item) => ({
        ...item,
        tool_name: toolMap.get(item.tool_id) ?? "Unknown",
    }));

    console.log(`[newsItems] Found ${result.length} undigested news items`);
    return result;
}

/**
 * Get statistics about unprocessed news
 */
export async function getUnprocessedNewsStats(): Promise<{
    total: number;
    withDates: number;
    withoutDates: number;
    byTool: Record<string, number>;
}> {
    const { data, error } = await supabase
        .from("news_items")
        .select("tool_id, published_at")
        .is("digest_date", null);

    if (error) {
        console.error("[newsItems] Error fetching stats:", error.message);
        return { total: 0, withDates: 0, withoutDates: 0, byTool: {} };
    }

    const items = data || [];
    const byTool: Record<string, number> = {};

    items.forEach((item) => {
        byTool[item.tool_id] = (byTool[item.tool_id] || 0) + 1;
    });

    return {
        total: items.length,
        withDates: items.filter((i) => i.published_at).length,
        withoutDates: items.filter((i) => !i.published_at).length,
        byTool,
    };
}

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
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: false });

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

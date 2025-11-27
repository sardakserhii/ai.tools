/**
 * Script to clean up test/invalid data from the database
 */
import { supabase } from "../src/db/supabaseClient.js";

async function main() {
    console.log("Cleaning database...\n");

    // 1. Delete news with mailto: URLs
    console.log("Deleting news with mailto: URLs...");
    const { data: mailtoNews, error: mailtoError } = await supabase
        .from("news_items")
        .delete()
        .like("url", "mailto:%")
        .select("id, title");

    if (mailtoError) {
        console.error("Error deleting mailto news:", mailtoError.message);
    } else {
        console.log(`Deleted ${mailtoNews?.length || 0} mailto news items`);
    }

    // 2. Delete old test data with fake URLs
    console.log("\nDeleting old test data...");
    const testUrls = [
        "https://anthropic.com/news/claude-3-opus",
        "https://openai.com/blog/chatgpt-memory",
        "https://openai.com/blog/gpt4-turbo-update",
        "https://openai.com/blog/dalle-3-expansion",
        "https://github.blog/copilot-chat-vscode",
        "https://midjourney.com/updates/v6-alpha",
    ];

    const { data: testNews, error: testError } = await supabase
        .from("news_items")
        .delete()
        .in("url", testUrls)
        .select("id, title");

    if (testError) {
        console.error("Error deleting test news:", testError.message);
    } else {
        console.log(`Deleted ${testNews?.length || 0} test news items`);
    }

    // 3. Show remaining items
    console.log("\n=== Remaining news items ===\n");
    const { data: remaining, error: remainingError } = await supabase
        .from("news_items")
        .select("tool_id, title, url, published_at")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(20);

    if (remainingError) {
        console.error("Error fetching remaining:", remainingError.message);
        return;
    }

    if (!remaining || remaining.length === 0) {
        console.log("No news items remaining in database");
    } else {
        remaining.forEach((item, i) => {
            const date = item.published_at
                ? new Date(item.published_at).toISOString().split("T")[0]
                : "no date";
            console.log(`${i + 1}. [${item.tool_id}] ${item.title}`);
            console.log(`   ${date} - ${item.url}`);
        });
    }

    console.log("\nDone!");
}

main().catch(console.error);

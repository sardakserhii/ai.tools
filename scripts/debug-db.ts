/**
 * Debug script to check news in database
 */
import { supabase } from "../src/db/supabaseClient.js";

async function main() {
    console.log("Checking news in database...\n");

    // Get news with dates first
    const { data: datedNews, error: error1 } = await supabase
        .from("news_items")
        .select("title, url, published_at, tool_id")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(15);

    if (error1) {
        console.error("Error:", error1);
        return;
    }

    console.log(`=== News with dates (${datedNews?.length || 0} items) ===\n`);

    datedNews?.forEach((n, i) => {
        console.log(`${i + 1}. [${n.tool_id}] ${n.title}`);
        console.log(`   Published: ${n.published_at}`);
        console.log(`   URL: ${n.url}`);
        console.log();
    });

    // Get news without dates
    const { data: undatedNews, error: error2 } = await supabase
        .from("news_items")
        .select("title, url, tool_id")
        .is("published_at", null)
        .limit(10);

    if (error2) {
        console.error("Error:", error2);
        return;
    }

    console.log(
        `\n=== News WITHOUT dates (${undatedNews?.length || 0} items, showing 10) ===\n`
    );

    undatedNews?.forEach((n, i) => {
        console.log(`${i + 1}. [${n.tool_id}] ${n.title} - ${n.url}`);
    });
}

main();

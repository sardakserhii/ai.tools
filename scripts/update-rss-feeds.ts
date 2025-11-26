import { supabase } from "../src/db/supabaseClient.js";

/**
 * RSS feed URLs for various AI tools
 * These are known RSS/Atom feeds that work well with the RssParser
 */
const RSS_FEEDS: Record<string, string> = {
    // Official RSS feeds
    n8n: "https://blog.n8n.io/rss/",
    replit: "https://blog.replit.com/feed.xml",

    // Alternative news sources with RSS
    "character-ai": "https://blog.character.ai/rss/",

    // Many blogs use /feed or /rss endpoints
    // These will be auto-detected by the RSS parser
};

/**
 * Alternative news URLs to try for tools with blocked sites
 * Some sites block direct scraping but have alternative feeds
 */
const ALTERNATIVE_NEWS_URLS: Record<string, string> = {
    // Tools that block main site but have RSS
    n8n: "https://blog.n8n.io/rss/",
    replit: "https://blog.replit.com/feed.xml",

    // Twitter/X feeds (if we implement twitter parser later)
    // "midjourney": "https://nitter.net/midjourney/rss",
};

async function main() {
    console.log("🔧 Updating news URLs with RSS feeds...\n");

    for (const [toolId, rssUrl] of Object.entries(RSS_FEEDS)) {
        console.log(`Updating ${toolId} -> ${rssUrl}`);

        const { error } = await supabase
            .from("tools")
            .update({ news_url: rssUrl })
            .eq("id", toolId);

        if (error) {
            console.error(`  ❌ Error: ${error.message}`);
        } else {
            console.log(`  ✅ Updated`);
        }
    }

    console.log("\n📊 Summary of tools with RSS feeds:");

    const { data: tools } = await supabase
        .from("tools")
        .select("id, name, news_url")
        .not("news_url", "is", null)
        .order("name");

    if (tools) {
        const rssTools = tools.filter(
            (t) =>
                t.news_url?.includes("/rss") ||
                t.news_url?.includes("/feed") ||
                t.news_url?.endsWith(".xml")
        );

        console.log(`\nTools with RSS feeds (${rssTools.length}):`);
        rssTools.forEach((t) => {
            console.log(`  - ${t.name}: ${t.news_url}`);
        });
    }

    console.log("\n✅ Done!");
}

main().catch(console.error);

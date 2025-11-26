/**
 * Test script for the digest generator
 * Run with: npx tsx scripts/test-digest.ts
 */

import { getTodayNews } from "../src/db/queries/newsItems.js";
import { generateDailyDigest } from "../src/services/digestGenerator.js";
import { formatDateISO, getDaysAgo } from "../src/utils/dates.js";

async function main() {
    console.log("Testing Digest Generator\n");
    console.log("========================\n");

    // Get news from today or yesterday
    const today = new Date();
    const dateStr = formatDateISO(today);

    console.log(`Fetching news for date: ${dateStr}`);

    try {
        let news = await getTodayNews(dateStr);

        // If no news today, try yesterday
        if (news.length === 0) {
            const yesterday = getDaysAgo(1);
            const yesterdayStr = formatDateISO(yesterday);
            console.log(`No news today, trying yesterday: ${yesterdayStr}`);
            news = await getTodayNews(yesterdayStr);
        }

        console.log(`Found ${news.length} news items\n`);

        if (news.length === 0) {
            console.log("No news items found. Please run the pipeline first.");
            console.log("Run: npx tsx scripts/run-pipeline.ts");
            return;
        }

        // Show sample news items
        console.log("Sample news items:");
        console.log("------------------");
        news.slice(0, 3).forEach((item, i) => {
            console.log(`${i + 1}. [${item.tool_name}] ${item.title}`);
            console.log(`   URL: ${item.url}`);
            console.log(`   Snippet: ${item.snippet?.substring(0, 100)}...`);
            console.log();
        });

        // Generate digest
        console.log("\nGenerating digest with OpenAI...\n");
        const digest = await generateDailyDigest(news, dateStr);

        console.log("=== SUMMARY (Markdown) ===\n");
        console.log(digest.summaryMd);

        console.log("\n=== SHORT SUMMARY ===\n");
        console.log(digest.summaryShort);

        console.log("\n=== TOOLS LIST ===\n");
        console.log(digest.toolsList.join(", "));

        console.log("\n✅ Digest generation test completed!");
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main();

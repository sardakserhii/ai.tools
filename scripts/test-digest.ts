/**
 * Test script for the digest generator
 * Run with: npx tsx scripts/test-digest.ts [date] [--force]
 *
 * Examples:
 *   npx tsx scripts/test-digest.ts              # Generate for today
 *   npx tsx scripts/test-digest.ts 2025-11-26   # Generate for specific date
 *   npx tsx scripts/test-digest.ts --force      # Force regeneration
 */

import { getTodayNews } from "../src/db/queries/newsItems.js";
import {
    saveDailyDigest,
    getDailyDigest,
} from "../src/db/queries/dailyDigest.js";
import { generateDailyDigest } from "../src/services/digestGenerator.js";
import { formatDateISO, getDaysAgo } from "../src/utils/dates.js";

async function main() {
    const args = process.argv.slice(2);
    const forceRegenerate = args.includes("--force");
    const dateArg = args.find((arg) => !arg.startsWith("--"));

    console.log("Testing Digest Generator\n");
    console.log("========================\n");

    // Get news from specified date or today
    const dateStr = dateArg || formatDateISO(new Date());
    console.log(`Fetching news for date: ${dateStr}`);

    try {
        // Check if digest already exists
        if (!forceRegenerate) {
            const existing = await getDailyDigest(dateStr);
            if (existing) {
                console.log(`\n✅ Digest already exists for ${dateStr}`);
                console.log("\n=== SUMMARY (English) ===\n");
                console.log(existing.summary_md);
                console.log("\n=== SUMMARY (Russian) ===\n");
                console.log(existing.summary_md_ru || "(no Russian version)");
                console.log("\nUse --force to regenerate.");
                return;
            }
        }

        let news = await getTodayNews(dateStr);

        // If no news today, try yesterday
        if (news.length === 0) {
            const yesterday = getDaysAgo(1);
            const yesterdayStr = formatDateISO(yesterday);
            console.log(
                `No news for ${dateStr}, trying yesterday: ${yesterdayStr}`
            );
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
            console.log(`   Snippet: ${item.snippet?.substring(0, 50)}...`);
            console.log();
        });

        // Generate digest
        console.log("\nGenerating digest...\n");
        const digest = await generateDailyDigest(news, dateStr);

        // Save to database
        console.log("\nSaving digest to database...");
        await saveDailyDigest({
            date: dateStr,
            summaryMd: digest.summaryMd,
            summaryMdRu: digest.summaryMdRu,
            summaryShort: digest.summaryShort,
            toolsList: digest.toolsList,
        });

        console.log("\n=== SUMMARY (English) ===\n");
        console.log(digest.summaryMd);

        console.log("\n=== SUMMARY (Russian) ===\n");
        console.log(digest.summaryMdRu);

        console.log("\n=== SHORT SUMMARY ===\n");
        console.log(digest.summaryShort);

        console.log("\n=== TOOLS LIST ===\n");
        console.log(digest.toolsList.join(", "));

        console.log("\n✅ Digest generated and saved!");
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main();

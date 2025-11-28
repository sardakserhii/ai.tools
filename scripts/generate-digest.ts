/**
 * Generate digest from undigested news (URL-based logic)
 *
 * This script:
 * 1. Fetches all news items not yet included in any digest
 * 2. Generates a digest using LLM
 * 3. Saves the digest to database
 * 4. Optionally marks news as digested
 * 5. Optionally publishes to Telegram
 *
 * Usage:
 *   npx tsx scripts/generate-digest.ts                    # Generate for today
 *   npx tsx scripts/generate-digest.ts --publish          # Generate and publish to Telegram
 *   npx tsx scripts/generate-digest.ts --dry              # Preview without saving
 *   npx tsx scripts/generate-digest.ts --limit 20         # Limit number of news items
 */

import {
    getUndigestedNews,
    markNewsAsDigested,
} from "../src/db/queries/newsItems.js";
import { saveDailyDigest, getDailyDigest } from "../src/db/queries/dailyDigest.js";
import { generateDailyDigest } from "../src/services/digestGenerator.js";
import { publishToTelegram } from "../src/services/telegramPublisher.js";
import { formatDateISO } from "../src/utils/dates.js";

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry");
    const shouldPublish = args.includes("--publish");
    const limitArg = args.find((arg) => arg.startsWith("--limit"));
    const limit = limitArg ? parseInt(limitArg.split("=")[1] || "50") : 50;

    const today = formatDateISO(new Date());

    console.log("\n========================================");
    console.log("📰 Generating Digest from Undigested News");
    console.log(`📅 Date: ${today}`);
    console.log(`🔢 Limit: ${limit} items`);
    console.log(`📤 Publish to Telegram: ${shouldPublish}`);
    console.log(`🧪 Dry run: ${dryRun}`);
    console.log("========================================\n");

    // Check if digest already exists for today
    const existingDigest = await getDailyDigest(today);
    if (existingDigest && !dryRun) {
        console.log(`⚠️  Digest already exists for ${today}`);
        console.log("   Use --dry to preview new digest without overwriting");
        console.log("   Or delete existing digest first\n");

        // Show existing digest info
        console.log("📝 Existing digest:");
        console.log(`   - Tools: ${existingDigest.tools_list?.join(", ") || "none"}`);
        console.log(`   - Length: ${existingDigest.summary_md.length} chars`);
        console.log(
            `   - Has Russian: ${existingDigest.summary_md_ru ? "yes" : "no"}`
        );

        if (shouldPublish) {
            console.log("\n📤 Publishing existing digest...");
            const summaryToPublish =
                existingDigest.summary_md_ru || existingDigest.summary_md;
            const result = await publishToTelegram(summaryToPublish, today);
            if (result.success) {
                console.log(`✅ Published to Telegram (Message ID: ${result.messageId})`);
            } else {
                console.error(`❌ Failed to publish: ${result.error}`);
            }
        }
        return;
    }

    // Fetch undigested news
    console.log("📥 Fetching undigested news...");
    const news = await getUndigestedNews(limit);

    if (news.length === 0) {
        console.log("\n⚠️  No undigested news found!");
        console.log("   All news items have already been included in digests.");
        console.log("   Run the pipeline first to fetch new content:");
        console.log("   npx tsx scripts/run-pipeline.ts\n");
        return;
    }

    console.log(`\n📊 Found ${news.length} undigested news items:`);
    
    // Group by tool
    const byTool = news.reduce((acc, item) => {
        acc[item.tool_name] = (acc[item.tool_name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    for (const [tool, count] of Object.entries(byTool)) {
        console.log(`   - ${tool}: ${count}`);
    }

    // Generate digest
    console.log("\n🤖 Generating digest via LLM...");
    const digest = await generateDailyDigest(news, today);

    console.log("\n📝 Digest generated:");
    console.log(`   - Tools: ${digest.toolsList.join(", ")}`);
    console.log(`   - English: ${digest.summaryMd.length} chars`);
    console.log(`   - Russian: ${digest.summaryMdRu.length} chars`);

    // Preview
    console.log("\n--- PREVIEW (Russian) ---");
    console.log(digest.summaryMdRu.substring(0, 500));
    if (digest.summaryMdRu.length > 500) {
        console.log("...[truncated]");
    }
    console.log("--- END PREVIEW ---\n");

    if (dryRun) {
        console.log("🧪 DRY RUN - not saving to database\n");
        return;
    }

    // Save digest
    console.log("💾 Saving digest to database...");
    await saveDailyDigest({
        date: today,
        summaryMd: digest.summaryMd,
        summaryMdRu: digest.summaryMdRu,
        summaryShort: digest.summaryShort,
        toolsList: digest.toolsList,
    });
    console.log("✅ Digest saved");

    // Mark news as digested
    console.log("📌 Marking news as digested...");
    const newsIds = news.map((n) => n.id);
    await markNewsAsDigested(newsIds, today);
    console.log(`✅ Marked ${newsIds.length} news items as digested`);

    // Publish to Telegram
    if (shouldPublish) {
        console.log("\n📤 Publishing to Telegram...");
        const result = await publishToTelegram(digest.summaryMdRu, today);
        if (result.success) {
            console.log(`✅ Published to Telegram (Message ID: ${result.messageId})`);
        } else {
            console.error(`❌ Failed to publish: ${result.error}`);
        }
    }

    console.log("\n========================================");
    console.log("✅ Digest generation completed!");
    console.log("========================================\n");
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});

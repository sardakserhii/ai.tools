/**
 * Script to publish a daily digest to Telegram
 *
 * Usage:
 *   npx tsx scripts/publish-telegram.ts                 # Publish today's digest
 *   npx tsx scripts/publish-telegram.ts 2025-01-15      # Publish specific date's digest
 *   npx tsx scripts/publish-telegram.ts --generate      # Generate and publish (don't use cache)
 *   npx tsx scripts/publish-telegram.ts --test          # Test Telegram connection
 */

import { getDailyDigest } from "../src/db/queries/dailyDigest.js";
import { getTodayNews } from "../src/db/queries/newsItems.js";
import { generateDailyDigest } from "../src/services/digestGenerator.js";
import {
    publishToTelegram,
    testTelegramConnection,
} from "../src/services/telegramPublisher.js";
import { formatDateISO } from "../src/utils/dates.js";

async function main() {
    const args = process.argv.slice(2);

    // Check for test flag
    if (args.includes("--test")) {
        console.log("🔌 Testing Telegram connection...\n");

        const result = await testTelegramConnection();

        if (result.success) {
            console.log("✅ Telegram connection successful!");
            console.log(`   Message ID: ${result.messageId}`);
        } else {
            console.error("❌ Telegram connection failed:", result.error);
            process.exit(1);
        }

        return;
    }

    // Check for flags
    const generateFresh = args.includes("--generate");

    // Get date from arguments or use today
    const dateArg = args.find((arg) => !arg.startsWith("--"));
    const date = dateArg || formatDateISO(new Date());

    console.log(`📰 Publishing digest for ${date} to Telegram...\n`);

    let summaryToPublish: string;

    if (generateFresh) {
        // Generate fresh digest
        console.log("🔄 Generating fresh digest...\n");
        const news = await getTodayNews(date);

        if (news.length === 0) {
            console.error(`❌ No news found for ${date}`);
            process.exit(1);
        }

        const digest = await generateDailyDigest(news, date);
        summaryToPublish = digest.summaryMd;

        console.log(
            `\n📝 Generated digest (${summaryToPublish.length} chars)\n`
        );
    } else {
        // Fetch the digest from database
        const digest = await getDailyDigest(date);

        if (!digest) {
            console.error(`❌ No digest found for ${date}`);
            console.log("\nHint: Run the digest generation first:");
            console.log(`  npx tsx scripts/generate-digest.ts`);
            console.log("\nOr generate and publish directly:");
            console.log(
                `  npx tsx scripts/publish-telegram.ts ${date} --generate`
            );
            process.exit(1);
        }

        // Use the digest (now only English)
        summaryToPublish = digest.summary_md;

        console.log("📝 Digest found:");
        console.log(`   - Date: ${digest.date}`);
        console.log(`   - Tools: ${digest.tools_list?.join(", ") || "none"}`);
        console.log(`   - Length: ${summaryToPublish.length} characters\n`);
    }

    // Publish to Telegram
    const result = await publishToTelegram(summaryToPublish, date);

    if (result.success) {
        console.log("\n✅ Successfully published to Telegram!");
        console.log(`   Message ID: ${result.messageId}`);
    } else {
        console.error("\n❌ Failed to publish to Telegram:", result.error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});

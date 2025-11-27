/**
 * Script to publish a daily digest to Telegram
 *
 * Usage:
 *   npx tsx scripts/publish-telegram.ts                 # Publish today's digest (Russian)
 *   npx tsx scripts/publish-telegram.ts 2025-01-15      # Publish specific date's digest
 *   npx tsx scripts/publish-telegram.ts --en            # Publish English version
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
    const useEnglish = args.includes("--en");
    const generateFresh = args.includes("--generate");
    const lang = useEnglish ? "English" : "Russian";

    // Get date from arguments or use today
    const dateArg = args.find((arg) => !arg.startsWith("--"));
    const date = dateArg || formatDateISO(new Date());

    console.log(`📰 Publishing ${lang} digest for ${date} to Telegram...\n`);

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
        summaryToPublish = useEnglish ? digest.summaryMd : digest.summaryMdRu;

        console.log(
            `\n📝 Generated ${lang} digest (${summaryToPublish.length} chars)\n`
        );
    } else {
        // Fetch the digest from database
        const digest = await getDailyDigest(date);

        if (!digest) {
            console.error(`❌ No digest found for ${date}`);
            console.log("\nHint: Run the digest generation first:");
            console.log(`  npx tsx scripts/test-digest.ts ${date}`);
            console.log("\nOr generate and publish directly:");
            console.log(
                `  npx tsx scripts/publish-telegram.ts ${date} --generate`
            );
            process.exit(1);
        }

        // Select the right version
        summaryToPublish = useEnglish
            ? digest.summary_md
            : digest.summary_md_ru || digest.summary_md;

        console.log("📝 Digest found:");
        console.log(`   - Date: ${digest.date}`);
        console.log(`   - Language: ${lang}`);
        console.log(`   - Tools: ${digest.tools_list?.join(", ") || "none"}`);
        console.log(`   - Length: ${summaryToPublish.length} characters`);
        console.log(
            `   - Has Russian: ${digest.summary_md_ru ? "yes" : "no"}\n`
        );
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

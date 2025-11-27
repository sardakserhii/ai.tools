/**
 * Run the rolling window digest pipeline
 *
 * This is the recommended production mode that collects all unprocessed
 * news from recent days and generates a combined digest.
 *
 * Usage:
 *   npx tsx scripts/run-rolling-digest.ts           # Default: 3 days recent, 7 days missed
 *   npx tsx scripts/run-rolling-digest.ts --dry-run # Preview without marking as digested
 *   npx tsx scripts/run-rolling-digest.ts --publish # Also publish to Telegram
 *   npx tsx scripts/run-rolling-digest.ts --recent 5 --missed 14  # Custom windows
 */
import { runRollingDigestPipeline } from "../src/services/newsPipeline.js";
import { getUnprocessedNewsStats } from "../src/db/queries/newsItems.js";

async function main() {
    const args = process.argv.slice(2);

    const dryRun = args.includes("--dry-run");
    const publish = args.includes("--publish");
    const skipFetch = args.includes("--skip-fetch");

    // Parse numeric options
    let recentDays = 3;
    let missedDays = 7;

    const recentIdx = args.indexOf("--recent");
    if (recentIdx !== -1 && args[recentIdx + 1]) {
        recentDays = parseInt(args[recentIdx + 1], 10);
    }

    const missedIdx = args.indexOf("--missed");
    if (missedIdx !== -1 && args[missedIdx + 1]) {
        missedDays = parseInt(args[missedIdx + 1], 10);
    }

    console.log("🚀 Rolling Window Digest Pipeline\n");
    console.log("📋 Configuration:");
    console.log(`   Recent window: ${recentDays} days`);
    console.log(`   Missed window: ${missedDays} days`);
    console.log(`   Dry run: ${dryRun}`);
    console.log(`   Publish to Telegram: ${publish}`);
    console.log(`   Fetch fresh news: ${!skipFetch}\n`);

    // Show current stats
    console.log("📊 Current unprocessed news stats:");
    const stats = await getUnprocessedNewsStats();
    console.log(`   Total unprocessed: ${stats.total}`);
    console.log(`   With dates: ${stats.withDates}`);
    console.log(`   Without dates: ${stats.withoutDates}`);

    if (Object.keys(stats.byTool).length > 0) {
        console.log("   By tool:");
        Object.entries(stats.byTool)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([tool, count]) => {
                console.log(`     - ${tool}: ${count}`);
            });
    }
    console.log();

    // Run the pipeline
    const result = await runRollingDigestPipeline({
        recentDays,
        missedDays,
        fetchNews: !skipFetch,
        publishToTelegram: publish,
        dryRun,
    });

    // Print results
    console.log("\n========================================");
    console.log("📊 Results:");
    console.log("========================================");
    console.log(`✅ Success: ${result.ok}`);
    console.log(`📰 Recent news: ${result.recentNewsCount}`);
    console.log(`📌 Missed news: ${result.missedNewsCount}`);
    console.log(`📝 Digest generated: ${result.digestGenerated}`);
    console.log(`📱 Telegram published: ${result.telegramPublished}`);
    console.log(`✓ News marked as digested: ${result.newsMarkedAsDigested}`);

    if (result.errors.length > 0) {
        console.log(`\n⚠️ Errors (${result.errors.length}):`);
        result.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }

    console.log("\n💡 Usage:");
    console.log(
        "   npx tsx scripts/run-rolling-digest.ts           # Generate digest"
    );
    console.log(
        "   npx tsx scripts/run-rolling-digest.ts --dry-run # Preview only"
    );
    console.log(
        "   npx tsx scripts/run-rolling-digest.ts --publish # With Telegram"
    );
    console.log(
        "   npx tsx scripts/run-rolling-digest.ts --skip-fetch # Skip fetching"
    );
}

main().catch(console.error);
